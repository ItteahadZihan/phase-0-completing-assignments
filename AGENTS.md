# AGENTS.md

## Cursor Cloud specific instructions

This repo is a single headless TypeScript Express API (a Solana token launchpad).
There is no frontend/GUI and no database — verify it via HTTP requests (curl).

### Services
- **Launchpad API** — the only service. Run in dev with `npm run dev` (tsx watch on
  `src/server.ts`), listens on `PORT` (default `3000`). Standard commands live in
  `package.json` and `README.md`: `npm test` (vitest), `npm run build` (tsc).
  There is no lint script configured.

### Non-obvious notes
- The server reads configuration from `process.env` via `src/config.ts` but does
  **not** auto-load a `.env` file (no dotenv import, and the dev script does not pass
  `--env-file`). Copying `.env.example` to `.env` is harmless but does not change
  runtime config; sane defaults (devnet, 0.01 SOL fee) are baked in. To override
  config, export the vars in the shell before `npm run dev`.
- `POST /api/quote` and `POST /api/launches/prepare` make live RPC calls to the
  configured Solana cluster (default `https://api.devnet.solana.com`) to fetch rent
  estimates, so those endpoints need outbound network access. `/health` and
  `/api/config` are offline.
- Quick smoke test of core functionality (prepares a serialized SPL launch tx):
  `curl -s -X POST localhost:3000/api/launches/prepare -H 'Content-Type: application/json' -d '{"name":"Example Coin","symbol":"EGC","initialSupply":"1000000","creatorPublicKey":"So11111111111111111111111111111111111111112"}'`
