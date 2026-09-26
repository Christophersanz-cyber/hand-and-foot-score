import { useEffect, useMemo, useState } from "react";
import { Delete, Minus, Plus } from "lucide-react";
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
import { CARD_VALUES, formatPts, negativeLine, type CardValueId } from "@/lib/scoring";
import { cn } from "@/lib/utils";

type Mode = "number" | "cards";
type Field = "cardCount" | "negativePts";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  field: Field;
  initial: number;
  teamName: string;
  onApply: (value: number) => void;
};

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "±", "0", "⌫"] as const;

export function ScoreEntryDrawer({
  open,
  onOpenChange,
  field,
  initial,
  teamName,
  onApply,
}: Props) {
  const [mode, setMode] = useState<Mode>("number");
  const [buffer, setBuffer] = useState("0");
  const [counts, setCounts] = useState<Record<CardValueId, number>>({
    joker: 0,
    twoAce: 0,
    face: 0,
    low: 0,
    red3: 0,
  });

  useEffect(() => {
    if (!open) return;
    setMode("number");
    setBuffer(String(initial));
    setCounts({ joker: 0, twoAce: 0, face: 0, low: 0, red3: 0 });
  }, [open, initial]);

  const tallyTotal = useMemo(
    () => CARD_VALUES.reduce((sum, row) => sum + counts[row.id] * row.pts, 0),
    [counts],
  );

  const title = field === "cardCount" ? "Card Count" : "Negative Pts";

  function press(key: (typeof KEYS)[number]) {
    setBuffer((prev) => {
      if (key === "⌫") {
        const next = prev.length <= 1 || (prev.length === 2 && prev.startsWith("−")) ? "0" : prev.slice(0, -1);
        return next === "−" ? "0" : next;
      }
      if (key === "±") {
        if (prev === "0") return "0";
        return prev.startsWith("−") ? prev.slice(1) : `−${prev}`;
      }
      if (prev === "0") return key;
      if (prev === "−0") return `−${key}`;
      if (prev.replace("−", "").length >= 7) return prev;
      return prev + key;
    });
  }

  function parsedBuffer(): number {
    const n = Number(buffer.replace("−", "-"));
    return Number.isFinite(n) ? n : 0;
  }

  function applyNumber() {
    const parsed = parsedBuffer();
    onApply(field === "negativePts" ? negativeLine(parsed) : parsed);
    onOpenChange(false);
  }

  function applyTally(asNegative: boolean) {
    const signed = asNegative ? -Math.abs(tallyTotal) : tallyTotal;
    onApply(field === "negativePts" ? negativeLine(signed) : signed);
    onOpenChange(false);
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerDescription>
            {teamName}
            {field === "cardCount"
              ? " — melded cards on the table"
              : " — leftover cards and red 3s"}
          </DrawerDescription>
          <div className="mt-3 grid grid-cols-2 gap-1 rounded-md bg-paper-inset p-1">
            <button
              type="button"
              onClick={() => setMode("number")}
              className={cn(
                "h-10 rounded-sm text-sm font-medium transition-colors duration-quick",
                mode === "number" ? "bg-paper text-paper-fg shadow-sm" : "text-paper-muted",
              )}
            >
              Keypad
            </button>
            <button
              type="button"
              onClick={() => setMode("cards")}
              className={cn(
                "h-10 rounded-sm text-sm font-medium transition-colors duration-quick",
                mode === "cards" ? "bg-paper text-paper-fg shadow-sm" : "text-paper-muted",
              )}
            >
              Count cards
            </button>
          </div>
        </DrawerHeader>

        {mode === "number" ? (
          <>
            <DrawerBody>
              <p className="font-display text-5xl tabular-nums tracking-tight text-paper-fg">
                {buffer}
              </p>
              <div className="mt-5 grid grid-cols-3 gap-2">
                {KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => press(key)}
                    className="flex h-14 items-center justify-center rounded-md bg-paper-inset text-lg font-medium text-paper-fg transition-transform duration-quick ease-smooth active:scale-[0.96]"
                  >
                    {key === "⌫" ? <Delete className="size-5" /> : key}
                  </button>
                ))}
              </div>
            </DrawerBody>
            <DrawerFooter>
              <Button size="lg" onClick={applyNumber}>
                Set {title.toLowerCase()}
              </Button>
            </DrawerFooter>
          </>
        ) : (
          <>
            <DrawerBody className="flex flex-col gap-1">
              {CARD_VALUES.map((row) => (
                <div
                  key={row.id}
                  className="flex items-center gap-3 border-b border-paper-line py-3 last:border-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{row.label}</p>
                    <p className="text-sm text-paper-muted">{formatPts(row.pts)} pts</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label={`Decrease ${row.label}`}
                      disabled={counts[row.id] === 0}
                      onClick={() =>
                        setCounts((c) => ({ ...c, [row.id]: Math.max(0, c[row.id] - 1) }))
                      }
                      className="flex size-11 items-center justify-center rounded-full bg-paper-inset text-paper-fg disabled:opacity-30"
                    >
                      <Minus className="size-4" />
                    </button>
                    <span className="w-7 text-center text-lg tabular-nums">
                      {counts[row.id]}
                    </span>
                    <button
                      type="button"
                      aria-label={`Increase ${row.label}`}
                      onClick={() =>
                        setCounts((c) => ({ ...c, [row.id]: Math.min(20, c[row.id] + 1) }))
                      }
                      className="flex size-11 items-center justify-center rounded-full bg-primary text-primary-fg"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                </div>
              ))}
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-sm text-paper-muted">Tally</span>
                <span className="font-display text-3xl tabular-nums">
                  {formatPts(tallyTotal)}
                </span>
              </div>
            </DrawerBody>
            <DrawerFooter>
              {field === "negativePts" ? (
                <Button size="lg" onClick={() => applyTally(true)}>
                  Apply as negative
                </Button>
              ) : (
                <Button size="lg" onClick={() => applyTally(false)}>
                  Set card count
                </Button>
              )}
              {field === "cardCount" ? (
                <Button variant="paperGhost" onClick={() => applyTally(true)}>
                  Apply as negative instead
                </Button>
              ) : (
                <Button variant="paperGhost" onClick={() => applyTally(false)}>
                  Apply as written
                </Button>
              )}
            </DrawerFooter>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
