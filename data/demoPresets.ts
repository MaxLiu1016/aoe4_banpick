import type { PresetConfig } from "@/lib/draft/schema";

// Seeded demo presets — baked from the originals so they exist on every fresh DB.
// Public, cloneable, owned by the seeded admin. Do not edit by hand casually.
export const DEMO_PRESETS: { name: string; description: string; config: PresetConfig }[] = [
  {
    "name": "Bo3 Draft(BCC)",
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
          "imageUrl": "/maps/kawasan.png"
        },
        {
          "id": "coastal-cliffs",
          "name": "Coastal Cliffs",
          "imageUrl": "/maps/coastal-cliffs.png"
        },
        {
          "id": "gorge",
          "name": "Gorge",
          "imageUrl": "/maps/gorge.webp"
        }
      ],
      "options": {
        "bestOf": 3,
        "publicHover": true,
        "defaultTimeLimitSec": 30,
        "pausable": false,
        "resultMode": "vote"
      },
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
          "pausable": false,
          "label": "P1 · Ban map"
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
          "pausable": false,
          "label": "P2 · Ban map"
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
          "pausable": false,
          "label": "P1 · Pick map (into pool)"
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
          "pausable": false,
          "label": "P2 · Pick map (into pool)"
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
          "pausable": false,
          "label": "P2 · Ban map"
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
          "pausable": false,
          "label": "P1 · Ban map"
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
          "pausable": false,
          "label": "P1 · Ban map"
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
          "pausable": false,
          "label": "P2 · Ban map"
        },
        {
          "id": "730f90b7-c2f5-4ff1-8455-6908120345fe",
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
          "id": "65369351-7905-4dbb-a853-22ac8d89e7f0",
          "type": "CIV_BAN",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "banScope": "opponent",
          "pausable": false,
          "label": "P1 · Ban civ"
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
          "pausable": false,
          "label": "P2 · Ban civ"
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
          "pausable": false,
          "label": "P1 · Ban civ"
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
          "pausable": false,
          "label": "P2 · Ban civ"
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
          "pausable": false,
          "label": "P1 · Pick civ into pool"
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
          "pausable": false,
          "label": "P2 · Pick civ into pool"
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
          "pausable": false,
          "label": "P2 · Pick civ into pool"
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
          "pausable": false,
          "label": "P1 · Pick civ into pool"
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
          "pausable": false,
          "label": "P2 · Ban civ"
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
          "pausable": false,
          "label": "P1 · Ban civ"
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
          "pausable": false,
          "label": "P1 · Pick civ into pool"
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
          "pausable": false,
          "label": "P2 · Pick civ into pool"
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
          "pausable": false,
          "label": "P1 · Pick civ into pool"
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
          "pausable": false,
          "label": "P2 · Pick civ into pool"
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
          "pausable": false,
          "label": "P1 · Pick civ into pool"
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
          "pausable": false,
          "label": "P2 · Pick civ into pool"
        },
        {
          "id": "46c7d40a-424a-4837-87f9-6b18e6311783",
          "type": "CIV_PICK",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "banScope": "opponent",
          "pausable": false,
          "label": "P1 · Pick civ into pool"
        },
        {
          "id": "f269608a-8832-4265-9221-aa7bec06a0c5",
          "type": "CIV_PICK",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "banScope": "opponent",
          "pausable": false,
          "label": "P2 · Pick civ into pool"
        },
        {
          "id": "ae23d3b4-d48c-41e4-8e60-cefe78776a17",
          "type": "CIV_PICK",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "banScope": "opponent",
          "pausable": false,
          "label": "P1 · Pick civ into pool"
        },
        {
          "id": "021508ad-653d-482e-b892-d261c4530da8",
          "type": "CIV_PICK",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "banScope": "opponent",
          "pausable": false,
          "label": "P2 · Pick civ into pool"
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
          "pausable": false,
          "label": "Pick civ to field (simultaneous)"
        },
        {
          "id": "7e426b6f-2150-4a06-afe4-ea8f0f30a526",
          "type": "CIV_OFFER",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 2,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false,
          "label": "Pick civ to field (simultaneous)"
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
          "pausable": false,
          "label": "Snipe opponent (simultaneous)"
        },
        {
          "id": "9edda4e6-ee1e-4eb2-9212-02c428ed55e3",
          "type": "CIV_SNIPE_OPPONENT",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false,
          "label": "Snipe opponent (simultaneous)"
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
          "pausable": false,
          "label": "Game result"
        },
        {
          "id": "ec1065bd-7bdc-4544-bb23-89e57a89b8fb",
          "type": "MAP_SELECT",
          "actor": "LOSER",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false,
          "label": "Loser · Select map"
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
          "pausable": false,
          "label": "Pick civ to field (simultaneous)"
        },
        {
          "id": "1d01b4c0-123c-4bfe-a8d6-235356b4c334",
          "type": "CIV_OFFER",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 2,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false,
          "label": "Pick civ to field (simultaneous)"
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
          "pausable": false,
          "label": "Snipe opponent (simultaneous)"
        },
        {
          "id": "915e464c-ac1e-4adc-9005-8d9ba94b891c",
          "type": "CIV_SNIPE_OPPONENT",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false,
          "label": "Snipe opponent (simultaneous)"
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
          "pausable": false,
          "label": "Game result"
        },
        {
          "id": "1ad7be64-8bdd-4a47-8600-a52769337832",
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
          "id": "8bc85816-cb99-44cd-aaf5-8ab41f21109e",
          "type": "CIV_OFFER",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 2,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false,
          "label": "Pick civ to field (simultaneous)"
        },
        {
          "id": "dc57d221-466f-4a51-ae09-1bbbddda80fe",
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
          "id": "444fd235-26be-4166-84c9-d7ed7f796d9b",
          "type": "CIV_SNIPE_OPPONENT",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false,
          "label": "Snipe opponent (simultaneous)"
        },
        {
          "id": "29d28028-1b2a-4971-8e9c-81c2a55fe382",
          "type": "CIV_SNIPE_OPPONENT",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false,
          "label": "Snipe opponent (simultaneous)"
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
          "pausable": false,
          "label": "Game result"
        }
      ]
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
    "name": "Bo5 Draft(BCC)",
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
          "imageUrl": "/maps/kawasan.png"
        },
        {
          "id": "coastal-cliffs",
          "name": "Coastal Cliffs",
          "imageUrl": "/maps/coastal-cliffs.png"
        },
        {
          "id": "gorge",
          "name": "Gorge",
          "imageUrl": "/maps/gorge.webp"
        }
      ],
      "options": {
        "bestOf": 5,
        "publicHover": true,
        "defaultTimeLimitSec": 30,
        "pausable": false,
        "resultMode": "vote"
      },
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
          "pausable": false,
          "label": "P1 · Ban map"
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
          "pausable": false,
          "label": "P2 · Ban map"
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
          "pausable": false,
          "label": "P1 · Pick map (into pool)"
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
          "pausable": false,
          "label": "P2 · Pick map (into pool)"
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
          "pausable": false,
          "label": "P2 · Ban map"
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
          "pausable": false,
          "label": "P1 · Ban map"
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
          "pausable": false,
          "label": "P1 · Ban map"
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
          "pausable": false,
          "label": "P2 · Ban map"
        },
        {
          "id": "86cbe4f2-4b9b-425b-815a-008dea3c7ee6",
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
          "id": "8d751a86-6b8d-478e-926c-3c775fcc6a6b",
          "type": "CIV_BAN",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "banScope": "opponent",
          "pausable": false,
          "label": "P1 · Ban civ"
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
          "pausable": false,
          "label": "P2 · Ban civ"
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
          "pausable": false,
          "label": "P1 · Ban civ"
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
          "pausable": false,
          "label": "P2 · Ban civ"
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
          "pausable": false,
          "label": "P1 · Pick civ into pool"
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
          "pausable": false,
          "label": "P2 · Pick civ into pool"
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
          "pausable": false,
          "label": "P2 · Pick civ into pool"
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
          "pausable": false,
          "label": "P1 · Pick civ into pool"
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
          "pausable": false,
          "label": "P2 · Ban civ"
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
          "pausable": false,
          "label": "P1 · Ban civ"
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
          "pausable": false,
          "label": "P1 · Pick civ into pool"
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
          "pausable": false,
          "label": "P2 · Pick civ into pool"
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
          "pausable": false,
          "label": "P1 · Pick civ into pool"
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
          "pausable": false,
          "label": "P2 · Pick civ into pool"
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
          "pausable": false,
          "label": "P1 · Pick civ into pool"
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
          "pausable": false,
          "label": "P2 · Pick civ into pool"
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
          "pausable": false,
          "label": "P1 · Pick civ into pool"
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
          "pausable": false,
          "label": "P2 · Pick civ into pool"
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
          "pausable": false,
          "label": "P1 · Pick civ into pool"
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
          "pausable": false,
          "label": "P2 · Pick civ into pool"
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
          "pausable": false,
          "label": "Pick civ to field (simultaneous)"
        },
        {
          "id": "1248267c-cca1-42a3-85d8-45152adbc217",
          "type": "CIV_OFFER",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 2,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false,
          "label": "Pick civ to field (simultaneous)"
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
          "pausable": false,
          "label": "Snipe opponent (simultaneous)"
        },
        {
          "id": "c9f7059a-b3e7-4ada-a25d-d831ca8702de",
          "type": "CIV_SNIPE_OPPONENT",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false,
          "label": "Snipe opponent (simultaneous)"
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
          "pausable": false,
          "label": "Game result"
        },
        {
          "id": "a2c1a987-7121-4c53-8a80-9c97381dd398",
          "type": "MAP_SELECT",
          "actor": "LOSER",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false,
          "label": "Loser · Select map"
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
          "pausable": false,
          "label": "Pick civ to field (simultaneous)"
        },
        {
          "id": "4571436e-0a0b-4a9f-8e73-037f532f30f7",
          "type": "CIV_OFFER",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 2,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false,
          "label": "Pick civ to field (simultaneous)"
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
          "pausable": false,
          "label": "Snipe opponent (simultaneous)"
        },
        {
          "id": "26b6f76a-4190-4a30-be28-8a498ef95b7d",
          "type": "CIV_SNIPE_OPPONENT",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false,
          "label": "Snipe opponent (simultaneous)"
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
          "pausable": false,
          "label": "Game result"
        },
        {
          "id": "5d824f69-96f4-491f-afed-aeeae25b54ba",
          "type": "MAP_SELECT",
          "actor": "LOSER",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false,
          "label": "Loser · Select map"
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
          "pausable": false,
          "label": "Pick civ to field (simultaneous)"
        },
        {
          "id": "b337054f-3b53-4e06-9664-c06d523a59d6",
          "type": "CIV_OFFER",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 2,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false,
          "label": "Pick civ to field (simultaneous)"
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
          "pausable": false,
          "label": "Snipe opponent (simultaneous)"
        },
        {
          "id": "b138e434-acca-4d97-a479-a080fa544733",
          "type": "CIV_SNIPE_OPPONENT",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false,
          "label": "Snipe opponent (simultaneous)"
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
          "pausable": false,
          "label": "Game result"
        },
        {
          "id": "8855d05a-be85-4b5d-bd59-392282fb65d1",
          "type": "MAP_SELECT",
          "actor": "LOSER",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false,
          "label": "Loser · Select map"
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
          "pausable": false,
          "label": "Pick civ to field (simultaneous)"
        },
        {
          "id": "742959a5-e263-4dbe-94d0-d4fd79811346",
          "type": "CIV_OFFER",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 2,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false,
          "label": "Pick civ to field (simultaneous)"
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
          "pausable": false,
          "label": "Snipe opponent (simultaneous)"
        },
        {
          "id": "a49c3cfd-4f47-46cb-ad79-e88bdab44803",
          "type": "CIV_SNIPE_OPPONENT",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false,
          "label": "Snipe opponent (simultaneous)"
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
          "pausable": false,
          "label": "Game result"
        },
        {
          "id": "bb7da104-471e-42e5-9782-2bea82480f4b",
          "type": "MAP_SELECT",
          "actor": "LOSER",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false,
          "label": "Loser · Select map"
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
          "pausable": false,
          "label": "Pick civ to field (simultaneous)"
        },
        {
          "id": "f83a2ea4-6c69-480c-aded-2f58cb344e4d",
          "type": "CIV_OFFER",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 2,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false,
          "label": "Pick civ to field (simultaneous)"
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
          "pausable": false,
          "label": "Snipe opponent (simultaneous)"
        },
        {
          "id": "8350e330-da45-4c53-8531-00dd0858861b",
          "type": "CIV_SNIPE_OPPONENT",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false,
          "label": "Snipe opponent (simultaneous)"
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
          "pausable": false,
          "label": "Game result"
        }
      ]
    }
  },
  {
    "name": "Bo3 Draft",
    "description": "Standard Bo3 — 4-civ hand variant.",
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
          "imageUrl": "/maps/kawasan.png"
        },
        {
          "id": "coastal-cliffs",
          "name": "Coastal Cliffs",
          "imageUrl": "/maps/coastal-cliffs.png"
        },
        {
          "id": "gorge",
          "name": "Gorge",
          "imageUrl": "/maps/gorge.webp"
        }
      ],
      "options": {
        "bestOf": 3,
        "publicHover": true,
        "defaultTimeLimitSec": 30,
        "pausable": false,
        "resultMode": "vote"
      },
      "steps": [
        {
          "id": "d878dce3-8fb9-40d1-b9ba-a5450fc39a5c",
          "type": "MAP_BAN",
          "actor": "PLAYER1",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false,
          "label": "P1 · Ban map"
        },
        {
          "id": "812e95b0-3027-4066-b9ca-a0d78ff95503",
          "type": "MAP_BAN",
          "actor": "PLAYER2",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false,
          "label": "P2 · Ban map"
        },
        {
          "id": "f71ba0fc-8bdf-43c1-bbd5-81c2380b099b",
          "type": "MAP_PICK",
          "actor": "PLAYER1",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false,
          "label": "P1 · Pick map (into pool)"
        },
        {
          "id": "3af600e4-65bd-4c4a-8eb2-88496e792da6",
          "type": "MAP_PICK",
          "actor": "PLAYER2",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false,
          "label": "P2 · Pick map (into pool)"
        },
        {
          "id": "2e5d70b9-c144-4bde-abda-e67284094a35",
          "type": "MAP_BAN",
          "actor": "PLAYER2",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "banScope": "opponent",
          "pausable": false,
          "label": "P2 · Ban map"
        },
        {
          "id": "4e2b609c-d5af-4480-8df1-c022a2019bfc",
          "type": "MAP_BAN",
          "actor": "PLAYER1",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "banScope": "opponent",
          "pausable": false,
          "label": "P1 · Ban map"
        },
        {
          "id": "661c6166-e81c-499f-9379-d8f8b276ab03",
          "type": "MAP_BAN",
          "actor": "PLAYER1",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "banScope": "opponent",
          "pausable": false,
          "label": "P1 · Ban map"
        },
        {
          "id": "21232eb5-9950-48a2-9611-c02d8c7dce98",
          "type": "MAP_BAN",
          "actor": "PLAYER2",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "banScope": "opponent",
          "pausable": false,
          "label": "P2 · Ban map"
        },
        {
          "id": "ff55c3de-d14e-4349-88b9-b6881ab54868",
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
          "id": "c84d3a35-1646-426f-86ca-fdbe099bdca1",
          "type": "CIV_BAN",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "banScope": "opponent",
          "pausable": false,
          "label": "P1 · Ban civ"
        },
        {
          "id": "a6208641-7cf9-439c-8f24-fe4ea15b9f56",
          "type": "CIV_BAN",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "banScope": "opponent",
          "pausable": false,
          "label": "P2 · Ban civ"
        },
        {
          "id": "99495389-d92e-4586-ae7b-df7a9987d460",
          "type": "CIV_BAN",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "banScope": "opponent",
          "pausable": false,
          "label": "P1 · Ban civ"
        },
        {
          "id": "021b4beb-076e-4b93-a72e-da48cd749202",
          "type": "CIV_BAN",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "banScope": "opponent",
          "pausable": false,
          "label": "P2 · Ban civ"
        },
        {
          "id": "b8f40ee3-31f2-4310-a689-9a84213bf84d",
          "type": "CIV_PICK",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false,
          "label": "P1 · Pick civ into pool"
        },
        {
          "id": "5fd65280-52e7-4568-835e-6139651b2ccb",
          "type": "CIV_PICK",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false,
          "label": "P2 · Pick civ into pool"
        },
        {
          "id": "ab2405ef-88e3-4d01-be8f-441f57550f4d",
          "type": "CIV_PICK",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "banScope": "opponent",
          "pausable": false,
          "label": "P2 · Pick civ into pool"
        },
        {
          "id": "d1c01e64-dbdd-4432-9e6a-93065abadd47",
          "type": "CIV_PICK",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "banScope": "opponent",
          "pausable": false,
          "label": "P1 · Pick civ into pool"
        },
        {
          "id": "996cfeec-f105-4713-a72c-10ec8de61e61",
          "type": "CIV_BAN",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "banScope": "opponent",
          "pausable": false,
          "label": "P2 · Ban civ"
        },
        {
          "id": "b5fc44c2-e8d2-4cca-8faf-a1f550b0e14d",
          "type": "CIV_BAN",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "banScope": "opponent",
          "pausable": false,
          "label": "P1 · Ban civ"
        },
        {
          "id": "824c9f3b-82a0-44cb-a236-0bc867b73fea",
          "type": "CIV_PICK",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false,
          "label": "P1 · Pick civ into pool"
        },
        {
          "id": "71ca86fc-3f29-4471-8e87-fd6dcb226a00",
          "type": "CIV_PICK",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false,
          "label": "P2 · Pick civ into pool"
        },
        {
          "id": "830d4c7a-87fb-4839-a31e-323e2894065a",
          "type": "CIV_PICK",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false,
          "label": "P1 · Pick civ into pool"
        },
        {
          "id": "79c07358-6c23-4193-907c-347087bdba98",
          "type": "CIV_PICK",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false,
          "label": "P2 · Pick civ into pool"
        },
        {
          "id": "5cca8eaa-1e13-4528-b95e-69f6308216c7",
          "type": "CIV_OFFER",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 2,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false,
          "label": "Pick civ to field (simultaneous)"
        },
        {
          "id": "0909e2a2-ef86-4842-ae11-915017378d86",
          "type": "CIV_OFFER",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 2,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false,
          "label": "Pick civ to field (simultaneous)"
        },
        {
          "id": "27638906-73d9-4949-bba3-5d08ab109f54",
          "type": "CIV_SNIPE_OPPONENT",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false,
          "label": "Snipe opponent (simultaneous)"
        },
        {
          "id": "743966f1-935d-42e3-987e-f6818d88084c",
          "type": "CIV_SNIPE_OPPONENT",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false,
          "label": "Snipe opponent (simultaneous)"
        },
        {
          "id": "22d8f492-b8bd-4316-ac06-d12e5266fae2",
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
          "id": "74d20a5e-38b5-4e04-91b4-17ec1c6da544",
          "type": "MAP_SELECT",
          "actor": "LOSER",
          "pool": "map",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false,
          "label": "Loser · Select map"
        },
        {
          "id": "c560b388-3fad-443f-987f-3abdbe48ec78",
          "type": "CIV_OFFER",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 2,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false,
          "label": "Pick civ to field (simultaneous)"
        },
        {
          "id": "1ea0cc59-2319-44b8-9050-40ebd66178ed",
          "type": "CIV_OFFER",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 2,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false,
          "label": "Pick civ to field (simultaneous)"
        },
        {
          "id": "17445c4c-2e1a-422b-82a9-9375b5d7fd36",
          "type": "CIV_SNIPE_OPPONENT",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false,
          "label": "Snipe opponent (simultaneous)"
        },
        {
          "id": "feec11e2-3da3-4e19-a921-4f6309ff2b90",
          "type": "CIV_SNIPE_OPPONENT",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false,
          "label": "Snipe opponent (simultaneous)"
        },
        {
          "id": "29056fb7-a954-41a9-8bca-0933a7d8dcc6",
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
          "id": "829fe483-30c2-44f2-95c4-da7d50dd5435",
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
          "id": "3d49acd5-3a60-4685-910d-0487a6b4571d",
          "type": "CIV_OFFER",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 2,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false,
          "label": "Pick civ to field (simultaneous)"
        },
        {
          "id": "f6060b9e-54d3-4be8-b070-a1286d37b4da",
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
          "id": "28f30b5c-bbc7-438c-9e31-054aff827405",
          "type": "CIV_SNIPE_OPPONENT",
          "actor": "PLAYER1",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false,
          "label": "Snipe opponent (simultaneous)"
        },
        {
          "id": "308dcef1-de3e-4373-9a89-fc740a40a58d",
          "type": "CIV_SNIPE_OPPONENT",
          "actor": "PLAYER2",
          "pool": "civ",
          "count": 1,
          "timeLimitSec": 30,
          "showCurrentMap": false,
          "excludeUsedCivs": true,
          "pausable": false,
          "label": "Snipe opponent (simultaneous)"
        },
        {
          "id": "2f982417-485a-4b8d-be56-ab930c5ef287",
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
      ]
    }
  }
];
