#!/usr/bin/env python3
"""Extract the visible text of index.html, one normalized line per text node.

scripts/verify.sh diffs the result against scripts/text-snapshot.txt so the page
copy is frozen: markup and UI may change, wording may not. After an approved
copy change, regenerate the snapshot with:

    python3 scripts/page_text.py --write
"""
import html
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "index.html"
SNAPSHOT = ROOT / "scripts" / "text-snapshot.txt"


def text_lines(markup: str) -> list[str]:
    markup = re.sub(r"<!--.*?-->", "", markup, flags=re.S)
    markup = re.sub(r"<(script|style)\b[^>]*>.*?</\1>", "", markup, flags=re.S | re.I)
    # UI chrome (appearance panel and the like) is marked data-ui: it is not CV copy.
    markup = re.sub(r"<([a-zA-Z][\w-]*)[^>]*\bdata-ui\b[^>]*>.*?</\1>", "", markup, flags=re.S | re.I)
    body = re.search(r"<body\b[^>]*>(.*)</body>", markup, flags=re.S | re.I)
    markup = body.group(1) if body else markup

    lines = []
    for chunk in re.split(r"<[^>]+>", markup):
        line = " ".join(html.unescape(chunk).split())
        if line:
            lines.append(line)
    return lines


def main(argv: list[str]) -> int:
    paths = [a for a in argv if not a.startswith("-")]
    source = ROOT / paths[0] if paths else SOURCE
    rendered = "\n".join(text_lines(source.read_text(encoding="utf-8"))) + "\n"

    if "--write" in argv:
        SNAPSHOT.write_text(rendered, encoding="utf-8", newline="\n")
        print("wrote %s (%d lines)" % (SNAPSHOT.relative_to(ROOT), rendered.count("\n")))
        return 0

    sys.stdout.write(rendered)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
