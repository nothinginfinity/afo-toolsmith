/**
 * AFO Toolsmith — Worker
 * Serves profile UI, profile manifest API, recommendation stub, and MCP endpoint
 * Mobile MCP Pattern — POST /mcp only, no SSE
 */

function ok(id, r) {
  return Response.json({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(r, null, 2) }] } });
}
function err(id, c, m) {
  return Response.json({ jsonrpc: '2.0', id, error: { code: c, message: m } });
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

const TOOLS = [
  {
    name: 'get_profile_manifest',
    description: 'Returns the agent-readable profile manifest for a given handle. Use this to load builder context before generating tool recommendations.'
  },
  {
    name: 'recommend_tools',
    description: 'Given a brainstorm or goal text, returns the best matching MCP tools and bundle from the AFO catalogue.'
  },
  {
    name: 'generate_connector',
    description: 'Generates a deploy-ready Cloudflare Worker source for the given tool belt. Returns worker source + connector name + deployment instructions.'
  }
];

const SAMPLE_MANIFEST = {
  profile_id: 'usr_sample',
  schema_version: '1.0.0',
  display: {
    name: 'Sample Builder',
    handle: 'builder',
    avatar_emoji: '🛠️',
    headline: 'Mobile-first AI software builder',
    public_profile: true
  },
  builder_mode: {
    primary_device: 'iPhone',
    mobile_first: true,
    preferred_agents: ['Claude', 'Perplexity'],
    preferred_runtime: 'Cloudflare',
    preferred_source_control: 'GitHub',
    preferred_spec_format: 'html.spec',
    default_output: 'mcp_tool_name_and_connector_url'
  },
  active_projects: [],
  generated_tools: [],
  retrieval_text: 'Mobile-first builder using Claude, GitHub, Cloudflare Workers, D1, and MCP connectors.'
};

async function handleMCP(req, env) {
  const { id, method, params } = await req.json();
  if (method === 'initialize') return ok(id, { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'afo-toolsmith', version: '1.0.0' } });
  if (method === 'notifications/initialized') return new Response(null, { status: 204 });
  if (method === 'ping') return ok(id, {});
  if (method === 'tools/list') return ok(id, { tools: TOOLS });
  if (method === 'tools/call') {
    const { name, arguments: args = {} } = params || {};
    try {
      switch (name) {
        case 'get_profile_manifest':
          return ok(id, SAMPLE_MANIFEST);
        case 'recommend_tools':
          return ok(id, {
            recommended_bundle: 'full_session_belt',
            tools: ['github.read_file', 'github.commit_file', 'cloudflare.deploy_worker', 'cloudflare.query_d1', 'mcp.post_board_status'],
            rationale: 'Based on your goal, this belt covers GitHub read/write, Worker deployment, D1 queries, and agent coordination.'
          });
        case 'generate_connector':
          return ok(id, {
            status: 'stub',
            message: 'Tier 2 generator coming in Phase 3. Use workshop.agentfeedoptimization.com to generate connectors manually.'
          });
        default:
          return err(id, -32601, 'Unknown tool: ' + name);
      }
    } catch (e) {
      return err(id, -32603, 'Tool error: ' + e.message);
    }
  }
  return err(id, -32601, 'Method not found: ' + method);
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const headers = new Headers(CORS);

    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (url.pathname === '/health') return Response.json({ status: 'ok', service: 'afo-toolsmith' }, { headers });

    // MCP endpoint
    if (url.pathname === '/mcp' && req.method === 'POST') {
      const r = await handleMCP(req, env);
      Object.entries(CORS).forEach(([k, v]) => r.headers.set(k, v));
      return r;
    }

    // Profile manifest API
    if (url.pathname.startsWith('/api/profile/') && req.method === 'GET') {
      const handle = url.pathname.split('/')[3];
      if (url.pathname.endsWith('/manifest')) {
        return Response.json({ ...SAMPLE_MANIFEST, display: { ...SAMPLE_MANIFEST.display, handle } }, { headers });
      }
    }

    // Recommend tool stub
    if (url.pathname === '/api/me/recommend-tool' && req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      return Response.json({
        recommended_bundle: 'full_session_belt',
        goal: body.goal || '',
        tools: ['github.read_file', 'github.commit_file', 'cloudflare.deploy_worker', 'cloudflare.query_d1', 'mcp.post_board_status'],
        connector_name: 'My Project Belt',
        next_step: 'Go to workshop.agentfeedoptimization.com to generate and deploy your connector.'
      }, { headers });
    }

    return new Response('not found', { status: 404, headers });
  }
};
