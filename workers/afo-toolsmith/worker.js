// afo-toolsmith worker.js — Phase 1
// Routes: /health, /mcp, /api/profile/:handle/manifest, /api/me, /api/me/recommend-tool
// Phase 2 will add D1 CRUD. Phase 3 adds vector recommendation.

import { JARED_SEED_MANIFEST } from '../../src/lib/profile-manifest';

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

function recommendTool(brainstorm) {
  const t = (brainstorm || '').toLowerCase();
  if (['repo','github','spec','html','scaffold'].some(k => t.includes(k))) {
    return { tool_name: 'AFO Repo Builder', connector_url: 'https://afo-repo-builder.agentfeedoptimization.com/mcp', risk: 'dev-only', source: 'stub' };
  }
  if (['cloudflare','worker','deploy','d1','kv','r2'].some(k => t.includes(k))) {
    return { tool_name: 'Cloudflare Tools MCP', connector_url: 'https://cloudflare-tools-mcp.agentfeedoptimization.com/mcp', risk: 'dev-only', source: 'stub' };
  }
  if (['link','context','slug','share'].some(k => t.includes(k))) {
    return { tool_name: 'Context Links MCP', connector_url: 'https://context-links-mcp.agentfeedoptimization.com/mcp', risk: 'safe', source: 'stub' };
  }
  return { tool_name: 'AFO Repo Builder', connector_url: 'https://afo-repo-builder.agentfeedoptimization.com/mcp', risk: 'dev-only', source: 'stub' };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    // ── Health ──
    if (path === '/health') {
      return json({ status: 'ok', version: '1.0.0', worker: 'afo-toolsmith', phase: 1 });
    }

    // ── Serve profile UI ──
    if (path === '/' || path === '/profile' || path === '/profile/jared') {
      // In production, serve src/index.html via Workers Sites or Pages.
      // This stub redirects to the GitHub Pages preview until Pages is wired.
      return new Response('Profile UI — deploy src/index.html via Cloudflare Pages or Workers Sites.', {
        headers: { 'Content-Type': 'text/plain', ...CORS },
      });
    }

    // ── GET /api/profile/:handle/manifest ──
    const manifestMatch = path.match(/^\/api\/profile\/([\w-]+)\/manifest$/);
    if (manifestMatch && request.method === 'GET') {
      const handle = manifestMatch[1];
      if (handle === 'jared') {
        return json(JARED_SEED_MANIFEST);
      }
      return json({ error: 'Profile not found' }, 404);
    }

    // ── GET /api/me ──
    if (path === '/api/me' && request.method === 'GET') {
      return json(JARED_SEED_MANIFEST);
    }

    // ── POST /api/me/recommend-tool ──
    if (path === '/api/me/recommend-tool' && request.method === 'POST') {
      let body = {};
      try { body = await request.json(); } catch {}
      return json(recommendTool(body.brainstorm));
    }

    // ── MCP endpoint (future tool server) ──
    if (path === '/mcp') {
      if (request.method === 'GET') {
        return json({ name: 'afo-toolsmith', version: '1.0.0', description: 'AFO Toolsmith profile + recommendation API', tools: [] });
      }
      if (request.method === 'POST') {
        let body = {};
        try { body = await request.json(); } catch {
          return json({ error: 'Invalid JSON' }, 400);
        }
        const { method, id } = body;
        if (method === 'initialize') {
          return json({ jsonrpc: '2.0', id, result: { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'afo-toolsmith', version: '1.0.0' } } });
        }
        if (method === 'tools/list') {
          return json({ jsonrpc: '2.0', id, result: { tools: [] } });
        }
        return json({ jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } }, 404);
      }
    }

    return json({ error: 'Not found', path }, 404);
  },
};
