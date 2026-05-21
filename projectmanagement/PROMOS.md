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

Goal: move promo definitions out of code and into D1.

Add a new migration with a `promo_codes` table:

- `code TEXT PRIMARY KEY`
- `campaign TEXT NOT NULL`
- `discount_type TEXT NOT NULL`
- `discount_value INTEGER NOT NULL`
- `max_uses INTEGER`
- `uses INTEGER NOT NULL DEFAULT 0`
- `starts_at TEXT`
- `expires_at TEXT`
- `active INTEGER NOT NULL DEFAULT 1`
- `created_at TEXT NOT NULL DEFAULT (datetime('now'))`
- `updated_at TEXT NOT NULL DEFAULT (datetime('now'))`
- `created_by TEXT`

Seed `FIGHTCLUBCRATE15` into D1 as a 15% active promo.

## Phase 3: Backend Promo API

Goal: make the Worker use D1 as the source of truth.

Add protected admin endpoints:

- `GET /api/admin/promos`
- `POST /api/admin/promos`
- `PATCH /api/admin/promos/:code`
- `DELETE /api/admin/promos/:code`
- `GET /api/admin/promos/:code/redemptions`

Update checkout:

- Worker validates promo code from D1 first.
- Worker rejects inactive, expired, not-started, or maxed-out codes.
- Worker records promo redemptions only after successful checkout start/payment flow.
- Keep the hardcoded promo map as a temporary fallback only during migration.

## Phase 4: Dashboard Promo Manager

Goal: manage promos from `/dashboard/`.

Dashboard views:

- Promo list with code, campaign, discount, active status, uses, max uses, expiry, and revenue/order count.
- Add promo form.
- Edit promo drawer.
- Disable/enable action.
- Delete action with confirmation.
- Redemption history for each promo.
- CSV export.

Dashboard safeguards:

- Normalize codes to uppercase.
- Prevent duplicate codes.
- Require confirmation before delete.
- Prefer disabling over deleting when a promo has redemptions.
- Show whether a promo is live, expired, scheduled, inactive, or maxed out.

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
