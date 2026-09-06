import { useEffect, useMemo, useState } from "react";

import type { YearCard } from "../data/cards/types";
import { emptyHandDraft, parseYearCard, serializeYearCard } from "../lib/card-schema";
import { patternTileCount } from "../lib/patterns";
import { HandEditor } from "./HandEditor";

type Tab = "cards" | "json" | "form";

interface CardManagerProps {
  open: boolean;
  onClose: () => void;
  bundled: YearCard[];
  userCards: YearCard[];
  activeId: string;
  onSelect: (id: string) => void;
  onSaveUserCard: (card: YearCard) => void;
  onDeleteUserCard: (id: string) => void;
}

export function CardManager({
  open,
  onClose,
  bundled,
  userCards,
  activeId,
  onSelect,
  onSaveUserCard,
  onDeleteUserCard,
}: CardManagerProps) {
  const [tab, setTab] = useState<Tab>("cards");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button type="button" className="absolute inset-0 bg-slate-900/40" aria-label="Close card manager" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="card-manager-title"
        className="relative flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
      >
        <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 id="card-manager-title" className="text-base font-semibold text-slate-900">
            Year cards
          </h2>
          <button type="button" onClick={onClose} className="min-h-11 px-2 text-sm font-medium text-slate-500">
            Done
          </button>
        </header>
        <nav className="flex border-b border-slate-200">
          {(
            [
              ["cards", "My cards"],
              ["json", "JSON import"],
              ["form", "Guided entry"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`min-h-12 flex-1 text-sm font-medium ${
                tab === id ? "border-b-2 border-indigo-600 text-indigo-700" : "text-slate-500"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="flex-1 overflow-y-auto p-4">
          {tab === "cards" && (
            <CardsTab
              bundled={bundled}
              userCards={userCards}
              activeId={activeId}
              onSelect={onSelect}
              onDelete={onDeleteUserCard}
            />
          )}
          {tab === "json" && <JsonTab onImport={onSaveUserCard} />}
          {tab === "form" && <FormTab onSave={onSaveUserCard} />}
        </div>
      </div>
    </div>
  );
}

function CardsTab({
  bundled,
  userCards,
  activeId,
  onSelect,
  onDelete,
}: {
  bundled: YearCard[];
  userCards: YearCard[];
  activeId: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-500">
        Official NMJL cards are copyrighted and are not shipped with the app. Import or type the hands from a
        card you own. The bundled year is a generic demo set.
      </p>
      <CardGroup title="Your cards" cards={userCards} activeId={activeId} onSelect={onSelect} onDelete={onDelete} />
      <CardGroup title="Bundled demo" cards={bundled} activeId={activeId} onSelect={onSelect} />
    </div>
  );
}

function CardGroup({
  title,
  cards,
  activeId,
  onSelect,
  onDelete,
}: {
  title: string;
  cards: YearCard[];
  activeId: string;
  onSelect: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  if (cards.length === 0) {
    return (
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
        <p className="text-sm text-slate-400">None yet.</p>
      </section>
    );
  }
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      <ul className="space-y-2">
        {cards.map((card) => (
          <li key={card.id} className="rounded-xl border border-slate-200 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-medium text-slate-800">
                  {card.year} — {card.title}
                </div>
                <div className="text-xs text-slate-500">{card.hands.length} hands</div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onSelect(card.id)}
                  className={`min-h-11 rounded-lg px-3 text-sm font-medium ${
                    activeId === card.id ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {activeId === card.id ? "Active" : "Use"}
                </button>
                {onDelete && (
                  <button type="button" onClick={() => onDelete(card.id)} className="min-h-11 text-sm text-rose-600">
                    Delete
                  </button>
                )}
              </div>
            </div>
            {card.source === "user" && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-indigo-700">Export JSON</summary>
                <textarea
                  readOnly
                  value={serializeYearCard(card)}
                  className="mt-2 h-32 w-full rounded-lg border border-slate-200 bg-slate-50 p-2 font-mono text-xs"
                />
              </details>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function JsonTab({ onImport }: { onImport: (card: YearCard) => void }) {
  const [text, setText] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const parsed = useMemo(() => (text.trim() ? parseYearCard(text, year) : null), [text, year]);

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">
        Paste a card JSON you transcribed, or start from{" "}
        <a href="/example-card.json" download className="font-medium text-indigo-700 underline">
          example-card.json
        </a>
        . Hands must total 14 tiles. Jokers default on for Pungs/Kongs/Quints only.
      </p>
      <label className="block text-xs font-medium text-slate-600">
        Fallback year (used if the JSON is a bare hands array)
        <input
          type="number"
          min={1900}
          max={2100}
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-2 text-sm"
        />
      </label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder='{ "year": 2026, "title": "My card", "hands": [ ... ] }'
        className="h-56 w-full rounded-lg border border-slate-300 p-3 font-mono text-xs"
      />
      {parsed && !parsed.ok && (
        <ul className="space-y-1 rounded-lg bg-rose-50 p-3 text-xs text-rose-800">
          {parsed.issues.map((i, idx) => (
            <li key={idx}>
              {i.path ? `${i.path}: ` : ""}
              {i.message}
            </li>
          ))}
        </ul>
      )}
      {parsed?.ok && (
        <p className="text-sm text-emerald-700">
          Ready: {parsed.card.year} — {parsed.card.title} ({parsed.card.hands.length} hands)
        </p>
      )}
      <button
        type="button"
        disabled={!parsed?.ok}
        onClick={() => {
          if (parsed?.ok) {
            onImport(parsed.card);
            setText("");
          }
        }}
        className="min-h-12 w-full rounded-lg bg-indigo-600 text-sm font-semibold text-white disabled:bg-slate-300"
      >
        Import card
      </button>
    </div>
  );
}

function FormTab({ onSave }: { onSave: (card: YearCard) => void }) {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [title, setTitle] = useState(`${thisYear} card`);
  const [hands, setHands] = useState(() => [emptyHandDraft("like-numbers")]);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Type hands from the printed card you own. Use suit variables S1/S2/S3 and optional N so one entry
        covers every suit/number the card allows.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs font-medium text-slate-600">
          Year
          <input
            type="number"
            min={1900}
            max={2100}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-2 text-sm"
          />
        </label>
        <label className="text-xs font-medium text-slate-600">
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-2 text-sm"
          />
        </label>
      </div>
      {hands.map((hand, i) => (
        <HandEditor
          key={hand.id}
          hand={hand}
          onChange={(next) => setHands((hs) => hs.map((h, j) => (j === i ? next : h)))}
          onRemove={hands.length > 1 ? () => setHands((hs) => hs.filter((_, j) => j !== i)) : undefined}
        />
      ))}
      <button
        type="button"
        onClick={() => setHands((hs) => [...hs, emptyHandDraft("other")])}
        className="min-h-11 text-sm font-medium text-indigo-700"
      >
        + Add another hand
      </button>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <button
        type="button"
        onClick={() => {
          const incomplete = hands.find((h) => patternTileCount(h) !== 14 || !h.name.trim());
          if (incomplete) {
            setError("Every hand needs a name and exactly 14 tiles.");
            return;
          }
          const result = parseYearCard({ year, title, hands });
          if (!result.ok) {
            setError(result.issues.map((i) => i.message).join(" · "));
            return;
          }
          onSave(result.card);
          setError(null);
        }}
        className="min-h-12 w-full rounded-lg bg-indigo-600 text-sm font-semibold text-white"
      >
        Save card
      </button>
    </div>
  );
}
