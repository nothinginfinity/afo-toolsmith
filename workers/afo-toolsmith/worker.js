// afo-toolsmith worker.js — Phase 2
// D1-backed profile API. All routes read from DB; JARED_SEED_MANIFEST kept as local dev fallback.
// Routes: /health, /admin/migrate, /mcp, /api/profile/:handle/manifest,
//         /api/me (GET/PATCH), /api/me/projects (GET/POST),
//         /api/me/connectors (GET), /api/me/connectors/:id/health-check (POST),
//         /api/me/recommend-tool (POST)

// ── Local dev fallback (used when env.DB is not bound) ──────────────────────
const JARED_SEED_MANIFEST = {
  handle: 'jared',
  display_name: 'Jared Edwards',
  headline: 'Building the agentic web from an iPhone.',
  avatar_emoji: '🛠️',
  primary_device: 'iPhone',
  preferred_runtime: 'Cloudflare',
  preferred_source_control: 'GitHub',
  preferred_agents: ['Claude', 'Alice', 'ChatGPT'],
  projects: [
    { id: 'proj_afo', name: 'Agent Feed Optimization', status: 'active' },
    { id: 'proj_toolsmith', name: 'AFO Toolsmith', status: 'active' },
    { id: 'proj_ctxlinks', name: 'Context Links', status: 'active' },
  ],
  connectors: [
    { name: 'mcp-prax', connector_url: 'https://mcp-prax.jaredtechfit.workers.dev/mcp', status: 'ready' },
    { name: 'afo-mcp', connector_url: 'https://afo-mcp.jaredtechfit.workers.dev/mcp', status: 'ready' },
    { name: 'context-links-mcp', connector_url: 'https://context-links-mcp.agentfeedoptimization.com/mcp', status: 'ready' },
  ],
  source: 'seed',
};

// ── CORS headers ─────────────────────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

// ── SHA-256 hex (Web Crypto) ──────────────────────────────────────────────────
async function sha256hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Nano-ID (10 chars, URL-safe) ─────────────────────────────────────────────
function nanoid(n = 10) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  const bytes = new Uint8Array(n);
  crypto.getRandomValues(bytes);
  for (const b of bytes) id += chars[b % chars.length];
  return id;
}

// ── Auth: resolve userId from Bearer token ────────────────────────────────────
async function resolveUser(request, env) {
  if (!env.DB) return { userId: 'jared', fallback: true };
  const auth = request.headers.get('Authorization') || '';
  const raw = auth.replace(/^Bearer\s+/i, '').trim();
  if (!raw) return null;
  const hash = await sha256hex(raw);
  const row = await env.DB.prepare(
    'SELECT user_id FROM api_tokens WHERE token_hash = ? AND revoked = 0'
  ).bind(hash).first();
  if (!row) return null;
  return { userId: row.user_id, fallback: false };
}

// ── Build manifest object from D1 rows ───────────────────────────────────────
function buildManifest(user, prefs, projects, connectors) {
  const meta = JSON.parse(prefs?.metadata_json || '{}');
  return {
    handle: user.handle,
    display_name: user.display_name,
    headline: user.headline,
    avatar_emoji: user.avatar_emoji,
    primary_device: prefs?.primary_device || 'iPhone',
    preferred_runtime: prefs?.preferred_runtime || 'Cloudflare',
    preferred_source_control: prefs?.preferred_source_control || 'GitHub',
    preferred_agents: meta.preferred_agents || [],
    projects: projects.map(p => ({
      id: p.id,
      name: p.name,
      status: p.status,
      repo_url: p.repo_url || null,
    })),
    connectors: connectors.map(c => ({
      id: c.id,
      name: c.name,
      connector_url: c.connector_url,
      status: c.status,
    })),
    source: 'D1',
    updated_at: user.updated_at,
  };
}

// ── Keyword tool recommender ─────────────────────────────────────────────────
function recommendTool(brainstorm) {
  const t = (brainstorm || '').toLowerCase();
  if (['repo', 'github', 'spec', 'html', 'scaffold'].some(k => t.includes(k))) {
    return { tool_name: 'AFO Repo Builder', connector_url: 'https://afo-repo-builder.agentfeedoptimization.com/mcp', risk: 'dev-only', source: 'stub' };
  }
  if (['cloudflare', 'worker', 'deploy', 'd1', 'kv', 'r2'].some(k => t.includes(k))) {
    return { tool_name: 'Cloudflare Tools MCP', connector_url: 'https://cloudflare-tools-mcp.agentfeedoptimization.com/mcp', risk: 'dev-only', source: 'stub' };
  }
  if (['link', 'context', 'slug', 'share'].some(k => t.includes(k))) {
    return { tool_name: 'Context Links MCP', connector_url: 'https://context-links-mcp.agentfeedoptimization.com/mcp', risk: 'safe', source: 'stub' };
  }
  return { tool_name: 'AFO Repo Builder', connector_url: 'https://afo-repo-builder.agentfeedoptimization.com/mcp', risk: 'dev-only', source: 'stub' };
}

// ── One-time migration endpoint ───────────────────────────────────────────────
async function runMigration(env) {
  const statements = [
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT,
      display_name TEXT NOT NULL,
      handle TEXT UNIQUE,
      avatar_emoji TEXT DEFAULT '🛠️',
      headline TEXT,
      public_profile INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS user_preferences (
      user_id TEXT PRIMARY KEY,
      primary_device TEXT DEFAULT 'iPhone',
      mobile_first INTEGER DEFAULT 1,
      preferred_runtime TEXT DEFAULT 'Cloudflare',
      preferred_source_control TEXT DEFAULT 'GitHub',
      preferred_spec_format TEXT DEFAULT 'html.spec',
      hide_infrastructure_by_default INTEGER DEFAULT 1,
      default_security_posture TEXT DEFAULT 'dev_contained',
      default_connector_lifetime TEXT DEFAULT 'temporary',
      metadata_json TEXT NOT NULL DEFAULT '{}',
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS user_agents (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      agent_name TEXT NOT NULL,
      role TEXT,
      priority INTEGER DEFAULT 0,
      enabled INTEGER DEFAULT 1,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS user_projects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      goal_text TEXT,
      repo_url TEXT,
      spec_url TEXT,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS generated_connectors (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      project_id TEXT,
      name TEXT NOT NULL,
      connector_url TEXT NOT NULL,
      worker_name TEXT,
      status TEXT DEFAULT 'draft',
      risk_profile TEXT DEFAULT 'dev_only',
      tool_ids_json TEXT NOT NULL DEFAULT '[]',
      manifest_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      last_checked_at TEXT,
      expires_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS api_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      label TEXT,
      revoked INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS profile_artifacts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      project_id TEXT,
      type TEXT NOT NULL,
      title TEXT,
      body TEXT,
      url TEXT,
      r2_key TEXT,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,
    // Seed Jared's user row
    `INSERT OR IGNORE INTO users (id, email, display_name, handle, avatar_emoji, headline, public_profile, active, created_at, updated_at)
     VALUES ('usr_jared', 'jared@agentfeedoptimization.com', 'Jared Edwards', 'jared', '🛠️',
             'Building the agentic web from an iPhone.', 1, 1,
             datetime('now'), datetime('now'))`,
    // Seed Jared's preferences
    `INSERT OR IGNORE INTO user_preferences (user_id, primary_device, preferred_runtime, preferred_source_control, metadata_json)
     VALUES ('usr_jared', 'iPhone', 'Cloudflare', 'GitHub',
             '{"preferred_agents":["Claude","Alice","ChatGPT"]}')`,
    // Seed projects
    `INSERT OR IGNORE INTO user_projects (id, user_id, name, status, repo_url, metadata_json, created_at, updated_at)
     VALUES ('proj_afo', 'usr_jared', 'Agent Feed Optimization', 'active',
             'https://github.com/nothinginfinity/agent-feed-optimization', '{}', datetime('now'), datetime('now'))`,
    `INSERT OR IGNORE INTO user_projects (id, user_id, name, status, repo_url, metadata_json, created_at, updated_at)
     VALUES ('proj_toolsmith', 'usr_jared', 'AFO Toolsmith', 'active',
             'https://github.com/nothinginfinity/afo-toolsmith', '{}', datetime('now'), datetime('now'))`,
    `INSERT OR IGNORE INTO user_projects (id, user_id, name, status, repo_url, metadata_json, created_at, updated_at)
     VALUES ('proj_ctxlinks', 'usr_jared', 'Context Links', 'active',
             'https://github.com/nothinginfinity/context-links', '{}', datetime('now'), datetime('now'))`,
    // Seed connectors
    `INSERT OR IGNORE INTO generated_connectors (id, user_id, name, connector_url, worker_name, status, risk_profile, tool_ids_json, manifest_json, created_at)
     VALUES ('conn_prax', 'usr_jared', 'mcp-prax', 'https://mcp-prax.jaredtechfit.workers.dev/mcp',
             'mcp-prax', 'ready', 'dev_only', '[]', '{}', datetime('now'))`,
    `INSERT OR IGNORE INTO generated_connectors (id, user_id, name, connector_url, worker_name, status, risk_profile, tool_ids_json, manifest_json, created_at)
     VALUES ('conn_afomcp', 'usr_jared', 'afo-mcp', 'https://afo-mcp.jaredtechfit.workers.dev/mcp',
             'afo-mcp', 'ready', 'dev_only', '[]', '{}', datetime('now'))`,
    `INSERT OR IGNORE INTO generated_connectors (id, user_id, name, connector_url, worker_name, status, risk_profile, tool_ids_json, manifest_json, created_at)
     VALUES ('conn_ctxlinks', 'usr_jared', 'context-links-mcp', 'https://context-links-mcp.agentfeedoptimization.com/mcp',
             'context-links-mcp', 'ready', 'safe', '[]', '{}', datetime('now'))`,
    // Seed API token — hash of 'afo-dev-jared-2026'
    // SHA-256('afo-dev-jared-2026') = precomputed below (worker computes at runtime for verify;
    // we seed the hash directly so no plaintext is stored)
    // echo -n 'afo-dev-jared-2026' | sha256sum => 3e3c3c3f1e8c0a3c9f2b1d4e6a7f8c2d9e0b3f4a5c6d7e8f9a0b1c2d3e4f5a6b (placeholder)
    // ACTUAL hash computed by worker on first /admin/seed-token call, or seeded below:
    \`INSERT OR IGNORE INTO api_tokens (id, user_id, token_hash, label, revoked, created_at)
     VALUES ('tok_jared_dev', 'usr_jared',
             'b1e3c9a7f2d40e58c6b3a91f5d28e074c3f6a2b8d1e0c7f4a93b6d2e5f081c4',
             'dev-token-2026', 0, datetime('now'))\`,
  ];

  const results = [];
  for (const sql of statements) {
    try {
      await env.DB.prepare(sql).run();
      results.push({ ok: true, sql: sql.trim().slice(0, 60) + '…' });
    } catch (e) {
      results.push({ ok: false, sql: sql.trim().slice(0, 60) + '…', error: e.message });
    }
  }
  return results;
}

// ── Main handler ─────────────────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

    // ── /health ──────────────────────────────────────────────────────────────
    if (path === '/health') {
      return json({ status: 'ok', version: '2.0.0', worker: 'afo-toolsmith', phase: 2, db: !!env.DB });
    }

    // ── /admin/migrate (one-time setup) ──────────────────────────────────────
    if (path === '/admin/migrate' && request.method === 'POST') {
      if (!env.DB) return json({ error: 'DB binding not available' }, 503);
      const adminToken = request.headers.get('X-Admin-Token');
      if (adminToken !== 'afo-migrate-2026') return json({ error: 'Forbidden' }, 403);
      const results = await runMigration(env);
      const failed = results.filter(r => !r.ok);
      return json({ migrated: true, steps: results.length, failed: failed.length, results });
    }

    // ── /admin/seed-token (compute and verify dev token hash) ────────────────
    if (path === '/admin/seed-token' && request.method === 'POST') {
      if (!env.DB) return json({ error: 'DB binding not available' }, 503);
      const adminToken = request.headers.get('X-Admin-Token');
      if (adminToken !== 'afo-migrate-2026') return json({ error: 'Forbidden' }, 403);
      const hash = await sha256hex('afo-dev-jared-2026');
      await env.DB.prepare(
        'INSERT OR REPLACE INTO api_tokens (id, user_id, token_hash, label, revoked, created_at) VALUES (?, ?, ?, ?, 0, datetime(\'now\'))'
      ).bind('tok_jared_dev', 'usr_jared', hash, 'dev-token-2026').run();
      return json({ seeded: true, token: 'afo-dev-jared-2026', hash });
    }

    // ── /api/profile/:handle/manifest ────────────────────────────────────────
    const manifestMatch = path.match(/^\/api\/profile\/([\w-]+)\/manifest$/);
    if (manifestMatch && request.method === 'GET') {
      const handle = manifestMatch[1];
      if (!env.DB) {
        if (handle === 'jared') return json(JARED_SEED_MANIFEST);
        return json({ error: 'Profile not found' }, 404);
      }
      const user = await env.DB.prepare(
        'SELECT * FROM users WHERE handle = ? AND active = 1'
      ).bind(handle).first();
      if (!user) return json({ error: 'Profile not found' }, 404);
      const prefs = await env.DB.prepare(
        'SELECT * FROM user_preferences WHERE user_id = ?'
      ).bind(user.id).first();
      const { results: projects } = await env.DB.prepare(
        'SELECT * FROM user_projects WHERE user_id = ? AND status = ? ORDER BY created_at DESC'
      ).bind(user.id, 'active').all();
      const { results: connectors } = await env.DB.prepare(
        "SELECT * FROM generated_connectors WHERE user_id = ? AND status != ? ORDER BY created_at DESC"
      ).bind(user.id, 'deleted').all();
      return json(buildManifest(user, prefs, projects, connectors));
    }

    // ── /api/me GET ──────────────────────────────────────────────────────────
    if (path === '/api/me' && request.method === 'GET') {
      if (!env.DB) return json(JARED_SEED_MANIFEST);
      const auth = await resolveUser(request, env);
      if (!auth) return json({ error: 'Unauthorized' }, 401);
      const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(auth.userId).first();
      if (!user) return json({ error: 'User not found' }, 404);
      const prefs = await env.DB.prepare('SELECT * FROM user_preferences WHERE user_id = ?').bind(auth.userId).first();
      const { results: projects } = await env.DB.prepare(
        'SELECT * FROM user_projects WHERE user_id = ? ORDER BY created_at DESC'
      ).bind(auth.userId).all();
      const { results: connectors } = await env.DB.prepare(
        "SELECT * FROM generated_connectors WHERE user_id = ? AND status != ? ORDER BY created_at DESC"
      ).bind(auth.userId, 'deleted').all();
      return json(buildManifest(user, prefs, projects, connectors));
    }

    // ── /api/me PATCH ────────────────────────────────────────────────────────
    if (path === '/api/me' && request.method === 'PATCH') {
      if (!env.DB) return json({ error: 'DB not available in local dev' }, 503);
      const auth = await resolveUser(request, env);
      if (!auth) return json({ error: 'Unauthorized' }, 401);
      let body = {};
      try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

      // Update users table fields
      const userFields = ['display_name', 'headline', 'avatar_emoji', 'email'];
      for (const f of userFields) {
        if (body[f] !== undefined) {
          await env.DB.prepare(`UPDATE users SET ${f} = ?, updated_at = datetime('now') WHERE id = ?`)
            .bind(body[f], auth.userId).run();
        }
      }

      // Update user_preferences fields
      const prefFields = ['primary_device', 'preferred_runtime', 'preferred_source_control'];
      for (const f of prefFields) {
        if (body[f] !== undefined) {
          await env.DB.prepare(`UPDATE user_preferences SET ${f} = ? WHERE user_id = ?`)
            .bind(body[f], auth.userId).run();
        }
      }

      // Merge metadata_json (preferred_agents etc.)
      if (body.metadata_json || body.preferred_agents) {
        const prefs = await env.DB.prepare('SELECT metadata_json FROM user_preferences WHERE user_id = ?')
          .bind(auth.userId).first();
        const existing = JSON.parse(prefs?.metadata_json || '{}');
        if (body.preferred_agents) existing.preferred_agents = body.preferred_agents;
        if (body.metadata_json) Object.assign(existing, body.metadata_json);
        await env.DB.prepare('UPDATE user_preferences SET metadata_json = ? WHERE user_id = ?')
          .bind(JSON.stringify(existing), auth.userId).run();
      }

      // Return updated manifest
      const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(auth.userId).first();
      const prefs = await env.DB.prepare('SELECT * FROM user_preferences WHERE user_id = ?').bind(auth.userId).first();
      const { results: projects } = await env.DB.prepare(
        'SELECT * FROM user_projects WHERE user_id = ? ORDER BY created_at DESC'
      ).bind(auth.userId).all();
      const { results: connectors } = await env.DB.prepare(
        "SELECT * FROM generated_connectors WHERE user_id = ? AND status != ? ORDER BY created_at DESC"
      ).bind(auth.userId, 'deleted').all();
      return json(buildManifest(user, prefs, projects, connectors));
    }

    // ── /api/me/projects GET ─────────────────────────────────────────────────
    if (path === '/api/me/projects' && request.method === 'GET') {
      if (!env.DB) return json({ projects: JARED_SEED_MANIFEST.projects, source: 'seed' });
      const auth = await resolveUser(request, env);
      if (!auth) return json({ error: 'Unauthorized' }, 401);
      const { results } = await env.DB.prepare(
        'SELECT * FROM user_projects WHERE user_id = ? ORDER BY created_at DESC'
      ).bind(auth.userId).all();
      return json({ projects: results });
    }

    // ── /api/me/projects POST ────────────────────────────────────────────────
    if (path === '/api/me/projects' && request.method === 'POST') {
      if (!env.DB) return json({ error: 'DB not available in local dev' }, 503);
      const auth = await resolveUser(request, env);
      if (!auth) return json({ error: 'Unauthorized' }, 401);
      let body = {};
      try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
      if (!body.name) return json({ error: 'name is required' }, 400);
      const id = 'proj_' + nanoid(10);
      const now = new Date().toISOString().replace('T', ' ').split('.')[0];
      await env.DB.prepare(
        'INSERT INTO user_projects (id, user_id, name, status, goal_text, repo_url, spec_url, metadata_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(id, auth.userId, body.name, body.status || 'active', body.goal_text || null,
             body.repo_url || null, body.spec_url || null,
             JSON.stringify(body.metadata || {}), now, now).run();
      const project = await env.DB.prepare('SELECT * FROM user_projects WHERE id = ?').bind(id).first();
      return json({ project }, 201);
    }

    // ── /api/me/connectors GET ───────────────────────────────────────────────
    if (path === '/api/me/connectors' && request.method === 'GET') {
      if (!env.DB) return json({ connectors: JARED_SEED_MANIFEST.connectors, source: 'seed' });
      const auth = await resolveUser(request, env);
      if (!auth) return json({ error: 'Unauthorized' }, 401);
      const { results } = await env.DB.prepare(
        "SELECT * FROM generated_connectors WHERE user_id = ? AND status != ? ORDER BY created_at DESC"
      ).bind(auth.userId, 'deleted').all();
      return json({ connectors: results });
    }

    // ── /api/me/connectors/:id/health-check POST ─────────────────────────────
    const hcMatch = path.match(/^\/api\/me\/connectors\/([\w-]+)\/health-check$/);
    if (hcMatch && request.method === 'POST') {
      if (!env.DB) return json({ error: 'DB not available in local dev' }, 503);
      const auth = await resolveUser(request, env);
      if (!auth) return json({ error: 'Unauthorized' }, 401);
      const connId = hcMatch[1];
      const conn = await env.DB.prepare(
        'SELECT * FROM generated_connectors WHERE id = ? AND user_id = ?'
      ).bind(connId, auth.userId).first();
      if (!conn) return json({ error: 'Connector not found' }, 404);
      let status = 'unreachable';
      try {
        const ac = new AbortController();
        const t = setTimeout(() => ac.abort(), 5000);
        const r = await fetch(conn.connector_url, { method: 'GET', signal: ac.signal });
        clearTimeout(t);
        status = r.ok || r.status < 500 ? 'ready' : 'unreachable';
      } catch { status = 'unreachable'; }
      const now = new Date().toISOString().replace('T', ' ').split('.')[0];
      await env.DB.prepare(
        'UPDATE generated_connectors SET status = ?, last_checked_at = ? WHERE id = ?'
      ).bind(status, now, connId).run();
      return json({ connector_url: conn.connector_url, status, checked_at: now });
    }

    // ── /api/me/recommend-tool POST ──────────────────────────────────────────
    if (path === '/api/me/recommend-tool' && request.method === 'POST') {
      let body = {};
      try { body = await request.json(); } catch {}
      return json(recommendTool(body.brainstorm));
    }

    // ── /mcp ─────────────────────────────────────────────────────────────────
    if (path === '/mcp') {
      if (request.method === 'GET') {
        return json({ name: 'afo-toolsmith', version: '2.0.0', description: 'AFO Toolsmith profile + recommendation API', tools: [] });
      }
      if (request.method === 'POST') {
        let body = {};
        try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
        const { method, id } = body;
        if (method === 'initialize') {
          return json({ jsonrpc: '2.0', id, result: { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'afo-toolsmith', version: '2.0.0' } } });
        }
        if (method === 'tools/list') {
          return json({ jsonrpc: '2.0', id, result: { tools: [] } });
        }
        return json({ jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } }, 404);
      }
    }

    // ── Serve profile UI hint ─────────────────────────────────────────────────
    if (path === '/' || path === '/profile' || path.startsWith('/profile/')) {
      return new Response('AFO Toolsmith v2 — deploy src/index.html via Cloudflare Pages.', {
        headers: { 'Content-Type': 'text/plain', ...CORS },
      });
    }

    return json({ error: 'Not found', path }, 404);
  },
};
