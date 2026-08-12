/**
 * Every Traditional character in the dictionary has a Simplified counterpart.
 *
 *   npx tsx scripts/check-i18n.ts
 *
 * The "cn" locale is not hand-translated: it is "zh" run through a character map
 * at render time. That works right up until somebody authors a zh string using a
 * character the map has never seen — and then it does not fail, it renders the
 * Traditional form in the middle of a Simplified sentence. Nobody reading the
 * diff will catch that; a Simplified reader will, and only after it ships.
 *
 * So this is the audit: pull every zh string out of the dictionary, list the
 * characters that need converting and are missing from T2S, and exit non-zero.
 *
 * The one thing this cannot do is decide on its own which characters differ
 * between the scripts — most are identical, and Node ships no T2S table. So the
 * list below is hand-kept, and the check is: every character in it must be in
 * the map. That is weaker than "every zh string is convertible", and it is worth
 * being clear about which one you are getting. What it does buy is the case that
 * actually happens: someone adds a string, the audit does not know its new
 * characters, they add them here, and the map gap shows up immediately.
 *
 * Keep it to characters that genuinely CHANGE. 帝, 本 and 家 are the same in both
 * scripts; listing them only produces false alarms.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, "..", "lib", "i18n.tsx"), "utf8");

// The map, read straight out of the source rather than imported: i18n.tsx is a
// client component and importing it drags React in for no reason.
const mapMatch = src.match(/const T2S: Record<string, string> = \{([\s\S]*?)\};/);
if (!mapMatch) {
  console.error("Could not find the T2S map in lib/i18n.tsx");
  process.exit(1);
}
const T2S = new Set<string>();
for (const m of mapMatch[1].matchAll(/"(.)":\s*"(.)"/g)) T2S.add(m[1]);

/**
 * Traditional forms that must be converted. Kept here rather than in the app so
 * the runtime stays a plain lookup — this is the reference the audit checks the
 * map against, and the two are deliberately separate copies: a map that graded
 * its own homework would pass every time.
 */
const TRADITIONAL = new Set(
  ("規則組揮個資訊篩試剛報載題問顧鍵顯稱這裡儲紀國運籌決勝開與圖對戰瀏覽訂輪數擊驟計時暫賽觀選標雙約負兩邊點誤陣為術來進廳帳號電郵碼請註冊採員還沒經錯敗後編輯複製換尋頁刪範內無愛間連結線當隊長準備傳給會強繼續獲場隨機隱鎖擇緒張僅誰贏寫確認舊從餘說項幾總預設許產執統動調順嗎單錄種關閉東須現況於夠靜練習滿參過純斷曉眾欄訪遊記條麼腦讓幫領將圍" +
    // Added for civ names, which are proper nouns and reach for characters UI
    // chrome never needed.
    "蘭聖羅蘇馬遺龍貞騎團頓魯").split("")
);

const missing = new Map<string, string[]>();
// Hyphens matter: civ ids are slugs (`civ.holy-roman-empire`), and a key pattern
// without `-` skips them silently — which is the opposite of what an audit is for.
for (const m of src.matchAll(/"([\w.-]+)":\s*\{[^}]*?zh:\s*"((?:[^"\\]|\\.)*)"/g)) {
  const [, key, zh] = m;
  for (const ch of zh) {
    if (TRADITIONAL.has(ch) && !T2S.has(ch)) {
      const keys = missing.get(ch) ?? [];
      if (keys.length < 3) keys.push(key);
      missing.set(ch, keys);
    }
  }
}

if (missing.size === 0) {
  console.log(`✓ every Traditional character in the dictionary is in T2S (${T2S.size} entries)`);
  process.exit(0);
}

console.error(`✗ ${missing.size} character(s) used in zh strings but missing from T2S:\n`);
for (const [ch, keys] of missing) console.error(`  ${ch}  — ${keys.join(", ")}`);
console.error(`\nAdd them to T2S in lib/i18n.tsx, or the "cn" locale renders them Traditional.`);
process.exit(1);
