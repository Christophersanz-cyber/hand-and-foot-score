# Native store path (Capacitor)

This repo ships as a **web PWA**. App Store and Play Store binaries are a later wrap of that same web build — do not fork scoring or the Zustand persist key `hand-foot-score`.

Plan-level only. Do not add Capacitor packages until you are ready to open developer accounts and sign releases.

## Why wrap, not rewrite

Hand & Foot Score is a client-side scoresheet. The UI, `src/lib/scoring.ts`, and `localStorage` persistence are the product. Capacitor loads that web app in a native WebView and gives you store listing, icons, and (later) optional native plugins.

Keep one web source of truth:

1. Ship the PWA (this PR).
2. When you want store presence, wrap **this** production build.
3. Do not reimplement scoring in Swift/Kotlin.

## Accounts and identifiers

| Store | Account | App ID (suggested) |
| --- | --- | --- |
| Apple App Store / TestFlight | [Apple Developer Program](https://developer.apple.com/programs/) ($99/year) | Bundle ID `com.handandfoot.score` |
| Google Play | [Play Console](https://play.google.com/console) (one-time registration) | Application ID `com.handandfoot.score` |

Use the same reverse-DNS id on both stores. Display name: **Hand & Foot Score**. Home-screen short name: **Hand & Foot**.

## Signing (do this before the first release build)

**iOS**

- Enroll the Apple Developer team.
- In App Store Connect, create the app record (name, bundle id, SKU).
- In Xcode → Signing & Capabilities: select the team. Automatic signing is enough for TestFlight.
- Distribution certificate + App Store provisioning profile are created by Xcode when you Archive.
- Keep the App Store Connect issuer / key (for CI) in a password manager — never commit `.p12` or `.mobileprovision` files.

**Android**

- Create an upload keystore (`keytool -genkey -v -keystore hand-foot-upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload`).
- Store the JKS and passwords offline. Losing the upload key blocks updates unless you enrolled Play App Signing (recommended — Google holds the app-signing key).
- Play Console → the app → Setup → App signing: use Play App Signing.
- Release artifact is an **AAB**, not a debug APK.

## Wrap this web build

This project is TanStack Start + Nitro (SSR for the hosted PWA). Capacitor wants a folder of static web assets (`index.html` + JS/CSS) **or** a live HTTPS origin.

Two workable approaches — pick one:

### A. Point the WebView at the hosted PWA (simplest)

Keep deploying the web app. Capacitor’s `server.url` loads that origin inside the native shell.

```ts
// capacitor.config.ts (not in repo yet)
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.handandfoot.score",
  appName: "Hand & Foot Score",
  webDir: "dist",
  server: {
    url: "https://YOUR-PRODUCTION-HOST",
    cleartext: false,
  },
  backgroundColor: "#121a16",
};

export default config;
```

Pros: one web build, PWA offline + store binary share scoring. Cons: first launch needs network unless you also ship a local fallback; store review will load a remote URL (Apple allows this when the binary is a wrapper of *your* app, not a generic browser).

### B. Bundle a static client export

If you want a fully offline binary that does not depend on a host:

1. Add a static / SPA client build (TanStack Start can prerender or emit a client-only `dist/`).
2. Set `webDir` to that folder. Do **not** point `webDir` at Nitro’s `.output/server` — that is the Node function, not a WebView tree.
3. `npx cap sync` after every web release.

This app does not need SSR for scoring. A static export is enough if you take this path.

## Capacitor commands (when you start)

Requires macOS + Xcode for iOS; Android Studio for Android.

```bash
npm i @capacitor/core
npm i -D @capacitor/cli
npx cap init "Hand & Foot Score" com.handandfoot.score --web-dir dist

npm i @capacitor/ios @capacitor/android
npx cap add ios
npx cap add android

# after each web build
npm run build   # plus whatever emits `dist/` for path B
npx cap sync
npx cap open ios
npx cap open android
```

Copy store icons from `public/icons/` (512) and `public/__grok/icon-180.png`. Use `#121a16` for splash / status bar.

## Store listing checklist

- Screenshots from a real device (play view + full sheet).
- Privacy: scores stay on device; no account. Optional **live shared scoring** connects two devices directly over WebRTC (peer-to-peer) via an invite link — game data is not stored on the server, only ephemeral WebRTC signaling metadata transits the `/api/rtc` relay. State this in both store privacy forms.
- Age rating: everyone / 4+.
- Do not advertise “Grok App”. Name is **Hand & Foot Score**.
- Hide the in-app install hint when `window.Capacitor` is present (the hint already no-ops in standalone display mode).

## What not to change

- Scoring rules (`src/lib/scoring.ts`).
- Persist key `hand-foot-score` — a rename wipes existing games.
- Theme `#121a16` and the card/heart icon, so PWA and store icons match.

## Suggested order

1. PWA install works on a phone (this repo).
2. Apple + Google accounts and the reserved app ids.
3. Create signing keys; enroll Play App Signing.
4. `cap init` + ios/android; choose path A or B.
5. TestFlight / internal Play testing.
6. Store screenshots and privacy forms.
7. Submit.
