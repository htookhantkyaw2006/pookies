# Pookies — Project Brief

Hand this to Claude Code as the source of truth for planning. Ask it to read this file, ask clarifying questions, then produce a phased build plan (architecture, data model, screen list, and milestone breakdown) before writing any code.

## 1. What Pookies is

Pookies is a virtual office platform for startups, small online businesses, and remote / work-from-home teams. It recreates the feeling of working in the same room — presence, quick interactions, light structure — without being a heavy, enterprise tool. Think friendly and lightweight, not corporate.

Positioning: closer to Gather / Tandem / Sococo than to Slack or Zoom. The differentiator is ambient presence + low-friction daily rhythm for small teams.

## 2. Target users

- Small remote teams (roughly 3–15 people)
- Early-stage startups and solo founders with a few collaborators
- Online businesses whose staff never share a physical office

Primary job-to-be-done: "Help my distributed team feel connected and stay in sync during the day, without more meetings."

## 3. Core problem

Remote teams lose the casual awareness of an office — who's around, who's heads-down, what's happening right now. Existing tools solve messaging or video calls but not presence and shared rhythm. Pookies focuses there.

## 4. Feature set (from the team's MoSCoW prioritization)

These came out of the board's MoSCoW / RICE exercise. Priorities are the team's; refine them with Claude Code during planning. I couldn't read every sticky note at full detail, so treat gaps as "confirm with the board."

### Must have (MVP)

- Accounts & sign-in — user registration, login, sessions
- User management — profiles, roles (member vs admin)
- Admin panel — manage team, members, workspace settings
- Core presence — see who's online / away / busy in real time (the heart of the product)
- Database & sync — real-time state shared across all team members
- Baseline quality — security, reasonable performance, launch-readiness

### Should have

- Daily check-ins — "What did you do yesterday? What's next?" prompts
- Calendar integration — show upcoming meetings / schedule
- Team spaces / rooms — group people by project or function

### Could have

- Emoji reactions — wave, clap, lightweight social signals
- Gamification & rewards — streaks, points to keep teams engaged
- Third-party integrations — connect with existing tools

### Won't have (this phase)

- Mobile native app — web-first for now
- Employee monitoring — explicitly deprioritized (and worth a privacy stance: Pookies is about connection, not surveillance)
- Heavy AI features — a separate "AI ideas (unsorted)" backlog exists; keep it parked until after MVP

## 5. Suggested MVP scope (one buildable slice)

A single team workspace where members can:

1. Sign up / log in
2. Set and see live presence (online / away / busy) for everyone in the room
3. Post a quick daily check-in
4. An admin can create the workspace and invite/remove members

Everything else layers on after this works end-to-end.

## 6. Key screens / flows (first pass — confirm during planning)

- Auth — sign up, log in
- Workspace / "the office" — the main room: avatars + live presence states
- Daily check-in — prompt + short input, visible to the team
- Admin settings — members, invites, workspace config
- Profile — name, avatar, status

## 7. Technical notes for planning

The one hard requirement is real-time: presence and check-ins must update live for everyone. That should drive the stack choice.

A sensible, buildable default (decide with Claude Code):

- Frontend: Next.js + React + TypeScript, Tailwind for styling
- Backend / data / auth / realtime: Supabase (Postgres + Auth + Realtime presence channels fit this use case almost perfectly)
- Hosting: Vercel

Alternatives worth a sentence of consideration: a custom Node + WebSocket server, or Firebase. The brief doesn't mandate one — ask Claude Code to weigh them against "small team, real-time presence, fast to ship."

## 8. Non-goals / guardrails

- Not an enterprise tool; keep it light and friendly (the name sets the tone)
- No surveillance / monitoring features
- Web-first; no native mobile this phase
- Don't over-build — MVP first, then layer Should/Could features

## 9. Open questions to resolve with Claude Code before building

1. Final tech stack (confirm Supabase vs alternatives)
2. Single workspace vs multi-workspace support in v1
3. What exactly "presence" shows (just online/away, or also "in a room" / "in focus")
4. Auth method (email/password, magic link, Google OAuth)
5. Where the MoSCoW "Should have" line actually falls for v1 — which of check-ins / calendar / rooms makes the first cut
6. Any details from the board's sticky notes I couldn't read at full zoom — fill these in from the original FigJam

## Decisions made during planning (2026-11-12)

| Question | Decision |
|---|---|
| Stack | Next.js + React + TypeScript + Tailwind, Supabase, Vercel |
| Workspaces | One workspace per user in the UI; schema is multi-workspace ready |
| Presence | Online / Busy / Away + optional one-line note; Offline is derived |
| Sign-in | Google OAuth only |
| Office view | A walkable, game-like 2D office (changed from "avatar room" on 2026-11-12): you move a character with WASD / arrow keys or click-to-walk through rooms (Desks, Focus room, Meeting room, Kitchen, Lounge). A plain People list sits beside it with the same information |
| Rooms and status | Walking into a room sets your status (Focus / Meeting → Busy, Kitchen / Lounge → Away, Desks → Online); the status picker can override it. To confirm |
| Small extras | A wave (E key) and "walk over to someone" are in, because they make the world playable |
| Invites | Shareable invite link with expiry and revoke |
| v1 Should-haves | Daily check-ins in; team rooms and calendar later (assumed from section 5, to confirm) |
| Build order | Look and feel first (no accounts), then live data, then accounts |
