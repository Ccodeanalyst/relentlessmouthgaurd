-- D1-backed promo management for RELENTLESS checkout.

CREATE TABLE IF NOT EXISTS promo_codes (
  code TEXT PRIMARY KEY,
  campaign TEXT NOT NULL,
  discount_type TEXT NOT NULL DEFAULT 'pct',
  discount_value INTEGER NOT NULL,
  max_uses INTEGER,
  starts_at TEXT,
  expires_at TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON promo_codes(active);
CREATE INDEX IF NOT EXISTS idx_promo_codes_campaign ON promo_codes(campaign);
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_code ON promo_redemptions(promo_code);

INSERT OR IGNORE INTO promo_codes (
  code, campaign, discount_type, discount_value, max_uses, starts_at, expires_at, active, created_by
) VALUES
  ('RELENTLESS15', 'General Launch', 'pct', 15, 9999, '2026-01-01', '2028-12-31', 1, 'migration'),
  ('WELCOME10', 'Welcome', 'pct', 10, 9999, '2026-01-01', '2028-12-31', 1, 'migration'),
  ('FIGHTCLUB501', 'Fight Club Crate', 'pct', 20, 1, '2026-01-01', '2027-06-30', 1, 'migration'),
  ('FC15OFF', 'Fight Club Crate', 'pct', 15, 1, '2026-01-01', '2027-06-30', 1, 'migration'),
  ('FIGHTCLUBCRATE15', 'Fight Club Crate', 'pct', 15, 9999, '2026-05-20', '2028-12-31', 1, 'migration'),
  ('IM1120', 'Fight Club Crate', 'pct', 20, 1, '2026-01-01', '2027-06-30', 1, 'migration'),
  ('FIGHTEVO', 'FightEvo', 'pct', 15, 9999, '2026-05-16', '2028-12-31', 1, 'migration'),
  ('TEAMSRISUK50', 'Team Srisuk', 'pct', 50, 9999, '2026-05-16', '2028-12-31', 1, 'migration'),
  ('SWAYCITYMT', 'Sway City Muay Thai', 'pct', 30, 9999, '2026-05-16', '2028-12-31', 1, 'migration'),
  ('RMGSPONSOR81', 'RMG Sponsor', 'pct', 50, 9999, '2026-05-16', '2028-12-31', 1, 'migration');
