import { useEffect, useState } from "react";
import { Check, Copy, LogIn, Share2, Users, Wifi } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { liveSession, useLiveStore, type LiveStatus } from "@/lib/multiplayer/session";
import { inviteLink, parseRoomId } from "@/lib/multiplayer/invite";
import { gameSummary, type Game } from "@/lib/scoring";
import { cn } from "@/lib/utils";

function statusLabel(status: LiveStatus, connectedCount: number): string {
  if (status === "live") {
    return connectedCount === 1 ? "1 player connected" : `${connectedCount} players connected`;
  }
  if (status === "connecting") return "Waiting for players…";
  return "Not sharing";
}

/** Compact live badge shown in the board header once a session is active. */
export function LiveBadge({ roomId }: { roomId: string }) {
  const status = useLiveStore((s) => s.status);
  const connectedCount = useLiveStore((s) => s.connectedCount);
  const activeRoom = useLiveStore((s) => s.roomId);
  if (status === "idle" || activeRoom !== roomId) return null;
  const live = status === "live";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        live ? "bg-emerald-500/15 text-emerald-300" : "bg-felt-elev text-felt-muted",
      )}
      aria-live="polite"
    >
      <Wifi className={cn("size-3", live ? "" : "opacity-60")} />
      {live ? (connectedCount === 1 ? "Live · 1" : `Live · ${connectedCount}`) : "Connecting…"}
    </span>
  );
}

async function copyText(text: string, okMessage: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(okMessage);
  } catch {
    toast.error("Could not copy");
  }
}

export function InviteDialog({
  game,
  open,
  onOpenChange,
}: {
  game: Game;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const status = useLiveStore((s) => s.status);
  const connectedCount = useLiveStore((s) => s.connectedCount);
  const activeRoom = useLiveStore((s) => s.roomId);
  const isLive = status !== "idle" && activeRoom === game.id;
  const [copied, setCopied] = useState(false);
  const link = inviteLink(game.id);

  // Opening the dialog starts sharing so the host is present in the room and a
  // joiner's link connects immediately.
  useEffect(() => {
    if (open && !liveSession.isActive(game.id)) {
      liveSession.start(game.id, game.teamNames[0]);
    }
  }, [open, game.id, game.teamNames]);

  async function shareLink() {
    try {
      if (navigator.share) {
        await navigator.share({ title: "Join my Hand & Foot game", url: link });
        return;
      }
    } catch {
      // Fall through to clipboard copy below.
    }
    await copyText(link, "Invite link copied");
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Score together</DialogTitle>
          <DialogDescription>
            Share this game so another device can score the same sheet live. Edits sync both
            ways in real time.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 rounded-lg bg-paper-inset px-3 py-2">
          <Wifi
            className={cn("size-4 shrink-0", isLive && status === "live" ? "text-emerald-500" : "text-paper-muted")}
          />
          <span className="text-sm text-paper-fg">{statusLabel(status, connectedCount)}</span>
        </div>

        <label className="grid gap-1.5">
          <span className="text-xs font-medium tracking-wide text-paper-muted uppercase">
            Invite link
          </span>
          <div className="flex gap-2">
            <Input readOnly value={link} onFocus={(e) => e.target.select()} className="text-xs" />
            <Button
              type="button"
              variant="cream"
              size="icon"
              aria-label="Copy invite link"
              onClick={() => void shareLink()}
            >
              {copied ? <Check /> : <Copy />}
            </Button>
          </div>
        </label>

        <DialogFooter className="sm:justify-between">
          <Button
            type="button"
            variant="paperGhost"
            onClick={() => void copyText(gameSummary(game), "Score copied")}
          >
            <Share2 className="size-4" /> Copy score
          </Button>
          {isLive ? (
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                liveSession.stop();
                onOpenChange(false);
              }}
            >
              Stop sharing
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function JoinDialog({
  open,
  onOpenChange,
  onJoin,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJoin: (roomId: string) => void;
}) {
  const [value, setValue] = useState("");
  useEffect(() => {
    if (open) setValue("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join a game</DialogTitle>
          <DialogDescription>
            Paste an invite link (or code) from the other device to score the same game together.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const roomId = parseRoomId(value);
            if (!roomId) {
              toast.error("Paste an invite link or code");
              return;
            }
            onJoin(roomId);
          }}
        >
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="https://…/?join=…"
            autoFocus
            autoComplete="off"
          />
          <DialogFooter>
            <Button type="submit" size="lg" className="w-full sm:w-auto">
              <LogIn className="size-4" /> Join
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Full-screen "connecting" state for a device that opened an invite link for a
 * game it doesn't have locally yet. */
export function JoiningScreen({ onCancel }: { onCancel: () => void }) {
  const connectedCount = useLiveStore((s) => s.connectedCount);
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-6 px-5 py-10 text-center safe-top">
      <div className="flex size-16 items-center justify-center rounded-full bg-felt-elev">
        <Users className="size-7 text-felt-fg" />
      </div>
      <div>
        <h1 className="font-display text-2xl font-semibold text-felt-fg">Joining game…</h1>
        <p className="mt-2 max-w-sm text-felt-muted">
          {connectedCount > 0
            ? "Connected — loading the score sheet."
            : "Connecting to the other device. Keep this open."}
        </p>
      </div>
      <Wifi className="size-5 animate-pulse text-felt-muted" />
      <Button variant="outline" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}
