# Payment Plan

Last updated: May 17, 2026

## Business Email

Primary order/contact email:

- relentlessmouthgaurds@gmail.com

## Current Checkout State

Status: Stripe setup started with email fallback

- The site does not collect card details directly.
- Checkout now attempts to create a Stripe Checkout Session through `/api/create-checkout-session`.
- If Stripe secrets are not configured yet, checkout falls back to preparing an order request email to relentlessmouthgaurds@gmail.com.
- Promo codes still calculate order totals locally for the visible checkout, and the Worker mirrors those promo rules server-side before payment.

## Recommended Payment Path

Use Stripe Checkout with Cloudflare Workers.

Why:

- Stripe hosts the secure payment page.
- The website does not need to store or handle card numbers.
- A Cloudflare Worker can create the Stripe Checkout Session.
- Stripe secret keys stay server-side in Cloudflare secrets.
- The cart can redirect customers to Stripe, then return them to success or cancel pages.

Official docs:

- Stripe Checkout overview: https://docs.stripe.com/payments/checkout/how-checkout-works
- Stripe Create Checkout Session API: https://docs.stripe.com/api/checkout/sessions/create
- Cloudflare Workers secrets: https://developers.cloudflare.com/workers/configuration/secrets/
- Cloudflare Workers environment variables: https://developers.cloudflare.com/workers/configuration/environment-variables/

## Phase 7 Payment Build

1. Create or confirm Stripe account.
2. Create Stripe products/prices for:
   - Base Guard - $99
   - Dual Layer Guard - $119
   - Full Custom Graphics Guard - $149
   - Rush Order add-on, only if final pricing is approved
3. Add Cloudflare Worker endpoint:
   - `POST /api/create-checkout-session`
4. Store secrets in Cloudflare:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
5. Update checkout button:
   - From `Prepare Order Email`
   - To `Pay Securely`
6. Send cart items, promo code, customer email, and order notes to the Worker.
7. Worker validates prices and promo codes server-side.
8. Worker creates Stripe Checkout Session and returns the Stripe URL.
9. Customer pays on Stripe-hosted checkout.
10. Stripe webhook confirms payment.
11. Save paid order to database.
12. Send confirmation email to customer and relentlessmouthgaurds@gmail.com.

## Current Stripe Starter Implementation

- `wrangler.jsonc` now points to `workers/site-worker.mjs` and binds static assets as `ASSETS`.
- `workers/site-worker.mjs` handles `POST /api/create-checkout-session`.
- `workers/site-worker.mjs` handles `POST /api/stripe-webhook` for Stripe webhook events.
- Product pricing is validated server-side before Stripe receives line items.
- Promo codes are validated server-side before Stripe receives the final payable amount.
- Stripe webhook signatures are verified with `STRIPE_WEBHOOK_SECRET` before paid-order updates are accepted.
- If a Cloudflare D1 `DB` binding is configured, checkout-started and payment-succeeded events are written to the orders database.
- Stripe secret keys are read from Worker secrets only. Use `.dev.vars` locally and Cloudflare secrets in production.
- `.dev.vars.example` shows the expected local secret name without committing a real secret.

## Important Rules

- Do not put Stripe secret keys in frontend HTML or JavaScript.
- Do not trust frontend prices or promo totals for real payment.
- Promo codes must be validated server-side before payment.
- Orders should move to a real database before or during payment launch.
- Card details should be handled by Stripe, not by this website.

## Local Secret Setup

1. Copy `.dev.vars.example` to `.dev.vars`.
2. Put the Stripe test secret key in `.dev.vars` as `STRIPE_SECRET_KEY`.
3. Put the Stripe CLI or Dashboard webhook signing secret in `.dev.vars` as `STRIPE_WEBHOOK_SECRET`.
4. Restart `npx wrangler dev --local --port 8787`.
5. For production, set the secrets with:
   - `npx wrangler secret put STRIPE_SECRET_KEY`
   - `npx wrangler secret put STRIPE_WEBHOOK_SECRET`

## Open Decisions

- Should rush order be a checkout add-on or contact-only?
- Should team/gym orders pay online or request a quote first?
- Should shipping stay included for all products?
- Should Stripe promo codes mirror the current site promo codes, or should the Worker calculate discounts?
