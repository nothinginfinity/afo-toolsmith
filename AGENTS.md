# AGENTS.md — AFO Toolsmith

## Repo
https://github.com/nothinginfinity/afo-toolsmith

## Spec
https://raw.githubusercontent.com/nothinginfinity/afo-toolsmith/main/afo-toolsmith-user-profile.spec.html

## Product principle
Hide Cloudflare infrastructure by default. The user gives a brainstorm, files, and links. AFO Toolsmith returns the MCP tool name and connector URL they should use in Claude.

## What Claude should build

See CLAUDE-TODO.md for the current task list.

## Stack
- Cloudflare Workers (compute)
- Cloudflare D1 (relational data)
- Cloudflare R2 (file/spec storage)
- Cloudflare Vectorize (semantic retrieval)
- GitHub (source control)
- Claude.ai custom MCP connectors (target runtime)

## Mobile constraint
All generated Workers use POST /mcp only — no SSE, no npm, no terminal required.

## Key files
- `schema/profile.sql` — D1 tables
- `schema/profile.manifest.schema.json` — canonical agent-readable manifest
- `src/index.html` — profile UI
- `src/api/profile.ts` — profile CRUD routes
- `src/lib/profile-manifest.ts` — manifest generator
- `src/lib/recommendation-stub.ts` — tool recommendation stub
