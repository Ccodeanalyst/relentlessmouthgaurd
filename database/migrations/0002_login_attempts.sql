-- Rate-limiting table for admin login attempts.
-- Tracks failed attempts per IP to enforce lockout after repeated failures.

CREATE TABLE IF NOT EXISTS login_attempts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  ip         TEXT    NOT NULL,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  success    INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip, created_at);
