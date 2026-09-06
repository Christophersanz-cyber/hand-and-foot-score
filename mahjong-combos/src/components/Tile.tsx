import { type TileCode, tileMeta } from "../lib/tiles";

const GROUP_STYLES: Record<string, string> = {
  bam: "bg-emerald-50 text-emerald-800 border-emerald-300",
  crack: "bg-rose-50 text-rose-800 border-rose-300",
  dot: "bg-sky-50 text-sky-800 border-sky-300",
  wind: "bg-slate-100 text-slate-800 border-slate-300",
  dragon: "bg-amber-50 text-amber-800 border-amber-300",
  flower: "bg-fuchsia-50 text-fuchsia-800 border-fuchsia-300",
  joker: "bg-violet-100 text-violet-800 border-violet-400",
};

interface TileProps {
  code: TileCode;
  size?: "sm" | "md";
  faded?: boolean;
  exposed?: boolean;
  onClick?: () => void;
  title?: string;
}

export function Tile({ code, size = "md", faded = false, exposed = false, onClick, title }: TileProps) {
  const meta = tileMeta(code);
  const groupStyle = meta ? GROUP_STYLES[meta.group] : "bg-white text-slate-700 border-slate-300";
  const dims = size === "sm" ? "h-9 min-w-8 w-8 text-xs" : "h-12 min-w-11 w-11 text-sm sm:h-12 sm:w-10";

  const content = (
    <div
      className={`relative flex flex-col items-center justify-center rounded-md border font-semibold shadow-sm ${dims} ${groupStyle} ${
        faded ? "opacity-40" : ""
      } ${exposed ? "ring-2 ring-amber-400 ring-offset-1" : ""}`}
    >
      <span className="leading-none">{meta?.label ?? code}</span>
      {exposed && (
        <span className="absolute -bottom-1 rounded bg-amber-400 px-0.5 text-[8px] font-bold leading-none text-amber-950">
          EXP
        </span>
      )}
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={title ?? meta?.name ?? code}
        className="min-h-11 min-w-11 rounded-md transition-transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
      >
        {content}
      </button>
    );
  }
  return (
    <div title={title ?? meta?.name ?? code} className="cursor-default">
      {content}
    </div>
  );
}
