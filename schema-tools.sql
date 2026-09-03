CREATE TABLE IF NOT EXISTS tools (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    icon TEXT NOT NULL DEFAULT '🛠️',
    category TEXT NOT NULL DEFAULT 'Other',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    show_on_home INTEGER NOT NULL DEFAULT 1 CHECK (show_on_home IN (0, 1)),
    is_featured INTEGER NOT NULL DEFAULT 0 CHECK (is_featured IN (0, 1)),
    version TEXT NOT NULL DEFAULT '1.0.0',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tools_sort
ON tools(sort_order);

CREATE INDEX IF NOT EXISTS idx_tools_active
ON tools(is_active, sort_order);

CREATE TABLE IF NOT EXISTS tool_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tool_id INTEGER NOT NULL,
    setting_key TEXT NOT NULL,
    setting_value TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tool_id, setting_key),
    FOREIGN KEY(tool_id) REFERENCES tools(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tool_settings_tool
ON tool_settings(tool_id);