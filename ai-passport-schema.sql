-- Passport Photo AI usage tables
-- The Worker also creates these automatically if they do not exist.
CREATE TABLE IF NOT EXISTS ai_passport_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  mode TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_passport_requests_ip_time
ON ai_passport_requests(ip_hash, created_at);

CREATE TABLE IF NOT EXISTS ai_passport_global (
  usage_day TEXT PRIMARY KEY,
  estimated_neurons REAL NOT NULL DEFAULT 0,
  locked INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);
