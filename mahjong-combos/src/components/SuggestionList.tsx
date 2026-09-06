import { CARD_SECTION_NAME, type CardSectionId } from "../data/cards/types";
import type { Suggestion } from "../lib/suggest";
import { Tile } from "./Tile";

interface SuggestionListProps {
  suggestions: Suggestion[];
  handSize: number;
  showWallOdds: boolean;
}

function progressColor(matched: number, eligible: boolean): string {
  if (!eligible) return "bg-slate-300";
  if (matched >= 12) return "bg-emerald-500";
  if (matched >= 8) return "bg-amber-500";
  return "bg-slate-400";
}

function sectionOf(pattern: Suggestion["pattern"]): CardSectionId | undefined {
  if ("section" in pattern && typeof pattern.section === "string") {
    return pattern.section as CardSectionId;
  }
  return undefined;
}

export function SuggestionList({ suggestions, handSize, showWallOdds }: SuggestionListProps) {
  if (handSize === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-400">
        Add some tiles to see suggested winning hands ranked by how close you are.
      </p>
    );
  }

  return (
    <ol className="space-y-3">
      {suggestions.map(({ pattern, result }, idx) => {
        const section = sectionOf(pattern);
        return (
          <li
            key={pattern.id}
            className={`rounded-xl border bg-white p-4 shadow-sm ${
              result.eligible ? "border-slate-200" : "border-slate-200 bg-slate-50 opacity-80"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                    {idx + 1}
                  </span>
                  <h3 className="font-semibold text-slate-800">{pattern.name}</h3>
                  {pattern.concealed && (
                    <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-700">
                      Concealed
                    </span>
                  )}
                  {typeof pattern.value === "number" && (
                    <span className="text-xs font-medium text-slate-500">{pattern.value}</span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  <span className="font-medium text-slate-600">
                    {section ? CARD_SECTION_NAME[section] : pattern.category}
                  </span>
                  {pattern.description ? ` · ${pattern.description}` : ""}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-lg font-bold text-slate-800">{result.matched}/14</div>
                <div className="text-xs text-slate-500">
                  {result.tilesNeeded} tile{result.tilesNeeded === 1 ? "" : "s"} to go
                </div>
              </div>
            </div>

            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all ${progressColor(result.matched, result.eligible)}`}
                style={{ width: `${(result.matched / 14) * 100}%` }}
              />
            </div>

            {result.concealedConflict && (
              <p className="mt-2 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-800">
                Not eligible — this is a concealed hand and you already have an exposure.
              </p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
              {result.jokersUsed > 0 && (
                <span className="rounded bg-violet-100 px-2 py-0.5 font-medium text-violet-700">
                  {result.jokersUsed} joker{result.jokersUsed === 1 ? "" : "s"} used
                </span>
              )}
              <span>
                Best fit: <span className="font-medium text-slate-600">{result.binding}</span>
              </span>
              {showWallOdds && result.nextDrawOdds !== undefined && result.tilesNeeded > 0 && (
                <span>
                  Next-draw ~{" "}
                  <span className="font-medium text-slate-600">
                    {(result.nextDrawOdds * 100).toFixed(1)}%
                  </span>
                </span>
              )}
            </div>

            {result.needed.length > 0 && (
              <div className="mt-3">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Still need
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {result.needed.map((code, i) => {
                    const left = result.neededRemaining?.[i];
                    return (
                      <div key={`${code}-${i}`} className="flex flex-col items-center gap-0.5">
                        <Tile code={code} size="sm" faded={left === 0} />
                        {showWallOdds && left !== undefined && (
                          <span className={`text-[10px] ${left === 0 ? "text-rose-600" : "text-slate-400"}`}>
                            {left} left
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
