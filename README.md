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

## Status

M0 (skeleton) complete: scaffolding, data layer, auth, custom Socket.IO server,
themed pages. Next up: M1 auth wiring → M2 preset editor → M3+ live match room.
See `PLAN.md` §6.
