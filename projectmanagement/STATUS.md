# Project Status

Last updated: May 16, 2026

## Completed

- Replaced text-based site logos with image logo assets across the public pages.
- Removed the extra logo image from the homepage hero.
- Expanded the shop page sections so they feel full-width and less compact, matching the homepage spread style.
- Added a photo background to the shop hero with dark overlays for readable copy.
- Converted the homepage recent work/design preview into a carousel with arrows, dots, keyboard support, swipe-friendly scrolling, slow autoplay, and pause on hover/focus.
- Started Phase 2 visual QA:
  - Fixed mobile homepage hero headline clipping.
  - Tightened mobile shop hero spacing so packages appear sooner.
  - Confirmed no browser console warnings or errors during the mobile pass.
- Installed Playwright and Chromium for viewport-specific screenshot QA.
- Ran a Playwright smoke test against `shop.html` and saved a screenshot in `projectmanagement/qa/`.
- Finished Phase 2 visual QA:
  - Captured desktop, tablet, and mobile Playwright screenshots for the homepage and shop page.
  - Switched tablet navigation to the hamburger menu before the header gets crowded.
  - Fixed mobile shop kit detail spacing so the "What's Included" copy stacks cleanly.
  - Confirmed carousel autoplay advances slowly and pauses on hover.
  - Confirmed homepage and shop page console checks return no warnings or errors.
  - Confirmed CTA arrows render correctly after removing encoded arrow artifacts.
- Reworked the homepage into a leaner sales funnel:
  - Hero with `Design Your Guard` as the primary CTA.
  - `See Recent Work` secondary CTA.
  - Design carousel.
  - Three value points: Custom Fit, Premium Design, Free Kit Shipping.
- Featured custom design offer before the Phase 4 pricing update.
  - Final CTA banner.
- Moved heavier buying/detail content to the shop page:
  - Package comparison.
  - What is included in the kit.
  - How ordering works.
  - Design upgrade / builder CTA.
  - FAQ and order notes.
- Finished Phase 3 buying flow QA:
  - Shop package cart buttons now use current product image paths.
  - Checkout line items show package/build details.
- Builder pricing matched the previous custom design package before the Phase 4 pricing update.
  - Builder cart items stay distinct by selected color, sport, and custom text.
  - Checkout cart text is escaped before rendering.
  - Playwright confirmed shop-to-checkout and builder-to-checkout totals.
- Started Phase 4 content/pricing pass:
  - Updated pricing to `$99` Single Layer Basic Light Bite, `$119` Dual Layer Basic Heavy Bite, and `$149` Dual Layer Custom Graphics.
  - Updated builder pricing to `$149` for Dual Layer Custom Graphics.
  - Removed dental-impression wording from key sales pages.
  - Removed dual-color package language.
- Removed outdated non-product imagery from homepage/top-photo usage.
  - Replaced the gallery's older AI-style images with current product photos.
  - Added team/gym discount and affiliate outreach copy.
  - Added bottom disclaimer copy to the main public footers.
  - Fixed homepage carousel autoplay so it no longer scrolls the page back to the gallery during rotation.
- Simplified the main navigation:
  - Main nav now links only to top-level pages: Home, Shop, Design Yours, Gallery, and Contact.
  - Removed section links and the text Checkout link from the main nav.
  - Kept checkout access as the cart icon.
  - Added a dedicated Contact page for order questions, gym discounts, and affiliate inquiries.
- Added legal/safety content:
  - Created a Terms & Safety Disclaimer page.
  - Clarified that RELENTLESS provides sports mouthguards for contact sports and is not a dental or medical provider.
  - Added non-treatment language for night guards, bruxism, TMJ/TMD, sleep apnea, retainers, orthodontic appliances, and similar dental/medical uses.
  - Added footer links to the disclaimer page.
- Added homepage intro prototype:
  - Full-screen cinematic logo reveal inspired by movie-studio intros.
  - Skippable intro button.
  - Reduced-motion fallback.
  - Local Playwright screenshots saved in `projectmanagement/qa/`.
- Synced local `main` with GitHub before starting the May 16 update pass.
- Completed the latest content/product cleanup:
  - Changed the homepage hero statement to "Fit as good as they look."
  - Confirmed no outdated business names, dental-impression wording, old product labels, or old pricing remains in source pages.
  - Renamed public product options to Base Guard, Dual Layer Guard, and Full Custom Graphics Guard.
  - Added clear pricing language for `$99`, `$119`, and `$149` with shipping and at-home impression kit included.
  - Added available color options and labeled color combination examples on the shop page.
  - Updated builder color choices to Black, White, Clear, Blue, Red, Green, Yellow, and Pink, with purple and orange noted as coming soon.
  - Added team, gym, and affiliate order copy.
  - Added a rush order note as an estimated `$30` option depending on shipping and production timing.
  - Added promo codes for FightEvo, teamSrisuk50, SwaycityMT, and RMGSponsor81.
  - Updated gallery helper copy to "Current design examples. More custom builds will be added soon."
  - Tightened carousel behavior so homepage autoplay stops when the carousel is out of view.
- Refreshed the homepage carousel to use the full real product photo set, including Mafia Layout and Green Pop instead of only the previous six slides.
- Updated `How It Works` navigation links to point to `shop.html#ordering`.
- Verified `js/main.js` with `node --check`.

## Current Site Flow

Homepage:
Hero -> Design carousel -> Value proof -> Featured premium offer -> CTA.

Shop page:
Shop hero -> Package comparison -> Kit contents -> Ordering workflow -> Design upgrade -> FAQ/order notes -> CTA.

## Open Follow-Ups

- Confirm whether the rush order add-on should be active in checkout or remain a contact-before-order note.
- Reconfirm pricing if it changes tomorrow morning.
- Add any new real product photos when the final photo folder is available.
- Start Phase 5 next: final launch QA across all public pages.
- After Phase 5, move into Cloudflare/domain/analytics setup, then real checkout, database, and admin dashboard phases.
- Added primary contact/order email: relentlessmouthgaurds@gmail.com.
- Changed checkout to a temporary order-request email flow so the site does not show fake Stripe/card fields before real payment processing is connected.
- Added `projectmanagement/PAYMENTS.md` with the recommended Stripe Checkout + Cloudflare Workers payment plan.
- Started Phase 8 backend/admin foundation:
  - Added future D1 schema in `database/schema.sql`.
  - Added non-deployed Workers API foundation in `workers/orders-api.mjs`.
  - Expanded local admin order statuses for kit shipped, impressions received, proof sent, production, shipped, delivered, and cancelled.
- Started Phase 9 builder upgrade:
  - Rebuilt the builder around package selection, base color, color combo, artwork reference, sport/details, rush request, and team/gym inquiry path.
  - Builder cart metadata now carries package, sport, color, combo, artwork filename, rush flag, text, and notes into checkout.
