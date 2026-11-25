# Migration notes — theme and UI upgrade (November 2026)

Scope: one static page served from GitHub Pages. Page copy is frozen; only UI,
theme and features may change. Every phase below was shipped green.

## What must be preserved exactly

- All visible text, title, meta description, JSON-LD and vCard content.
  `scripts/verify.sh` diffs the page text against `scripts/text-snapshot.txt`.
- URLs and relative asset paths (`assets/…`, `css/…`, `js/…`): no build step,
  no server, nothing that GitHub Pages cannot serve as-is.
- Existing anchors (`#hero`, `#about`, `#experience`, `#practice`, `#contact`),
  the filter contract (`data-filter` / `data-category`) and the monogram mount.
- Accessibility baseline: skip link, single `h1`, `aria-live` counts, visible
  focus, `prefers-reduced-motion` honoured.

## Phases (each one shipped working)

1. Tooling. `scripts/verify.sh` moved off `node` to `python3` and gained the
   frozen-copy check (`scripts/page_text.py` + snapshot). `scripts/make_assets.py`
   resolves Arial/Liberation per OS and exits loudly when no TrueType font is
   found, instead of silently drawing with Pillow's bitmap default. Assets
   regenerated and compared against the previous card.
2. Correctness. Filter badge counts are computed from the DOM on load, keeping
   the markup values for no-JS readers.
3. Theme. Colour literals replaced with a semantic token layer; light palette
   under `:root[data-theme="light"]`. Toggle in the header, choice persisted in
   `localStorage`, applied by an inline head script before first paint so the
   page never flashes. The monogram reads `--mark-1..4`.
4. UI. Scroll reveal (safety pass at 2.5s), pointer spotlight on practice cards,
   hover rails on rows, 44px mobile targets, print stylesheet remapping tokens
   to ink on white.

## Deprecated or replaced

- `python`/`node` as gate dependencies; the hard-coded `C:/Windows/Fonts` font
  path; the literal hex palette in components (now tokens only).

## Cutover and rollback

Cutover is a push to the default branch; Pages redeploys from it. Rollback for
this phase is `git checkout -- .` before committing, or `git revert <sha>`
after. Assets are reproducible with `python3 scripts/make_assets.py`.

## Verification for any future phase

`bash scripts/verify.sh` must print GATE OK, then load the page at 360, 390 and
1280 px in both themes and confirm no overflow, clipping, overlap or low
contrast, and that the toggle survives a reload.

## Phase 2 — live-site guardrails, recruiter features, design depth (2026-11-25)

Copy is untouched; `scripts/text-snapshot.txt` still matches byte for byte.

1. Guardrails. `.github/workflows/verify.yml` runs the gate on every push and
   pull request. `css/style.css` and both scripts are requested with `?v=YYYYMMDD`
   so Pages' ten-minute cache never serves a stale asset: **bump the date when
   you edit CSS or JS**. `404.html` sends mistyped paths back to `/resume/`
   (meta refresh plus a plain link; the path is hard-coded, update it if the
   repository is renamed).
2. Deep links. `?filter=automation#experience` opens the page already filtered
   and scrolls to the journey; picking a filter rewrites the URL with
   `history.replaceState`, so a copied address carries the filter.
3. Header. A share control (native share sheet where available, clipboard
   otherwise) with a runtime-only status line; keyboard `t` theme, `f` filters,
   `Esc` clears the filter.
4. Design depth. Static film-grain layer (`body::after`, hidden in print and for
   `prefers-contrast: more`), staggered entrance for experience rows and
   practice cards, desktop section rail (markers only, labelled for screen
   readers, shown from 1360px).

Constraints kept: no new visible copy in `index.html` (icons carry `aria-label`
only), no third-party JS, no build step.
