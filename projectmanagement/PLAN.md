# Project Plan

Last updated: May 16, 2026

## Phase 1: Funnel Structure

Status: Complete

- Make the homepage the main conversion page.
- Keep the homepage focused on hero, design proof, value proof, featured premium offer, and final CTA.
- Move package details, ordering steps, kit contents, upgrade details, and FAQ/order notes to the shop page.

## Phase 2: Visual Polish

Status: Complete

- Preview homepage and shop page at mobile width. Status: Complete in in-app browser.
- Preview homepage and shop page at desktop and tablet widths. Status: Complete with Playwright screenshots.
- Check carousel autoplay timing, hover pause, keyboard behavior, and mobile swipe behavior. Status: Complete for the current implementation.
- Tune image crops in hero, carousel, featured offer, and shop sections. Status: Complete for the current pass.
- Confirm spacing between homepage sections feels intentional and not too long. Status: Complete.

## Phase 2 Findings

- Fixed mobile homepage hero headline clipping by reducing mobile H1 scale and top-aligning hero content.
- Reduced mobile shop hero depth so the package section appears sooner.
- Confirmed mobile shop package card layout reads cleanly.
- Switched the tablet header to the hamburger menu before the nav becomes crowded.
- Fixed mobile shop kit detail cards so labels and copy no longer overlap.
- Tightened the desktop homepage hero copy width so the hero image collage reads cleaner.
- Fixed CTA arrow encoding on the homepage and shop page.
- Confirmed browser console has no warnings or errors on the tested homepage and shop page.
- Confirmed carousel autoplay advances slowly and pauses while hovered.
- Playwright and Chromium are installed, and viewport screenshots are saved in `projectmanagement/qa/`.

## Phase 3: Buying Flow

Status: Complete

- Confirm all `Add to Cart` buttons use real available image paths. Status: Complete.
- Review cart and checkout flow after the shop page restructure. Status: Complete.
- Confirm package pricing and product names are final for the current pass. Status: Complete.
- Make sure the builder CTA sends users to the best next step for premium custom orders. Status: Complete.

## Phase 3 Findings

- Updated shop package buttons to add the same product images shown on the page.
- Aligned builder pricing with the Premium package at `$79.99`.
- Builder orders now create distinct cart lines by color, sport, and custom text instead of merging into the generic Premium item.
- Checkout now shows product detail notes in each cart line.
- Checkout cart text is escaped before rendering.
- Confirmed the shop-to-checkout and builder-to-checkout flow with Playwright.

## Phase 4: Content Review

Status: In progress

- Review homepage headline, subtitle, and CTAs for stronger sales language. Status: In progress.
- Review shop page FAQ/order notes for accuracy. Status: In progress.
- Check footer copy and navigation labels. Status: In progress.
- Remove any placeholder or internal-sounding copy before launch. Status: In progress.

## Phase 4 Findings

- Updated public pricing to `$99` Single Layer Basic Light Bite, `$119` Dual Layer Basic Heavy Bite, and `$149` Dual Layer Custom Graphics.
- Updated package copy to say shipping and the at-home impression kit are included.
- Renamed the public product option labels to Base Guard, Dual Layer Guard, and Full Custom Graphics Guard.
- Added available colors: Black, White, Clear, Blue, Red, Green, Yellow, and Pink.
- Added labeled color combination examples, including Red-Green.
- Noted purple and orange as coming soon.
- Removed dental-impression phrasing from the homepage, shop page, and gallery copy.
- Removed dual-color language from the premium/custom graphics package.
- Removed the older AI-style gallery image paths and refreshed the gallery with current product photos.
- Removed the Boner Garage image from the homepage/top-photo flow.
- Added team/gym outreach copy for discounts and affiliate program interest.
- Added rush order note as an estimated `$30` option depending on shipping and production timing.
- Added promo codes for FightEvo, teamSrisuk50, SwaycityMT, and RMGSponsor81.
- Added a bottom mouthguard safety disclaimer to the main public footers.
- Fixed the homepage carousel autoplay so it no longer pulls the page back to the gallery while rotating.
- Updated carousel behavior so autoplay pauses when the gallery carousel is out of view.
- Added a dedicated Contact page for order questions, gym discounts, and affiliate inquiries.
- Simplified the main navigation so it only points to top-level pages.
- Kept checkout out of the main nav and available through the cart icon.
- Added a Terms & Safety Disclaimer page for sports-mouthguard use, non-dental-provider language, injury limitations, and fit/care guidance.
- Added footer links to the Terms & Safety Disclaimer page.
- Added a homepage cinematic logo intro prototype with a skip control and reduced-motion fallback.
- Changed the homepage hero phrase to "Fit as good as they look."

## Phase 5: Launch Readiness

Status: Planned

- Run a final browser pass across the public pages.
- Check images load correctly from `assets/images`.
- Check mobile navigation and cart badge behavior.
- Prepare a final completed-work summary in `projectmanagement/STATUS.md`.
