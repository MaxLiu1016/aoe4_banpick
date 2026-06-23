import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, existsSync } from "node:fs";
import { CIVS } from "../data/civs";
import { DEFAULT_MAPS } from "../data/maps";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

// Download via curl (reliable in this sandbox) with a referer so the CDN returns
// the small optimized image instead of the full-res original.
function dl(url: string, outBase: string): string {
  const tmp = outBase + ".tmp";
  execFileSync("curl", ["-s", "-L", "--retry", "3", "--retry-delay", "1", "-m", "40", "-A", UA, "-e", "http://localhost:3000/", "-o", tmp, url]);
  if (!existsSync(tmp)) return "FAILED";
  const buf = readFileSync(tmp);
  const isPng = buf[0] === 0x89 && buf[1] === 0x50;
  const ext = isPng ? "png" : "webp";
  const final = `${outBase}.${ext}`;
  renameSync(tmp, final);
  return `${buf.length}b -> ${final.split(/[\\/]/).pop()}`;
}

mkdirSync("public/civs", { recursive: true });
mkdirSync("public/maps", { recursive: true });
let ok = 0, fail = 0;
for (const c of CIVS) if (c.imageUrl) { const r = dl(c.imageUrl, `public/civs/${c.id}`); console.log("civ", c.id, r); r.includes("->") ? ok++ : fail++; }
for (const m of DEFAULT_MAPS) if (m.imageUrl) { const r = dl(m.imageUrl, `public/maps/${m.id}`); console.log("map", m.id, r); r.includes("->") ? ok++ : fail++; }
console.log(`\nDONE: ${ok} ok, ${fail} failed`);
