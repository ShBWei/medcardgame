-- MediCard Cloud Backend — D1 Database Schema
-- ============================================

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS study_progress (
  user_id INTEGER NOT NULL REFERENCES users(id),
  subject TEXT NOT NULL,
  total_answered INTEGER NOT NULL DEFAULT 0,
  total_correct INTEGER NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0,
  max_streak INTEGER NOT NULL DEFAULT 0,
  last_studied TEXT,
  PRIMARY KEY (user_id, subject)
);

CREATE TABLE IF NOT EXISTS wrong_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  subject TEXT NOT NULL,
  question_index INTEGER NOT NULL,
  question_data TEXT NOT NULL,
  added_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Player online stats (heartbeat-based)
CREATE TABLE IF NOT EXISTS player_sessions (
  sid TEXT PRIMARY KEY,
  last_seen TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Legacy account backups (localStorage-based user system)
CREATE TABLE IF NOT EXISTS legacy_accounts (
  user_id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL DEFAULT '',
  avatar_color TEXT NOT NULL DEFAULT '#06b6d4',
  avatar_icon TEXT NOT NULL DEFAULT '👨‍⚕️',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_sync TEXT NOT NULL DEFAULT (datetime('now')),
  game_stats TEXT NOT NULL DEFAULT '[]',
  wrong_questions TEXT NOT NULL DEFAULT '[]',
  study_progress TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_legacy_accounts_username ON legacy_accounts(username);

-- Leaderboard entries
CREATE TABLE IF NOT EXISTS leaderboard (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL,
  period TEXT NOT NULL DEFAULT 'total',
  score REAL NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  win_rate REAL NOT NULL DEFAULT 0,
  max_streak INTEGER NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0,
  reputation INTEGER NOT NULL DEFAULT 0,
  total_value INTEGER NOT NULL DEFAULT 0,
  approved INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_lb_type_period ON leaderboard(type, period);
CREATE INDEX IF NOT EXISTS idx_lb_score ON leaderboard(type, period, score DESC);

CREATE INDEX IF NOT EXISTS idx_wq_user ON wrong_questions(user_id, subject);
CREATE INDEX IF NOT EXISTS idx_progress_user ON study_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
