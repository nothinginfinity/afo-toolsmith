# CLAUDE-TODO — AFO Toolsmith

> Phase 1: Static UI + Schema

## Phase 1 — Ship first (static UI + D1 schema)

- [ ] Build `src/index.html` — responsive mobile-first profile page
  - Builder card (name, handle, agent prefs, mobile-first badge)
  - Current goal input
  - Active projects list
  - Generated connectors ledger
  - Tool belts panel
  - Output card: tool name + connector URL (primary CTA)
  - Three tabs: Onboarding / Cockpit / Workshop
- [ ] Add sample profile data matching the manifest schema
- [ ] Build `schema/profile.sql` — all 6 D1 tables:
  - users
  - user_preferences
  - user_agents
  - user_projects
  - generated_connectors
  - profile_artifacts
- [ ] Build `schema/profile.manifest.schema.json`
- [ ] Add stub Worker at `workers/afo-toolsmith/worker.js`
  - GET /health
  - GET /api/profile/:handle/manifest → returns sample manifest JSON
  - POST /api/me/recommend-tool → stub returning hardcoded bundle
  - POST /mcp → MCP protocol handler (tools/list, tools/call)
- [ ] Add `wrangler.toml` for afo-toolsmith Worker

## Phase 2 — Foundation (D1 CRUD API)

- [ ] Wire D1 binding into Worker
- [ ] CRUD routes: GET/PATCH /api/me, POST /api/me/projects, POST /api/me/projects/:id/artifacts
- [ ] Connector ledger: GET /api/me/connectors, POST /api/me/connectors/:id/health-check
- [ ] Profile manifest endpoint: GET /api/profile/:handle/manifest (live from D1)

## Phase 3 — Intelligence (recommendation + generation)

- [ ] Wire Vectorize for tool catalogue semantic search
- [ ] Real recommend-tool: brainstorm → vector search → ranked tool list
- [ ] Connector generation: belt → Tier 2 Worker source with real handlers
- [ ] Profile embedding refresh: POST /api/profile/:handle/refresh-embedding

## Spec
https://raw.githubusercontent.com/nothinginfinity/afo-toolsmith/main/afo-toolsmith-user-profile.spec.html
