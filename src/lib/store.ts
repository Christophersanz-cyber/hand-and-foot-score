import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  createGame,
  emptyScore,
  type Game,
  type HandIndex,
  type TeamHandScore,
  type TeamIndex,
} from "./scoring";

type GameState = {
  _hasHydrated: boolean;
  games: Game[];
  activeGameId: string | null;
  setHydrated: () => void;
  newGame: (teamNames?: [string, string]) => string;
  setActive: (id: string | null) => void;
  deleteGame: (id: string) => void;
  /**
   * Replace (or insert) a game from a peer in a live session, keeping the
   * remote's `updatedAt` so LWW versioning stays stable, and make it active.
   * Never call this from UI — it's the P2P sync path (see multiplayer/session).
   */
  applyRemoteGame: (game: Game) => void;
  renameTeam: (team: TeamIndex, name: string) => void;
  setCurrentHand: (hand: HandIndex) => void;
  updateScore: (
    hand: HandIndex,
    team: TeamIndex,
    patch: Partial<TeamHandScore>,
  ) => void;
  resetHand: (hand: HandIndex, team?: TeamIndex) => void;
  resetGame: () => void;
};

function touch(game: Game, patch: Partial<Game>): Game {
  return { ...game, ...patch, updatedAt: Date.now() };
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      _hasHydrated: false,
      games: [],
      activeGameId: null,
      setHydrated: () => set({ _hasHydrated: true }),
      newGame: (teamNames) => {
        const game = createGame(teamNames);
        set((s) => ({
          games: [game, ...s.games],
          activeGameId: game.id,
        }));
        return game.id;
      },
      setActive: (id) => set({ activeGameId: id }),
      deleteGame: (id) => {
        set((s) => {
          const games = s.games.filter((g) => g.id !== id);
          const activeGameId =
            s.activeGameId === id ? (games[0]?.id ?? null) : s.activeGameId;
          return { games, activeGameId };
        });
      },
      applyRemoteGame: (game) => {
        set((s) => {
          const exists = s.games.some((g) => g.id === game.id);
          const games = exists
            ? s.games.map((g) => (g.id === game.id ? game : g))
            : [game, ...s.games];
          return { games, activeGameId: game.id };
        });
      },
      renameTeam: (team, name) => {
        const { activeGameId } = get();
        const trimmed = name.trim().slice(0, 24) || (team === 0 ? "Team 1" : "Team 2");
        set((s) => ({
          games: s.games.map((g) => {
            if (g.id !== activeGameId) return g;
            const teamNames: [string, string] = [...g.teamNames];
            teamNames[team] = trimmed;
            return touch(g, { teamNames });
          }),
        }));
      },
      setCurrentHand: (hand) => {
        const { activeGameId } = get();
        set((s) => ({
          games: s.games.map((g) =>
            g.id === activeGameId ? touch(g, { currentHand: hand }) : g,
          ),
        }));
      },
      updateScore: (hand, team, patch) => {
        const { activeGameId } = get();
        set((s) => ({
          games: s.games.map((g) => {
            if (g.id !== activeGameId) return g;
            const scores = g.scores.map((pair, i) => {
              if (i !== hand) return pair;
              const next: [TeamHandScore, TeamHandScore] = [
                team === 0 ? { ...pair[0], ...patch } : pair[0],
                team === 1 ? { ...pair[1], ...patch } : pair[1],
              ];
              if (patch.goingOut === true) {
                const other: TeamIndex = team === 0 ? 1 : 0;
                next[other] = { ...next[other], goingOut: false };
              }
              return next;
            }) as Game["scores"];
            return touch(g, { scores });
          }),
        }));
      },
      resetHand: (hand, team) => {
        const { activeGameId } = get();
        set((s) => ({
          games: s.games.map((g) => {
            if (g.id !== activeGameId) return g;
            const scores = g.scores.map((pair, i) => {
              if (i !== hand) return pair;
              if (team === 0) return [emptyScore(), pair[1]] as typeof pair;
              if (team === 1) return [pair[0], emptyScore()] as typeof pair;
              return [emptyScore(), emptyScore()] as typeof pair;
            }) as Game["scores"];
            return touch(g, { scores });
          }),
        }));
      },
      resetGame: () => {
        const { activeGameId } = get();
        set((s) => ({
          games: s.games.map((g) => {
            if (g.id !== activeGameId) return g;
            return touch(g, {
              scores: [
                [emptyScore(), emptyScore()],
                [emptyScore(), emptyScore()],
                [emptyScore(), emptyScore()],
                [emptyScore(), emptyScore()],
              ],
              currentHand: 0,
            });
          }),
        }));
      },
    }),
    {
      name: "hand-foot-score",
      version: 1,
      partialize: (s) => ({ games: s.games, activeGameId: s.activeGameId }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);

export function useActiveGame(): Game | null {
  return useGameStore((s) => {
    if (!s.activeGameId) return null;
    return s.games.find((g) => g.id === s.activeGameId) ?? null;
  });
}
