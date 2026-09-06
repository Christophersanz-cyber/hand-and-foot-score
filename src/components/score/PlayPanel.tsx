import { useState } from "react";
import { Calculator, Flag, Minus, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { TeamMark } from "./Suits";
import { ScoreEntryDrawer } from "./ScoreEntryDrawer";
import {
  BOOK_ROWS,
  HANDS,
  POINTS,
  formatPts,
  handTotal,
  meetsGoOut,
  runningTotal,
  subtotal,
  type BookKey,
  type Game,
  type HandDef,
  type TeamHandScore,
  type TeamIndex,
} from "@/lib/scoring";
import { cn } from "@/lib/utils";

type Props = {
  game: Game;
  team: TeamIndex;
  onChange: (patch: Partial<TeamHandScore>) => void;
  onReset: () => void;
};

export function PlayPanel({ game, team, onChange, onReset }: Props) {
  const hand = HANDS[game.currentHand];
  const score = game.scores[game.currentHand][team];
  const otherGoingOut = game.scores[game.currentHand][team === 0 ? 1 : 0].goingOut;
  const lines = {
    perfectDraw: score.perfectDraw ? POINTS.perfectDraw : 0,
  };
  const otherName = game.teamNames[team === 0 ? 1 : 0];
  const sub = subtotal(score, hand);
  const total = handTotal(score, hand);
  const running = runningTotal(game, team, game.currentHand);
  const ready = meetsGoOut(score, hand);
  const [entry, setEntry] = useState<null | "cardCount" | "negativePts">(null);

  return (
    <div className="flex flex-col">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <TeamMark team={team} className="size-4" />
          <h2 className="font-display text-2xl font-semibold tracking-tight text-paper-fg">
            {game.teamNames[team]}
          </h2>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex h-11 items-center gap-1.5 rounded-sm px-2 text-sm text-paper-muted transition-colors hover:text-paper-fg"
        >
          <RotateCcw className="size-3.5" />
          Clear
        </button>
      </div>

      <ToggleRow
        label="Perfect Draw"
        hint={`${hand.perfectDrawCards} cards dealt`}
        value={lines.perfectDraw}
        checked={score.perfectDraw}
        onCheckedChange={(v) => onChange({ perfectDraw: v })}
      />
      {BOOK_ROWS.map((row) => (
        <StepperRow
          key={row.key}
          label={row.label}
          hint={row.hint}
          ptsEach={row.pts}
          count={score[row.key]}
          onChange={(n) => onChange({ [row.key]: n } as Pick<TeamHandScore, BookKey>)}
        />
      ))}

      <NumberRow
        label="Negative Pts"
        hint="Leftover cards, red 3s"
        value={score.negativePts}
        onOpen={() => setEntry("negativePts")}
      />
      <NumberRow
        label="Card Count"
        hint="Melded cards on the table"
        value={score.cardCount}
        onOpen={() => setEntry("cardCount")}
      />

      <div className="mt-2 rounded-lg bg-paper-inset px-4 py-3">
        <div className="flex items-baseline justify-between text-sm text-paper-muted">
          <span>Subtotal</span>
          <span className="tabular-nums text-paper-fg">{formatPts(sub)}</span>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="font-medium">Hand total</span>
          <span className="font-display text-3xl tabular-nums tracking-tight">
            {formatPts(total)}
          </span>
        </div>
        <div className="mt-2 flex items-baseline justify-between border-t border-paper-line pt-2 text-sm">
          <span className="text-paper-muted">Game total through {hand.short}</span>
          <span className="font-medium tabular-nums">{formatPts(running)}</span>
        </div>
      </div>

      <div className="mt-4">
        {otherGoingOut ? (
          <p className="rounded-lg bg-paper-inset px-4 py-3 text-center text-sm text-paper-muted">
            {otherName} already submitted going out — last act of this hand.
          </p>
        ) : score.goingOut ? (
          <div className="rounded-lg bg-paper-inset px-4 py-3">
            <p className="flex items-center justify-center gap-2 font-medium text-paper-fg">
              <Flag className="size-4" />
              Went out · last act · +{formatPts(hand.goingOut)}
            </p>
            <p className="mt-1 text-center text-sm text-paper-muted">
              {score.goingOut && !ready
                ? `Books are short of ${hand.cleanNeed} clean & ${hand.dirtyNeed} dirty`
                : "This team closed the hand. Enter the other team's leftover cards, then move on."}
            </p>
            <button
              type="button"
              onClick={() => onChange({ goingOut: false })}
              className="mx-auto mt-2 block h-11 px-3 text-sm text-paper-muted hover:text-paper-fg"
            >
              Undo go out
            </button>
          </div>
        ) : (
          <div>
            <Button
              size="lg"
              className="w-full"
              disabled={!ready}
              onClick={() => onChange({ goingOut: true })}
            >
              <Flag className="size-4" />
              Submit — go out (+{formatPts(hand.goingOut)})
            </Button>
            <p className="mt-2 text-center text-sm text-paper-muted">
              {ready
                ? "Last act of the hand. Only one team can go out."
                : `Need ${hand.cleanNeed} clean & ${hand.dirtyNeed} dirty before you can go out`}
            </p>
          </div>
        )}
      </div>

      <ScoreEntryDrawer
        open={entry !== null}
        onOpenChange={(o) => {
          if (!o) setEntry(null);
        }}
        field={entry ?? "cardCount"}
        initial={entry === "negativePts" ? score.negativePts : score.cardCount}
        teamName={game.teamNames[team]}
        onApply={(value) => {
          if (entry === "negativePts") onChange({ negativePts: value });
          else onChange({ cardCount: value });
        }}
      />
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  value,
  checked,
  disabled,
  warn,
  onCheckedChange,
}: {
  label: string;
  hint: string;
  value: number;
  checked: boolean;
  disabled?: boolean;
  warn?: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  const id = label.replace(/\s+/g, "-").toLowerCase();
  return (
    <div className="flex items-center gap-3 border-b border-paper-line py-3">
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="font-medium">
          {label}
        </label>
        <p className={cn("text-sm", warn ? "text-destructive" : "text-paper-muted")}>{hint}</p>
      </div>
      <span
        className={cn(
          "w-16 text-right text-sm tabular-nums",
          checked ? "text-paper-fg" : "text-paper-muted",
        )}
      >
        {formatPts(value)}
      </span>
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}

function StepperRow({
  label,
  hint,
  ptsEach,
  count,
  onChange,
}: {
  label: string;
  hint: string;
  ptsEach: number;
  count: number;
  onChange: (n: number) => void;
}) {
  const pts = count * ptsEach;
  return (
    <div className="border-b border-paper-line py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">{label}</p>
          <p className="text-sm text-paper-muted">
            {formatPts(ptsEach)} each · {hint}
          </p>
        </div>
        <span
          className={cn(
            "pt-0.5 text-sm tabular-nums",
            pts ? "text-paper-fg" : "text-paper-muted",
          )}
        >
          {formatPts(pts)}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          disabled={count === 0}
          onClick={() => onChange(Math.max(0, count - 1))}
          className="flex size-11 items-center justify-center rounded-full bg-paper-inset text-paper-fg transition-transform duration-quick ease-smooth active:scale-[0.96] disabled:opacity-30"
        >
          <Minus className="size-4" />
        </button>
        <span className="w-8 text-center text-lg tabular-nums">{count}</span>
        <button
          type="button"
          aria-label={`Increase ${label}`}
          onClick={() => onChange(Math.min(12, count + 1))}
          className="flex size-11 items-center justify-center rounded-full bg-primary text-primary-fg transition-transform duration-quick ease-smooth active:scale-[0.96]"
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}

function NumberRow({
  label,
  hint,
  value,
  onOpen,
}: {
  label: string;
  hint: string;
  value: number;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 border-b border-paper-line py-3 text-left transition-colors hover:bg-paper-inset/50"
    >
      <div className="min-w-0 flex-1">
        <p className="font-medium">{label}</p>
        <p className="text-sm text-paper-muted">{hint}</p>
      </div>
      <span
        className={cn(
          "font-display text-2xl tabular-nums tracking-tight",
          value < 0 ? "text-destructive" : "text-paper-fg",
        )}
      >
        {formatPts(value)}
      </span>
      <Calculator className="size-4 text-paper-muted" />
    </button>
  );
}

export function HandRequirements({ hand }: { hand: HandDef }) {
  return (
    <p className="text-sm text-felt-muted">
      Open {hand.open}
      <span className="mx-2 text-felt-line">·</span>
      Out {hand.goingOut}
      <span className="mx-2 text-felt-line">·</span>
      {hand.cleanNeed} clean & {hand.dirtyNeed} dirty
    </p>
  );
}
