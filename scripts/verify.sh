#!/usr/bin/env bash
# Regression gate for the CV site. Usage: bash scripts/verify.sh
set -u
cd "$(dirname "$0")/.."
fail=0

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

# --- filter wiring -----------------------------------------------------------
for cat in automation-vibe-code it-support-helpdesk other; do
  check "rows for $cat" bash -c "grep -qF 'data-category=\"$cat\"' index.html"
done
check "filter ctx"        has 'resultCount.textContent' js/main.js
check "hidden rule"       has '.experience-row[hidden]' css/style.css

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
Automation &amp; Vibe Coding
assets/Milad-Nasrollahi-CV.pdf
assets/profile.jpg
EOF
)
missing=0
while IFS= read -r line; do
  [ -z "$line" ] && continue
  grep -qF -- "$line" index.html || { printf 'FAIL  missing copy: %s\n' "$line"; missing=1; fail=1; }
done <<< "$strings"
[ $missing -eq 0 ] && printf 'PASS  content fidelity\n'

chips=$(python -c "import re; s=open('index.html',encoding='utf-8').read(); b=re.findall(r'<div class=\"tags\">(.*?)</div>', s, re.S); print(sum(len(re.findall('<span>', x)) for x in b))")
[ "$chips" -eq 17 ] && printf 'PASS  tag chips (17)\n' || { printf 'FAIL  tag chips (%s)\n' "$chips"; fail=1; }

# --- leftovers ---------------------------------------------------------------
check "no old palette"    bash -c '! grep -qE "#0b0b0d|#141418|#e6e6e6" css/style.css'
check "no old classes"    bash -c '! grep -qE "site-header|timeline-entry|photo-slot" index.html'
check "no dead wrapper"   bash -c '! grep -qF "experience-list" index.html'

echo
[ $fail -eq 0 ] && echo "GATE OK" || { echo "GATE FAILED"; exit 1; }
