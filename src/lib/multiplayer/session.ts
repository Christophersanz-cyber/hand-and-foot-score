/**
 * Live shared scoring: glues the P2PRoom WebRTC client (p2p.ts) to the Zustand
 * game store so two devices score the SAME game together in real time.
 *
 * Sync model (see sync.ts): whenever the active game changes locally we push
 * the whole game to peers over the reliable data channel; incoming games win by
 * last-write-wins on their `Version`. Full-game snapshots make late joiners and
 * dropped packets trivially self-healing — a scoresheet changes only on a tap,
 * so the bandwidth is nothing.
 *
 * Feedback loops are prevented two ways: applying a remote game is wrapped in a
 * `suppressBroadcast` flag so the store subscription doesn't echo it back, and
 * every state carries a version so an echo that slips through is not "newer"
 * and gets dropped.
 */
import { create } from "zustand";
import type { Game } from "../scoring";
import { useGameStore } from "../store";
import { P2PRoom, type PeerInfo } from "./p2p";
import { isNewer, isStateMessage, type StateMessage, type Version } from "./sync";

export type LiveStatus = "idle" | "connecting" | "live";

interface LiveState {
  status: LiveStatus;
  roomId: string | null;
  /** How many remote peers are fully connected right now. */
  connectedCount: number;
  peers: PeerInfo[];
}

export const useLiveStore = create<LiveState>(() => ({
  status: "idle",
  roomId: null,
  connectedCount: 0,
  peers: [],
}));

/** Retries (ms) for pushing state to a freshly-connected peer whose reliable
 * data channel may not be open the instant connectionState flips to
 * "connected". */
const PUSH_RETRY_MS = [0, 400, 1200];

class LiveSession {
  private room: P2PRoom | null = null;
  private roomId: string | null = null;
  private readonly clientId = crypto.randomUUID();
  private unsubStore: (() => void) | null = null;
  private lastVersion: Version = { ts: 0, cid: "" };
  private suppressBroadcast = false;
  private lastGameRef: Game | null = null;
  private connectedPeers = new Set<string>();

  isActive(roomId: string): boolean {
    return this.room !== null && this.roomId === roomId;
  }

  start(roomId: string, name?: string): void {
    if (this.isActive(roomId)) return;
    this.stop();
    this.roomId = roomId;

    const local = this.currentGame(roomId);
    this.lastGameRef = local;
    this.lastVersion = local
      ? { ts: local.updatedAt, cid: this.clientId }
      : { ts: 0, cid: "" };

    useLiveStore.setState({
      status: "connecting",
      roomId,
      connectedCount: 0,
      peers: [],
    });

    const room = new P2PRoom({
      room: roomId,
      selfId: this.clientId,
      name: name ?? "Player",
      onMessage: (_from, data) => this.onMessage(data),
      onPeersChanged: (peers) => this.onPeersChanged(peers),
    });
    this.room = room;
    void room.join();

    // Broadcast local score edits to peers. touch() makes a fresh game object
    // on every change, so reference inequality detects a real edit.
    this.unsubStore = useGameStore.subscribe((state) => {
      const game = state.games.find((g) => g.id === roomId) ?? null;
      if (game === this.lastGameRef) return;
      this.lastGameRef = game;
      if (game) this.onLocalChange(game);
    });
  }

  stop(): void {
    this.unsubStore?.();
    this.unsubStore = null;
    this.room?.close();
    this.room = null;
    this.roomId = null;
    this.connectedPeers.clear();
    this.lastGameRef = null;
    this.lastVersion = { ts: 0, cid: "" };
    if (useLiveStore.getState().status !== "idle") {
      useLiveStore.setState({ status: "idle", roomId: null, connectedCount: 0, peers: [] });
    }
  }

  private currentGame(roomId: string): Game | null {
    return useGameStore.getState().games.find((g) => g.id === roomId) ?? null;
  }

  private onLocalChange(game: Game): void {
    if (this.suppressBroadcast) return;
    const version: Version = { ts: game.updatedAt, cid: this.clientId };
    if (!isNewer(version, this.lastVersion)) return;
    this.lastVersion = version;
    this.pushState(game);
  }

  private pushState(game: Game): void {
    const msg: StateMessage = { type: "state", cid: this.clientId, game };
    this.room?.send(msg);
  }

  private onMessage(data: unknown): void {
    if (!isStateMessage(data)) return;
    const game = data.game as Game;
    if (!game || game.id !== this.roomId) return;
    const remote: Version = { ts: game.updatedAt, cid: data.cid };
    if (!isNewer(remote, this.lastVersion)) return;
    this.lastVersion = remote;
    // Apply without re-broadcasting: the store subscription would otherwise
    // echo this straight back to the sender.
    this.suppressBroadcast = true;
    try {
      useGameStore.getState().applyRemoteGame(game);
      this.lastGameRef = this.currentGame(game.id);
    } finally {
      this.suppressBroadcast = false;
    }
  }

  private onPeersChanged(peers: PeerInfo[]): void {
    const connected = peers.filter((p) => p.connectionState === "connected");
    useLiveStore.setState({
      peers,
      connectedCount: connected.length,
      status: connected.length > 0 ? "live" : "connecting",
    });

    // Push our current game to any peer that just finished connecting, so a
    // late joiner (or a reconnecting peer) immediately gets the live state.
    const nowConnected = new Set(connected.map((p) => p.id));
    let hasNew = false;
    for (const id of nowConnected) {
      if (!this.connectedPeers.has(id)) hasNew = true;
    }
    this.connectedPeers = nowConnected;
    if (hasNew && this.roomId) this.scheduleStatePush(this.roomId);
  }

  private scheduleStatePush(roomId: string): void {
    for (const delay of PUSH_RETRY_MS) {
      setTimeout(() => {
        if (this.roomId !== roomId) return;
        const game = this.currentGame(roomId);
        if (game) this.pushState(game);
      }, delay);
    }
  }
}

export const liveSession = new LiveSession();
