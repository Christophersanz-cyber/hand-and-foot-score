import { CARD_SECTIONS, type CardHand, type CardSectionId } from "../data/cards/types";
import {
  type Block,
  type BlockCount,
  type SuitVar,
  type TileSpec,
  defaultJokerable,
  patternTileCount,
} from "../lib/patterns";
import type { Dragon, Wind } from "../lib/tiles";

interface HandEditorProps {
  hand: CardHand;
  onChange: (hand: CardHand) => void;
  onRemove?: () => void;
}

const COUNTS: { value: BlockCount; label: string }[] = [
  { value: 1, label: "Single" },
  { value: 2, label: "Pair" },
  { value: 3, label: "Pung" },
  { value: 4, label: "Kong" },
  { value: 5, label: "Quint" },
];

const KINDS = [
  { value: "num", label: "Number" },
  { value: "wind", label: "Wind" },
  { value: "dragon", label: "Dragon" },
  { value: "dragonOfSuit", label: "Suit dragon" },
  { value: "flower", label: "Flower" },
] as const;

function newSpec(kind: TileSpec["kind"]): TileSpec {
  switch (kind) {
    case "num":
      return { kind: "num", suit: "S1", offset: 0 };
    case "wind":
      return { kind: "wind", wind: "north" };
    case "dragon":
      return { kind: "dragon", dragon: "red" };
    case "dragonOfSuit":
      return { kind: "dragonOfSuit", suit: "S1" };
    case "flower":
      return { kind: "flower" };
  }
}

function setBlock(hand: CardHand, index: number, block: Block): CardHand {
  const blocks = hand.blocks.map((b, i) => (i === index ? block : b));
  return { ...hand, blocks };
}

export function HandEditor({ hand, onChange, onRemove }: HandEditorProps) {
  const tiles = patternTileCount(hand);

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-start justify-between gap-2">
        <label className="block min-w-0 flex-1 text-xs font-medium text-slate-600">
          Name
          <input
            value={hand.name}
            onChange={(e) => onChange({ ...hand, name: e.target.value })}
            className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm"
          />
        </label>
        {onRemove && (
          <button type="button" onClick={onRemove} className="min-h-11 text-xs font-medium text-rose-600">
            Remove
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <label className="text-xs font-medium text-slate-600">
          Section
          <select
            value={hand.section}
            onChange={(e) => {
              const section = e.target.value as CardSectionId;
              onChange({ ...hand, section, category: section });
            }}
            className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm"
          >
            {CARD_SECTIONS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-slate-600">
          Suits
          <select
            value={hand.suitVarCount}
            onChange={(e) => onChange({ ...hand, suitVarCount: Number(e.target.value) as 0 | 1 | 2 | 3 })}
            className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm"
          >
            <option value={0}>Fixed (0)</option>
            <option value={1}>1 suit</option>
            <option value={2}>2 suits</option>
            <option value={3}>3 suits</option>
          </select>
        </label>
        <label className="flex min-h-11 items-end gap-2 text-xs font-medium text-slate-600">
          <input
            type="checkbox"
            checked={hand.usesNumberVar}
            onChange={(e) => onChange({ ...hand, usesNumberVar: e.target.checked })}
          />
          Uses N (1–9)
        </label>
        <label className="flex min-h-11 items-end gap-2 text-xs font-medium text-slate-600">
          <input
            type="checkbox"
            checked={hand.concealed}
            onChange={(e) => onChange({ ...hand, concealed: e.target.checked })}
          />
          Concealed
        </label>
      </div>

      <label className="block text-xs font-medium text-slate-600">
        Description
        <input
          value={hand.description}
          onChange={(e) => onChange({ ...hand, description: e.target.value })}
          className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm"
        />
      </label>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Blocks</span>
          <span className={`text-xs font-medium ${tiles === 14 ? "text-emerald-700" : "text-rose-600"}`}>
            {tiles} / 14 tiles
          </span>
        </div>
        {hand.blocks.map((block, i) => (
          <BlockRow
            key={i}
            block={block}
            onChange={(next) => onChange(setBlock(hand, i, next))}
            onRemove={() => onChange({ ...hand, blocks: hand.blocks.filter((_, j) => j !== i) })}
          />
        ))}
        <button
          type="button"
          onClick={() => {
            const spec = newSpec("num");
            onChange({
              ...hand,
              blocks: [...hand.blocks, { count: 3, spec, jokerable: defaultJokerable(3, spec) }],
            });
          }}
          className="min-h-11 text-sm font-medium text-indigo-700"
        >
          + Add block
        </button>
      </div>
    </div>
  );
}

function BlockRow({
  block,
  onChange,
  onRemove,
}: {
  block: Block;
  onChange: (block: Block) => void;
  onRemove: () => void;
}) {
  const kind = block.spec.kind;
  return (
    <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 bg-white p-2 sm:grid-cols-6">
      <select
        value={block.count}
        onChange={(e) => {
          const count = Number(e.target.value) as BlockCount;
          onChange({ count, spec: block.spec, jokerable: defaultJokerable(count, block.spec) });
        }}
        className="min-h-11 rounded-lg border border-slate-300 px-2 text-sm"
      >
        {COUNTS.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>
      <select
        value={kind}
        onChange={(e) => {
          const spec = newSpec(e.target.value as TileSpec["kind"]);
          onChange({ ...block, spec, jokerable: defaultJokerable(block.count, spec) });
        }}
        className="min-h-11 rounded-lg border border-slate-300 px-2 text-sm"
      >
        {KINDS.map((k) => (
          <option key={k.value} value={k.value}>
            {k.label}
          </option>
        ))}
      </select>
      <SpecFields spec={block.spec} onChange={(spec) => onChange({ ...block, spec })} />
      <button type="button" onClick={onRemove} className="min-h-11 text-xs text-slate-500 sm:col-span-1">
        Delete
      </button>
    </div>
  );
}

function SpecFields({ spec, onChange }: { spec: TileSpec; onChange: (spec: TileSpec) => void }) {
  if (spec.kind === "num") {
    return (
      <>
        <select
          value={spec.suit}
          onChange={(e) => onChange({ ...spec, suit: e.target.value as SuitVar })}
          className="min-h-11 rounded-lg border border-slate-300 px-2 text-sm"
        >
          <option value="S1">S1</option>
          <option value="S2">S2</option>
          <option value="S3">S3</option>
        </select>
        <label className="flex items-center gap-1 text-xs text-slate-500">
          N+
          <input
            type="number"
            min={0}
            max={9}
            value={spec.offset}
            onChange={(e) => onChange({ ...spec, offset: Number(e.target.value) })}
            className="min-h-11 w-full rounded-lg border border-slate-300 px-2 text-sm"
          />
        </label>
      </>
    );
  }
  if (spec.kind === "wind") {
    return (
      <select
        value={spec.wind}
        onChange={(e) => onChange({ ...spec, wind: e.target.value as Wind })}
        className="min-h-11 rounded-lg border border-slate-300 px-2 text-sm sm:col-span-2"
      >
        <option value="north">North</option>
        <option value="east">East</option>
        <option value="west">West</option>
        <option value="south">South</option>
      </select>
    );
  }
  if (spec.kind === "dragon") {
    return (
      <select
        value={spec.dragon}
        onChange={(e) => onChange({ ...spec, dragon: e.target.value as Dragon })}
        className="min-h-11 rounded-lg border border-slate-300 px-2 text-sm sm:col-span-2"
      >
        <option value="red">Red</option>
        <option value="green">Green</option>
        <option value="white">White / soap</option>
      </select>
    );
  }
  if (spec.kind === "dragonOfSuit") {
    return (
      <select
        value={spec.suit}
        onChange={(e) => onChange({ ...spec, suit: e.target.value as SuitVar })}
        className="min-h-11 rounded-lg border border-slate-300 px-2 text-sm sm:col-span-2"
      >
        <option value="S1">Dragon of S1</option>
        <option value="S2">Dragon of S2</option>
        <option value="S3">Dragon of S3</option>
      </select>
    );
  }
  return <span className="self-center text-xs text-slate-400 sm:col-span-2">Flower (no Joker)</span>;
}
