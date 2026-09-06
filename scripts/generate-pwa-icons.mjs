/**
 * Rasterize scripts/pwa-icons/*.svg into the PNGs the PWA manifest serves.
 * Run: node scripts/generate-pwa-icons.mjs
 *
 * Uses @resvg/resvg-js when available (npx/npm). The PNGs are committed so
 * `npm run build` does not need this step.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "public/icons");
const GROK_DIR = join(ROOT, "public/__grok");

const JOBS = [
  { svg: "icon.svg", file: join(OUT_DIR, "icon-192.png"), size: 192 },
  { svg: "icon.svg", file: join(OUT_DIR, "icon-512.png"), size: 512 },
  { svg: "icon-maskable.svg", file: join(OUT_DIR, "icon-192-maskable.png"), size: 192 },
  { svg: "icon-maskable.svg", file: join(OUT_DIR, "icon-512-maskable.png"), size: 512 },
  { svg: "icon.svg", file: join(GROK_DIR, "icon-180.png"), size: 180 },
];

async function loadResvg() {
  const require = createRequire(import.meta.url);
  try {
    return require("@resvg/resvg-js");
  } catch {
    const { Resvg } = await import("@resvg/resvg-js");
    return { Resvg };
  }
}

async function main() {
  const { Resvg } = await loadResvg();
  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(GROK_DIR, { recursive: true });
  for (const job of JOBS) {
    const svg = readFileSync(join(ROOT, "scripts/pwa-icons", job.svg));
    const resvg = new Resvg(svg, {
      fitTo: { mode: "width", value: job.size },
    });
    const png = resvg.render().asPng();
    writeFileSync(job.file, png);
    console.log(`wrote ${job.file} (${png.byteLength} bytes)`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err);
    console.error("\nInstall the rasterizer once: npm install --no-save @resvg/resvg-js");
    process.exit(1);
  });
}
