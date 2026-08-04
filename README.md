# AoE4 Ban/Pick

A single configurable arena for Age of Empires IV tournament drafting — map ban/pick,
civ ban/pick, snipe drafting, and **live spectating** — replacing the current
three-separate-sites workflow.

See [`PLAN.md`](./PLAN.md) for the full architecture and milestone plan.

## Stack

- **Next.js 16** (App Router, TypeScript) on a **custom Node server** (`server.ts`)
- **Socket.IO** for real-time BP sync, hover, timers (self-hosted; one room per match)
- **MongoDB Atlas** via Mongoose (app models) + raw client for the Auth.js adapter
- **Auth.js v5** (credentials + bcrypt) for accounts
- **Tailwind CSS v4** — AoE4-flavored dark/gold/parchment theme
- Deploy target: **Railway** (long-lived WebSocket host)

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in MONGODB_URI + AUTH_SECRET
npm run dev                  # custom server + Socket.IO on http://localhost:3000
```

`npm run dev` runs `tsx watch server.ts` (Next + Socket.IO together).
`npm run build` then `npm run start` for production.

## Environment

| Var | Purpose |
| --- | --- |
| `MONGODB_URI` | Atlas connection string (keep in `.env.local`, never commit) |
| `AUTH_SECRET` | Auth.js JWT secret (`openssl rand -base64 32`) |
| `AUTH_URL` | App base URL |
| `PORT` | Server port (default 3000) |
| `NEXT_PUBLIC_SOCKET_URL` | Socket origin for the browser (blank = same origin) |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Super-admin seeded on boot. No default password — leave blank to skip admin seeding |

## Project layout

```
server.ts                 # custom Node server: Next handler + Socket.IO
auth.ts                   # Auth.js (NextAuth v5) config
app/                      # routes: / · /login · /presets · /match/[id] · /watch/[id]
components/               # UI components
lib/
  mongoose.ts             # Mongoose connection (app models)
  mongodb.ts              # raw MongoClient promise (Auth.js adapter)
  models/                 # User, Preset, Match, MatchAction, MatchGame
  draft/                  # schema.ts (Zod rules) · defaultPreset.ts
  socket/events.ts        # shared Socket.IO event contract
data/                     # civs.ts, maps.ts (sourced from the AoE fandom wiki)
```

## Asset policy

All civ/map names and images are sourced from the **Age of Empires Wiki**
(`ageofempires.fandom.com`) only. Do **not** use aoe4world.com.

## 回報問題 / Feedback

歡迎開 **[Issue](../../issues/new/choose)** 回報 bug 或提介面／功能建議 — 中文、English、日本語 皆可。
社群的反饋就是這個站台的開發順序來源。

Bug reports and feature requests are very welcome via issues, in any of those languages.

**關於 Pull Request**:這個專案目前由我一個人維護,程式碼一律由我這邊修改,
所以**不接受外部 PR**。請改用 issue 描述問題,我會排進來處理。
This repository does not accept outside pull requests — please open an issue instead.

程式碼公開是為了透明與方便討論,**未附授權條款**,保留一切權利。
Source is public for transparency and discussion only; no licence is granted.

## Status

Live and in community testing. Working today: accounts (invite-only), the preset
editor, the full draft room (map/civ ban & pick, snipe, simultaneous bans, timers),
live spectating, match history, and en / 繁中 / 简中 / 日本語 localisation.
See `PLAN.md` for the original architecture plan.
