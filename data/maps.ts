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
  // TWC qualifier map pool additions (icons cropped from the r/aoe4 TWC pool image)
  { id: "prairie", name: "Prairie", imageUrl: img("prairie") },
  { id: "frisian-marshes", name: "Frisian Marshes", imageUrl: img("frisian-marshes") },
  { id: "holy-island", name: "Holy Island", imageUrl: img("holy-island") },
  { id: "front-range", name: "Front Range", imageUrl: img("front-range") },
  { id: "rockies", name: "Rockies", imageUrl: img("rockies") },
  { id: "pigeons-view", name: "Pigeon's View", imageUrl: img("pigeons-view") },
  { id: "hideout", name: "Hideout", imageUrl: img("hideout") },
  { id: "four-lakes", name: "Four Lakes", imageUrl: img("four-lakes") },
  // Added for the BCC map-draft pool (images self-hosted under /public/maps).
  { id: "kawasan", name: "Kawasan", imageUrl: "/maps/kawasan.png" },
  { id: "gorge", name: "Gorge", imageUrl: img("gorge") },
  { id: "coastal-cliffs", name: "Coastal Cliffs", imageUrl: "/maps/coastal-cliffs.png" },
  { id: "socotra", name: "Socotra", imageUrl: "/maps/socotra.png" },
  { id: "baldland", name: "Baldland", imageUrl: "/maps/baldland.png" },
  { id: "mountain-clearing", name: "Mountain Clearing", imageUrl: "/maps/mountain-clearing.png" },
];
