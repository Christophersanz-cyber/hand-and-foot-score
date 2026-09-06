import type { YearCard } from "../data/cards/types";

interface YearSelectProps {
  cards: YearCard[];
  activeId: string;
  onChange: (id: string) => void;
}

export function YearSelect({ cards, activeId, onChange }: YearSelectProps) {
  return (
    <label className="flex min-h-11 items-center gap-2 text-sm">
      <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-500">Card</span>
      <select
        value={activeId}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-11 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-800 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
      >
        {cards.map((card) => (
          <option key={card.id} value={card.id}>
            {card.year} — {card.title}
            {card.source === "bundled" ? " (demo)" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
