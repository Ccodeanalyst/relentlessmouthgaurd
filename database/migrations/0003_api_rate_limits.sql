-- Rate-limiting table for public API endpoints (checkout, promo validation).
-- Tracks request counts per IP per endpoint within a rolling window.

CREATE TABLE IF NOT EXISTS api_requests (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  ip         TEXT    NOT NULL,
  endpoint   TEXT    NOT NULL,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_api_requests_ip_endpoint ON api_requests(ip, endpoint, created_at);
