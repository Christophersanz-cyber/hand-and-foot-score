import { useEffect, useMemo, useState } from "react";

import { CardManager } from "./components/CardManager";
import { DiscardRack } from "./components/DiscardRack";
import { HandBar } from "./components/HandBar";
import { SuggestionList } from "./components/SuggestionList";
import { Tile } from "./components/Tile";
import { TilePicker } from "./components/TilePicker";
import { YearSelect } from "./components/YearSelect";
import { BUNDLED_CARDS, defaultCard, findCard, mergeCards } from "./data/cards";
import { CARD_SECTION_NAME, type CardSectionId } from "./data/cards/types";
import { MAX_HAND_SIZE } from "./lib/hand";
import {
  loadActiveCardId,
  loadUserCards,
  removeUserCard,
  saveActiveCardId,
  saveUserCards,
  upsertUserCard,
} from "./lib/card-store";
import {
  addDiscard,
  addRackTile,
  codesOf,
  exposuresOf,
  loadSession,
  removeDiscard,
  removeRackTile,
  saveSession,
  toggleExposed,
} from "./lib/session";
import { suggest } from "./lib/suggest";

const TOP_N = 8;

export default function App() {
  const [session, setSession] = useState(() => loadSession());
  const [userCards, setUserCards] = useState(() => loadUserCards());
  const [activeId, setActiveId] = useState(() => loadActiveCardId() ?? defaultCard(loadUserCards()).id);
  const [cardOpen, setCardOpen] = useState(false);
  const [discardsOpen, setDiscardsOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<"hand" | "discards">("hand");
  const [section, setSection] = useState<CardSectionId | "all">("all");

  const cards = useMemo(() => mergeCards(userCards), [userCards]);
  const active = findCard(activeId, userCards) ?? defaultCard(userCards);

  useEffect(() => {
    saveSession(session);
  }, [session]);

  useEffect(() => {
    saveUserCards(userCards);
  }, [userCards]);

  useEffect(() => {
    saveActiveCardId(activeId);
  }, [activeId]);

  useEffect(() => {
    if (!findCard(activeId, userCards)) {
      setActiveId(defaultCard(userCards).id);
    }
  }, [activeId, userCards]);

  const patterns = useMemo(() => {
    if (section === "all") return active.hands;
    return active.hands.filter((h) => h.section === section);
  }, [active, section]);

  const suggestions = useMemo(
    () =>
      suggest(codesOf(session.tiles), patterns, TOP_N, {
        exposures: exposuresOf(session.tiles),
        discards: session.discards,
        useWallOdds: session.discards.length > 0,
      }),
    [session.tiles, session.discards, patterns],
  );

  const sectionIds = useMemo(() => {
    const seen = new Set(active.hands.map((h) => h.section));
    return (Object.keys(CARD_SECTION_NAME) as CardSectionId[]).filter((id) => seen.has(id));
  }, [active]);

  const handFull = session.tiles.length >= MAX_HAND_SIZE;

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Mahjong Combos</h1>
              <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                American Mahjong (NMJL) — closest hands on this year's card.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCardOpen(true)}
              className="min-h-11 shrink-0 rounded-lg bg-indigo-600 px-3 text-sm font-semibold text-white"
            >
              Manage cards
            </button>
          </div>
          <YearSelect
            cards={cards}
            activeId={active.id}
            onChange={(id) => {
              setActiveId(id);
              setSection("all");
            }}
          />
          {active.source === "bundled" && (
            <p className="text-xs text-amber-800">
              Using demo shapes for {active.year} — not the official NMJL card. Import the card you own.
            </p>
          )}
          {session.tiles.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:hidden">
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {session.tiles.length}/14
              </span>
              {session.tiles.map((tile, i) => (
                <Tile
                  key={`${tile.code}-${i}`}
                  code={tile.code}
                  size="sm"
                  exposed={tile.exposed}
                  onClick={() => setSession((s) => ({ ...s, tiles: removeRackTile(s.tiles, i) }))}
                  title="Remove tile"
                />
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-6 px-4 py-5 pb-[max(2.5rem,env(safe-area-inset-bottom))] lg:grid-cols-2">
        <section className="order-2 space-y-4 lg:order-1">
          <HandBar
            tiles={session.tiles}
            onRemove={(i) => setSession((s) => ({ ...s, tiles: removeRackTile(s.tiles, i) }))}
            onToggleExposed={(i) => setSession((s) => ({ ...s, tiles: toggleExposed(s.tiles, i) }))}
            onClear={() => setSession((s) => ({ ...s, tiles: [] }))}
          />

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-700">Add tiles</h2>
              <div className="flex rounded-lg bg-slate-100 p-0.5">
                <button
                  type="button"
                  onClick={() => setPickerTarget("hand")}
                  className={`min-h-10 rounded-md px-3 text-xs font-semibold ${
                    pickerTarget === "hand" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"
                  }`}
                >
                  To hand
                </button>
                <button
                  type="button"
                  onClick={() => setPickerTarget("discards")}
                  className={`min-h-10 rounded-md px-3 text-xs font-semibold ${
                    pickerTarget === "discards" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"
                  }`}
                >
                  To discards
                </button>
              </div>
            </div>
            <TilePicker
              disabled={pickerTarget === "hand" && handFull}
              onAdd={(code) => {
                if (pickerTarget === "discards") {
                  setSession((s) => ({ ...s, discards: addDiscard(s.discards, code) }));
                  setDiscardsOpen(true);
                  return;
                }
                setSession((s) => ({ ...s, tiles: addRackTile(s.tiles, code) }));
              }}
            />
          </div>

          <DiscardRack
            discards={session.discards}
            open={discardsOpen}
            onToggle={() => setDiscardsOpen((o) => !o)}
            onAdd={(code) => setSession((s) => ({ ...s, discards: addDiscard(s.discards, code) }))}
            onRemove={(i) => setSession((s) => ({ ...s, discards: removeDiscard(s.discards, i) }))}
            onClear={() => setSession((s) => ({ ...s, discards: [] }))}
          />
        </section>

        <section className="order-1 lg:order-2">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-700">
              Suggested combinations
              <span className="ml-2 font-normal text-slate-400">
                (top {Math.min(TOP_N, patterns.length)} of {patterns.length})
              </span>
            </h2>
          </div>
          <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1">
            <FilterChip label="All" active={section === "all"} onClick={() => setSection("all")} />
            {sectionIds.map((id) => (
              <FilterChip
                key={id}
                label={CARD_SECTION_NAME[id]}
                active={section === id}
                onClick={() => setSection(id)}
              />
            ))}
          </div>
          <SuggestionList
            suggestions={suggestions}
            handSize={session.tiles.length}
            showWallOdds={session.discards.length > 0}
          />
        </section>
      </main>

      <footer className="mx-auto max-w-5xl px-4 pb-[max(2.5rem,env(safe-area-inset-bottom))] text-xs text-slate-400">
        Demo hands are generic shapes, not a copy of the copyrighted NMJL card. Import the yearly card you
        legally own — it stays on this device in localStorage.
      </footer>

      <CardManager
        open={cardOpen}
        onClose={() => setCardOpen(false)}
        bundled={BUNDLED_CARDS}
        userCards={userCards}
        activeId={active.id}
        onSelect={(id) => {
          setActiveId(id);
          setSection("all");
          setCardOpen(false);
        }}
        onSaveUserCard={(card) => {
          setUserCards((cs) => upsertUserCard(cs, card));
          setActiveId(card.id);
          setSection("all");
          setCardOpen(false);
        }}
        onDeleteUserCard={(id) => {
          setUserCards((cs) => {
            const next = removeUserCard(cs, id);
            if (activeId === id) setActiveId(defaultCard(next).id);
            return next;
          });
        }}
      />
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-10 shrink-0 rounded-full px-3 text-xs font-semibold ${
        active ? "bg-indigo-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"
      }`}
    >
      {label}
    </button>
  );
}
