import { MAX_HAND_SIZE } from "../lib/hand";
import type { PlayerTile } from "../lib/session";
import { Tile } from "./Tile";

interface HandBarProps {
  tiles: PlayerTile[];
  onRemove: (index: number) => void;
  onToggleExposed: (index: number) => void;
  onClear: () => void;
}

export function HandBar({ tiles, onRemove, onToggleExposed, onClear }: HandBarProps) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-700">
          Your hand{" "}
          <span
            className={`ml-1 rounded-full px-2 py-0.5 text-xs font-medium ${
              tiles.length > MAX_HAND_SIZE ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"
            }`}
          >
            {tiles.length} / {MAX_HAND_SIZE}
          </span>
        </h2>
        {tiles.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="min-h-11 px-2 text-xs font-medium text-slate-500 hover:text-rose-600"
          >
            Clear all
          </button>
        )}
      </div>

      {tiles.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm text-slate-400">
          Tap tiles below to build your hand (up to {MAX_HAND_SIZE}).
        </p>
      ) : (
        <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white p-3">
          {tiles.map((tile, i) => (
            <div key={`${tile.code}-${i}`} className="flex flex-col items-center gap-1">
              <Tile
                code={tile.code}
                exposed={tile.exposed}
                onClick={() => onRemove(i)}
                title="Remove tile"
              />
              <button
                type="button"
                onClick={() => onToggleExposed(i)}
                className={`min-h-8 rounded px-1.5 text-[10px] font-semibold uppercase tracking-wide ${
                  tile.exposed
                    ? "bg-amber-100 text-amber-800"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {tile.exposed ? "Exposed" : "Conceal"}
              </button>
            </div>
          ))}
        </div>
      )}
      <p className="mt-1.5 text-xs text-slate-400">
        Tap a tile to remove it. Mark claimed Pungs/Kongs as Exposed — concealed card hands then drop off.
      </p>
    </div>
  );
}
