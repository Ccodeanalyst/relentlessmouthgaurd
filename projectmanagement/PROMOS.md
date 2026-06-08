# Promo Management Plan

Last updated: May 20, 2026

## Immediate Promo

New promo to support:

- Customer-facing code: `Fightclubcrate15`
- Normalized backend code: `FIGHTCLUBCRATE15`
- Discount: `15%`
- Campaign: `Fight Club Crate`
- Recommended status: active

## Current State

- The visible checkout estimate uses `public/js/promo.js`.
- Real payment pricing is protected in `workers/site-worker.mjs`.
- Current backend promo validation is hardcoded in the Worker.
- D1 stores promo use in `promo_redemptions`, but there is no editable `promo_codes` table yet.
- The dashboard can show order `promo_code` values and export them, but it cannot add, disable, delete, or report on promo codes yet.

## Phase 1: Bridge Promo

Status: Complete

Goal: make `FIGHTCLUBCRATE15` usable right away without waiting for the full promo dashboard.

- Added `FIGHTCLUBCRATE15` to the Worker promo map so Stripe Checkout applies the real 15% discount server-side.
- Added `FIGHTCLUBCRATE15` to the frontend seed promos so customers see the correct visible estimate before redirecting to Stripe.
- Live UI check passed: `Fightclubcrate15` discounts a `$149` cart to `$126.65` before tax.
- Live backend check passed: Checkout Session creation stored `promo_code = FIGHTCLUBCRATE15`, `discount_cents = 2235`, and `total_cents = 12665` for a `$149` QA order.
- Temporary QA order was removed from D1 after verification.

## Phase 2: D1 Promo Table

Status: Complete

Goal: move promo definitions out of code and into D1.

Added `database/migrations/0002_promo_codes.sql` with a `promo_codes` table:

- `code TEXT PRIMARY KEY`
- `campaign TEXT NOT NULL`
- `discount_type TEXT NOT NULL`
- `discount_value INTEGER NOT NULL`
- `max_uses INTEGER`
- `starts_at TEXT`
- `expires_at TEXT`
- `active INTEGER NOT NULL DEFAULT 1`
- `created_at TEXT NOT NULL DEFAULT (datetime('now'))`
- `updated_at TEXT NOT NULL DEFAULT (datetime('now'))`
- `created_by TEXT`

Seeded the existing promo set into D1, including `FIGHTCLUBCRATE15` as a 15% active Fight Club Crate promo.

## Phase 3: Backend Promo API

Status: Complete

Goal: make the Worker use D1 as the source of truth.

Added protected admin endpoints:

- `GET /api/admin/promos`
- `POST /api/admin/promos`
- `PATCH /api/admin/promos/:code`
- `DELETE /api/admin/promos/:code`
- `GET /api/admin/promos/:code/redemptions`

Updated checkout:

- Worker validates promo code from D1 first.
- Worker rejects inactive, expired, not-started, or maxed-out codes.
- Worker records promo redemptions after a checkout session is successfully saved.
- Keep the hardcoded promo map as a temporary fallback only during migration.
- Public checkout estimates use `POST /api/validate-promo`, so dashboard-created codes can work without editing frontend code.

## Phase 4: Dashboard Promo Manager

Status: Complete

Goal: manage promos from `/dashboard/`.

Added dashboard views:

- Promo list with code, campaign, discount, active status, uses, max uses, expiry, and revenue/order count.
- Add promo form.
- Edit promo form.
- Disable/delete action with confirmation.
- Promo performance metrics for active promos, redemptions, discount given, and paid revenue.

Dashboard safeguards:

- Normalize codes to uppercase.
- Prevent duplicate codes.
- Require confirmation before delete.
- Prefer disabling over deleting when a promo has redemptions.
- Show whether a promo is live, expired, scheduled, inactive, or maxed out.

## Current Verification

- Remote D1 migration applied successfully to `relentless-orders`.
- Live public validation for `Fightclubcrate15` returned `discountCents = 2235` and `totalCents = 12665` on a `$149` cart.
- Live dashboard API login succeeded using protected credentials from `.env`.
- Temporary dashboard-created `QAPROMO15` validated publicly, then was deleted.
- Remote D1 cleanup check confirmed `0` `QAPROMO%` rows remain.
- Browser QA confirmed `/dashboard/` loads the promo manager with `FIGHTCLUBCRATE15` listed from D1.
- Screenshot saved: `projectmanagement/qa/dashboard-promo-manager-live.png`.

## Phase 5: Reporting

Goal: make promo performance easy to track.

Metrics:

- Orders by campaign.
- Gross revenue by campaign.
- Discount total by campaign.
- Net paid revenue by campaign.
- Promo conversion rate once analytics events exist.

Dashboard additions:

- Promo performance cards.
- Filter orders by promo/campaign.
- Export promo performance CSV.

## Recommended Build Order

1. Ship Phase 1 so `Fightclubcrate15` works immediately.
2. Add the D1 `promo_codes` migration.
3. Add admin promo API endpoints.
4. Replace hardcoded Worker promo validation with D1 validation.
5. Add dashboard promo management.
6. Add performance reporting.
