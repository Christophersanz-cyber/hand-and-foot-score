import type { TileCode } from "../lib/tiles";
import { Tile } from "./Tile";
import { TilePicker } from "./TilePicker";

interface DiscardRackProps {
  discards: TileCode[];
  onAdd: (code: TileCode) => void;
  onRemove: (index: number) => void;
  onClear: () => void;
  open: boolean;
  onToggle: () => void;
}

export function DiscardRack({ discards, onAdd, onRemove, onClear, open, onToggle }: DiscardRackProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex min-h-12 w-full items-center justify-between px-4 text-left text-sm font-semibold text-slate-700"
        aria-expanded={open}
      >
        <span>
          Discards / wall{" "}
          <span className="ml-1 font-normal text-slate-400">
            ({discards.length} seen · optional)
          </span>
        </span>
        <span className="text-slate-400">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <div className="space-y-3 border-t border-slate-100 px-4 pb-4 pt-3">
          <p className="text-xs text-slate-500">
            Track tiles already discarded (and optionally other seen tiles) to estimate remaining copies
            and next-draw odds. The wall model is 152 NMJL tiles.
          </p>
          {discards.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {discards.map((code, i) => (
                <Tile key={`${code}-${i}`} code={code} size="sm" onClick={() => onRemove(i)} title="Remove discard" />
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400">No discards recorded yet.</p>
          )}
          {discards.length > 0 && (
            <button type="button" onClick={onClear} className="text-xs font-medium text-slate-500 hover:text-rose-600">
              Clear discards
            </button>
          )}
          <TilePicker onAdd={onAdd} />
        </div>
      )}
    </div>
  );
}
