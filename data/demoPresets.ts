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
          "banScope": "opponent",
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
          "banScope": "opponent",
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
          "banScope": "opponent",
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
          "banScope": "opponent",
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
          "banScope": "opponent",
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
          "banScope": "opponent",
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
        "resultMode": "vote",
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
        "resultMode": "vote",
        "defaultTimeLimitSec": 30,
        "pausable": true
      }
    }
  },
  {
    "name": "Bo5 Draft",
    "description": "Standard Bo5 — map BP, hand draft, simultaneous offer & snipe.",
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
          "id": "64a8abab-9dfe-4cab-8aeb-db1ba27cf08a",
          "type": "MAP_BAN",
          "actor": "PLAYER1",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": false,
          "pausable": true,
          "label": "P1 · Ban map"
        },
        {
          "id": "79a2e5cb-95ab-4d0e-be76-d7c50cd4e6cc",
          "type": "MAP_BAN",
          "actor": "PLAYER2",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": false,
          "pausable": true,
          "label": "P2 · Ban map"
        },
        {
          "id": "22b17003-1869-4730-8ec5-ecf7d380af06",
          "type": "MAP_PICK",
          "actor": "PLAYER1",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": false,
          "pausable": true,
          "label": "P1 · Pick map (into pool)"
        },
        {
          "id": "36985902-e2b1-4089-8422-2c3053d56afe",
          "type": "MAP_PICK",
          "actor": "PLAYER2",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": false,
          "pausable": true,
          "label": "P2 · Pick map (into pool)"
        },
        {
          "id": "6f14a711-96cc-4c66-b267-ff74859a67df",
          "type": "MAP_PICK",
          "actor": "PLAYER1",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": false,
          "pausable": true,
          "label": "P1 · Pick map (into pool)"
        },
        {
          "id": "02932648-9d5b-4431-90e3-76a2f6037f13",
          "type": "MAP_PICK",
          "actor": "PLAYER2",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": false,
          "pausable": true,
          "label": "P2 · Pick map (into pool)"
        },
        {
          "id": "fbc20c5b-6f6a-40ff-acb5-af3554a99825",
          "type": "MAP_SELECT",
          "actor": "HOST_DRAW",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": false,
          "pausable": true,
          "label": "Random · Select map"
        },
        {
          "id": "09f99454-cbab-4db5-a5a0-2a0b27403c2e",
          "type": "CIV_BAN",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": false,
          "pausable": true,
          "banScope": "opponent",
          "label": "P1 · Ban civ"
        },
        {
          "id": "dfbaf2db-6da6-4c59-84ce-0098f80a8326",
          "type": "CIV_BAN",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": false,
          "pausable": true,
          "banScope": "opponent",
          "label": "P2 · Ban civ"
        },
        {
          "id": "2a4cf309-6837-4997-86a4-58ef96efe116",
          "type": "CIV_BAN",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": false,
          "pausable": true,
          "banScope": "opponent",
          "label": "P1 · Ban civ"
        },
        {
          "id": "f4d18811-f56f-439d-b57d-70fb6df4a45d",
          "type": "CIV_BAN",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": false,
          "pausable": true,
          "banScope": "opponent",
          "label": "P2 · Ban civ"
        },
        {
          "id": "ffb4a017-e269-46f0-a46f-1212cbb27b54",
          "type": "CIV_BAN",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": false,
          "pausable": true,
          "banScope": "opponent",
          "label": "P1 · Ban civ"
        },
        {
          "id": "01a84531-063e-42ec-9e33-47ee497fdb07",
          "type": "CIV_BAN",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": false,
          "pausable": true,
          "banScope": "opponent",
          "label": "P2 · Ban civ"
        },
        {
          "id": "ff90c301-85f9-4355-a906-181eecbf9682",
          "type": "CIV_PICK",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": false,
          "pausable": true,
          "label": "P1 · Pick civ into pool"
        },
        {
          "id": "ea0ff5df-8760-4cb2-bea1-2f847fc580e1",
          "type": "CIV_PICK",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": false,
          "pausable": true,
          "label": "P2 · Pick civ into pool"
        },
        {
          "id": "1592f10c-ec9a-4e03-bdf7-9c4d4e91523a",
          "type": "CIV_PICK",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": false,
          "pausable": true,
          "label": "P1 · Pick civ into pool"
        },
        {
          "id": "db2148e1-cfd2-41ee-881e-a131557f77b6",
          "type": "CIV_PICK",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": false,
          "pausable": true,
          "label": "P2 · Pick civ into pool"
        },
        {
          "id": "0098802d-9500-4343-8364-17bdfb62101b",
          "type": "CIV_PICK",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": false,
          "pausable": true,
          "label": "P1 · Pick civ into pool"
        },
        {
          "id": "ad624f39-703d-448b-818f-3b03979f3f18",
          "type": "CIV_PICK",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": false,
          "pausable": true,
          "label": "P2 · Pick civ into pool"
        },
        {
          "id": "c7bc983d-6ea0-4526-a766-a03a1b2bd69c",
          "type": "CIV_PICK",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": false,
          "pausable": true,
          "label": "P1 · Pick civ into pool"
        },
        {
          "id": "abc8af0c-89c6-4b04-a536-3b210af9a33a",
          "type": "CIV_PICK",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": false,
          "pausable": true,
          "label": "P2 · Pick civ into pool"
        },
        {
          "id": "2a6daf98-de8e-4d78-8a16-a403cf6d56f9",
          "type": "CIV_PICK",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": false,
          "pausable": true,
          "label": "P1 · Pick civ into pool"
        },
        {
          "id": "5d565ea9-0d28-4458-8e51-663145c0cbbd",
          "type": "CIV_PICK",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": false,
          "pausable": true,
          "label": "P2 · Pick civ into pool"
        },
        {
          "id": "1213334e-7136-48cb-abe0-224d1ba4b0b5",
          "type": "CIV_PICK",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": false,
          "pausable": true,
          "label": "P1 · Pick civ into pool"
        },
        {
          "id": "aeb47f73-8364-44d3-bdf9-c57ba0f5fc4a",
          "type": "CIV_PICK",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": false,
          "pausable": true,
          "label": "P2 · Pick civ into pool"
        },
        {
          "id": "caa4d068-cbd1-4097-a437-8cd971afbadd",
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
          "id": "9084c4ea-4389-4bbe-b0d5-d0e64e5b3148",
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
          "id": "b748ca4e-1f58-44cc-a7da-11736f2c6f4d",
          "type": "CIV_SNIPE_OPPONENT",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": true,
          "excludeUsedCivs": false,
          "pausable": true,
          "label": "Snipe opponent (simultaneous)"
        },
        {
          "id": "dc552d5e-312d-4356-8682-c9df9a3a80b9",
          "type": "CIV_SNIPE_OPPONENT",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": true,
          "excludeUsedCivs": false,
          "pausable": true,
          "label": "Snipe opponent (simultaneous)"
        },
        {
          "id": "4cf1e1ec-b15d-4095-9803-cc4c2181a04c",
          "type": "GAME_RESULT",
          "actor": "WINNER",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": true,
          "excludeUsedCivs": false,
          "pausable": true,
          "label": "Game result"
        },
        {
          "id": "67a55522-03e9-4f25-980a-0679efd48ad7",
          "type": "MAP_SELECT",
          "actor": "LOSER",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": false,
          "pausable": true,
          "label": "Loser · Select map"
        },
        {
          "id": "42e302a1-8e28-4c7f-a17a-f67bb87152e2",
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
          "id": "f8b9904a-22ec-4553-be26-24a23cb07538",
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
          "id": "3778cf35-6bcd-4dd8-b2b1-1c319fc0f99e",
          "type": "CIV_SNIPE_OPPONENT",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": true,
          "excludeUsedCivs": false,
          "pausable": true,
          "label": "Snipe opponent (simultaneous)"
        },
        {
          "id": "9e3b389a-3ff4-4b9b-a113-56083d1b9d40",
          "type": "CIV_SNIPE_OPPONENT",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": true,
          "excludeUsedCivs": false,
          "pausable": true,
          "label": "Snipe opponent (simultaneous)"
        },
        {
          "id": "804ee0e8-bc9e-423e-b377-84f0016fd8b7",
          "type": "GAME_RESULT",
          "actor": "WINNER",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": true,
          "excludeUsedCivs": false,
          "pausable": true,
          "label": "Game result"
        },
        {
          "id": "da731644-bcb3-4b71-ba06-50fd24a2ef2d",
          "type": "MAP_SELECT",
          "actor": "LOSER",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": false,
          "pausable": true,
          "label": "Loser · Select map"
        },
        {
          "id": "e98a3846-5d79-456b-a96b-03d60bd02bd0",
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
          "id": "3e81f43f-780e-42ce-8d18-fd69f2022f21",
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
          "id": "dbc4aa33-2d01-42d3-9998-4605a024e0ae",
          "type": "CIV_SNIPE_OPPONENT",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": true,
          "excludeUsedCivs": false,
          "pausable": true,
          "label": "Snipe opponent (simultaneous)"
        },
        {
          "id": "204a9da5-89ee-4980-b751-d1399889bf5c",
          "type": "CIV_SNIPE_OPPONENT",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": true,
          "excludeUsedCivs": false,
          "pausable": true,
          "label": "Snipe opponent (simultaneous)"
        },
        {
          "id": "913ad0b8-cc0c-4012-814e-149516ba11a3",
          "type": "GAME_RESULT",
          "actor": "WINNER",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": true,
          "excludeUsedCivs": false,
          "pausable": true,
          "label": "Game result"
        },
        {
          "id": "5f59fb24-4220-4057-a364-5e9302eab592",
          "type": "MAP_SELECT",
          "actor": "LOSER",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": false,
          "pausable": true,
          "label": "Loser · Select map"
        },
        {
          "id": "fd7273f1-1a2f-4cbd-ba67-1470475f2a88",
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
          "id": "ba20e941-b154-4732-9564-859c9ba352bc",
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
          "id": "4cbd91cc-1be8-4009-a68c-8e6f6f0a70d0",
          "type": "CIV_SNIPE_OPPONENT",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": true,
          "excludeUsedCivs": false,
          "pausable": true,
          "label": "Snipe opponent (simultaneous)"
        },
        {
          "id": "77f548e3-5de4-46b7-8a74-4f463877296c",
          "type": "CIV_SNIPE_OPPONENT",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": true,
          "excludeUsedCivs": false,
          "pausable": true,
          "label": "Snipe opponent (simultaneous)"
        },
        {
          "id": "2c98ba6f-b3d1-4624-b2fe-f9d63aa9a917",
          "type": "GAME_RESULT",
          "actor": "WINNER",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": true,
          "excludeUsedCivs": false,
          "pausable": true,
          "label": "Game result"
        },
        {
          "id": "5bde45bf-cdf8-4844-b1a9-f5e5d4a0f78b",
          "type": "MAP_SELECT",
          "actor": "LOSER",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": false,
          "pausable": true,
          "label": "Loser · Select map"
        },
        {
          "id": "31ec9f0e-e19d-4406-9679-66af2d3fe0e9",
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
          "id": "7e200eef-e9af-4578-8e6a-14ab0e3c81bc",
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
          "id": "a6d84445-12b4-4e2b-a681-6adc3be8e6c8",
          "type": "CIV_SNIPE_OPPONENT",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": true,
          "excludeUsedCivs": false,
          "pausable": true,
          "label": "Snipe opponent (simultaneous)"
        },
        {
          "id": "83c2583c-295a-4635-bdab-666e74926adc",
          "type": "CIV_SNIPE_OPPONENT",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": true,
          "excludeUsedCivs": false,
          "pausable": true,
          "label": "Snipe opponent (simultaneous)"
        },
        {
          "id": "08c6db94-de4a-4b1c-b0ed-32956487ed82",
          "type": "GAME_RESULT",
          "actor": "WINNER",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": true,
          "excludeUsedCivs": false,
          "pausable": true,
          "label": "Game result"
        }
      ],
      "options": {
        "bestOf": 5,
        "publicHover": true,
        "resultMode": "vote",
        "defaultTimeLimitSec": 30,
        "pausable": true
      }
    }
  }
];
