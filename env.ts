// Loads .env / .env.local / .env.<NODE_ENV> the same way `next dev` does.
//
// The custom server (server.ts) is started with `tsx`, which — unlike `next dev` —
// does NOT auto-load .env files. Because server.ts imports modules (e.g. lib/mongoose.ts)
// at the top level that read process.env on import, the env must be loaded BEFORE those
// imports run. ESM evaluates imported modules in source order, so importing this file
// first guarantees the env is populated before anything else touches process.env.
//
// loadEnvConfig respects already-set vars, so platform-injected vars (Railway) win.
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());
