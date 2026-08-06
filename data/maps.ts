import type { PoolEntry } from "@/lib/draft/schema";

/**
 * Default AoE4 1v1 map pool with preview images.
 * Images downloaded from the fandom wiki and self-hosted under /public/maps
 * (so they render reliably without depending on the external CDN).
 * Source: https://ageofempires.fandom.com (fandom only — never aoe4world.com).
 * Map pools rotate per season/tournament; edit this set in the preset editor.
 */
const img = (id: string) => `/maps/${id}.webp`;

export const DEFAULT_MAPS: PoolEntry[] = [
  { id: "dry-arabia", name: "Dry Arabia", imageUrl: img("dry-arabia") },
  { id: "lipany", name: "Lipany", imageUrl: img("lipany") },
  { id: "high-view", name: "High View", imageUrl: img("high-view") },
  { id: "mongolian-heights", name: "Mongolian Heights", imageUrl: img("mongolian-heights") },
  { id: "ancient-spires", name: "Ancient Spires", imageUrl: img("ancient-spires") },
  { id: "boulder-bay", name: "Boulder Bay", imageUrl: img("boulder-bay") },
  { id: "confluence", name: "Confluence", imageUrl: img("confluence") },
  { id: "danube-river", name: "Danube River", imageUrl: img("danube-river") },
  { id: "french-pass", name: "French Pass", imageUrl: img("french-pass") },
  { id: "altai", name: "Altai", imageUrl: img("altai") },
  { id: "nagari", name: "Nagari", imageUrl: img("nagari") },
  { id: "hill-and-dale", name: "Hill and Dale", imageUrl: img("hill-and-dale") },
  { id: "golden-heights", name: "Golden Heights", imageUrl: img("golden-heights") },
  { id: "cliffside", name: "Cliffside", imageUrl: img("cliffside") },
  { id: "king-of-the-hill", name: "King of the Hill", imageUrl: img("king-of-the-hill") },
  // TWC qualifier map pool additions (clean single icons self-hosted under /public/maps).
  { id: "prairie", name: "Prairie", imageUrl: "/maps/prairie.png" },
  { id: "frisian-marshes", name: "Frisian Marshes", imageUrl: "/maps/frisian-marshes.png" },
  { id: "holy-island", name: "Holy Island", imageUrl: "/maps/holy-island.png" },
  { id: "front-range", name: "Front Range", imageUrl: "/maps/front-range.png" },
  { id: "rockies", name: "Rockies", imageUrl: "/maps/rockies.png" },
  { id: "pigeons-view", name: "Pigeon's View", imageUrl: "/maps/pigeons-view.png" },
  { id: "hideout", name: "Hideout", imageUrl: img("hideout") },
  { id: "four-lakes", name: "Four Lakes", imageUrl: img("four-lakes") },
  // Added for the BCC map-draft pool (images self-hosted under /public/maps).
  { id: "kawasan", name: "Kawasan", imageUrl: "/maps/kawasan.png" },
  { id: "gorge", name: "Gorge", imageUrl: img("gorge") },
  { id: "coastal-cliffs", name: "Coastal Cliffs", imageUrl: "/maps/coastal-cliffs.png" },
  { id: "socotra", name: "Socotra", imageUrl: "/maps/socotra.png" },
  { id: "baldland", name: "Baldland", imageUrl: "/maps/baldland.png" },
  { id: "mountain-clearing", name: "Mountain Clearing", imageUrl: "/maps/mountain-clearing.png" },
  // Reported missing from the default pool by a player building a tournament preset.
  { id: "himeyama", name: "Himeyama", imageUrl: img("himeyama") },

  // --- EGC Masters map pool ---
  // EGC ship their own tuned versions of these maps, so they are separate entries
  // rather than aliases of the ladder maps that share a name — "EGC-Dry Arabia" is
  // not the map the ladder calls Dry Arabia. Names are spelled exactly as the EGC
  // handbook spells them (Silk Road and Danube Divide carry no prefix there).
  // Previews are the handbook's own minimap icons; the fandom wiki has no art for
  // custom tournament maps. First eight = Open Qualifier pool.
  { id: "egc-dry-arabia", name: "EGC-Dry Arabia", imageUrl: "/maps/egc-dry-arabia.png" },
  { id: "egc-dry-river", name: "EGC-Dry River", imageUrl: "/maps/egc-dry-river.png" },
  { id: "egc-gorge", name: "EGC-Gorge", imageUrl: "/maps/egc-gorge.png" },
  { id: "egc-holy-island", name: "EGC-Holy Island", imageUrl: "/maps/egc-holy-island.png" },
  { id: "egc-kerlaugar", name: "EGC-Kerlaugar", imageUrl: "/maps/egc-kerlaugar.png" },
  { id: "egc-king-of-the-hill", name: "EGC-King of the Hill", imageUrl: "/maps/egc-king-of-the-hill.png" },
  { id: "egc-mountain-clearing", name: "EGC-Mountain Clearing", imageUrl: "/maps/egc-mountain-clearing.png" },
  { id: "egc-silk-road", name: "Silk Road", imageUrl: "/maps/egc-silk-road.png" },
  // …plus these three in the Main Event.
  { id: "egc-archipelago", name: "EGC-Archipelago", imageUrl: "/maps/egc-archipelago.png" },
  { id: "egc-danube-divide", name: "Danube Divide", imageUrl: "/maps/egc-danube-divide.png" },
  { id: "egc-golden-stream", name: "EGC-Golden Stream", imageUrl: "/maps/egc-golden-stream.png" },
];
