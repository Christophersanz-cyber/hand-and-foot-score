/**
 * Manual end-to-end proof of live shared scoring. Not part of `npm test` (it
 * needs a running dev server and real WebRTC). Run it with:
 *
 *   npm run dev                 # in one terminal (http://localhost:8080)
 *   node scripts/e2e-live-sync.mjs
 *
 * It opens two isolated browser contexts, creates a game in A, joins via the
 * invite link in B, then asserts a score edit in A appears in B and vice-versa
 * — proving the /api/rtc signaling + P2PRoom + store-sync path end to end.
 * Screenshots of both synced boards land in /opt/cursor/artifacts.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = "http://localhost:8080";
const ART = "/opt/cursor/artifacts";
mkdirSync(ART, { recursive: true });

const log = (...a) => console.log("[e2e]", ...a);

/** Read cleanBooks/dirtyBooks for the active game's team from localStorage. */
async function readScore(page, team, hand = 0) {
  return page.evaluate(
    ({ team, hand }) => {
      const raw = localStorage.getItem("hand-foot-score");
      if (!raw) return null;
      const { state } = JSON.parse(raw);
      const g = state.games.find((x) => x.id === state.activeGameId);
      if (!g) return null;
      return {
        id: g.id,
        cleanBooks: g.scores[hand][team].cleanBooks,
        dirtyBooks: g.scores[hand][team].dirtyBooks,
      };
    },
    { team, hand },
  );
}

async function waitFor(fn, { timeout = 25000, label = "condition" } = {}) {
  const start = Date.now();
  for (;;) {
    if (await fn()) return;
    if (Date.now() - start > timeout) throw new Error(`timeout waiting for ${label}`);
    await new Promise((r) => setTimeout(r, 300));
  }
}

const browser = await chromium.launch({
  args: ["--no-sandbox"],
});

try {
  const ctxA = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const ctxB = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const A = await ctxA.newPage();
  const B = await ctxB.newPage();
  A.on("console", (m) => m.text().includes("[live]") && console.log("[A]", m.text()));
  B.on("console", (m) => m.text().includes("[live]") && console.log("[B]", m.text()));
  A.on("console", (m) => m.type() === "error" && console.log("[A err]", m.text()));
  B.on("console", (m) => m.type() === "error" && console.log("[B err]", m.text()));

  // ── A creates a game ──────────────────────────────────────────────────────
  log("A: open app + create game");
  await A.goto(BASE, { waitUntil: "networkidle" });
  const newGameBtn = A.getByRole("button", { name: "New game" }).first();
  await newGameBtn.waitFor();
  const dealBtn = A.getByRole("button", { name: "Deal" });
  // Retry opening the dialog until React has hydrated and the click registers.
  await waitFor(
    async () => {
      if (await dealBtn.isVisible().catch(() => false)) return true;
      await newGameBtn.click().catch(() => {});
      return dealBtn.isVisible().catch(() => false);
    },
    { label: "New game dialog to open", timeout: 20000 },
  );
  await dealBtn.click();
  await A.getByLabel("Invite to score together").waitFor();

  // ── A opens Invite (goes live) and grabs the join link ────────────────────
  log("A: open invite dialog (host goes live)");
  await A.getByLabel("Invite to score together").click();
  const link = await A.locator("input[readonly]").inputValue();
  log("invite link:", link);
  if (!/\/\?join=/.test(link)) throw new Error("invite link missing ?join=");
  // Close the dialog; the live session keeps running.
  await A.keyboard.press("Escape");

  // ── B joins via the link ──────────────────────────────────────────────────
  log("B: open invite link + auto-join");
  await B.goto(link);
  // Board renders on B only once it receives the game state over WebRTC.
  await B.locator('button[aria-label="Increase Clean Books"]:visible').waitFor({ timeout: 25000 });
  log("B: board rendered (received game over P2P)");

  const idA = (await readScore(A, 0)).id;
  await waitFor(async () => (await readScore(B, 0))?.id === idA, {
    label: "B adopts A's game id",
  });
  log("B adopted the shared game id:", idA);

  // ── A edits → B reflects it ───────────────────────────────────────────────
  log("A: +1 Clean Book (team 0) → expect B to sync");
  await A.locator('button[aria-label="Increase Clean Books"]:visible').first().click();
  await waitFor(async () => (await readScore(B, 0))?.cleanBooks === 1, {
    label: "B sees A's clean book",
  });
  log("OK: A→B synced (cleanBooks=1 on B)");

  // ── B edits → A reflects it ───────────────────────────────────────────────
  log("B: +1 Dirty Book (team 0) → expect A to sync");
  await B.locator('button[aria-label="Increase Dirty Books"]:visible').first().click();
  await waitFor(async () => (await readScore(A, 0))?.dirtyBooks === 1, {
    label: "A sees B's dirty book",
  });
  log("OK: B→A synced (dirtyBooks=1 on A)");

  // Final: both show clean=1, dirty=1 for team 0.
  const finalA = await readScore(A, 0);
  const finalB = await readScore(B, 0);
  log("final A:", JSON.stringify(finalA));
  log("final B:", JSON.stringify(finalB));
  if (finalA.cleanBooks !== 1 || finalA.dirtyBooks !== 1) throw new Error("A final mismatch");
  if (finalB.cleanBooks !== 1 || finalB.dirtyBooks !== 1) throw new Error("B final mismatch");

  await A.screenshot({ path: `${ART}/live_sync_context_a.png` });
  await B.screenshot({ path: `${ART}/live_sync_context_b.png` });
  log("screenshots saved");

  log("SUCCESS: bidirectional live sync verified");
  await browser.close();
  process.exit(0);
} catch (err) {
  console.error("[e2e] FAILED:", err);
  await browser.close();
  process.exit(1);
}
