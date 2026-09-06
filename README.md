# Hand & Foot Score

Mobile-first scoring app for Hand and Foot (5-deck partnership rules).

Track four hands for two teams: Perfect Draw, clean and dirty books, books of 7s and black 3s, going out, card count, and negatives. Subtotals and running totals are calculated for you.

Games are stored on the device (`localStorage` key `hand-foot-score`). No account required.

Live reference: [hand-and-foot-scoresheet.grok.me](https://hand-and-foot-scoresheet.grok.me/)

## Live shared scoring (real-time multiplayer)

Two devices can score the **same** game together, updating in real time.

- On the scoring screen, tap **Share** (top-right) to open **Score together**. This starts a live session and gives you an invite link (`/?join=<gameId>`) to send to the other player.
- The other device opens the link — or taps **Join a game** on the landing screen and pastes the link/code — and auto-joins the shared sheet. A **Live · N** badge shows the connection state.
- Every score edit on either device syncs to the other instantly. State is a full-game snapshot with a `updatedAt`-based last-write-wins version (see `src/lib/multiplayer/sync.ts`), so late joiners get the current sheet and there are no feedback loops.

### How it works

Peers connect directly over **WebRTC** (full-mesh `P2PRoom` in `src/lib/multiplayer/p2p.ts`). Game data never touches the server — it flows browser-to-browser. The only server piece is a tiny **signaling relay** at `/api/rtc` that brokers the WebRTC handshake (offer/answer/ICE) and a room roster, backed by the shared SQL accessor (`src/lib/db.ts`) and the `rtc_peers` / `rtc_signals` tables (migration `migrations/0002_rtc.sql`). Rows are tiny and self-expiring; no background job is needed.

### Production caveat — set `DATABASE_URL`

Cross-device signaling in production **requires a real `DATABASE_URL` (Neon)**. The signaling relay stores handshake rows in the database, and the local PGLite fallback is **per-serverless-instance / in-memory** — two phones can land on different instances and never see each other's signals. Local dev is a single instance, so two tabs or browser contexts sync fine against PGLite. Set `DATABASE_URL` on the deploy (the same variable the rest of the app already uses) and the relay works across instances with no code changes.

Only STUN is configured (`defaultIceServers()`), which is enough for loopback and most networks. Devices behind **strict/symmetric NATs** may need a **TURN** relay to connect; add one via `VITE_STUN_URLS`-style ICE config if you hit that (no TURN server is bundled).

You can prove the whole path locally with two browser contexts:

```bash
npm run dev
node scripts/e2e-live-sync.mjs   # requires playwright + chromium
```

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
