import type { PoolEntry } from "@/lib/draft/schema";

/**
 * AoE4 civilizations (23 — 12 base + 11 variants).
 * Names/source: https://ageofempires.fandom.com/wiki/Civilization_(Age_of_Empires_IV)
 * Images downloaded from the fandom wiki and self-hosted under /public/civs
 * (so they render reliably without depending on the external CDN).
 * Per project rule, assets come from the fandom wiki only — never aoe4world.com.
 */

export type Civ = PoolEntry & {
  /** Base civ this is a variant of, if any. */
  variantOf?: string;
};

const img = (id: string) => `/civs/${id}.webp`;

export const CIVS: Civ[] = [
  // --- Base civilizations ---
  { id: "english", name: "English", imageUrl: img("english") },
  { id: "french", name: "French", imageUrl: img("french") },
  { id: "holy-roman-empire", name: "Holy Roman Empire", imageUrl: img("holy-roman-empire") },
  { id: "mongols", name: "Mongols", imageUrl: img("mongols") },
  { id: "rus", name: "Rus", imageUrl: img("rus") },
  { id: "delhi-sultanate", name: "Delhi Sultanate", imageUrl: img("delhi-sultanate") },
  { id: "abbasid-dynasty", name: "Abbasid Dynasty", imageUrl: img("abbasid-dynasty") },
  { id: "chinese", name: "Chinese", imageUrl: img("chinese") },
  { id: "ottomans", name: "Ottomans", imageUrl: img("ottomans") },
  { id: "malians", name: "Malians", imageUrl: img("malians") },
  { id: "byzantines", name: "Byzantines", imageUrl: img("byzantines") },
  { id: "japanese", name: "Japanese", imageUrl: img("japanese") },

  // --- Variant civilizations ---
  { id: "ayyubids", name: "Ayyubids", variantOf: "abbasid-dynasty", imageUrl: img("ayyubids") },
  { id: "zhu-xis-legacy", name: "Zhu Xi's Legacy", variantOf: "chinese", imageUrl: img("zhu-xis-legacy") },
  { id: "jin-dynasty", name: "Jin Dynasty", variantOf: "chinese", imageUrl: img("jin-dynasty") },
  { id: "order-of-the-dragon", name: "Order of the Dragon", variantOf: "holy-roman-empire", imageUrl: img("order-of-the-dragon") },
  { id: "jeanne-darc", name: "Jeanne d'Arc", variantOf: "french", imageUrl: img("jeanne-darc") },
  { id: "knights-templar", name: "Knights Templar", variantOf: "french", imageUrl: img("knights-templar") },
  { id: "house-of-lancaster", name: "House of Lancaster", variantOf: "english", imageUrl: img("house-of-lancaster") },
  { id: "golden-horde", name: "Golden Horde", variantOf: "mongols", imageUrl: img("golden-horde") },
  { id: "macedonian-dynasty", name: "Macedonian Dynasty", variantOf: "byzantines", imageUrl: img("macedonian-dynasty") },
  { id: "sengoku-daimyo", name: "Sengoku Daimyo", variantOf: "japanese", imageUrl: img("sengoku-daimyo") },
  { id: "tughlaq-dynasty", name: "Tughlaq Dynasty", variantOf: "delhi-sultanate", imageUrl: img("tughlaq-dynasty") },
];

// Standard (non-variant) civilizations — the default competitive pool.
export const BASE_CIVS = CIVS.filter((c) => !c.variantOf);
