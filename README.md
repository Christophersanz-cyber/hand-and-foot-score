# Hand & Foot Score

Mobile-first scoring app for Hand and Foot (5-deck partnership rules).

Track four hands for two teams: Perfect Draw, clean and dirty books, books of 7s and black 3s, going out, card count, and negatives. Subtotals and running totals are calculated for you.

Games are stored on the device (`localStorage` key `hand-foot-score`). No account required.

Live reference: [hand-and-foot-scoresheet.grok.me](https://hand-and-foot-scoresheet.grok.me/)

## Scoring

Authoritative values live in `src/lib/scoring.ts`. Going out is **100 / 200 / 300 / 400** by hand — not a flat 100.

| Item | Points |
| --- | --- |
| Perfect Draw | 100 |
| Clean book | 500 |
| Dirty book | 300 |
| Book of 7s | 1,500 |
| Book of black 3s | 2,000 |
| Going out | 100 / 200 / 300 / 400 (1st–4th hand) |
| Joker | 50 |
| 2 / Ace | 20 |
| King–8 | 10 |
| 7–4 / black 3 | 5 |
| Red 3 | −500 |

Hand requirements follow the printed sheet:

- Hand 1 — open 90, go out 100, 1 clean + 1 dirty
- Hand 2 — open 120, go out 200, 2 + 2
- Hand 3 — open 150, go out 300, 3 + 3
- Hand 4 — open 180, go out 400, 4 + 4

Only one team can go out in a hand.

## Install (Add to Home Screen)

The app is an installable PWA named **Hand & Foot Score** (home-screen label **Hand & Foot**). Theme color is `#121a16`.

Open [/?install=1](/?install=1) on the phone for the in-app tutorial, or:

### iPhone / iPad (Safari)

1. Open the site in Safari (not an in-app browser).
2. Tap **Share**.
3. Tap **Add to Home Screen**, then **Add**.

### Android (Chrome)

1. Open the site in Chrome.
2. Tap the menu (⋮).
3. Tap **Install app** or **Add to Home screen**, then confirm.

Once installed, scores stay on the device even when you are offline (app shell + `localStorage`).

Native App Store / Play Store packaging is a later Capacitor wrap of this same web build — see [MOBILE.md](MOBILE.md).

## Run locally

Requires Node.js 22+.

```bash
npm install
npm run dev
```

The app listens on port 8080.

```bash
npm run build
npm run typecheck
```

## Stack

React 19, TanStack Start / Router, Tailwind CSS v4, Zustand.

## License

Private project. Use and change as you like.
