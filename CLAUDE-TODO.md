# Claude Task List — AFO Toolsmith

Alice scaffolds. Claude deploys and wires.

---

## Phase 1 — Static Profile UI + Manifest API

- [ ] Deploy `workers/afo-toolsmith/worker.js` to Cloudflare Workers
- [ ] Confirm `/health` returns `{ status: 'ok', phase: 1 }`
- [ ] Confirm `GET /api/profile/jared/manifest` returns Jared's seed manifest JSON
- [ ] Confirm `POST /api/me/recommend-tool` with `{ brainstorm: 'build a github repo' }` returns AFO Repo Builder
- [ ] Deploy `src/index.html` via Cloudflare Pages (connect `nothinginfinity/afo-toolsmith` repo, set build output to `src/`)
- [ ] Confirm profile UI loads at the Pages URL and manifest tab shows Jared's JSON
- [ ] Post live URLs to `shared/bulletin.md` in agent-bridge
- [ ] Write reply to `alice/inbox.md` in agent-bridge with live URLs
- [ ] Mark Phase 1 done below

**Phase 1 status:** `pending`

---

## Phase 2 — D1 Persistence

- [ ] Create D1 database `afo-toolsmith-db` in Cloudflare dashboard
- [ ] Run `schema/profile.sql` migrations against `afo-toolsmith-db`
- [ ] Add `DB` D1 binding to `workers/afo-toolsmith/wrangler.toml`
- [ ] Seed Jared's profile row in `users` and `user_preferences` tables
- [ ] Wire `GET /api/profile/:handle/manifest` to query D1 (see `src/api/profile.ts` comments)
- [ ] Wire `GET /api/me` with auth (Bearer token or Cloudflare Access)
- [ ] Implement `PATCH /api/me` for profile updates
- [ ] Implement `GET /api/me/projects` + `POST /api/me/projects`
- [ ] Implement `GET /api/me/connectors` + `POST /api/me/connectors/:id/health-check`
- [ ] Update `src/index.html` to use real API endpoints
- [ ] Post status to agent-bridge

**Phase 2 status:** `not started`

---

## Phase 3 — Recommendation Engine

- [ ] Wire `POST /api/me/recommend-tool` to `tools.agentfeedoptimization.com` tool catalogue
- [ ] Add Vectorize binding for semantic tool search
- [ ] Replace keyword stub in `src/lib/recommendation-stub.ts` with vector + catalogue lookup
- [ ] Test with real brainstorm inputs from Jared's profile context
- [ ] Post status to agent-bridge

**Phase 3 status:** `not started`

---

## Notes for Claude

- Alice scaffolds all source files. Claude deploys and wires bindings.
- Worker source: `workers/afo-toolsmith/worker.js`
- Profile UI: `src/index.html` (deploy via Cloudflare Pages)
- TypeScript source in `src/` is for reference — the worker.js is vanilla JS for direct deploy
- The `JARED_SEED_MANIFEST` constant in `worker.js` is Jared's real profile — update it when D1 is live
- All post-build status goes to `shared/bulletin.md` + `alice/inbox.md` in `nothinginfinity/agent-bridge`
