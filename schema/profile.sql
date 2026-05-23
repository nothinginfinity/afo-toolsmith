-- AFO Toolsmith D1 Schema
-- Profile tables for users, preferences, projects, connectors, and artifacts

-- users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT,
  display_name TEXT NOT NULL,
  handle TEXT UNIQUE,
  avatar_emoji TEXT DEFAULT '🛠️',
  headline TEXT,
  public_profile INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- user_preferences
CREATE TABLE IF NOT EXISTS user_preferences (
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
);

-- user_agents
CREATE TABLE IF NOT EXISTS user_agents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  role TEXT,
  priority INTEGER DEFAULT 0,
  enabled INTEGER DEFAULT 1,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- user_projects
CREATE TABLE IF NOT EXISTS user_projects (
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
);

-- generated_connectors
CREATE TABLE IF NOT EXISTS generated_connectors (
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
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (project_id) REFERENCES user_projects(id)
);

-- profile_artifacts
CREATE TABLE IF NOT EXISTS profile_artifacts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  project_id TEXT,
  type TEXT NOT NULL, -- brainstorm | file | link | spec | repo | screenshot | message | tool | bundle
  title TEXT,
  body TEXT,
  url TEXT,
  r2_key TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (project_id) REFERENCES user_projects(id)
);
