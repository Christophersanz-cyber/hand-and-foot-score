# Mahjong Combos

An **American Mahjong (NMJL) hand-suggestion assistant**. Enter the tiles on your
rack and the app ranks winning hands from **this year's card** by how close you
are, including Jokers where the rules allow.

Backend-free SPA. The rack, discards, and any cards you import stay in
`localStorage` on this device.

---

## What this app is

- A **tile model** for American Mahjong: Bams / Cracks / Dots (1–9), Winds
  (N/E/W/S), Dragons (Red / Green / White soap), Flowers, and Jokers.
- A **rack UI** (up to 14 tiles) with optional **exposures** (claimed Pungs/Kongs)
  and an optional **discard / wall** tracker.
- A **per-year card** model. The bundled year is a generic **demo** set — not the
  official National Mah Jongg League card.
- **Import / entry** so you can add the card you legally own (JSON paste or a
  guided form). New years do not require a code change.
- A **suggestion engine** that ranks those hands by tiles matched vs still needed.

### Chosen variant & assumptions

- Variant: **American Mahjong (NMJL)**, 14-tile hands.
- **Jokers** may substitute in groups of **3 or more** (Pungs, Kongs, Quints) but
  **never** in singles, pairs, or Flowers.
- Hands marked **Concealed** on the card are ineligible once any tile is exposed.
- Suit ↔ Dragon pairing: **Bam→Green, Crack→Red, Dot→White**.
- Optional wall odds use a 152-tile NMJL deck (4 of each standard tile, 8
  Flowers, 8 Jokers) minus your rack and recorded discards. This is a simple
  remaining-copy / next-draw estimate, not a full table model.

---

## Year cards (legal)

The official NMJL card is **copyrighted** and is published annually. This app
does **not** ship official hands.

- Bundled demo: [`src/data/cards/2026.ts`](src/data/cards/2026.ts) — generic shapes
  grouped into familiar sections (2468, Like Numbers, Quints, Consecutive Run,
  13579, Winds-Dragons, 369, Singles & Pairs, NEWS, Year).
- Registry: [`src/data/cards/index.ts`](src/data/cards/index.ts). Adding a committed
  year file is optional; players can import a new year at runtime.
- Import JSON sample: [`public/example-card.json`](public/example-card.json).
- User cards persist under `mahjong-combos:user-cards:v1`.

A card JSON looks like:

```json
{
  "year": 2026,
  "title": "My 2026 card",
  "hands": [
    {
      "id": "wd-1",
      "name": "Four Winds & Dragon Pair",
      "section": "winds-dragons",
      "concealed": false,
      "suitVarCount": 0,
      "usesNumberVar": false,
      "blocks": [
        { "count": 3, "spec": { "kind": "wind", "wind": "north" } },
        { "count": 3, "spec": { "kind": "wind", "wind": "east" } },
        { "count": 3, "spec": { "kind": "wind", "wind": "west" } },
        { "count": 3, "spec": { "kind": "wind", "wind": "south" } },
        { "count": 2, "spec": { "kind": "dragon", "dragon": "red" } }
      ]
    }
  ]
}
```

`count` is 1 single / 2 pair / 3 pung / 4 kong / 5 quint. `jokerable` defaults
from NMJL rules if omitted. `usesNumberVar: true` treats `offset` as `N + offset`.

---

## How suggestions work

1. **Expand** each pattern into every legal 14-tile binding (distinct suits,
   `N` from 1–9 when used).
2. **Score** real tiles first, then spend Jokers only on jokerable slots.
3. **Concealment:** if the pattern is concealed and the rack has any exposure,
   the hand stays listed but is marked ineligible and sorted last.
4. **Wall (optional):** remaining copies of needed tiles and a next-draw
   percentage when discards are recorded.

---

## Run it

Requires Node 20+ (developed on Node 22).

```bash
cd mahjong-combos
npm install
npm run dev        # http://localhost:5173
```

```bash
npm run typecheck
npm run build
npm test
npm run lint
```

PWA install packaging is still optional / later.

---

## Project layout

```
mahjong-combos/
├─ public/example-card.json   # import schema sample
├─ src/
│  ├─ App.tsx                 # session + card wiring
│  ├─ lib/                    # tiles, patterns, suggest, deck, import schema
│  ├─ data/cards/             # per-year cards + registry
│  └─ components/             # rack, picker, suggestions, card manager
└─ README.md
```
