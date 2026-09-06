import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Share2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  CARD_VALUES,
  HANDS,
  POINTS,
  formatPts,
  gameSummary,
  runningTotal,
  winnerOf,
  type Game,
} from "@/lib/scoring";
import { useGameStore } from "@/lib/store";
import { TeamMark } from "./Suits";
import { cn } from "@/lib/utils";

export function RulesDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Score sheet key</DrawerTitle>
          <DrawerDescription>
            5-deck Hand & Foot — matches the paper sheet. Going out is the last act of
            a hand; only one team can submit it.
          </DrawerDescription>
        </DrawerHeader>
        <DrawerBody className="space-y-6">
          <section>
            <h3 className="text-xs font-medium tracking-wide text-paper-muted uppercase">
              Hands
            </h3>
            <ul className="mt-2 divide-y divide-paper-line">
              {HANDS.map((h) => (
                <li key={h.index} className="flex items-baseline justify-between py-2 text-sm">
                  <span className="font-medium">{h.label}</span>
                  <span className="text-paper-muted">
                    Open {h.open} · Out {h.goingOut} · {h.cleanNeed}+{h.dirtyNeed} books · deal{" "}
                    {h.perfectDrawCards}
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h3 className="text-xs font-medium tracking-wide text-paper-muted uppercase">
              Bonuses
            </h3>
            <ul className="mt-2 space-y-1.5 text-sm">
              <li className="flex justify-between">
                <span>Perfect Draw</span>
                <span className="tabular-nums">{POINTS.perfectDraw}</span>
              </li>
              <li className="flex justify-between">
                <span>Clean Book</span>
                <span className="tabular-nums">{POINTS.cleanBook}</span>
              </li>
              <li className="flex justify-between">
                <span>Dirty Book</span>
                <span className="tabular-nums">{POINTS.dirtyBook}</span>
              </li>
              <li className="flex justify-between">
                <span>Book of 7's</span>
                <span className="tabular-nums">{POINTS.bookOf7s}</span>
              </li>
              <li className="flex justify-between">
                <span>Book of Black 3's</span>
                <span className="tabular-nums">{POINTS.bookOfBlack3s}</span>
              </li>
            </ul>
          </section>
          <section>
            <h3 className="text-xs font-medium tracking-wide text-paper-muted uppercase">
              Card values
            </h3>
            <p className="mt-1 text-sm text-paper-muted">Wilds are Jokers and 2s.</p>
            <ul className="mt-2 space-y-1.5 text-sm">
              {CARD_VALUES.map((c) => (
                <li key={c.id} className="flex justify-between">
                  <span>{c.label}</span>
                  <span className="tabular-nums">{formatPts(c.pts)}</span>
                </li>
              ))}
            </ul>
          </section>
        </DrawerBody>
        <DrawerFooter>
          <Button variant="paperGhost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

export function GamesDrawer({
  open,
  onOpenChange,
  onNewGame,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNewGame: () => void;
}) {
  const games = useGameStore((s) => s.games);
  const activeId = useGameStore((s) => s.activeGameId);
  const setActive = useGameStore((s) => s.setActive);
  const deleteGame = useGameStore((s) => s.deleteGame);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  async function share(game: Game) {
    const text = gameSummary(game);
    try {
      if (navigator.share) {
        await navigator.share({ title: "Hand & Foot Score", text });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success("Score copied");
      }
    } catch {
      try {
        await navigator.clipboard.writeText(text);
        toast.success("Score copied");
      } catch {
        toast.error("Could not share");
      }
    }
  }

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Games</DrawerTitle>
            <DrawerDescription>Saved on this device.</DrawerDescription>
          </DrawerHeader>
          <DrawerBody className="space-y-2">
            {games.length === 0 ? (
              <p className="py-8 text-center text-sm text-paper-muted">No games yet.</p>
            ) : (
              games.map((game) => {
                const t0 = runningTotal(game, 0);
                const t1 = runningTotal(game, 1);
                const win = winnerOf(game);
                const active = game.id === activeId;
                return (
                  <div
                    key={game.id}
                    className={cn(
                      "rounded-lg border p-3",
                      active ? "border-primary bg-paper-inset" : "border-paper-line",
                    )}
                  >
                    <button
                      type="button"
                      className="w-full text-left"
                      onClick={() => {
                        setActive(game.id);
                        onOpenChange(false);
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-paper-muted">
                          {format(game.updatedAt, "MMM d · h:mm a")}
                        </p>
                        {win !== null ? (
                          <p className="text-xs font-medium">
                            {game.teamNames[win]} ahead
                          </p>
                        ) : t0 || t1 ? (
                          <p className="text-xs text-paper-muted">Tied</p>
                        ) : null}
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-3">
                        <ScoreChip team={0} name={game.teamNames[0]} pts={t0} lead={win === 0} />
                        <ScoreChip team={1} name={game.teamNames[1]} pts={t1} lead={win === 1} />
                      </div>
                    </button>
                    <div className="mt-2 flex justify-end gap-1">
                      <Button
                        variant="paperGhost"
                        size="iconSm"
                        aria-label="Share game"
                        onClick={() => void share(game)}
                      >
                        <Share2 />
                      </Button>
                      <Button
                        variant="paperGhost"
                        size="iconSm"
                        aria-label="Delete game"
                        onClick={() => setPendingDelete(game.id)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </DrawerBody>
          <DrawerFooter>
            <Button size="lg" onClick={onNewGame}>
              New game
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Dialog open={pendingDelete !== null} onOpenChange={() => setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this game?</DialogTitle>
            <DialogDescription>This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="paperGhost" onClick={() => setPendingDelete(null)}>
              Keep
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (pendingDelete) deleteGame(pendingDelete);
                setPendingDelete(null);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ScoreChip({
  team,
  name,
  pts,
  lead,
}: {
  team: 0 | 1;
  name: string;
  pts: number;
  lead: boolean;
}) {
  return (
    <div>
      <p className="flex items-center gap-1 text-xs text-paper-muted">
        <TeamMark team={team} />
        {name}
      </p>
      <p
        className={cn(
          "font-display text-xl tabular-nums",
          lead ? "text-paper-fg" : "text-paper-muted",
        )}
      >
        {formatPts(pts)}
      </p>
    </div>
  );
}

export function SetupDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (names: [string, string]) => void;
}) {
  const [a, setA] = useState("Team 1");
  const [b, setB] = useState("Team 2");

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setA("Team 1");
          setB("Team 2");
        }
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New game</DialogTitle>
          <DialogDescription>Two partnerships. Names stay on this device.</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            onCreate([a, b]);
          }}
        >
          <label className="grid gap-1.5">
            <span className="flex items-center gap-1.5 text-sm font-medium">
              <TeamMark team={0} /> Team 1
            </span>
            <Input
              value={a}
              onChange={(e) => setA(e.target.value)}
              maxLength={24}
              autoComplete="off"
            />
          </label>
          <label className="grid gap-1.5">
            <span className="flex items-center gap-1.5 text-sm font-medium">
              <TeamMark team={1} /> Team 2
            </span>
            <Input
              value={b}
              onChange={(e) => setB(e.target.value)}
              maxLength={24}
              autoComplete="off"
            />
          </label>
          <DialogFooter className="mt-2">
            <Button type="submit" size="lg" className="w-full sm:w-auto">
              Deal
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RenameDialog({
  open,
  team,
  current,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  team: 0 | 1 | null;
  current: string;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState(current);
  useEffect(() => {
    if (open) setName(current);
  }, [open, current]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {team !== null ? <TeamMark team={team} className="size-4" /> : null}
            Rename team
          </DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            onSave(name);
          }}
        >
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={24}
            autoFocus
          />
          <DialogFooter>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
