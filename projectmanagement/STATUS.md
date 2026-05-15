# Project Status

Last updated: May 14, 2026

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
  - Featured Premium Custom Design offer at `$79.99`.
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
  - Builder pricing matched the previous Premium Custom Design package before the Phase 4 pricing update.
  - Builder cart items stay distinct by selected color, sport, and custom text.
  - Checkout cart text is escaped before rendering.
  - Playwright confirmed shop-to-checkout and builder-to-checkout totals.
- Started Phase 4 content/pricing pass:
  - Updated pricing to `$99` Single Layer Basic Light Bite, `$119` Dual Layer Basic Heavy Bite, and `$149` Dual Layer Custom Graphics.
  - Updated builder pricing to `$149` for Dual Layer Custom Graphics.
  - Removed dental-impression wording from key sales pages.
  - Removed dual-color package language.
  - Removed the Boner Garage image from homepage/top-photo usage.
  - Replaced the gallery's older AI-style images with current product photos.
  - Added team/gym discount and affiliate outreach copy.
  - Added bottom disclaimer copy to the main public footers.
  - Fixed homepage carousel autoplay so it no longer scrolls the page back to the gallery during rotation.
- Simplified the main navigation:
  - Main nav now links only to top-level pages: Home, Shop, Design Yours, Gallery, and Contact.
  - Removed section links and the text Checkout link from the main nav.
  - Kept checkout access as the cart icon.
  - Added a dedicated Contact page for order questions, gym discounts, and affiliate inquiries.
- Updated `How It Works` navigation links to point to `shop.html#ordering`.
- Verified `js/main.js` with `node --check`.

## Current Site Flow

Homepage:
Hero -> Design carousel -> Value proof -> Featured premium offer -> CTA.

Shop page:
Shop hero -> Package comparison -> Kit contents -> Ordering workflow -> Design upgrade -> FAQ/order notes -> CTA.

## Open Follow-Ups

- Review final copy for brand tone and pricing accuracy before launch.
