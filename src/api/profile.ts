// profile.ts
// API route handlers for profile endpoints.
// Imported by workers/afo-toolsmith/worker.js
// Phase 1: returns seed manifest. Phase 2: wires D1.

import { buildManifest, JARED_SEED_MANIFEST } from '../lib/profile-manifest';
import { recommendTool } from '../lib/recommendation-stub';

export async function handleProfileManifest(
  handle: string,
  env: Record<string, unknown>,
): Promise<Response> {
  // Phase 2: query D1 for real user data
  // const db = env.DB as D1Database;
  // const user = await db.prepare('SELECT * FROM users WHERE handle = ?').bind(handle).first();
  // const prefs = await db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').bind(user?.id).first();
  // const projects = (await db.prepare('SELECT * FROM user_projects WHERE user_id = ?').bind(user?.id).all()).results;
  // const tools = (await db.prepare('SELECT * FROM generated_connectors WHERE user_id = ?').bind(user?.id).all()).results;
  // const manifest = buildManifest(user, prefs, projects, tools);

  // Phase 1: return seed
  const manifest = handle === 'jared' ? JARED_SEED_MANIFEST : null;
  if (!manifest) {
    return json({ error: 'Profile not found' }, 404);
  }
  return json(manifest);
}

export async function handleGetMe(
  userId: string,
  env: Record<string, unknown>,
): Promise<Response> {
  // Phase 1: return Jared's seed
  return json(JARED_SEED_MANIFEST);
}

export async function handleRecommendTool(
  body: Record<string, unknown>,
): Promise<Response> {
  const result = recommendTool({
    brainstorm: (body.brainstorm as string) || '',
    project_id: body.project_id as string | undefined,
    user_handle: body.user_handle as string | undefined,
  });
  return json(result);
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
