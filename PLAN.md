# AoE4 Ban/Pick 平台 — 技術規劃

> 目標：把目前分散在三個 aoe2cm.net 網站的「地圖 BP → 文明 BP → 選圖 → 狙擊草稿」流程，整合成單一網站，並支援即時觀戰與彈性規則配置。

---

## 1. 核心需求對照

| 需求 | 設計對應 |
| --- | --- |
| 註冊 / 登入 | Supabase Auth（Email + OAuth 可選） |
| 自訂 BP 規則 / 輪數 / 文明池 / 狙擊 / 顯示當前地圖 / 每輪秒數 / 是否可暫停 | `presets` 表，規則存成 JSON「步驟序列」 |
| 勝負雙方約定，兩邊都可點誰贏；host 可反悔 | `match_games` 表 + host override 權限 |
| 觀戰即時看到雙方 BP | Supabase Realtime（broadcast + postgres_changes） |
| 觀戰看到選手 hover（可選） | Realtime broadcast（ephemeral，不入庫），由 preset 開關控制 |

---

## 2. 技術棧（已定案：自建 WebSocket 路線）

- **前端 / 後端**：Next.js 15（App Router, TypeScript）+ **自訂 Node server**（`server.ts`），讓 Next 與 Socket.IO 跑在同一個服務、單一部署。
- **即時**：**Socket.IO**（自建）
  - 每場 match 一個 room：`match:{id}`
  - 持久 BP 動作落庫後由 server 廣播（重連時從 DB 回放）
  - hover、倒數、暫停心跳走 ephemeral 事件（不入庫）
- **資料庫**：**MongoDB Atlas（使用者自有 cluster）**，透過 Mongoose 連線
- **認證**：**Auth.js v5（NextAuth）** + `@auth/mongodb-adapter`，Email/密碼（bcrypt）起步，OAuth 可後加
- **樣式**：Tailwind CSS（+ 視需要少量元件）
- **部署**：**Railway**（單一 Node 服務，支援長連線 WebSocket）；MongoDB Atlas 為外部 DB
- **驗證**：規則與動作以 Zod schema 雙端驗證
- **素材來源（硬性規定）**：文明 / 地圖 / 圖片一律取自 `ageofempires.fandom.com`，**禁止** `aoe4world.com`

### 連線敏感資訊
- MongoDB 連線字串、Auth secret 一律放 `.env.local`（git 已忽略），不得 commit。
- 提醒：曾在對話中外洩的 Atlas 密碼需於 Atlas 後台輪替。

---

## 3. 領域模型（流程拆解）

整場比賽 = 一連串「階段（phase）」，每個階段由 preset 定義。階段類型：

1. **MAP_BAN / MAP_PICK** — 對地圖池操作
2. **CIV_BAN / CIV_PICK** — 對文明池操作（建立本場可用文明池）
3. **MAP_SELECT** — 選出本局地圖（首局可設定為「隨機未被 ban 的圖」，其後由「上一局敗方」選）
4. **CIV_SNIPE_DRAFT** — 針對當前地圖選文明；限制：只能選 CIV_PICK 階段產生的文明池，且「前幾局已選過的文明不可重選」
5. **GAME_RESULT** — 記錄該局勝負，決定下一局選圖權

每個階段步驟（step）的可配置欄位：
```
{
  type,              // 上述五類
  actor,             // HOST_DRAW(隨機) | PLAYER1 | PLAYER2 | LOSER | WINNER
  action,            // ban | pick | select
  count,             // 本步驟操作幾個
  pool,              // map | civ | civ_pool(本場已 pick 的文明)
  timeLimitSec,      // 每步驟秒數（0 = 不限）
  showCurrentMap,    // 文明選擇時是否顯示當前地圖
  excludeUsedCivs,   // 狙擊時排除已用文明
  pausable           // 是否允許暫停
}
```

> preset 即為 `steps[]` + 全域設定（文明池清單、地圖池清單、bo幾、是否公開 hover）。

---

## 4. 資料表（Postgres）

- **profiles** `(id PK→auth.users, username, avatar_url, created_at)`
- **presets** `(id, owner_id, name, description, config jsonb, is_public, created_at)`
  - `config` = `{ civs[], maps[], steps[], options{} }`
- **matches** `(id, preset_id, host_id, player1_id, player2_id, status, bo, share_code, created_at)`
  - status：`lobby | running | paused | finished`
- **match_actions** `(id, match_id, step_index, actor, action_type, target, payload jsonb, created_at)`
  - 持久 BP 事件流，觀戰回放與重連的真相來源
- **match_games** `(id, match_id, game_index, map, civ_p1, civ_p2, winner, confirmed_by jsonb)`
  - 單局結果；`winner` 可被 host override
- **(ephemeral, 不入庫)** hover / presence → Realtime broadcast channel `match:{id}`

RLS 原則：preset 擁有者可改自己的；match 參與者（host/2 player）可寫動作；公開 match 任何人可讀（觀戰）。

---

## 5. 即時架構

- 每場 match 一個 Realtime channel：`match:{id}`
- **落庫事件**：玩家送出 ban/pick → 寫 `match_actions` → `postgres_changes` 廣播 → 所有人（含觀戰）更新狀態
- **ephemeral**：hover、倒數同步、暫停請求 → `broadcast`（低延遲、不污染 DB）
- 狀態機在 server（Route Handler / Server Action）驗證「輪到誰、合法目標、是否超時」後才落庫，避免作弊

---

## 6. 開發階段（里程碑）

- **M0 — 骨架（本次）**：Next.js + Tailwind + Supabase client 初始化、目錄結構、env 範本、型別與 Zod schema 草稿、placeholder 頁面（首頁 / 登入 / preset 編輯 / match 房間 / 觀戰）
- **M1 — 認證**：Supabase Auth、profiles、登入/登出、受保護路由
- **M2 — Preset 編輯器**：建立/編輯/儲存 BP 規則，steps 拖拉排序
- **M3 — Match 房間核心**：建房、雙方加入、狀態機、地圖 BP → 文明 BP 流程
- **M4 — 選圖 + 狙擊草稿**：選圖權邏輯、狙擊文明池限制、排除已用文明
- **M5 — 即時觀戰**：Realtime 同步、觀戰頁、hover 顯示（可開關）
- **M6 — 勝負與 host override**：雙方點選勝負、host 反悔、Bo 進程
- **M7 — 計時 / 暫停 / 打磨**：每步驟倒數、暫停、UI/UX、行動裝置

---

## 7. 目錄結構（規劃）

```
/app
  /(auth)/login
  /(main)/                 # 首頁、preset 列表
  /presets/[id]/edit       # preset 編輯器
  /match/[id]              # 對戰房間（選手視角）
  /watch/[id]              # 觀戰視角
/components                # UI 元件
/lib
  /supabase                # client / server / middleware
  /draft                   # 狀態機、規則型別、Zod schema
  /types                   # 共用型別
/supabase
  /migrations              # SQL schema
/data                      # 文明、地圖種子資料（可更新）
```
