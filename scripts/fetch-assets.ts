import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
import sharp from "sharp";
import { CIVS } from "../data/civs";
import { DEFAULT_MAPS } from "../data/maps";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

// Nothing is displayed larger than 280px wide, so anything past this is bytes we
// pay for and never show. The CDN also hands back PNGs that weigh ~8x the WebP.
const MAX_PX = 256;
const QUALITY = 80;

// Download via curl (reliable in this sandbox) with a referer so the CDN returns
// the small optimized image instead of the full-res original, then normalise
// every asset to one format and one ceiling so the pool can't drift back to fat.
async function dl(url: string, outBase: string): Promise<string> {
  const tmp = outBase + ".tmp";
  execFileSync("curl", ["-s", "-L", "--retry", "3", "--retry-delay", "1", "-m", "40", "-A", UA, "-e", "http://localhost:3000/", "-o", tmp, url]);
  if (!existsSync(tmp)) return "FAILED";
  const raw = readFileSync(tmp);
  rmSync(tmp);
  const webp = await sharp(raw)
    .resize(MAX_PX, MAX_PX, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toBuffer();
  const final = `${outBase}.webp`;
  writeFileSync(final, webp);
  return `${raw.length}b -> ${webp.length}b ${final.split(/[\\/]/).pop()}`;
}

mkdirSync("public/civs", { recursive: true });
mkdirSync("public/maps", { recursive: true });
let ok = 0, fail = 0;
for (const c of CIVS) if (c.imageUrl) { const r = await dl(c.imageUrl, `public/civs/${c.id}`); console.log("civ", c.id, r); r.includes("->") ? ok++ : fail++; }
for (const m of DEFAULT_MAPS) if (m.imageUrl) { const r = await dl(m.imageUrl, `public/maps/${m.id}`); console.log("map", m.id, r); r.includes("->") ? ok++ : fail++; }
console.log(`\nDONE: ${ok} ok, ${fail} failed`);
