# SECURITY — AFO Toolsmith

## Risk posture
Default: `dev_contained` — generated tools are scoped to the user's own Cloudflare account and GitHub repos.

## High-risk operations
The following tool classes require `confirm: true` before execution:
- `cloudflare_run_d1_migration` with DROP or DELETE
- `cloudflare_deploy_worker` (overwrites live Workers)
- Any tool tagged `risk: high` in the catalogue

## Connector expiration
Generated connectors are temporary by default. Users can set a connector lifetime in their profile preferences.

## Data storage
- Profile data stored in Cloudflare D1 (user-scoped)
- Uploaded specs/files stored in Cloudflare R2 (user-scoped prefix)
- No raw Cloudflare API tokens stored in D1 — tokens are bound as Worker secrets at deploy time

## Infrastructure visibility
Cloudflare is hidden from the user by default. Users interact with tool names and connector URLs only.
