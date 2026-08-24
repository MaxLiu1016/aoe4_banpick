import type { PresetConfig } from "@/lib/draft/schema";
import { EGC_PRESETS } from "./egcPresets";

export interface DemoPreset {
  /** Identity across renames — the seed matches on this, never on the name. */
  key: string;
  name: string;
  description: string;
  /**
   * Where this sits in the preset list, low first. Demos are the shop window, so
   * which one a newcomer sees at the top is an editorial decision rather than
   * whichever happened to be touched last.
   *
   * Not versioned: it is metadata about presentation, not the rule set, and no
   * admin can reorder demos from the UI — so the seed keeps it in step on every
   * boot without a version bump.
   */
  order: number;
  /** Raise this to hand the demo back to the code: the seed overwrites any copy in
   *  the database whose stored version is lower. Leave it alone and edits made in
   *  the admin UI survive every restart. */
  version: number;
  config: PresetConfig;
}

// Seeded demo presets — baked from the originals so they exist on every fresh DB.
// Public, cloneable, owned by the seeded admin. Do not edit by hand casually.
export const DEMO_PRESETS: DemoPreset[] = [
  {
    "key": "bcc-bo3",
    "order": 20,
    "version": 6,
    "name": "Bo3 Draft(BCC)",
    "description": "For Border Conquest Cup, Standard Bo3 — map BP, hand draft, simultaneous offer & snipe.",
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
          "name": "Dry Arabia",
          "imageUrl": "/maps/dry-arabia.webp"
        },
        {
          "id": "lipany",
          "name": "Lipany",
          "imageUrl": "/maps/lipany.webp"
        },
        {
          "id": "hill-and-dale",
          "name": "Hill and Dale",
          "imageUrl": "/maps/hill-and-dale.webp"
        },
        {
          "id": "four-lakes",
          "name": "Four Lakes",
          "imageUrl": "/maps/four-lakes.webp"
        },
        {
          "id": "frisian-marshes",
          "name": "Frisian Marshes",
          "imageUrl": "/maps/frisian-marshes.webp"
        },
        {
          "id": "cliffside",
          "name": "Cliffside",
          "imageUrl": "/maps/cliffside.webp"
        },
        {
          "id": "kawasan",
          "name": "Kawasan",
          "imageUrl": "/maps/kawasan.webp"
        },
        {
          "id": "coastal-cliffs",
          "name": "Coastal Cliffs",
          "imageUrl": "/maps/coastal-cliffs.webp"
        },
        {
          "id": "gorge",
          "name": "Gorge",
          "imageUrl": "/maps/gorge.webp"
        }
      ],
      "steps": [
        {
          "id": "91fa4d2a-0dc7-44a1-8abc-6cddc98fee38",
          "type": "MAP_BAN",
          "actor": "PLAYER1",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false
        },
        {
          "id": "406934d7-251e-4587-857f-46ff81308b21",
          "type": "MAP_BAN",
          "actor": "PLAYER2",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false
        },
        {
          "id": "99bf221f-b4c2-4e5d-bac3-8595b80cb272",
          "type": "MAP_PICK",
          "actor": "PLAYER1",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false
        },
        {
          "id": "2e34e30b-d48f-407d-9d27-c4a19853c696",
          "type": "MAP_PICK",
          "actor": "PLAYER2",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false
        },
        {
          "id": "587008d2-9d38-40c6-a04d-7afa63a98e6b",
          "type": "MAP_BAN",
          "actor": "PLAYER2",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "banScope": "opponent",
          "pausable": false
        },
        {
          "id": "a4411079-9c61-4816-8254-0bce3f09fe66",
          "type": "MAP_BAN",
          "actor": "PLAYER1",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "banScope": "opponent",
          "pausable": false
        },
        {
          "id": "0c5fc674-7b94-47ea-a4bc-d0b4ab6d6752",
          "type": "MAP_BAN",
          "actor": "PLAYER1",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "banScope": "opponent",
          "pausable": false
        },
        {
          "id": "79d5be73-b70b-45c2-bc32-f84115caf2e3",
          "type": "MAP_BAN",
          "actor": "PLAYER2",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "banScope": "opponent",
          "pausable": false
        },
        {
          "id": "730f90b7-c2f5-4ff1-8455-6908120345fe",
          "type": "MAP_SELECT",
          "mapScope": "shared",
          "actor": "HOST_DRAW",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": true
        },
        {
          "id": "bcc-bo3-map-civ-gate",
          "type": "SYNC_CONFIRM",
          "actor": "HOST_DRAW",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 60,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": true
        },
        {
          "id": "65369351-7905-4dbb-a853-22ac8d89e7f0",
          "type": "CIV_BAN",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "banScope": "opponent",
          "pausable": false
        },
        {
          "id": "79555d71-6850-4104-905c-660c18558e54",
          "type": "CIV_BAN",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "banScope": "opponent",
          "pausable": false
        },
        {
          "id": "de5d8917-081e-4faf-9f7e-7c3129348de5",
          "type": "CIV_BAN",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "banScope": "opponent",
          "pausable": false
        },
        {
          "id": "b2c86a65-213c-4676-855c-11385ddd3ce7",
          "type": "CIV_BAN",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "banScope": "opponent",
          "pausable": false
        },
        {
          "id": "99327e54-211a-46a3-8289-1a25325f6bfc",
          "type": "CIV_PICK",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false
        },
        {
          "id": "66b671c0-0921-4eb8-9834-d8f2eee56c53",
          "type": "CIV_PICK",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false
        },
        {
          "id": "28bb2435-1044-4482-9620-5f5e0b012c80",
          "type": "CIV_PICK",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "banScope": "opponent",
          "pausable": false
        },
        {
          "id": "82b5d107-0bbb-4c1e-bf2c-eca6beb7dfd5",
          "type": "CIV_PICK",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "banScope": "opponent",
          "pausable": false
        },
        {
          "id": "aa5de46d-3879-4bc3-8b9c-1337b28cba3c",
          "type": "CIV_BAN",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "banScope": "opponent",
          "pausable": false
        },
        {
          "id": "465ea5e0-8709-40b7-ad57-5b8958c721b3",
          "type": "CIV_BAN",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "banScope": "opponent",
          "pausable": false
        },
        {
          "id": "4dc8c98b-31f3-4b95-8c20-10b2867d3464",
          "type": "CIV_PICK",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false
        },
        {
          "id": "8a02576f-6c07-4298-a3e6-9e57ec0229e6",
          "type": "CIV_PICK",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false
        },
        {
          "id": "8498f229-26bc-4962-b4cc-d830f5d69a73",
          "type": "CIV_PICK",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false
        },
        {
          "id": "588459e9-a4fc-4cd3-ab7a-c6eb84e4af67",
          "type": "CIV_PICK",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false
        },
        {
          "id": "97219ffc-6cd2-4935-9b33-d1b7a3e39bfb",
          "type": "CIV_PICK",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false
        },
        {
          "id": "bb8a6355-2dc1-431d-b372-fef7955233c3",
          "type": "CIV_PICK",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false
        },
        {
          "id": "290851bf-ab32-46fe-af40-718362ffd725",
          "type": "CIV_OFFER",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 2,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false
        },
        {
          "id": "3ca7bedf-64f7-4be6-b26b-af60e93b8ec0",
          "type": "CIV_SNIPE_OPPONENT",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false
        },
        {
          "id": "227468cf-3918-49fb-90fb-c52729d139d4",
          "type": "GAME_RESULT",
          "actor": "WINNER",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false
        },
        {
          "id": "ec1065bd-7bdc-4544-bb23-89e57a89b8fb",
          "type": "MAP_SELECT",
          "mapScope": "shared",
          "actor": "LOSER",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false
        },
        {
          "id": "confirm-map-9",
          "type": "SYNC_CONFIRM",
          "actor": "WINNER",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 60,
          "showCurrentMap": true,
          "excludeUsedCivs": false,
          "pausable": true
        },
        {
          "id": "0ef8a39e-9851-425a-b508-1bddb69a94d3",
          "type": "CIV_OFFER",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 2,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false
        },
        {
          "id": "99cfa415-92f7-4d88-9219-1875c6cc7a23",
          "type": "CIV_SNIPE_OPPONENT",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false
        },
        {
          "id": "5dddc3cb-004b-4206-8e2d-8250dacb14e7",
          "type": "GAME_RESULT",
          "actor": "WINNER",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false
        },
        {
          "id": "1ad7be64-8bdd-4a47-8600-a52769337832",
          "type": "MAP_SELECT",
          "mapScope": "shared",
          "actor": "LOSER",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false
        },
        {
          "id": "confirm-map-8",
          "type": "SYNC_CONFIRM",
          "actor": "WINNER",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 60,
          "showCurrentMap": true,
          "excludeUsedCivs": false,
          "pausable": true
        },
        {
          "id": "8bc85816-cb99-44cd-aaf5-8ab41f21109e",
          "type": "CIV_OFFER",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 2,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false
        },
        {
          "id": "444fd235-26be-4166-84c9-d7ed7f796d9b",
          "type": "CIV_SNIPE_OPPONENT",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false
        },
        {
          "id": "15c30a12-2623-4eab-b312-0f9913210245",
          "type": "GAME_RESULT",
          "actor": "WINNER",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false
        }
      ],
      "options": {
        "bestOf": 3,
        "publicHover": false,
        "anonymous": false,
        "defaultTimeLimitSec": 30,
        "pausable": false,
        "resultMode": "vote"
      }
    }
  },
  {
    "key": "bcc-bo5",
    "order": 21,
    "version": 6,
    "name": "Bo5 Draft(BCC)",
    "description": "For Border Conquest Cup, Standard Bo5 — map BP, hand draft, simultaneous offer & snipe.",
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
          "name": "Dry Arabia",
          "imageUrl": "/maps/dry-arabia.webp"
        },
        {
          "id": "lipany",
          "name": "Lipany",
          "imageUrl": "/maps/lipany.webp"
        },
        {
          "id": "hill-and-dale",
          "name": "Hill and Dale",
          "imageUrl": "/maps/hill-and-dale.webp"
        },
        {
          "id": "four-lakes",
          "name": "Four Lakes",
          "imageUrl": "/maps/four-lakes.webp"
        },
        {
          "id": "frisian-marshes",
          "name": "Frisian Marshes",
          "imageUrl": "/maps/frisian-marshes.webp"
        },
        {
          "id": "cliffside",
          "name": "Cliffside",
          "imageUrl": "/maps/cliffside.webp"
        },
        {
          "id": "kawasan",
          "name": "Kawasan",
          "imageUrl": "/maps/kawasan.webp"
        },
        {
          "id": "coastal-cliffs",
          "name": "Coastal Cliffs",
          "imageUrl": "/maps/coastal-cliffs.webp"
        },
        {
          "id": "gorge",
          "name": "Gorge",
          "imageUrl": "/maps/gorge.webp"
        }
      ],
      "steps": [
        {
          "id": "c6d9dee7-1415-405b-8f18-36213c360b2d",
          "type": "MAP_BAN",
          "actor": "PLAYER1",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false
        },
        {
          "id": "c45a8b68-1a5d-4cb5-a17d-0eff2bbdfce5",
          "type": "MAP_BAN",
          "actor": "PLAYER2",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false
        },
        {
          "id": "c3996f1d-abf6-49c4-bc0f-6f7bd10a5b08",
          "type": "MAP_PICK",
          "actor": "PLAYER1",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false
        },
        {
          "id": "8b90f35b-6afa-40a5-93f9-c2f106a6c7a7",
          "type": "MAP_PICK",
          "actor": "PLAYER2",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false
        },
        {
          "id": "615b1dca-c71e-4619-9577-079b2b3fd167",
          "type": "MAP_BAN",
          "actor": "PLAYER2",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "banScope": "opponent",
          "pausable": false
        },
        {
          "id": "6fc7afd7-19e9-474a-8a5f-290e7308ce51",
          "type": "MAP_BAN",
          "actor": "PLAYER1",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "banScope": "opponent",
          "pausable": false
        },
        {
          "id": "9fbde93a-45da-45f5-a207-9b5bde273895",
          "type": "MAP_PICK",
          "actor": "PLAYER1",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false
        },
        {
          "id": "32b9c16c-80e8-4ab0-a67e-99b531d099ec",
          "type": "MAP_PICK",
          "actor": "PLAYER2",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false
        },
        {
          "id": "86cbe4f2-4b9b-425b-815a-008dea3c7ee6",
          "type": "MAP_SELECT",
          "mapScope": "shared",
          "actor": "HOST_DRAW",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": true
        },
        {
          "id": "bcc-bo5-map-civ-gate",
          "type": "SYNC_CONFIRM",
          "actor": "HOST_DRAW",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 60,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": true
        },
        {
          "id": "8d751a86-6b8d-478e-926c-3c775fcc6a6b",
          "type": "CIV_BAN",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "banScope": "opponent",
          "pausable": false
        },
        {
          "id": "8511eaa6-4615-4852-80b1-47a019f2b60b",
          "type": "CIV_BAN",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "banScope": "opponent",
          "pausable": false
        },
        {
          "id": "52d45158-14e4-4971-8bc6-1da623e21e2f",
          "type": "CIV_BAN",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "banScope": "opponent",
          "pausable": false
        },
        {
          "id": "b842cc60-f5a1-46a7-8699-e18db65397d6",
          "type": "CIV_BAN",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "banScope": "opponent",
          "pausable": false
        },
        {
          "id": "87415aa8-410c-4c78-b663-f2bf975f3388",
          "type": "CIV_PICK",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false
        },
        {
          "id": "c894512b-48e5-414e-a6a6-76ae2ad66893",
          "type": "CIV_PICK",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false
        },
        {
          "id": "5e770f85-6dd3-4e5a-bc4a-c0b607fa13a4",
          "type": "CIV_PICK",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "banScope": "opponent",
          "pausable": false
        },
        {
          "id": "d5917885-2e60-4340-95e9-18cee63d7484",
          "type": "CIV_PICK",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "banScope": "opponent",
          "pausable": false
        },
        {
          "id": "98f60338-0b4d-4b9f-b341-bdd17d13a3b4",
          "type": "CIV_BAN",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "banScope": "opponent",
          "pausable": false
        },
        {
          "id": "fa32c845-1baa-4d1e-846c-bb0eb91a7494",
          "type": "CIV_BAN",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "banScope": "opponent",
          "pausable": false
        },
        {
          "id": "02c88a4f-0dd6-4ab4-81c7-e672bac5131a",
          "type": "CIV_PICK",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false
        },
        {
          "id": "6543a77b-a8b6-4a5f-9c14-3b3b983abb20",
          "type": "CIV_PICK",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false
        },
        {
          "id": "700ace3c-5334-4b93-9b6b-97649889dddf",
          "type": "CIV_PICK",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false
        },
        {
          "id": "c851d051-1588-47c0-bb4d-5825b32e5184",
          "type": "CIV_PICK",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false
        },
        {
          "id": "0bcd320c-53b1-4f0e-bf76-bec96a581598",
          "type": "CIV_PICK",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false
        },
        {
          "id": "db1e01f8-ad40-4c79-be61-3e7df58b8f92",
          "type": "CIV_PICK",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false
        },
        {
          "id": "ff80aa47-ffd5-45c3-bbb0-70b3eb28dec3",
          "type": "CIV_PICK",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "banScope": "opponent",
          "pausable": false
        },
        {
          "id": "2070ec84-0951-4d8a-802e-5eea8ca0f946",
          "type": "CIV_PICK",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "banScope": "opponent",
          "pausable": false
        },
        {
          "id": "f2df94ab-fec6-4752-84e7-36978c056326",
          "type": "CIV_PICK",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "banScope": "opponent",
          "pausable": false
        },
        {
          "id": "83eb8d14-f96f-47e0-9d71-d2420f9f1f5e",
          "type": "CIV_PICK",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "banScope": "opponent",
          "pausable": false
        },
        {
          "id": "053a05fc-7c6e-4fe3-9a76-53934a365410",
          "type": "CIV_OFFER",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 2,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false
        },
        {
          "id": "1edd0e13-e73a-4d65-9b6d-f6e0d4701d7c",
          "type": "CIV_SNIPE_OPPONENT",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false
        },
        {
          "id": "bf64deb4-5238-4c17-9af1-8f4084817139",
          "type": "GAME_RESULT",
          "actor": "WINNER",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false
        },
        {
          "id": "a2c1a987-7121-4c53-8a80-9c97381dd398",
          "type": "MAP_SELECT",
          "mapScope": "shared",
          "actor": "LOSER",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false
        },
        {
          "id": "confirm-map-7",
          "type": "SYNC_CONFIRM",
          "actor": "WINNER",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 60,
          "showCurrentMap": true,
          "excludeUsedCivs": false,
          "pausable": true
        },
        {
          "id": "08a58288-f36a-4d7f-89d8-fecbd7b5d7c2",
          "type": "CIV_OFFER",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 2,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false
        },
        {
          "id": "2c341893-895d-46a6-9b59-4dfa5f7a8e39",
          "type": "CIV_SNIPE_OPPONENT",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false
        },
        {
          "id": "b8a21ee9-17e4-45f5-9678-0d33d310e052",
          "type": "GAME_RESULT",
          "actor": "WINNER",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false
        },
        {
          "id": "5d824f69-96f4-491f-afed-aeeae25b54ba",
          "type": "MAP_SELECT",
          "mapScope": "shared",
          "actor": "LOSER",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false
        },
        {
          "id": "confirm-map-6",
          "type": "SYNC_CONFIRM",
          "actor": "WINNER",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 60,
          "showCurrentMap": true,
          "excludeUsedCivs": false,
          "pausable": true
        },
        {
          "id": "01c1425d-0e39-4a13-8c06-09f197694bbb",
          "type": "CIV_OFFER",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 2,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false
        },
        {
          "id": "a78e112f-00aa-423c-b06f-b0c7e0172e7c",
          "type": "CIV_SNIPE_OPPONENT",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false
        },
        {
          "id": "671f1e95-71ba-4791-bffe-3b5705f21441",
          "type": "GAME_RESULT",
          "actor": "WINNER",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false
        },
        {
          "id": "8855d05a-be85-4b5d-bd59-392282fb65d1",
          "type": "MAP_SELECT",
          "mapScope": "shared",
          "actor": "LOSER",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false
        },
        {
          "id": "confirm-map-5",
          "type": "SYNC_CONFIRM",
          "actor": "WINNER",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 60,
          "showCurrentMap": true,
          "excludeUsedCivs": false,
          "pausable": true
        },
        {
          "id": "4e7a6606-35ae-44b1-bfeb-96448cd8c3fc",
          "type": "CIV_OFFER",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 2,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false
        },
        {
          "id": "458cfe29-26e3-4c95-99aa-34b6a24aed32",
          "type": "CIV_SNIPE_OPPONENT",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false
        },
        {
          "id": "89a965c5-3b3a-4c73-a4f9-1de8ab74b3de",
          "type": "GAME_RESULT",
          "actor": "WINNER",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false
        },
        {
          "id": "bb7da104-471e-42e5-9782-2bea82480f4b",
          "type": "MAP_SELECT",
          "mapScope": "shared",
          "actor": "LOSER",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false
        },
        {
          "id": "confirm-map-4",
          "type": "SYNC_CONFIRM",
          "actor": "WINNER",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 60,
          "showCurrentMap": true,
          "excludeUsedCivs": false,
          "pausable": true
        },
        {
          "id": "7c2f8a8a-bf6b-4e78-a009-3cd76dcc1dc8",
          "type": "CIV_OFFER",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 2,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false
        },
        {
          "id": "4d64f709-deec-44dd-b3c2-aa353169d93f",
          "type": "CIV_SNIPE_OPPONENT",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false
        },
        {
          "id": "e865efa4-856d-4b15-a556-f70342ec3388",
          "type": "GAME_RESULT",
          "actor": "WINNER",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false
        }
      ],
      "options": {
        "bestOf": 5,
        "publicHover": false,
        "anonymous": false,
        "defaultTimeLimitSec": 30,
        "pausable": false,
        "resultMode": "vote"
      }
    }
  },
  {
    "key": "standard-bo3",
    "order": 30,
    "version": 3,
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
          "name": "Dry Arabia",
          "imageUrl": "/maps/dry-arabia.webp"
        },
        {
          "id": "lipany",
          "name": "Lipany",
          "imageUrl": "/maps/lipany.webp"
        },
        {
          "id": "cliffside",
          "name": "Cliffside",
          "imageUrl": "/maps/cliffside.webp"
        },
        {
          "id": "hill-and-dale",
          "name": "Hill and Dale",
          "imageUrl": "/maps/hill-and-dale.webp"
        },
        {
          "id": "four-lakes",
          "name": "Four Lakes",
          "imageUrl": "/maps/four-lakes.webp"
        },
        {
          "id": "king-of-the-hill",
          "name": "King of the Hill",
          "imageUrl": "/maps/king-of-the-hill.webp"
        },
        {
          "id": "high-view",
          "name": "High View",
          "imageUrl": "/maps/high-view.webp"
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
          "pausable": true
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
          "pausable": true
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
          "pausable": true
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
          "pausable": true
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
          "pausable": true
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
          "pausable": true
        },
        {
          "id": "09179417-f17d-42b6-bc94-1501f9719a49",
          "type": "MAP_SELECT",
          "mapScope": "shared",
          "actor": "HOST_DRAW",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": true
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
          "banScope": "opponent",
          "pausable": true
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
          "banScope": "opponent",
          "pausable": true
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
          "banScope": "opponent",
          "pausable": true
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
          "banScope": "opponent",
          "pausable": true
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
          "pausable": true
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
          "pausable": true
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
          "banScope": "opponent",
          "pausable": true
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
          "banScope": "opponent",
          "pausable": true
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
          "pausable": true
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
          "pausable": true
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
          "pausable": true
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
          "pausable": true
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
          "pausable": true
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
          "pausable": true
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
          "pausable": true
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
          "pausable": true
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
          "pausable": true
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
          "pausable": true
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
          "pausable": true
        },
        {
          "id": "71cd9347-ec36-4d94-9713-05d1d221faa8",
          "type": "MAP_SELECT",
          "mapScope": "shared",
          "actor": "LOSER",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": true
        },
        {
          "id": "confirm-map-3",
          "type": "SYNC_CONFIRM",
          "actor": "WINNER",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 60,
          "showCurrentMap": true,
          "excludeUsedCivs": false,
          "pausable": true
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
          "pausable": true
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
          "pausable": true
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
          "pausable": true
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
          "pausable": true
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
          "pausable": true
        },
        {
          "id": "14fdbb93-83b5-4b0e-9143-cb29f6554139",
          "type": "MAP_SELECT",
          "mapScope": "shared",
          "actor": "LOSER",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": true
        },
        {
          "id": "confirm-map-2",
          "type": "SYNC_CONFIRM",
          "actor": "WINNER",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 60,
          "showCurrentMap": true,
          "excludeUsedCivs": false,
          "pausable": true
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
          "pausable": true
        },
        {
          "id": "28c4e603-7562-49be-a0fc-d16b56158026",
          "type": "CIV_OFFER",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 2,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": true
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
          "pausable": true
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
          "pausable": true
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
          "pausable": true
        }
      ],
      "options": {
        "bestOf": 3,
        "publicHover": false,
        "anonymous": false,
        "defaultTimeLimitSec": 30,
        "pausable": true,
        "resultMode": "vote"
      }
    }
  },
  {
    "key": "easy-bo3",
    "order": 31,
    "version": 4,
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
          "name": "Dry Arabia",
          "imageUrl": "/maps/dry-arabia.webp"
        },
        {
          "id": "lipany",
          "name": "Lipany",
          "imageUrl": "/maps/lipany.webp"
        },
        {
          "id": "high-view",
          "name": "High View",
          "imageUrl": "/maps/high-view.webp"
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
          "pausable": true
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
          "pausable": true
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
          "pausable": true
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
          "pausable": true
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
          "pausable": true
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
          "pausable": true
        },
        {
          "id": "09179417-f17d-42b6-bc94-1501f9719a49",
          "type": "MAP_SELECT",
          "mapScope": "shared",
          "actor": "HOST_DRAW",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": true
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
          "pausable": true
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
          "pausable": true
        },
        {
          "id": "71cd9347-ec36-4d94-9713-05d1d221faa8",
          "type": "MAP_SELECT",
          "mapScope": "shared",
          "actor": "LOSER",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": true
        },
        {
          "id": "confirm-map-1",
          "type": "SYNC_CONFIRM",
          "actor": "WINNER",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 60,
          "showCurrentMap": true,
          "excludeUsedCivs": false,
          "pausable": true
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
          "pausable": false
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
          "pausable": false
        },
        {
          "id": "14fdbb93-83b5-4b0e-9143-cb29f6554139",
          "type": "MAP_SELECT",
          "mapScope": "shared",
          "actor": "LOSER",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false
        },
        {
          "id": "confirm-map-0",
          "type": "SYNC_CONFIRM",
          "actor": "WINNER",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 60,
          "showCurrentMap": true,
          "excludeUsedCivs": false,
          "pausable": true
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
          "pausable": false
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
          "pausable": false
        }
      ],
      "options": {
        "bestOf": 3,
        "publicHover": false,
        "anonymous": false,
        "resultMode": "vote",
        "defaultTimeLimitSec": 30,
        "pausable": true
      }
    }
  },
  // Generated rather than pasted — see data/egcPresets.ts.
  ...EGC_PRESETS,
];
