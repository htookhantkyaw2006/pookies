# Pookies

A light, friendly virtual office for small remote teams. You walk a little character around a shared office; where you are says how you're working, and a quick daily check-in keeps everyone in sync.

The product brief and the decisions made so far are in [POOKIES_BRIEF.md](POOKIES_BRIEF.md).

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

Pookies runs in one of two modes, chosen by `.env.local` (see [.env.example](.env.example)):

| Mode | When | What you get |
|---|---|---|
| Sample office | No Supabase values, or `NEXT_PUBLIC_DATA_SOURCE=sample` | Pretend teammates who wander about. Nothing is saved. Good for looking at the design |
| Live office | Supabase URL and publishable key are set | The real thing: other browsers see you walk, change status and check in |

### Live office: guest mode

Until Google sign-in is added, the live office lets people in as guests: pick a name, step into one shared demo office. This needs **anonymous sign-ins** switched on in the Supabase project (Authentication → Sign In / Providers → Allow anonymous sign-ins). Guest mode is for development; it is switched off before launch.

## What's where

| Path | What it is |
|---|---|
| `src/app` | Pages. `(app)` holds the signed-in screens: office, check-ins, profile, admin |
| `src/components/world` | The walkable office: controls, the floating panels, and two stages that draw it: `WorldStage3D` (default) and `WorldStage2D` (the flat map) |
| `src/lib/world` | The office itself, with no React: floor plan, furniture, collisions, pathfinding, movement |
| `src/lib/world3d` | The 3D office, built in code with Three.js: rooms and walls, every piece of furniture, the characters, camera and lighting. No model files |
| `src/lib/data` | Everything about data. `types.ts` is the contract; `mock/` is the sample office; `supabase/` is the real backend; `store.ts` picks one |
| `src/lib/presence`, `src/lib/dates.ts` | Small pure helpers (who is where, time zones) |
| `supabase/migrations` | The database: tables, row-level security, live-update triggers and the guarded actions |
| `supabase/tests/security_checks.sql` | Acts as several pretend people to prove the database rules hold. Rolls itself back |
| `e2e` | Browser test: two browsers walk in and watch each other live |

## Checks

```bash
npm run lint
```

```bash
npm run typecheck
```

```bash
npm test
```

```bash
npm run test:e2e
```

`npm run test:e2e` needs the live office with guest mode on; it skips itself with a message otherwise.

## 3D and 2D

The office opens in 3D. The map button at the bottom left switches to the flat 2D map and back; the choice is remembered in that browser. Devices without WebGL get the 2D map automatically, and the 3D office turns off its shadows by itself if a device struggles to keep up.

Both views share the same floor plan in `src/lib/world/map.ts`. To add furniture, add it there (the 2D drawing lives in `WorldMapArt.tsx`, the 3D model in `src/lib/world3d/furniture`). The tests check that every piece has a 3D model and stays inside the tiles it blocks.

## How live updates work

- **Who is here, and their status**: a Supabase Realtime presence channel per workspace. Closing the tab is what makes you offline; nothing tracks activity.
- **Walking and waving**: short messages on the same channel, sent a few times a second while you move. Positions are never stored.
- **Saved things** (check-ins, members, invites, names): stored in Postgres. A trigger tells the workspace "this table changed" and each browser re-reads it through row-level security, so the message itself carries no data.

## Privacy stance

Pookies is for connection, not surveillance. There is no activity tracking, no idle detection and no "last seen".
