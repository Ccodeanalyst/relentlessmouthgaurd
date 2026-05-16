# Payment Plan

Last updated: May 16, 2026

## Business Email

Primary order/contact email:

- relentlessmouthgaurds@gmail.com

## Current Checkout State

Status: Temporary order-request flow

- The site does not collect card details directly.
- Checkout prepares an order request email to relentlessmouthgaurds@gmail.com.
- This avoids showing fake card fields while real payment processing is being set up.
- Promo codes still calculate order totals locally for planning and testing.

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

## Important Rules

- Do not put Stripe secret keys in frontend HTML or JavaScript.
- Do not trust frontend prices or promo totals for real payment.
- Promo codes must be validated server-side before payment.
- Orders should move to a real database before or during payment launch.
- Card details should be handled by Stripe, not by this website.

## Open Decisions

- Should rush order be a checkout add-on or contact-only?
- Should team/gym orders pay online or request a quote first?
- Should shipping stay included for all products?
- Should Stripe promo codes mirror the current site promo codes, or should the Worker calculate discounts?
