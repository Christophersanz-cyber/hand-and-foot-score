import { useCallback, useEffect, useState } from "react";
import {
  BookOpen,
  ClipboardList,
  History,
  LogIn,
  PenLine,
  Pencil,
  RotateCcw,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GamesDrawer, RenameDialog, RulesDrawer, SetupDialog } from "./Drawers";
import { HandRequirements, PlayPanel } from "./PlayPanel";
import { SheetPanel } from "./SheetPanel";
import { SuitRow, TeamMark } from "./Suits";
import { InviteDialog, JoinDialog, JoiningScreen, LiveBadge } from "./Live";
import {
  HANDS,
  formatPts,
  goOutTeam,
  isHandPlayed,
  playedHandCount,
  runningTotal,
  winnerOf,
  type HandIndex,
  type TeamIndex,
} from "@/lib/scoring";
import { useActiveGame, useGameStore } from "@/lib/store";
import { liveSession } from "@/lib/multiplayer/session";
import { cn } from "@/lib/utils";
import { InstallHint } from "@/components/pwa/InstallHint";

type View = "play" | "sheet";

export function ScoreApp() {
  const game = useActiveGame();
  const games = useGameStore((s) => s.games);
  const setHydrated = useGameStore((s) => s.setHydrated);
  const setActive = useGameStore((s) => s.setActive);
  const [joiningRoom, setJoiningRoom] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => {
      if (!useGameStore.getState()._hasHydrated) setHydrated();
    }, 600);
    return () => window.clearTimeout(t);
  }, [setHydrated]);

  const startJoin = useCallback(
    (roomId: string) => {
      const existing = useGameStore.getState().games.find((g) => g.id === roomId);
      if (existing) {
        setActive(roomId);
        liveSession.start(roomId);
        setJoiningRoom(null);
      } else {
        setJoiningRoom(roomId);
        liveSession.start(roomId);
      }
    },
    [setActive],
  );

  // A `?join=<roomId>` link (auto)joins the shared game, then drops the param.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get("join");
    if (!room) return;
    params.delete("join");
    const qs = params.toString();
    window.history.replaceState(null, "", window.location.pathname + (qs ? `?${qs}` : ""));
    startJoin(room);
  }, [startJoin]);

  // Once the joined game's state arrives, leave the connecting screen.
  useEffect(() => {
    if (joiningRoom && games.some((g) => g.id === joiningRoom)) setJoiningRoom(null);
  }, [joiningRoom, games]);

  if (joiningRoom && !game) {
    return (
      <JoiningScreen
        onCancel={() => {
          liveSession.stop();
          setJoiningRoom(null);
        }}
      />
    );
  }

  if (!game) {
    return <Home gamesCount={games.length} onJoin={startJoin} />;
  }

  return <Board />;
}

function Home({ gamesCount, onJoin }: { gamesCount: number; onJoin: (roomId: string) => void }) {
  const newGame = useGameStore((s) => s.newGame);
  const [setup, setSetup] = useState(false);
  const [gamesOpen, setGamesOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col items-stretch justify-center px-5 py-10 safe-top pb-24">
      <header className="flex flex-col items-center text-center">
        <SuitRow className="mb-6" />
        <p className="text-xs font-medium tracking-[0.22em] text-felt-muted uppercase">
          5-deck scorekeeper
        </p>
        <h1 className="mt-2 font-display text-5xl font-semibold tracking-tight text-felt-fg">
          Hand & Foot
        </h1>
        <p className="mt-4 max-w-sm text-pretty text-felt-muted">
          Four hands. Two teams. Books, going out, and card counts — the paper
          sheet, without the pencil.
        </p>
        <div className="relative mt-10 h-24 w-20" aria-hidden>
          <div className="absolute inset-0 rotate-[-10deg] rounded-lg bg-paper-deep shadow-paper" />
          <div className="absolute inset-0 rotate-[7deg] rounded-lg border border-paper-line bg-paper shadow-paper" />
        </div>
      </header>
      <div className="mt-10 flex flex-col gap-3">
        <Button size="lg" variant="cream" className="w-full" onClick={() => setSetup(true)}>
          New game
        </Button>
        {gamesCount > 0 ? (
          <Button variant="outline" className="w-full" onClick={() => setGamesOpen(true)}>
            Resume a game
          </Button>
        ) : null}
        <Button variant="ghost" className="w-full" onClick={() => setJoinOpen(true)}>
          <LogIn className="size-4" /> Join a game
        </Button>
      </div>
      <JoinDialog
        open={joinOpen}
        onOpenChange={setJoinOpen}
        onJoin={(roomId) => {
          setJoinOpen(false);
          onJoin(roomId);
        }}
      />
      <SetupDialog
        open={setup}
        onOpenChange={setSetup}
        onCreate={(names) => {
          newGame(names);
          setSetup(false);
        }}
      />
      <GamesDrawer
        open={gamesOpen}
        onOpenChange={setGamesOpen}
        onNewGame={() => {
          setGamesOpen(false);
          setSetup(true);
        }}
      />
      <InstallHint />
    </div>
  );
}

function Board() {
  const game = useActiveGame();
  const setCurrentHand = useGameStore((s) => s.setCurrentHand);
  const updateScore = useGameStore((s) => s.updateScore);
  const resetHand = useGameStore((s) => s.resetHand);
  const resetGame = useGameStore((s) => s.resetGame);
  const renameTeam = useGameStore((s) => s.renameTeam);
  const newGame = useGameStore((s) => s.newGame);

  const [view, setView] = useState<View>("play");
  const [team, setTeam] = useState<TeamIndex>(0);
  const [rules, setRules] = useState(false);
  const [gamesOpen, setGamesOpen] = useState(false);
  const [setup, setSetup] = useState(false);
  const [rename, setRename] = useState<TeamIndex | null>(null);
  const [invite, setInvite] = useState(false);

  if (!game) return null;

  const active = game;
  const hand = HANDS[active.currentHand];
  const t0 = runningTotal(active, 0);
  const t1 = runningTotal(active, 1);
  const win = winnerOf(active);
  const fourthPlayed = isHandPlayed(active, 3);
  const played = playedHandCount(active);
  const outTeam = goOutTeam(active, active.currentHand);

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col pb-16">
      <header className="safe-top safe-x sticky top-0 z-20 bg-felt/95 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-2 pt-1 pb-2">
          <div className="flex min-w-0 items-center gap-2">
            <div className="min-w-0">
              <p className="text-xs font-medium tracking-[0.2em] text-felt-muted uppercase">
                Hand & Foot
              </p>
              <h1 className="font-display text-lg font-semibold tracking-tight text-felt-fg">
                Score
              </h1>
            </div>
            <LiveBadge roomId={active.id} />
          </div>
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="iconSm"
              aria-label="Invite to score together"
              onClick={() => setInvite(true)}
            >
              <Share2 />
            </Button>
            <Button
              variant="ghost"
              size="iconSm"
              aria-label={view === "play" ? "Full score sheet" : "Score this hand"}
              onClick={() => setView((v) => (v === "play" ? "sheet" : "play"))}
            >
              {view === "play" ? <ClipboardList /> : <PenLine />}
            </Button>
            <Button
              variant="ghost"
              size="iconSm"
              aria-label="Rules"
              onClick={() => setRules(true)}
            >
              <BookOpen />
            </Button>
            <Button
              variant="ghost"
              size="iconSm"
              aria-label="Games"
              onClick={() => setGamesOpen(true)}
            >
              <History />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pb-3">
          {([0, 1] as const).map((t) => {
            const lead = win === t && (t0 !== 0 || t1 !== 0);
            return (
              <div
                key={t}
                className={cn(
                  "rounded-md px-3 py-2",
                  lead ? "bg-felt-elev" : "bg-transparent",
                )}
              >
                <button
                  type="button"
                  onClick={() => setRename(t)}
                  className="flex items-center gap-1.5 text-xs text-felt-muted"
                >
                  <TeamMark
                    team={t}
                    className={t === 0 ? "text-suit-red" : "text-felt-fg"}
                  />
                  {game.teamNames[t]}
                  <Pencil className="size-3 opacity-50" />
                </button>
                <p className="font-display text-2xl tabular-nums tracking-tight text-felt-fg">
                  {formatPts(t === 0 ? t0 : t1)}
                </p>
              </div>
            );
          })}
        </div>

        {view === "play" ? (
          <>
            <div className="grid grid-cols-4 gap-1 pb-2">
              {HANDS.map((h) => {
                const active = game.currentHand === h.index;
                const playedThis = isHandPlayed(game, h.index);
                return (
                  <button
                    key={h.index}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setCurrentHand(h.index)}
                    className={cn(
                      "rounded-md px-1 py-2 text-center transition-[background-color,color] duration-quick",
                      active
                        ? "bg-paper text-paper-fg"
                        : "bg-felt-elev text-felt-muted hover:text-felt-fg",
                    )}
                  >
                    <span className="block text-xs font-medium">{h.short}</span>
                    <span
                      className={cn(
                        "mx-auto mt-1 block size-1 rounded-full",
                        playedThis ? "bg-current" : "bg-transparent",
                      )}
                    />
                  </button>
                );
              })}
            </div>
            <div className="pb-3">
              <HandRequirements hand={hand} />
            </div>
          </>
        ) : (
          <div className="pb-3">
            <p className="text-sm text-felt-muted">
              Full sheet · {played} of 4 hands scored
            </p>
          </div>
        )}
      </header>

      <main className="flex-1 px-4 pb-24">
        {outTeam !== null && view === "play" ? (
          <div className="mb-4 rounded-lg bg-felt-elev px-4 py-3 text-felt-fg">
            <p className="text-xs font-medium tracking-wide text-felt-muted uppercase">
              Last act · {hand.short} hand
            </p>
            <p className="font-display text-xl font-semibold">
              {game.teamNames[outTeam]} went out (+{formatPts(hand.goingOut)})
            </p>
            {hand.index < 3 ? (
              <button
                type="button"
                onClick={() => setCurrentHand((hand.index + 1) as HandIndex)}
                className="mt-2 inline-flex h-11 items-center text-sm font-medium text-felt-fg underline-offset-4 hover:underline"
              >
                Score the next hand
              </button>
            ) : null}
          </div>
        ) : null}

        {fourthPlayed ? (
          <div className="mb-4 rounded-lg bg-paper px-4 py-3 text-paper-fg shadow-paper">
            <p className="text-xs font-medium tracking-wide text-paper-muted uppercase">
              After 4th hand
            </p>
            <p className="font-display text-xl font-semibold">
              {win === null
                ? "Tied — extra hand if you like"
                : `${game.teamNames[win]} wins`}
            </p>
          </div>
        ) : null}

        {view === "play" ? (
          <>
            <div className="mb-3 grid grid-cols-2 gap-1 rounded-md bg-felt-elev p-1 md:hidden">
              {([0, 1] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTeam(t)}
                  className={cn(
                    "flex h-11 items-center justify-center gap-2 rounded-sm text-sm font-medium transition-colors duration-quick",
                    team === t
                      ? "bg-paper text-paper-fg"
                      : "text-felt-muted hover:text-felt-fg",
                  )}
                >
                  <TeamMark
                    team={t}
                    className={team === t ? undefined : "text-felt-muted"}
                  />
                  {game.teamNames[t]}
                </button>
              ))}
            </div>
            <div className="rounded-xl bg-paper p-4 text-paper-fg shadow-paper md:grid md:grid-cols-2 md:gap-8 md:p-6">
              <div className={cn(team === 0 ? "block" : "hidden", "md:block")}>
                <PlayPanel
                  game={game}
                  team={0}
                  onChange={(patch) => updateScore(game.currentHand, 0, patch)}
                  onReset={() => resetHand(game.currentHand, 0)}
                />
              </div>
              <div
                className={cn(
                  "md:border-l md:border-paper-line md:pl-8",
                  team === 1 ? "block" : "hidden",
                  "md:block",
                )}
              >
                <PlayPanel
                  game={game}
                  team={1}
                  onChange={(patch) => updateScore(game.currentHand, 1, patch)}
                  onReset={() => resetHand(game.currentHand, 1)}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-xl bg-paper p-3 text-paper-fg shadow-paper md:p-5">
            <SheetPanel game={game} />
          </div>
        )}

        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => {
              if (confirm("Clear every hand for both teams?")) resetGame();
            }}
            className="inline-flex h-11 items-center gap-1.5 px-3 text-sm text-felt-muted hover:text-felt-fg"
          >
            <RotateCcw className="size-3.5" />
            Reset game
          </button>
        </div>
      </main>

      <InviteDialog game={active} open={invite} onOpenChange={setInvite} />
      <RulesDrawer open={rules} onOpenChange={setRules} />
      <GamesDrawer
        open={gamesOpen}
        onOpenChange={setGamesOpen}
        onNewGame={() => {
          setGamesOpen(false);
          setSetup(true);
        }}
      />
      <SetupDialog
        open={setup}
        onOpenChange={setSetup}
        onCreate={(names) => {
          newGame(names);
          setSetup(false);
          setView("play");
          setTeam(0);
        }}
      />
      <RenameDialog
        open={rename !== null}
        team={rename}
        current={rename !== null ? game.teamNames[rename] : ""}
        onOpenChange={(o) => {
          if (!o) setRename(null);
        }}
        onSave={(name) => {
          if (rename !== null) renameTeam(rename, name);
          setRename(null);
        }}
      />
    </div>
  );
}
