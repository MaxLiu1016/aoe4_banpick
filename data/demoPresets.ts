import type { PresetConfig } from "@/lib/draft/schema";

// Seeded demo presets — baked from the originals so they exist on every fresh DB.
// Public, cloneable, owned by the seeded admin. Do not edit by hand casually.
export const DEMO_PRESETS: { name: string; description: string; config: PresetConfig }[] = [
  {
    "name": "Bo3 Draft",
    "description": "Standard Bo3 — map BP, hand draft, simultaneous offer & snipe.",
    "config": {
      "civs": [
        {
          "id": "english",
          "name": "English",
          "imageUrl": "https://static.wikia.nocookie.net/ageofempires/images/6/6e/English_AoE4.png"
        },
        {
          "id": "french",
          "name": "French",
          "imageUrl": "https://static.wikia.nocookie.net/ageofempires/images/5/5a/French_AoE4.png"
        },
        {
          "id": "holy-roman-empire",
          "name": "Holy Roman Empire",
          "imageUrl": "https://static.wikia.nocookie.net/ageofempires/images/5/58/HRE_AoE4.png"
        },
        {
          "id": "mongols",
          "name": "Mongols",
          "imageUrl": "https://static.wikia.nocookie.net/ageofempires/images/7/70/Mongols_AoE4.png"
        },
        {
          "id": "rus",
          "name": "Rus",
          "imageUrl": "https://static.wikia.nocookie.net/ageofempires/images/5/5d/Rus_AoE4.png"
        },
        {
          "id": "delhi-sultanate",
          "name": "Delhi Sultanate",
          "imageUrl": "https://static.wikia.nocookie.net/ageofempires/images/f/fb/Delhi_Sultanate_AoE4.png"
        },
        {
          "id": "abbasid-dynasty",
          "name": "Abbasid Dynasty",
          "imageUrl": "https://static.wikia.nocookie.net/ageofempires/images/d/d5/Abbasid_Dynasty_AoE4.png"
        },
        {
          "id": "chinese",
          "name": "Chinese",
          "imageUrl": "https://static.wikia.nocookie.net/ageofempires/images/2/20/Chinese_AoE4.png"
        },
        {
          "id": "ottomans",
          "name": "Ottomans",
          "imageUrl": "https://static.wikia.nocookie.net/ageofempires/images/2/2a/Ottomans_AoE4.png"
        },
        {
          "id": "malians",
          "name": "Malians",
          "imageUrl": "https://static.wikia.nocookie.net/ageofempires/images/b/bd/Malians_AoE4.png"
        },
        {
          "id": "byzantines",
          "name": "Byzantines",
          "imageUrl": "https://static.wikia.nocookie.net/ageofempires/images/b/bd/Byzantines_AoE4.png"
        },
        {
          "id": "japanese",
          "name": "Japanese",
          "imageUrl": "https://static.wikia.nocookie.net/ageofempires/images/3/39/Japanese_AoE4.png"
        },
        {
          "id": "ayyubids",
          "name": "Ayyubids",
          "imageUrl": "https://static.wikia.nocookie.net/ageofempires/images/c/ce/Ayyubids_AoE4.png"
        },
        {
          "id": "zhu-xis-legacy",
          "name": "Zhu Xi's Legacy",
          "imageUrl": "https://static.wikia.nocookie.net/ageofempires/images/0/0b/Zhu_Xis_Legacy_AoE4.png"
        },
        {
          "id": "order-of-the-dragon",
          "name": "Order of the Dragon",
          "imageUrl": "https://static.wikia.nocookie.net/ageofempires/images/5/50/Order_of_the_Dragon_AoE4.png"
        },
        {
          "id": "jeanne-darc",
          "name": "Jeanne d'Arc",
          "imageUrl": "https://static.wikia.nocookie.net/ageofempires/images/f/fd/Jeanne_d_Arc_AoE4.png"
        },
        {
          "id": "house-of-lancaster",
          "name": "House of Lancaster",
          "imageUrl": "https://static.wikia.nocookie.net/ageofempires/images/5/53/House_of_Lancaster_AoE4.png"
        },
        {
          "id": "knights-templar",
          "name": "Knights Templar",
          "imageUrl": "https://static.wikia.nocookie.net/ageofempires/images/a/ae/Knights_Templar_AoE4.png"
        },
        {
          "id": "jin-dynasty",
          "name": "Jin Dynasty",
          "imageUrl": "https://static.wikia.nocookie.net/ageofempires/images/8/82/Jin_Dynasty.png"
        },
        {
          "id": "macedonian-dynasty",
          "name": "Macedonian Dynasty",
          "imageUrl": "https://static.wikia.nocookie.net/ageofempires/images/7/70/Macedonian_Dynasty_AoE4.png"
        },
        {
          "id": "golden-horde",
          "name": "Golden Horde",
          "imageUrl": "https://static.wikia.nocookie.net/ageofempires/images/2/2d/Golden_Horde_AoE4.png"
        },
        {
          "id": "sengoku-daimyo",
          "name": "Sengoku Daimyo",
          "imageUrl": "https://static.wikia.nocookie.net/ageofempires/images/3/35/Sengoku_Daimyo_AoE4.png"
        },
        {
          "id": "tughlaq-dynasty",
          "name": "Tughlaq Dynasty",
          "imageUrl": "https://static.wikia.nocookie.net/ageofempires/images/e/e1/Tughlaq_Dynasty_AoE4.png"
        }
      ],
      "maps": [
        {
          "id": "dry-arabia",
          "name": "Dry Arabia"
        },
        {
          "id": "lipany",
          "name": "Lipany"
        },
        {
          "id": "high-view",
          "name": "High View"
        },
        {
          "id": "hill-and-dale",
          "name": "Hill and Dale",
          "imageUrl": "/maps/hill-and-dale.webp"
        },
        {
          "id": "king-of-the-hill",
          "name": "King of the Hill",
          "imageUrl": "/maps/king-of-the-hill.webp"
        },
        {
          "id": "four-lakes",
          "name": "Four Lakes",
          "imageUrl": "/maps/four-lakes.webp"
        },
        {
          "id": "boulder-bay",
          "name": "Boulder Bay",
          "imageUrl": "/maps/boulder-bay.webp"
        }
      ],
      "steps": [
        {
          "id": "MAP_BAN-0",
          "type": "MAP_BAN",
          "actor": "PLAYER1",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": true,
          "label": "P1 · Ban map"
        },
        {
          "id": "MAP_BAN-1",
          "type": "MAP_BAN",
          "actor": "PLAYER2",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": true,
          "label": "P2 · Ban map"
        },
        {
          "id": "CIV_BAN-2",
          "type": "MAP_PICK",
          "actor": "PLAYER1",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": true,
          "label": "P1 · Pick map (into pool)"
        },
        {
          "id": "CIV_BAN-3",
          "type": "MAP_PICK",
          "actor": "PLAYER2",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": true,
          "label": "P2 · Pick map (into pool)"
        },
        {
          "id": "CIV_PICK-4",
          "type": "MAP_PICK",
          "actor": "PLAYER1",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": true,
          "label": "P1 · Pick map (into pool)"
        },
        {
          "id": "GAME_RESULT-25",
          "type": "MAP_PICK",
          "actor": "PLAYER2",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": true,
          "label": "P2 · Pick map (into pool)"
        },
        {
          "id": "09179417-f17d-42b6-bc94-1501f9719a49",
          "type": "MAP_SELECT",
          "actor": "HOST_DRAW",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": true,
          "label": "Random · Select map"
        },
        {
          "id": "6c98d936-f141-42c2-b7a1-1c38ccf1b8d3",
          "type": "CIV_BAN",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": true,
          "label": "P1 · Ban civ"
        },
        {
          "id": "86658e31-f903-4011-971b-0c52162dde6f",
          "type": "CIV_BAN",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": true,
          "label": "P2 · Ban civ"
        },
        {
          "id": "d31394c4-448e-421e-8bbe-575b7a06debe",
          "type": "CIV_BAN",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": true,
          "label": "P1 · Ban civ"
        },
        {
          "id": "da5bc025-4fe8-4db1-aaef-fcd48fd0378f",
          "type": "CIV_BAN",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": true,
          "label": "P2 · Ban civ"
        },
        {
          "id": "52797920-3217-40b8-afbd-40632c173ed1",
          "type": "CIV_PICK",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": true,
          "label": "P1 · Pick civ into pool"
        },
        {
          "id": "85769d14-cc39-45a4-9ead-39b696a42ddb",
          "type": "CIV_PICK",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": true,
          "label": "P2 · Pick civ into pool"
        },
        {
          "id": "defc3fc8-0259-4c62-b1c3-b9ab8cc43bc6",
          "type": "CIV_BAN",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": true,
          "label": "P1 · Ban civ"
        },
        {
          "id": "fca26866-5bac-4e63-b385-2f76ed01e993",
          "type": "CIV_BAN",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": true,
          "label": "P2 · Ban civ"
        },
        {
          "id": "03f9322c-efdc-4089-829a-4566c4523e3b",
          "type": "CIV_PICK",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": true,
          "label": "P1 · Pick civ into pool"
        },
        {
          "id": "861d5641-ca01-44bb-8789-da1ec5ca685e",
          "type": "CIV_PICK",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": true,
          "label": "P2 · Pick civ into pool"
        },
        {
          "id": "ad1bd095-bb01-42d3-a553-0947b8e77823",
          "type": "CIV_PICK",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": true,
          "label": "P1 · Pick civ into pool"
        },
        {
          "id": "14184712-e0ce-4d30-af63-34fa808eec54",
          "type": "CIV_PICK",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": true,
          "label": "P2 · Pick civ into pool"
        },
        {
          "id": "087fd67c-bd85-4134-9dfb-c4533b5307de",
          "type": "CIV_PICK",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": true,
          "label": "P1 · Pick civ into pool"
        },
        {
          "id": "5f56fbdf-14d3-47b7-ba03-8ea2d57682ab",
          "type": "CIV_PICK",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": true,
          "label": "P2 · Pick civ into pool"
        },
        {
          "id": "b5325de9-5083-49a9-85f1-7d5a936668b9",
          "type": "CIV_OFFER",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 2,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": true,
          "label": "Pick civ to field (simultaneous)"
        },
        {
          "id": "39cfea76-31ba-4531-81b2-690a80a32587",
          "type": "CIV_OFFER",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 2,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": true,
          "label": "Pick civ to field (simultaneous)"
        },
        {
          "id": "1ca8fed9-b8ca-44a7-b522-2fe705af95ff",
          "type": "CIV_SNIPE_OPPONENT",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": true,
          "label": "Snipe opponent (simultaneous)"
        },
        {
          "id": "11da54e4-6175-4e8b-8b7a-ba5f9e6ed2bf",
          "type": "CIV_SNIPE_OPPONENT",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": true,
          "label": "Snipe opponent (simultaneous)"
        },
        {
          "id": "0c08202d-531b-4eea-8b38-421f99bc9ab9",
          "type": "GAME_RESULT",
          "actor": "WINNER",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": true,
          "label": "Game result"
        },
        {
          "id": "71cd9347-ec36-4d94-9713-05d1d221faa8",
          "type": "MAP_SELECT",
          "actor": "LOSER",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": true,
          "label": "Loser · Select map"
        },
        {
          "id": "9a97ffbb-e9f5-4691-aef6-0d80fe6e75eb",
          "type": "CIV_OFFER",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 2,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": true,
          "label": "Pick civ to field (simultaneous)"
        },
        {
          "id": "ca70f74c-df03-4748-9e4c-be9a518ad350",
          "type": "CIV_OFFER",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 2,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": true,
          "label": "Pick civ to field (simultaneous)"
        },
        {
          "id": "1e5f44e2-36cb-42cd-a7e3-b8396f2894ad",
          "type": "CIV_SNIPE_OPPONENT",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": true,
          "label": "Snipe opponent (simultaneous)"
        },
        {
          "id": "04cba7c6-31c1-46bb-be82-8b8e8b72f2c4",
          "type": "CIV_SNIPE_OPPONENT",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": true,
          "label": "Snipe opponent (simultaneous)"
        },
        {
          "id": "11acdb2d-1ddf-4a86-af8f-89b2b134ad62",
          "type": "GAME_RESULT",
          "actor": "WINNER",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": true,
          "label": "Game result"
        },
        {
          "id": "14fdbb93-83b5-4b0e-9143-cb29f6554139",
          "type": "MAP_SELECT",
          "actor": "LOSER",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": true,
          "label": "Loser · Select map"
        },
        {
          "id": "0f1e6f22-d17f-49d1-b2f3-44efa5bffd83",
          "type": "CIV_OFFER",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 2,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": true,
          "label": "Pick civ to field (simultaneous)"
        },
        {
          "id": "28c4e603-7562-49be-a0fc-d16b56158026",
          "type": "CIV_OFFER",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": true,
          "label": "Pick civ to field (simultaneous)"
        },
        {
          "id": "9903d2f4-87e4-4f30-bdb6-5b88528dd3a6",
          "type": "CIV_SNIPE_OPPONENT",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": true,
          "label": "Snipe opponent (simultaneous)"
        },
        {
          "id": "d5f5cdc7-15e1-4004-8961-6bd7b41d1b88",
          "type": "CIV_SNIPE_OPPONENT",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": true,
          "label": "Snipe opponent (simultaneous)"
        },
        {
          "id": "487eaa3d-0f70-4944-82dd-6665a667e751",
          "type": "GAME_RESULT",
          "actor": "WINNER",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": true,
          "label": "Game result"
        }
      ],
      "options": {
        "bestOf": 3,
        "publicHover": true,
        "defaultTimeLimitSec": 30,
        "pausable": true
      }
    }
  },
  {
    "name": "easy Bo3 Draft",
    "description": "Simplified Bo3 demo.",
    "config": {
      "civs": [
        {
          "id": "english",
          "name": "English",
          "imageUrl": "https://static.wikia.nocookie.net/ageofempires/images/6/6e/English_AoE4.png"
        },
        {
          "id": "french",
          "name": "French",
          "imageUrl": "https://static.wikia.nocookie.net/ageofempires/images/5/5a/French_AoE4.png"
        },
        {
          "id": "holy-roman-empire",
          "name": "Holy Roman Empire",
          "imageUrl": "https://static.wikia.nocookie.net/ageofempires/images/5/58/HRE_AoE4.png"
        },
        {
          "id": "mongols",
          "name": "Mongols",
          "imageUrl": "https://static.wikia.nocookie.net/ageofempires/images/7/70/Mongols_AoE4.png"
        },
        {
          "id": "rus",
          "name": "Rus",
          "imageUrl": "https://static.wikia.nocookie.net/ageofempires/images/5/5d/Rus_AoE4.png"
        },
        {
          "id": "delhi-sultanate",
          "name": "Delhi Sultanate",
          "imageUrl": "https://static.wikia.nocookie.net/ageofempires/images/f/fb/Delhi_Sultanate_AoE4.png"
        },
        {
          "id": "abbasid-dynasty",
          "name": "Abbasid Dynasty",
          "imageUrl": "https://static.wikia.nocookie.net/ageofempires/images/d/d5/Abbasid_Dynasty_AoE4.png"
        },
        {
          "id": "chinese",
          "name": "Chinese",
          "imageUrl": "https://static.wikia.nocookie.net/ageofempires/images/2/20/Chinese_AoE4.png"
        },
        {
          "id": "ottomans",
          "name": "Ottomans",
          "imageUrl": "https://static.wikia.nocookie.net/ageofempires/images/2/2a/Ottomans_AoE4.png"
        },
        {
          "id": "malians",
          "name": "Malians",
          "imageUrl": "https://static.wikia.nocookie.net/ageofempires/images/b/bd/Malians_AoE4.png"
        },
        {
          "id": "byzantines",
          "name": "Byzantines",
          "imageUrl": "https://static.wikia.nocookie.net/ageofempires/images/b/bd/Byzantines_AoE4.png"
        },
        {
          "id": "japanese",
          "name": "Japanese",
          "imageUrl": "https://static.wikia.nocookie.net/ageofempires/images/3/39/Japanese_AoE4.png"
        },
        {
          "id": "ayyubids",
          "name": "Ayyubids",
          "imageUrl": "https://static.wikia.nocookie.net/ageofempires/images/c/ce/Ayyubids_AoE4.png"
        },
        {
          "id": "zhu-xis-legacy",
          "name": "Zhu Xi's Legacy",
          "imageUrl": "https://static.wikia.nocookie.net/ageofempires/images/0/0b/Zhu_Xis_Legacy_AoE4.png"
        },
        {
          "id": "order-of-the-dragon",
          "name": "Order of the Dragon",
          "imageUrl": "https://static.wikia.nocookie.net/ageofempires/images/5/50/Order_of_the_Dragon_AoE4.png"
        },
        {
          "id": "jeanne-darc",
          "name": "Jeanne d'Arc",
          "imageUrl": "https://static.wikia.nocookie.net/ageofempires/images/f/fd/Jeanne_d_Arc_AoE4.png"
        },
        {
          "id": "house-of-lancaster",
          "name": "House of Lancaster",
          "imageUrl": "https://static.wikia.nocookie.net/ageofempires/images/5/53/House_of_Lancaster_AoE4.png"
        },
        {
          "id": "knights-templar",
          "name": "Knights Templar",
          "imageUrl": "https://static.wikia.nocookie.net/ageofempires/images/a/ae/Knights_Templar_AoE4.png"
        },
        {
          "id": "jin-dynasty",
          "name": "Jin Dynasty",
          "imageUrl": "https://static.wikia.nocookie.net/ageofempires/images/8/82/Jin_Dynasty.png"
        },
        {
          "id": "macedonian-dynasty",
          "name": "Macedonian Dynasty",
          "imageUrl": "https://static.wikia.nocookie.net/ageofempires/images/7/70/Macedonian_Dynasty_AoE4.png"
        },
        {
          "id": "golden-horde",
          "name": "Golden Horde",
          "imageUrl": "https://static.wikia.nocookie.net/ageofempires/images/2/2d/Golden_Horde_AoE4.png"
        },
        {
          "id": "sengoku-daimyo",
          "name": "Sengoku Daimyo",
          "imageUrl": "https://static.wikia.nocookie.net/ageofempires/images/3/35/Sengoku_Daimyo_AoE4.png"
        },
        {
          "id": "tughlaq-dynasty",
          "name": "Tughlaq Dynasty",
          "imageUrl": "https://static.wikia.nocookie.net/ageofempires/images/e/e1/Tughlaq_Dynasty_AoE4.png"
        }
      ],
      "maps": [
        {
          "id": "dry-arabia",
          "name": "Dry Arabia"
        },
        {
          "id": "lipany",
          "name": "Lipany"
        },
        {
          "id": "high-view",
          "name": "High View"
        },
        {
          "id": "hill-and-dale",
          "name": "Hill and Dale",
          "imageUrl": "/maps/hill-and-dale.webp"
        },
        {
          "id": "king-of-the-hill",
          "name": "King of the Hill",
          "imageUrl": "/maps/king-of-the-hill.webp"
        },
        {
          "id": "four-lakes",
          "name": "Four Lakes",
          "imageUrl": "/maps/four-lakes.webp"
        },
        {
          "id": "boulder-bay",
          "name": "Boulder Bay",
          "imageUrl": "/maps/boulder-bay.webp"
        }
      ],
      "steps": [
        {
          "id": "MAP_BAN-0",
          "type": "MAP_BAN",
          "actor": "PLAYER1",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": true,
          "label": "P1 · Ban map"
        },
        {
          "id": "MAP_BAN-1",
          "type": "MAP_BAN",
          "actor": "PLAYER2",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": true,
          "label": "P2 · Ban map"
        },
        {
          "id": "CIV_BAN-2",
          "type": "MAP_PICK",
          "actor": "PLAYER1",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": true,
          "label": "P1 · Pick map (into pool)"
        },
        {
          "id": "CIV_BAN-3",
          "type": "MAP_PICK",
          "actor": "PLAYER2",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": true,
          "label": "P2 · Pick map (into pool)"
        },
        {
          "id": "CIV_PICK-4",
          "type": "MAP_PICK",
          "actor": "PLAYER1",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": true,
          "label": "P1 · Pick map (into pool)"
        },
        {
          "id": "GAME_RESULT-25",
          "type": "MAP_PICK",
          "actor": "PLAYER2",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": true,
          "label": "P2 · Pick map (into pool)"
        },
        {
          "id": "09179417-f17d-42b6-bc94-1501f9719a49",
          "type": "MAP_SELECT",
          "actor": "HOST_DRAW",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": true,
          "label": "Random · Select map"
        },
        {
          "id": "b5325de9-5083-49a9-85f1-7d5a936668b9",
          "type": "CIV_OFFER",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": true,
          "label": "Pick civ to field (simultaneous)"
        },
        {
          "id": "39cfea76-31ba-4531-81b2-690a80a32587",
          "type": "CIV_OFFER",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": true,
          "label": "Pick civ to field (simultaneous)"
        },
        {
          "id": "0c08202d-531b-4eea-8b38-421f99bc9ab9",
          "type": "GAME_RESULT",
          "actor": "WINNER",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": true,
          "label": "Game result"
        },
        {
          "id": "71cd9347-ec36-4d94-9713-05d1d221faa8",
          "type": "MAP_SELECT",
          "actor": "LOSER",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": true,
          "label": "Loser · Select map"
        },
        {
          "id": "9a97ffbb-e9f5-4691-aef6-0d80fe6e75eb",
          "type": "CIV_OFFER",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false,
          "label": "Pick civ to field (simultaneous)"
        },
        {
          "id": "ca70f74c-df03-4748-9e4c-be9a518ad350",
          "type": "CIV_OFFER",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false,
          "label": "Pick civ to field (simultaneous)"
        },
        {
          "id": "11acdb2d-1ddf-4a86-af8f-89b2b134ad62",
          "type": "GAME_RESULT",
          "actor": "WINNER",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false,
          "label": "Game result"
        },
        {
          "id": "14fdbb93-83b5-4b0e-9143-cb29f6554139",
          "type": "MAP_SELECT",
          "actor": "LOSER",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false,
          "label": "Loser · Select map"
        },
        {
          "id": "0f1e6f22-d17f-49d1-b2f3-44efa5bffd83",
          "type": "CIV_OFFER",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false,
          "label": "Pick civ to field (simultaneous)"
        },
        {
          "id": "28c4e603-7562-49be-a0fc-d16b56158026",
          "type": "CIV_OFFER",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false,
          "label": "Pick civ to field (simultaneous)"
        },
        {
          "id": "487eaa3d-0f70-4944-82dd-6665a667e751",
          "type": "GAME_RESULT",
          "actor": "WINNER",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false,
          "label": "Game result"
        }
      ],
      "options": {
        "bestOf": 3,
        "publicHover": true,
        "defaultTimeLimitSec": 30,
        "pausable": true
      }
    }
  }
];
