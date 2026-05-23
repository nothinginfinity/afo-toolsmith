# ARCHITECTURE — AFO Toolsmith

## Overview

AFO Toolsmith is a Cloudflare Worker that serves both a profile UI and an agent-readable API. It is designed to be invisible infrastructure — users see tool names and connector URLs, not Workers or D1.

## Request flow

```
User (iPhone, Claude.ai)
  ↓
AFO Toolsmith Worker (afo-toolsmith.agentfeedoptimization.com)
  ↓
  ├── GET /           → Profile UI (static HTML)
  ├── GET /api/profile/:handle/manifest → Profile manifest JSON (agent-readable)
  ├── POST /api/me/recommend-tool → Tool recommendation (Vectorize + D1)
  ├── POST /api/me/generate-connector → Tier 2 Worker source generation
  └── POST /mcp → MCP protocol (tools/list, tools/call)

D1: users, preferences, projects, connectors, artifacts
R2: uploaded specs, files, screenshots
Vectorize: tool catalogue embeddings, profile retrieval text
```

## Key design decisions

1. **POST /mcp only** — no SSE, no npm, proven mobile pattern
2. **Hide infrastructure** — users see tool name + URL, not Cloudflare
3. **Profile as context router** — every recommendation is informed by the user's builder mode, projects, and history
4. **Tier 2 generator** — generated Workers include real handler implementations, not stubs
5. **D1 + Vectorize dual storage** — structured data in D1, semantic retrieval in Vectorize
