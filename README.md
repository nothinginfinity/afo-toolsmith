# AFO Toolsmith

Mobile-first MCP tool factory. Users sign up, describe what they want to build, and get a Claude-ready MCP connector URL in seconds.

## What it does

A user gives AFO Toolsmith a brainstorm, some files, and links. Toolsmith returns:
- An MCP tool name
- A connector URL ready to paste into Claude.ai settings
- A starter prompt so their first Claude session is immediately productive

The user never sees Cloudflare. The product hides the infrastructure and delivers the outcome.

## Stack

- **Compute:** Cloudflare Workers
- **Database:** Cloudflare D1
- **Storage:** Cloudflare R2
- **Vector search:** Cloudflare Vectorize
- **Source control:** GitHub
- **Target runtime:** Claude.ai custom MCP connectors (mobile)

## Spec

See [`afo-toolsmith-user-profile.spec.html`](./afo-toolsmith-user-profile.spec.html) for the full product spec.

## Build order

1. Static responsive UI from spec
2. D1 schema — users, preferences, projects, connectors, artifacts
3. Profile API — `/api/me`, `/api/profile/:handle/manifest`
4. Recommendation stub — `/api/me/recommend-tool`
5. Connector generation — full Tier 2 worker factory
