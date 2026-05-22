# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common commands

- `npm run dev` — start the Next.js development server.
- `npm run build` — create a production Next.js build.
- `npm run start` — serve the production build.
- `npm run lint` — run ESLint across the repository.
- `npm run typecheck` — run TypeScript with `--noEmit`.
- `npm test` or `npm run test` — run the Vitest suite once.
- `npx vitest run src/game-engine/engine.test.ts` — run the game engine tests directly.
- `npx vitest run -t "test name"` — run tests matching a name pattern.

## Project architecture

This is a Next.js App Router game app for Exploding Kittens Online. The app combines a browser client, server route handlers, a pure TypeScript game engine, and optional hosted realtime/storage integrations.

- [src/app/](src/app/) contains Next.js pages and route handlers. [src/app/HomeContent.tsx](src/app/HomeContent.tsx) renders the landing page, card gallery, and lobby entry point. [src/app/room/[id]/page.tsx](src/app/room/[id]/page.tsx) is the main client-side game table; it owns local UI state, joins/creates rooms, polls state, subscribes to Pusher when configured, and posts player actions to the API.
- [src/app/api/rooms/route.ts](src/app/api/rooms/route.ts) lists and creates rooms. [src/app/api/games/[id]/route.ts](src/app/api/games/[id]/route.ts) is the game action API for create/join/start/draw/play/nope/resolve/confirm/leave actions. Route handlers wrap mutations in `RedisService.withLock()` to serialize state changes per room.
- [src/game-engine/](src/game-engine/) is the core rules layer. [src/game-engine/engine.ts](src/game-engine/engine.ts) exports state transitions such as `initializeGame`, `startGame`, `joinGame`, `drawCard`, `playCard`, `playNope`, pending-action confirmations, timeout resolution, and `toClientGameState`. Keep game-rule changes here when possible and cover them in [src/game-engine/engine.test.ts](src/game-engine/engine.test.ts).
- [src/game-engine/types.ts](src/game-engine/types.ts) defines the server-only and client-visible game state shapes. `ServerGameState` includes hidden hands, draw pile, pending actions, insights, and room ownership; `ClientGameState` is the redacted view returned to clients, optionally including the current viewer's hand and private prompts.
- [src/data/cardsData.ts](src/data/cardsData.ts) is the card catalog and deck source of truth: card ids, display metadata, expansion membership, copy counts, and whether a card can be Noped. Card art is loaded from [public/assets/cards/](public/assets/cards/) by matching `${card.id}.webp`.
- [src/components/](src/components/) contains reusable UI pieces. [src/components/CardView.tsx](src/components/CardView.tsx) renders catalog/hand cards from card ids; [src/components/LobbyForm.tsx](src/components/LobbyForm.tsx) handles public room discovery, identity persistence, room creation, room joining, password entry, deck size, and expansion selection.
- [src/server/](src/server/) contains server-side adapters and types. `RedisService` uses Upstash Redis when `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are present, otherwise it falls back to an in-memory store for local development. `PusherService` publishes game updates only when Pusher environment variables are configured. Passwords are SHA-256 hashed by [src/server/password.ts](src/server/password.ts).

## Runtime behavior and data flow

- The lobby creates rooms through `POST /api/rooms`, stores the local player id/name in `localStorage`, stores room passwords in `sessionStorage`, then navigates to `/room/[id]?playerId=...&name=...`.
- The room page attempts to join an existing room; if the room is missing, it can create a fallback room through `POST /api/games/[id]` with action `create`.
- Clients mutate state only by posting actions to `/api/games/[id]`. The server loads `ServerGameState`, resolves timeouts, applies exactly one game-engine transition, persists the result, then returns `toClientGameState(next, playerId)`.
- Realtime is optional. Without Pusher, the room page still polls `/api/games/[id]?viewerId=...` every two seconds. With Pusher configured, mutations publish a `gameState:update` event and clients refetch their viewer-specific state.
- Hidden information matters: do not return raw `ServerGameState` to clients. Use `toClientGameState` for API responses so only the viewer sees their own hand and private insight/pending prompts.

## Environment variables

- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` enable persistent Redis-backed games and public room indexes. If absent, game state is process-local and resets when the server restarts.
- `PUSHER_APP_ID`, `NEXT_PUBLIC_PUSHER_KEY`, `PUSHER_SECRET`, and `NEXT_PUBLIC_PUSHER_CLUSTER` enable realtime room updates. If absent, Pusher publish/subscribe is skipped and polling remains the fallback.

## Testing notes

- Vitest is configured for a Node environment with `@` aliased to [src/](src/).
- Prefer adding or updating engine tests for rule changes because the engine is pure TypeScript and easier to verify than the full UI.
- For UI or room-flow changes, run the dev server and manually exercise the flow in the browser in addition to lint/typecheck/tests.
