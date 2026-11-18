# Pookies

A light, friendly virtual office for small remote teams. You walk a little character around a shared office; where you are says how you're working, and a quick daily check-in keeps everyone in sync.

The product brief and the decisions made so far are in [POOKIES_BRIEF.md](POOKIES_BRIEF.md).

## The office

Walk up to anything and press **F** (or tap the button that appears) to use it. Where you are sets your status: rooms marked Away or Busy below change it for you.

The building is one block, roughly square: the original office (focus room, meeting room, kitchen along the top; desks and lounge below) with the game corner and a long garden down its east side, and a row of quiet rooms under the desks and lounge: headspace, three personal space rooms, then the washroom.

| Place | What's there | Status |
|---|---|---|
| Desks | Desk pods and chairs | Online |
| Focus room, meeting room | Quiet desks; a meeting table and a whiteboard everyone can write on | Busy |
| Kitchen | Coffee machine (you carry a mug for a while), stools | Away |
| Lounge | Sofas, beanbags, a ping-pong table | Away |
| Game corner | **Snack Catch** at two arcade cabinets, **darts**, a high-score board for the team, foosball | Away |
| Washroom | Toilet stalls (you're hidden and the sign turns red), sinks, a mirror that changes your pookie's look | Away |
| Headspace | Nap pods (you lie down with 💤), a one-minute breathing guide | Away |
| Garden | Picnic table, benches, a fire pit with logs, a pond, string lights, the **photo booth** and **photo wall** | Away |
| Personal space | Three quiet rooms under the desks, next to the headspace room. A light by each door shows red while someone's inside | Busy |

- **Places** (signpost button, bottom left) lists every room; pick one and your character walks there. "Personal space" picks a free room.
- **Plants** everywhere can be watered; they look thirsty after a few days.
- **Photo booth**: up to four people on the spots, pick a backdrop, 3-2-1, flash. Everyone in the booth sees the countdown and is in the photo, which goes on the photo wall (newest twelve). Save one as an image, or take down one you're in.
- **Day and night**: the 3D office follows your own clock (sunset, stars, lamps and the fire after dark). The sun/moon button switches between following the clock, day and night; `?hour=21` in the address previews a time.

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
| `src/components/world` | The walkable office: controls, the floating panels, and two stages that draw it: `WorldStage3D` (default) and `WorldStage2D` (the flat map). `interactions.tsx` is the one table of "what F does" for every thing you can use |
| `src/components/games`, `photo`, `calm` | The game corner (Snack Catch, darts, high scores), the photo booth and wall, the breathing guide |
| `src/lib/world` | The office itself, with no React: floor plan (`map/`, one file per wing), collisions, pathfinding, movement |
| `src/lib/world3d` | The 3D office, built in code with Three.js: rooms and walls, every piece of furniture, the characters, camera, lighting and the day/night sky. No model files |
| `src/lib/games` | The rules of the two games, with no drawing, so they can be tested |
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

`npm run test:e2e` needs the live office with guest mode on; it skips itself with a message otherwise. If your dev server shows the sample office, build a live copy on another port and point the test at it:

```bash
NEXT_PUBLIC_DATA_SOURCE=live npx next build && npx next start -p 3001
```

```bash
E2E_BASE_URL=http://localhost:3001 npm run test:e2e
```

## 3D and 2D

The office opens in 3D. The map button at the bottom left switches to the flat 2D map and back; the choice is remembered in that browser. Devices without WebGL get the 2D map automatically, and the 3D office turns off its shadows by itself if a device struggles to keep up.

Both views share the same floor plan in `src/lib/world/map/` (`layout.ts` is the building, then one file of furniture, seats and things per wing). To add furniture, add it there (the 2D drawing lives in `WorldMapArt.tsx`, the 3D model in `src/lib/world3d/furniture`). The tests check that every piece has a 3D model and stays inside the tiles it blocks, that every room and seat can be reached from the front door, and that nothing shares an id.

## How live updates work

- **Who is here, and their status**: a Supabase Realtime presence channel per workspace. Closing the tab is what makes you offline; nothing tracks activity.
- **Walking and waving**: short messages on the same channel, sent a few times a second while you move. Positions are never stored.
- **The photo booth countdown**: one message on the same channel, so everyone standing in the booth gets the 3-2-1 and flash together.
- **Saved things** (check-ins, members, invites, names, the whiteboard, plants, high scores, photos): stored in Postgres. A trigger tells the workspace "this table changed" and each browser re-reads it through row-level security, so the message itself carries no data.

## The database

`supabase/migrations` builds it from scratch, in order. Every table has row-level security; signed-in people can read their own workspace and nothing else, and visitors who aren't signed in can't read anything. Nobody writes a table directly: every change goes through a small function that checks who's asking first (`save_check_in`, `write_board`, `submit_score`, `pin_photo`, ...).

To prove the rules hold, run [`supabase/tests/security_checks.sql`](supabase/tests/security_checks.sql) in the Supabase SQL editor. It acts as four pretend people (an admin, two members and an outsider), tries everything they should and shouldn't be able to do, and always ends with an error so nothing it did is kept:

- `ALL CHECKS PASSED (rolled back)`: the rules behave as intended.
- `CHECK FAILED: ...`: something's wrong; the message says what.

It needs the demo office to be empty when it runs.

## Good to know

- **High scores can be faked** by someone technical, because the games run in the browser. The database refuses scores no round could reach (474 for Snack Catch, 150 for darts) but can't tell a real round from a made-up one. Fine for fun, not for prizes.
- **Personal space rooms aren't locked.** The red light means "someone's in here"; anyone can still walk in.
- **The sample office forgets everything on reload**, including scores and photos you add.

## Privacy stance

Pookies is for connection, not surveillance. There is no activity tracking, no idle detection and no "last seen". Walking positions are never stored. High scores and photos belong to your membership: leave the workspace and your scores go, and you're taken out of every photo (a photo of only you is deleted).
