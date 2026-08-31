-- =====================================================
-- Free PDF Forms & Government Resources
-- D1 Database Schema
-- =====================================================

PRAGMA foreign_keys = ON;


-- =====================================================
-- 1. Departments
-- =====================================================

CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    name TEXT NOT NULL,

    description TEXT DEFAULT '',

    icon TEXT DEFAULT '📁',

    sort_order INTEGER NOT NULL DEFAULT 0,

    is_active INTEGER NOT NULL DEFAULT 1
        CHECK (is_active IN (0, 1)),

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =====================================================
-- 2. PDF Forms
-- =====================================================

CREATE TABLE IF NOT EXISTS forms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    department_id INTEGER NOT NULL,

    name TEXT NOT NULL,

    description TEXT DEFAULT '',

    r2_key TEXT NOT NULL UNIQUE,

    original_filename TEXT NOT NULL,

    file_size INTEGER NOT NULL DEFAULT 0,

    mime_type TEXT NOT NULL DEFAULT 'application/pdf',

    sort_order INTEGER NOT NULL DEFAULT 0,

    is_active INTEGER NOT NULL DEFAULT 1
        CHECK (is_active IN (0, 1)),

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (department_id)
        REFERENCES departments(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);


-- =====================================================
-- 3. Government Websites / Useful Links
-- =====================================================

CREATE TABLE IF NOT EXISTS government_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    name TEXT NOT NULL,

    url TEXT NOT NULL,

    description TEXT DEFAULT '',

    icon TEXT DEFAULT '🔗',

    sort_order INTEGER NOT NULL DEFAULT 0,

    is_active INTEGER NOT NULL DEFAULT 1
        CHECK (is_active IN (0, 1)),

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =====================================================
-- 4. Website Settings
-- =====================================================

CREATE TABLE IF NOT EXISTS site_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),

    site_title TEXT NOT NULL
        DEFAULT 'Free PDF Forms & Government Resources',

    site_subtitle TEXT NOT NULL
        DEFAULT 'Government forms and useful resources in one place',

    footer_text TEXT NOT NULL
        DEFAULT 'Free PDF Forms & Government Resources',

    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =====================================================
-- 5. Admin Users
-- =====================================================

CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    username TEXT NOT NULL UNIQUE,

    password_hash TEXT NOT NULL,

    is_active INTEGER NOT NULL DEFAULT 1
        CHECK (is_active IN (0, 1)),

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =====================================================
-- 6. Admin Sessions
-- =====================================================

CREATE TABLE IF NOT EXISTS admin_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    user_id INTEGER NOT NULL,

    token_hash TEXT NOT NULL UNIQUE,

    expires_at TEXT NOT NULL,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
        REFERENCES admin_users(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);


-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_departments_active_sort
ON departments(is_active, sort_order);


CREATE INDEX IF NOT EXISTS idx_forms_department_active_sort
ON forms(department_id, is_active, sort_order);


CREATE INDEX IF NOT EXISTS idx_forms_active
ON forms(is_active);


CREATE INDEX IF NOT EXISTS idx_government_links_active_sort
ON government_links(is_active, sort_order);


CREATE INDEX IF NOT EXISTS idx_admin_sessions_token
ON admin_sessions(token_hash);


CREATE INDEX IF NOT EXISTS idx_admin_sessions_expiry
ON admin_sessions(expires_at);


-- =====================================================
-- INITIAL DEPARTMENTS
-- =====================================================

INSERT OR IGNORE INTO departments
    (id, name, description, icon, sort_order, is_active)
VALUES
    (
        1,
        'School Forms',
        'School and education related forms',
        '🏫',
        1,
        1
    ),
    (
        2,
        'SDM / Tehsil Office',
        'SDM, Tehsil and revenue office forms',
        '🏛️',
        2,
        1
    ),
    (
        3,
        'ICDS Forms',
        'Integrated Child Development Services forms',
        '📋',
        3,
        1
    ),
    (
        4,
        'Anganwadi Forms',
        'Anganwadi related forms and documents',
        '👩‍👧',
        4,
        1
    ),
    (
        5,
        'College Forms',
        'College and higher education forms',
        '🎓',
        5,
        1
    ),
    (
        6,
        'Other Forms',
        'Other useful government forms',
        '📄',
        6,
        1
    );


-- =====================================================
-- INITIAL SITE SETTINGS
-- =====================================================

INSERT OR IGNORE INTO site_settings
    (id, site_title, site_subtitle, footer_text)
VALUES
    (
        1,
        'Free PDF Forms & Government Resources',
        'Government forms and useful resources in one place',
        'Free PDF Forms & Government Resources'
    );
