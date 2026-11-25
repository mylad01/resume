#!/usr/bin/env bash
# Regression gate for the CV site. Usage: bash scripts/verify.sh
set -u
cd "$(dirname "$0")/.."
fail=0

PY=$(command -v python3 || command -v python) || { echo "FAIL  python3 or python is required"; exit 1; }

check() { # check <label> <command...>
  local label="$1"; shift
  if "$@" >/dev/null 2>&1; then printf 'PASS  %s\n' "$label"
  else printf 'FAIL  %s\n' "$label"; fail=1; fi
}

has()      { grep -qF -- "$1" "$2"; }
count_is() { [ "$(grep -cF -- "$1" "$2")" -eq "$3" ]; }

# --- structure ---------------------------------------------------------------
check "tokens"            has '--lime: #d2f89b' css/style.css
check "wrap"              has 'width: min(var(--wrap), calc(100% - 112px))' css/style.css
check "skip link"         has 'class="skip-link"' index.html
check "progress bar"      has 'id="scroll-progress"' index.html
check "wordmark"          has 'class="wordmark"' index.html
check "cv action"         has 'class="nav-cv"' index.html
check "hero panel"        has 'class="experiment"' index.html
check "monogram mount"    has 'id="mn-mark"' index.html
check "discipline strip"  has 'class="discipline-strip"' index.html
check "portrait"          has 'class="portrait"' index.html
check "facts grid"        has 'class="about-facts"' index.html
check "experience rows"   count_is 'class="experience-row"' index.html 4
check "practice cards"    count_is 'class="practice-card"' index.html 3
check "filter buttons"    count_is 'data-filter=' index.html 4
check "contact links"     has 'class="contact-links"' index.html
check "copy hook"         has 'id="copy-email"' index.html
check "breakpoints"       has 'max-width: 760px' css/style.css
check "reduced motion"    has 'prefers-reduced-motion: reduce' css/style.css
check "appearance panel"  has 'id="theme-panel"' index.html
check "role pickers"      has "data-role-hex" js/theme.js
check "token derivation"  has "'--mark-1'" js/theme.js
check "theme store"       has "mn-theme-v2" js/theme.js
check "theme tokens"      has '--accent: var(--lime)' css/style.css
check "light theme"       has ':root[data-theme="light"]' css/style.css
check "theme meta"        has 'name="color-scheme" content="dark light"' index.html
check "mark tokens"       has "getPropertyValue('--mark-'" js/mark.js
check "section rail"      count_is 'data-rail=' index.html 5
check "share button"      has 'id="share-page"' index.html
check "cache-busted css"  bash -c 'grep -qE "css/style\.css\?v=[0-9a-z]+" index.html'
check "cache-busted js"   bash -c '[ "$(grep -cE "js/(main|mark)\.js\?v=[0-9a-z]+" index.html)" -eq 2 ]'
check "ci gate"           has 'scripts/verify.sh' .github/workflows/verify.yml
check "404 redirect"      has 'url=./' 404.html
check "404 root detect"   has "indexOf('/resume/')" 404.html
check "pwa manifest"      has '"start_url"' manifest.webmanifest
check "pwa standalone"    has '"display": "standalone"' manifest.webmanifest
check "pwa maskable"      has 'icon-maskable-512.png' manifest.webmanifest
check "pwa icons on disk" bash -c 'test -s assets/icon-192.png -a -s assets/icon-512.png -a -s assets/icon-maskable-512.png'
check "sw network-first"  has "request.mode === 'navigate'" sw.js
build=$(grep -o 'style\.css?v=[0-9a-z]*' index.html | head -1 | cut -d= -f2)
check "sw caches build"   has "./css/style.css?v=$build" sw.js
check "sw cache version"  has "mn-cv-$build" sw.js
check "sw registered"     has 'serviceWorker.register' js/main.js
check "panel not printed" has '.theme-panel { display: none' css/style.css
check "glass preset"      has 'glass: {' js/theme.js
check "glass strength ui" has 'data-glass-choice="strong"' index.html
check "glass css hooks"   has 'html[data-glass="strong"]' css/style.css
check "copy fallback"     has 'document.execCommand' js/main.js
check "motion tokens"     has '--dur-3: 340ms' css/style.css
check "entrance motion"   has '@keyframes mn-rise' css/style.css
check "reveal stagger"    has 'calc(var(--i, 0) * var(--stagger))' css/style.css
check "stagger index"     has "setProperty('--i'" js/main.js
check "parallax mount"    has 'data-parallax="0.05"' index.html
check "parallax reduced"  has "prefers-reduced-motion: reduce" js/main.js
check "ledger readout"    has 'data-pct="00"' index.html
check "ledger fill mount" has 'class="ledger-fill"' index.html
check "ledger numbers"    count_is 'data-num=' index.html 4
check "ledger fill js"    has 'paintLedgerFill' js/main.js
check "ledger labels"     has 'attr(data-label)' css/style.css
check "ledger hit"        has 'a.is-hit::after' css/style.css
check "hero word split"   has "className = 'word'" js/main.js
check "settled jumps"     has "is-settled" js/main.js
check "reveal reset"      has 'clip-path: none !important' css/style.css
check "scan motion"       has '@keyframes mn-scan' css/style.css

# The PDF is generated from index.html; cross-check it when poppler is around.
if command -v pdftotext >/dev/null 2>&1; then
  pdftxt=$(mktemp)
  pdftotext assets/Milad-Nasrollahi-CV.pdf "$pdftxt" 2>/dev/null
  check "pdf has every role" bash -c 'for t in "Automation & Python Projects" "Computer Technician" "Insurance Clerk" "Associate Degree in Insurance"; do grep -qF "$t" "$1" || exit 1; done' _ "$pdftxt"
  check "pdf no stray text"  bash -c '! grep -q "Hello," "$1"' _ "$pdftxt"
  check "pdf one page"       bash -c '[ "$(tr -cd "\f" < "$1" | wc -c)" -eq 1 ]' _ "$pdftxt"
  rm -f "$pdftxt"
fi
check "filter deep link"  has 'URLSearchParams' js/main.js
check "rail rule"         has '.section-rail' css/style.css
check "share fallback"    has 'navigator.share' js/main.js

# --- filter wiring -----------------------------------------------------------
for cat in automation it-support-helpdesk other; do
  check "rows for $cat" bash -c "grep -qF 'data-category=\"$cat\"' index.html"
done
check "filter ctx"        has 'resultCount.textContent' js/main.js
check "hidden rule"       has '.experience-row[hidden]' css/style.css
check "studio software"   has 'WORKSTATIONS / RENDER FARM / PHOTOSHOP / PREMIERE PRO / VFX PIPELINE' index.html
check "no unconfirmed"    bash -c '! grep -qE "After Effects|Microsoft Office|Linux" index.html'
check "webp portrait"     has 'assets/profile.webp' index.html
check "webp weight"       bash -c '[ "$(wc -c < assets/profile.webp)" -lt 120000 ]'
check "image dimensions"  has 'width="776"' index.html
check "no vague status"   bash -c '! grep -qF "ALWAYS LEARNING" index.html'
check "hero label"        bash -c 'grep -qE "01 / (IT SUPPORT|OPEN TO)" index.html'
check "h1 is the name"    has '<h1 id="hero-title">Milad Nasrollahi</h1>' index.html
check "slogan is the lede" has '<p class="lede">Where IT support meets intelligent automation.</p>' index.html
check "single h1"         count_is '<h1' index.html 1

# --- one label set: IT support / studio systems / automation -----------------
check "hero labels"        "$PY" -c "import re,sys; s=open('index.html',encoding='utf-8').read(); r=re.search(r'class=\"hero-bottom\">(.*?)</div>', s, re.S).group(1).split('<a')[0]; sys.exit(0 if ' '.join(re.sub(r'<[^>]+>',' ',r).split())=='IT SUPPORT · STUDIO SYSTEMS · AUTOMATION' else 1)"
check "band labels"        "$PY" -c "import re,sys; s=open('index.html',encoding='utf-8').read(); b=re.search(r'class=\"discipline-strip\"[^>]*>(.*?)</div>', s, re.S).group(1); sys.exit(0 if re.findall(r'<span>(.*?)</span>', b)==['IT SUPPORT','STUDIO SYSTEMS','AUTOMATION','PYTHON','LOCAL LLMs','WINDOWS SYSTEMS'] else 1)"
check "footer labels"      has 'IT SUPPORT / STUDIO SYSTEMS / AUTOMATION' index.html
check "experience labels"  "$PY" -c "import re,sys,html; s=open('index.html',encoding='utf-8').read(); pairs=[(v, html.unescape(t).strip()) for v,t in re.findall(r'data-filter=\"([^\"]+)\"[^>]*>([^<]*)<span', s)]; chips=[html.unescape(c) for c in re.findall(r'class=\"category category-\w+\">(.*?)</span>', s)]; want=[('all','All'),('it-support-helpdesk','IT Support & Helpdesk'),('automation','Automation'),('other','Other')]; sys.exit(0 if pairs==want and chips==['Automation','IT Support & Helpdesk','Other','Other'] else 1)"
check "feature bridge"     has 'IT support · Studio systems · Python automation' index.html
check "no vibe language"   bash -c '! grep -qiE "vibe" index.html js/main.js css/style.css'

check "no fake arrows"    bash -c '! grep -qF "job-arrow" index.html'
check "mobile panel compact" has '.sculpture { height: 240px; }' css/style.css
check "print page size"   has '@page { size: A4' css/style.css
check "print block"       has '@media print' css/style.css
check "print parses"      "$PY" -c "import sys; css=open('css/style.css',encoding='utf-8').read(); sys.exit(0 if css.count('{')==css.count('}') else 1)"
check "vcard"             has 'BEGIN:VCARD' assets/milad-nasrollahi.vcf
check "vcard crlf"        "$PY" -c "import sys; d=open('assets/milad-nasrollahi.vcf','rb').read(); sys.exit(0 if d.count(bytes([13,10])) >= 10 else 1)"

check "vcard linked"      has 'assets/milad-nasrollahi.vcf' index.html
check "vcard no placeholder url" bash -c '! grep -q "^URL:" assets/milad-nasrollahi.vcf'

# --- content fidelity --------------------------------------------------------
strings=$(cat <<'EOF'
Where IT support meets intelligent automation.
I learn fast, adapt to new tools, and enjoy turning messy problems into clean, reliable systems.
English · Farsi
Technology · Science · Gaming · Inventing new things
Nov 2026 – Now
Jun 2023 – Nov 2026
Apr 2022 – Jun 2023
Automation &amp; Python Projects (Independent)
Freelancing
Computer Technician / IT Support
Digital Cinema City
Insurance Clerk
Bama Official Insurance Brokerage
Associate Degree in Insurance
Islamic Azad University (North Tehran Branch)
miladnasrollahi.mn@gmail.com
+98 902 395 5445
Tehran, Iran
Reliable IT Support
Studio &amp; Pipeline Support
Automation &amp; Scripting
assets/Milad-Nasrollahi-CV.pdf
assets/profile.webp
EOF
)
missing=0
while IFS= read -r line; do
  [ -z "$line" ] && continue
  grep -qF -- "$line" index.html || { printf 'FAIL  missing copy: %s\n' "$line"; missing=1; fail=1; }
done <<< "$strings"
[ $missing -eq 0 ] && printf 'PASS  content fidelity\n'

chips=$("$PY" -c "import re; s=open('index.html',encoding='utf-8').read(); b=re.findall(r'<div class=\"tags\">(.*?)</div>', s, re.S); print(sum(len(re.findall('<span>', x)) for x in b))")
[ "$chips" -eq 17 ] && printf 'PASS  tag chips (17)\n' || { printf 'FAIL  tag chips (%s)\n' "$chips"; fail=1; }

# --- frozen copy -------------------------------------------------------------
# The page text is frozen: scripts/text-snapshot.txt holds every visible text
# node. Markup, classes and UI may change freely; wording may not. An approved
# copy change is recorded with: python3 scripts/page_text.py --write
diffout=$(mktemp)
if "$PY" scripts/page_text.py > "$diffout.rendered" 2>/dev/null &&
   diff -u scripts/text-snapshot.txt "$diffout.rendered" > "$diffout" 2>&1; then
  printf 'PASS  copy frozen\n'
else
  printf 'FAIL  copy frozen — page text no longer matches scripts/text-snapshot.txt\n'
  sed -n '1,24p' "$diffout"
  fail=1
fi
rm -f "$diffout" "$diffout.rendered"

# --- metadata ----------------------------------------------------------------
check "description"       has 'name="description"' index.html
check "theme colour"      has 'name="theme-color" content="#111310"' index.html
check "svg favicon"       has 'assets/favicon.svg' index.html
check "og image"          has 'property="og:image"' index.html
check "og image size"     has 'property="og:image:height" content="630"' index.html
check "twitter card"      has 'name="twitter:card"' index.html
check "role in title"     has '<title>Milad Nasrollahi — IT Support &amp; Systems Specialist</title>' index.html
check "role in og"        has 'property="og:title" content="Milad Nasrollahi — IT Support &amp; Systems Specialist"' index.html
check "role in nav"       has 'IT SUPPORT<br>SYSTEMS SPECIALIST' index.html
check "role in json-ld"   has '"jobTitle": "IT Support & Systems Specialist"' index.html
check "old role gone"     bash -c '! grep -qF "Vibe Coder" index.html'
check "json-ld person"    has '"@type": "Person"' index.html
check "json-ld valid"     "$PY" -c "import json,re,sys; s=open('index.html',encoding='utf-8').read(); b=re.search(r'<script type=\"application/ld\+json\">(.*?)</script>', s, re.S).group(1); d=json.loads(b); sys.exit(0 if d['name']=='Milad Nasrollahi' else 1)"

# --- leftovers ---------------------------------------------------------------
check "no old palette"    bash -c '! grep -qE "#0b0b0d|#141418|#e6e6e6" css/style.css'
check "no old classes"    bash -c '! grep -qE "site-header|timeline-entry|photo-slot" index.html'
check "no dead wrapper"   bash -c '! grep -qF "experience-list" index.html'

echo
[ $fail -eq 0 ] && echo "GATE OK" || { echo "GATE FAILED"; exit 1; }
