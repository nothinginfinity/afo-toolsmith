// recommendation-stub.ts
// Phase 1 stub for POST /api/me/recommend-tool
// Phase 3 will wire this to tools.agentfeedoptimization.com + Vectorize

export interface RecommendInput {
  brainstorm: string;
  project_id?: string;
  user_handle?: string;
}

export interface RecommendResult {
  tool_name: string;
  connector_url: string;
  description: string;
  bundle: string;
  risk: string;
  setup_instructions: string;
  source: 'stub' | 'catalogue' | 'vector';
}

// Keyword-to-tool map for stub matching
const TOOL_MAP: Array<{
  keywords: string[];
  result: RecommendResult;
}> = [
  {
    keywords: ['repo', 'github', 'spec', 'html', 'scaffold'],
    result: {
      tool_name: 'AFO Repo Builder',
      connector_url: 'https://afo-repo-builder.agentfeedoptimization.com/mcp',
      description: 'Creates GitHub repos from html.spec files, adds README/AGENTS/ROADMAP docs.',
      bundle: 'full-session-belt',
      risk: 'dev-only',
      setup_instructions: 'Add connector URL to Claude.ai → Settings → Connectors → + Custom.',
      source: 'stub',
    },
  },
  {
    keywords: ['cloudflare', 'worker', 'deploy', 'wrangler', 'd1', 'kv', 'r2'],
    result: {
      tool_name: 'Cloudflare Tools MCP',
      connector_url: 'https://cloudflare-tools-mcp.agentfeedoptimization.com/mcp',
      description: 'Deploy Workers, manage D1, KV, R2, and DNS from Claude.',
      bundle: 'full-session-belt',
      risk: 'dev-only',
      setup_instructions: 'Add connector URL to Claude.ai → Settings → Connectors → + Custom.',
      source: 'stub',
    },
  },
  {
    keywords: ['link', 'context', 'url', 'slug', 'share'],
    result: {
      tool_name: 'Context Links MCP',
      connector_url: 'https://context-links-mcp.agentfeedoptimization.com/mcp',
      description: 'Create and manage context links — shareable slugs with rich metadata.',
      bundle: 'context-belt',
      risk: 'safe',
      setup_instructions: 'Add connector URL to Claude.ai → Settings → Connectors → + Custom.',
      source: 'stub',
    },
  },
];

const DEFAULT_RESULT: RecommendResult = {
  tool_name: 'AFO Repo Builder',
  connector_url: 'https://afo-repo-builder.agentfeedoptimization.com/mcp',
  description: 'Best starting point for mobile builders — creates repos, scaffolds docs, and connects to the message board.',
  bundle: 'full-session-belt',
  risk: 'dev-only',
  setup_instructions: 'Add connector URL to Claude.ai → Settings → Connectors → + Custom.',
  source: 'stub',
};

export function recommendTool(input: RecommendInput): RecommendResult {
  const text = (input.brainstorm || '').toLowerCase();
  for (const entry of TOOL_MAP) {
    if (entry.keywords.some(kw => text.includes(kw))) {
      return entry.result;
    }
  }
  return DEFAULT_RESULT;
}
