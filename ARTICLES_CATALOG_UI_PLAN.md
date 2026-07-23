# Articles Catalog UI/UX Improvement Plan

## Problems identified

1. **Sidebar does not point to the Articles catalog.**
   - The main nav item is labeled "Scripts" and links to `script-reader.html`.
   - The Articles catalog (`pages/articles.html`) is only reachable through the collapsed "Script Library" → "Browse All" link.

2. **Duplicate type label on article cards.**
   - `article-card.js` renders the type badge (Article / News / Speech) on the thumbnail overlay.
   - It also renders the same label again above the title when `hskDisplay` is empty, so "News" can appear twice.

3. **HSK mini-bar has no legend.**
   - The colored distribution bar gives no indication of what each color means.

4. **Mini-bar looks incomplete.**
   - For HSK4+ articles only HSK4/5/6/Beyond segments are shown, but percentages are not normalized, leaving most of the bar as empty background.

5. **Source attribution is ugly.**
   - Descriptions contain raw strings like `Original article: https://finance.caixin.com/...`.
   - This breaks the visual flow and is hard to read.

## UX goals

- Make the catalog the primary entry point for reading content.
- Let students scan cards quickly: topic → difficulty → value → action.
- Surface meaningful difficulty information with a clear legend.
- Show source attribution as a clean, trustworthy link.
- Add value signals (read time, idiom count, audio) that help a student decide which article to open.

## Step-by-step implementation plan

### Step 1 — Fix sidebar navigation
- In `js/shell.js`, rename the main nav item from **Scripts** to **Articles**.
- Update both `NAV_ITEMS.root` and `NAV_ITEMS.pages` so the href is `pages/articles.html`.
- Keep the Script Library collapsible section as a secondary navigation aid.

### Step 2 — Redesign the article card
Update `js/components/article-card.js` with the following card structure:

1. **Thumbnail / placeholder**
   - Keep the type badge on the thumbnail only (Article / News / Speech).
   - Replace the oversized `文` placeholder with a subtle topic pattern or icon.
   - Keep the HSK level badge on the thumbnail bottom-left for quick scanning.

2. **Title**
   - One-line, bold, with a hover color transition.

3. **Teaser / description**
   - Two-line clamp.
   - Strip the `Original article: https://...` prefix from the description text.

4. **Source attribution**
   - Parse the domain from `sourceUrl`.
   - Render as a subtle inline link with an `open_in_new` icon, e.g., `caixin.com`.

5. **HSK difficulty fingerprint**
   - Render only the focused band (HSK4/5/6/Beyond for HSK4+ articles, HSK1/2/3 for lower-level articles).
   - Normalize the displayed percentages so the bar always fills 100% width.
   - Add a tooltip on hover that shows the exact percentages.

6. **Metadata row**
   - Estimated read time (derived from character/line count or fallback).
   - Idiom count when greater than zero, e.g., `3 成语`.
   - Audio indicator only when `hasAudio` is true.
   - Optional "Recommended" badge when the article matches the user's stored HSK level.

### Step 3 — Add a catalog-level HSK legend
- Place a compact legend directly under the filter bar or above the grid.
- Reuse `js/components/hsk-legend.js` in `focused` mode so it matches the card bars.

### Step 4 — Improve the filter bar
- Visually group HSK level pills and type chips.
- Pre-select the user's stored HSK level on load.
- Add a "Clear filters" button that appears when any filter is active.
- Keep sorting as Newest / Easiest / Hardest.

### Step 5 — Personalize the catalog heading
- If the user has a stored HSK level, show a "Recommended for your level" sub-heading.
- Otherwise fall back to "Latest articles".

### Step 6 — Add utility helpers
- `getDomainFromUrl(url)` — extract a clean domain for source attribution.
- `estimateReadTime(script)` — estimate reading time from available content metadata.
- Normalize HSK bar data inside the card component so segments sum to 100% within the displayed band.

### Step 7 — Files to change
- `js/shell.js` — sidebar nav labels and links.
- `js/components/article-card.js` — card redesign and normalization.
- `pages/articles.html` — legend container and filter bar refinements.
- `js/pages/articles.js` — wire legend, recommendation heading, clear-filters button.
- `css/design-system.css` — any additional card, legend, or filter styles.

### Step 8 — Verification
- Run the local preview server.
- Capture desktop and mobile screenshots.
- Confirm:
  - Sidebar "Articles" is active and links to the catalog.
  - No duplicate type labels on cards.
  - HSK bars always fill their track.
  - Legend is visible and correctly filtered.
  - Source URLs render as clean domain links.
  - Cards look good on mobile.

## Notes

- This plan aligns with the earlier decision to show only HSK4/5/6/Beyond for HSK4+ articles and HSK1/2/3 for lower-level articles.
- The backend already returns `sourceUrl`, `hskStats`, `idioms`, and `hskLevel`, so no API changes are required.
