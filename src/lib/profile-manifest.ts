// profile-manifest.ts
// Builds the canonical agent-readable JSON manifest for a user profile.
// Used by GET /api/profile/:handle/manifest

export interface ProfileManifest {
  id: string;
  schema_version: string;
  display_name: string;
  handle: string;
  avatar_emoji: string;
  headline: string;
  public_profile: boolean;
  belt_count: number;
  builder_mode: {
    primary_device: string;
    mobile_first: boolean;
    preferred_agents: string[];
    preferred_runtime: string;
    preferred_source_control: string;
    preferred_spec_format: string;
    default_output: string;
  };
  workflow_preferences: {
    hide_infrastructure_by_default: boolean;
    show_power_tools: boolean;
    default_connector_lifetime: string;
    default_security_posture: string;
    default_tool_scope: string;
    preferred_handoff_style: string;
  };
  active_projects: ActiveProject[];
  generated_tools: GeneratedTool[];
  retrieval_text: string;
}

export interface ActiveProject {
  project_id: string;
  name: string;
  status: string;
  source_inputs: string[];
  recommended_bundle: string;
  current_connector_url: string;
}

export interface GeneratedTool {
  tool_id: string;
  name: string;
  connector_url: string;
  status: string;
  risk: string;
  expires_at: string | null;
  tools: string[];
}

// Jared's seed profile — used as fallback until D1 is wired in Phase 2
export const JARED_SEED_MANIFEST: ProfileManifest = {
  id: 'usr_01_jared_mobile_builder',
  schema_version: '1.0.0',
  display_name: 'Jared Edwards',
  handle: 'jared',
  avatar_emoji: '⚡',
  headline: 'Mobile-first AI software builder',
  public_profile: true,
  belt_count: 0,
  builder_mode: {
    primary_device: 'iPhone',
    mobile_first: true,
    preferred_agents: ['Claude', 'Perplexity', 'ChatGPT', 'Alice'],
    preferred_runtime: 'Cloudflare',
    preferred_source_control: 'GitHub',
    preferred_spec_format: 'html.spec',
    default_output: 'mcp_tool_name_and_connector_url',
  },
  workflow_preferences: {
    hide_infrastructure_by_default: true,
    show_power_tools: true,
    default_connector_lifetime: 'temporary',
    default_security_posture: 'dev-contained',
    default_tool_scope: 'project-belt',
    preferred_handoff_style: 'copyable_alice_prompt',
  },
  active_projects: [],
  generated_tools: [],
  retrieval_text:
    'Mobile-first builder using Claude, Perplexity, ChatGPT, Alice, GitHub, Cloudflare Workers, D1, R2, Vectorize, MCP connectors, and html.spec files. Wants simple outputs: MCP tool name and connector URL. Hides infrastructure by default.',
};

/**
 * Build a manifest from a D1 user row + related records.
 * In Phase 1 this just returns the seed. Phase 2 wires real D1 data.
 */
export function buildManifest(
  user: Record<string, unknown> | null,
  prefs: Record<string, unknown> | null,
  projects: Record<string, unknown>[],
  tools: Record<string, unknown>[],
): ProfileManifest {
  if (!user) return JARED_SEED_MANIFEST;

  const metadata = safeJson(prefs?.metadata_json as string);

  return {
    id: user.id as string,
    schema_version: '1.0.0',
    display_name: user.display_name as string,
    handle: user.handle as string,
    avatar_emoji: (user.avatar_emoji as string) || '⚡',
    headline: (user.headline as string) || '',
    public_profile: Boolean(user.public_profile),
    belt_count: 0,
    builder_mode: {
      primary_device: (prefs?.primary_device as string) || 'iPhone',
      mobile_first: Boolean(prefs?.mobile_first ?? 1),
      preferred_agents: metadata?.preferred_agents || ['Claude', 'Perplexity', 'ChatGPT', 'Alice'],
      preferred_runtime: (prefs?.preferred_runtime as string) || 'Cloudflare',
      preferred_source_control: (prefs?.preferred_source_control as string) || 'GitHub',
      preferred_spec_format: (prefs?.preferred_spec_format as string) || 'html.spec',
      default_output: 'mcp_tool_name_and_connector_url',
    },
    workflow_preferences: {
      hide_infrastructure_by_default: Boolean(prefs?.hide_infrastructure_by_default ?? 1),
      show_power_tools: true,
      default_connector_lifetime: (prefs?.default_connector_lifetime as string) || 'temporary',
      default_security_posture: (prefs?.default_security_posture as string) || 'dev-contained',
      default_tool_scope: 'project-belt',
      preferred_handoff_style: 'copyable_alice_prompt',
    },
    active_projects: projects.map(p => ({
      project_id: p.id as string,
      name: p.name as string,
      status: (p.status as string) || 'active',
      source_inputs: safeJson(p.metadata_json as string)?.source_inputs || [],
      recommended_bundle: safeJson(p.metadata_json as string)?.recommended_bundle || '',
      current_connector_url: safeJson(p.metadata_json as string)?.current_connector_url || '',
    })),
    generated_tools: tools.map(t => ({
      tool_id: t.id as string,
      name: t.name as string,
      connector_url: t.connector_url as string,
      status: (t.status as string) || 'draft',
      risk: (t.risk_profile as string) || 'dev-only',
      expires_at: (t.expires_at as string) || null,
      tools: safeJson(t.tool_ids_json as string) || [],
    })),
    retrieval_text:
      `${user.display_name} — mobile-first AI builder using Cloudflare, GitHub, Claude, Perplexity. Builds MCP tools from brainstorms and html.spec files.`,
  };
}

function safeJson(str: string): Record<string, unknown> | null {
  try { return JSON.parse(str); } catch { return null; }
}
