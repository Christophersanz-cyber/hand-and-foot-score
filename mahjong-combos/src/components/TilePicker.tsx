import { type TileCode, TILE_CATALOG } from "../lib/tiles";
import { Tile } from "./Tile";

interface TilePickerProps {
  onAdd: (code: TileCode) => void;
  disabled?: boolean;
}

const SECTIONS: { title: string; groups: string[] }[] = [
  { title: "Bams", groups: ["bam"] },
  { title: "Cracks", groups: ["crack"] },
  { title: "Dots", groups: ["dot"] },
  { title: "Winds · Dragons · Flower · Joker", groups: ["wind", "dragon", "flower", "joker"] },
];

export function TilePicker({ onAdd, disabled = false }: TilePickerProps) {
  return (
    <div className="space-y-4">
      {SECTIONS.map((section) => (
        <div key={section.title}>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {section.title}
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {TILE_CATALOG.filter((t) => section.groups.includes(t.group)).map((t) => (
              <Tile
                key={t.code}
                code={t.code}
                onClick={disabled ? undefined : () => onAdd(t.code)}
                title={disabled ? "Hand is full" : `Add ${t.name}`}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
