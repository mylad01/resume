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

## Phase 3 — appearance engine, installable page, generated PDF (2026-11-25)

Copy is unchanged; the frozen-copy check now skips `data-ui` subtrees, so the
appearance panel's own labels are chrome, not CV text.

1. Appearance panel (`#theme-panel`, opened from the palette button in the
   header). A role editor, not a swatch list (theme engine in `js/theme.js`):
   - seven editable roles: background, surface, card, text, muted text, accent,
     border — each with a colour input and a hex field, applied live;
   - every other token (`--text-2..4`, `--muted-2/3`, `--line-soft/strong/hover`,
     `--card-wash`, `--row-hover`, `--ring-line`, `--grid`, `--nav-bg`,
     `--bg-soft`, `--lime*`, `--glow`, `--dot-glow`, `--mark-1..4`, `--shadow`)
     is derived from those seven, so the page stays coherent;
   - derived text tokens have a contrast floor: `tone()` walks the fade back
     toward the background until the colour clears 4.5:1 on background **and**
     card, so light presets cannot produce unreadable small type;
   - six presets (night, paper, slate, forest, sand, glass), a contrast readout,
     a grain switch and a mode toggle; `t` still swaps night ↔ paper;
   - liquid glass: a Glass segmented control (off / soft / strong) that works
     with any preset. It sets `data-glass` on `<html>`; the sheet gives the nav,
     experience rows, practice cards, about facts and panel a translucent
     `--glass-bg` surface with backdrop blur, saturation and a specular top
     edge. Blur/alpha are tokens derived from the same roles, so glass never
     changes text contrast, and print strips the whole effect;
   - persisted in `localStorage` (`mn-theme-v2`) as the role set **plus** the
     derived token map, so the head script repaints before first paint with no
     colour maths. Inline token styles are stripped on `beforeprint` and
     re-applied after, so the print sheet still wins.
   Panel chrome is `data-ui`, so it is not part of the frozen-copy check.

2. Installable page. `manifest.webmanifest` plus `sw.js`: HTML is
   **network-first** (a new CV is never hidden behind the cache), assets are
   cache-first because they carry `?v=`. Icons come from
   `scripts/make_assets.py` (192, 512, maskable 512).
3. Generated PDF. `scripts/make_pdf.py` parses `index.html` and lays the same
   words out with reportlab (`pip install reportlab`), portrait included; it
   refuses to run if the expected page structure is missing. `verify.sh`
   cross-checks the PDF with poppler when it is installed: all four entries, no
   stray text, exactly one page.
4. Copy email. `copyText()` uses `navigator.clipboard` when it is available and
   falls back to a hidden textarea plus `execCommand('copy')` when the async
   API is blocked or missing, so COPY works in strict browsers and plain HTTP.
   The share sheet's copy-link path uses the same helper.

Cache version: `?v=20261125h`. Whenever CSS or JS changes, bump that string in
`index.html` **and** in `sw.js` (cache name plus the `CORE` list) together, or
returning visitors keep the old files. `verify.sh` reads the version out of
`index.html` and fails if `sw.js` disagrees, so the two cannot drift.

5. Motion system. Motion tokens live in `:root` (`--dur-1`…`--dur-4`,
   `--ease-out`, `--ease-in`, `--stagger`). First load composes the hero with
   `mn-rise` / `mn-panel` / `mn-ring` / `mn-rule`, staggered 40–360 ms; rows,
   cards, section headings and about facts reveal on scroll with their order
   set as `--i` by `main.js`, so groups never share one running index. The
   monogram drifts a few pixels from scroll (`data-parallax`). Every rule is
   inside `html.js` with the finished page as the base style, so no-JS, print
   and `prefers-reduced-motion` all show the complete page. The mobile nav is
   opaque because the blur is disabled there.

