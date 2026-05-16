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
- Aligned builder pricing with the previous premium package before the Phase 4 pricing update.
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
- Removed outdated non-product imagery from the homepage/top-photo flow.
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

## Phase 5 Checklist

- Final visual QA on Home, Shop, Builder, Gallery, Contact, Checkout, and Terms pages.
- Confirm all CTAs lead to the intended next step.
- Confirm promo codes apply correctly in checkout.
- Confirm cart add/remove behavior works across pages.
- Confirm all active product images are real product photos.
- Confirm homepage intro feels polished and is not too slow for returning visitors.
- Reconfirm final pricing, shipping, and rush order language before public launch.
- Run Cloudflare dry-run deploy before each push.

## Phase 6: Deployment, Domain, and Analytics

Status: Planned

- Confirm Cloudflare deploy command uses `npx wrangler deploy`.
- Confirm Cloudflare deploy reads from `public/` only.
- Connect the production domain when ready.
- Add redirects if any old URLs need to point to the new pages.
- Add basic analytics so visits, CTA clicks, and checkout starts can be measured.
- Add conversion events for `Design Your Guard`, `Add to Cart`, promo apply, and checkout start.
- Confirm sitemap, metadata, favicon, and social preview card.

## Phase 7: Checkout and Payments

Status: Planned

- Current temporary state: checkout prepares an order request email to relentlessmouthgaurds@gmail.com instead of collecting card details.
- Replace temporary checkout behavior with real payment processing.
- Recommended provider flow: Stripe Checkout through a Cloudflare Worker.
- Decide whether rush order becomes a selectable checkout add-on.
- Decide whether team/gym orders stay as contact requests or get their own quote form.
- Send order confirmation emails to the customer and business.
- Add clearer order status language: kit shipped, impressions received, proof sent, production, shipped.
- Make sure discount codes are handled server-side before taking real payments.
- See `projectmanagement/PAYMENTS.md` for the implementation plan and official docs.

## Phase 8: Orders Database and Admin Dashboard

Status: In progress

- Move orders out of browser `localStorage` and into a real database.
- Recommended Cloudflare path: Workers + D1 for orders, with R2 later if file uploads are needed.
- Add admin login before exposing order data.
- Build admin order list with filters by status, product type, promo code, and date.
- Add order detail view with customer info, selected color, sport, design notes, rush flag, and uploaded art when available.
- Add status updates and internal notes for production tracking.
- Add export options for CSV and email list management.

## Phase 8 Current Pass

- Added `database/schema.sql` as the future Cloudflare D1 order schema.
- Added `workers/orders-api.mjs` as a non-deployed Workers API foundation.
- Expanded local admin order statuses to match the future production workflow.
- Kept live checkout as the email order-request flow until payments/database are ready.

## Phase 9: Design Builder Upgrade

Status: In progress

- Add clearer product selection inside the builder: Base Guard, Dual Layer Guard, Full Custom Graphics Guard.
- Add color combo selection with labels under color circles.
- Add artwork upload flow for logos or reference images.
- Add optional rush order toggle if approved.
- Add team/gym inquiry path from the builder.
- Improve preview behavior so selected colors and notes feel more connected to the final order.

## Phase 9 Current Pass

- Rebuilt the builder into a five-step flow: package, base color, color combo, artwork, and details.
- Added package switching for Base Guard, Dual Layer Guard, and Full Custom Graphics Guard.
- Added labeled color combo controls.
- Added artwork filename capture for order metadata.
- Added rush request toggle at estimated `+$30`.
- Added team/gym/affiliate path from the builder.
- Builder cart items now include package, sport, color, combo, artwork filename, rush request, custom text, and notes.

## Phase 10: Content, SEO, and Growth

Status: Planned

- Add more real product photos as they come in.
- Add team/gym landing content when partnerships are ready.
- Add contact-sport specific copy for MMA, boxing, Muay Thai, football, BJJ, and other sports.
- Add FAQ content for shipping time, impression kit process, proof review, fit concerns, and care instructions.
- Review Terms & Safety Disclaimer with a qualified professional before launch.
- Build promo campaign tracking for gyms, affiliates, and sponsored athletes.
