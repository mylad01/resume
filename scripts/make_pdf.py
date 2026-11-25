#!/usr/bin/env python3
"""Build assets/Milad-Nasrollahi-CV.pdf from the text of index.html.

The page is the single source of truth: this script parses it, checks the
expected structure is there, and lays the same words out for print. Nothing is
typed twice, so the PDF cannot drift from the site.

Usage: python3 scripts/make_pdf.py [--out path.pdf]
Needs reportlab (`pip install reportlab`).
"""
from __future__ import annotations

import argparse
import re
from html.parser import HTMLParser
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (BaseDocTemplate, Frame, HRFlowable, Image,
                                PageTemplate, Paragraph, Spacer, Table, TableStyle)

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"

INK, INK_2, MUTED, LINE, ACCENT = (
    colors.HexColor("#20271b"), colors.HexColor("#333a2e"), colors.HexColor("#526242"),
    colors.HexColor("#cbd1c4"), colors.HexColor("#4c5c22"),
)

VOID = {"br", "img", "hr", "meta", "link", "input", "source", "path", "rect", "circle"}


class Node:
    __slots__ = ("tag", "attrs", "children", "parent")

    def __init__(self, tag: str, attrs: dict, parent: "Node | None") -> None:
        self.tag, self.attrs, self.children, self.parent = tag, attrs, [], parent

    @property
    def classes(self) -> list[str]:
        return (self.attrs.get("class") or "").split()

    def walk(self):
        for child in self.children:
            if isinstance(child, Node):
                yield child
                yield from child.walk()

    def find_all(self, cls: str, limit: int | None = None) -> list["Node"]:
        found = [n for n in self.walk() if cls in n.classes]
        return found[:limit] if limit else found

    def find_tags(self, tag: str) -> list["Node"]:
        return [n for n in self.walk() if n.tag == tag]

    def find(self, cls: str) -> "Node | None":
        found = self.find_all(cls, 1)
        return found[0] if found else None

    def text(self) -> str:
        parts = []
        for child in self.children:
            if isinstance(child, str):
                parts.append(child)
            elif child.attrs.get("aria-hidden") != "true":
                parts.append(child.text())
        return re.sub(r"\s+", " ", "".join(parts).replace("\xa0", " ")).strip()

    def has_class(self, cls: str) -> bool:
        return cls in self.classes


class Tree(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.root = Node("document", {}, None)
        self.current = self.root

    def handle_starttag(self, tag, attrs):
        node = Node(tag, dict(attrs), self.current)
        self.current.children.append(node)
        if tag not in VOID:
            self.current = node

    def handle_endtag(self, tag):
        node = self.current
        while node is not None and node.tag != tag:
            node = node.parent
        if node is not None and node.parent is not None:
            self.current = node.parent

    def handle_data(self, data):
        if data.strip():
            self.current.children.append(data)


def esc(value: str) -> str:
    return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def build_data() -> dict:
    tree = Tree()
    tree.feed((ROOT / "index.html").read_text(encoding="utf-8"))
    doc = tree.root

    title = next((h for h in doc.walk() if h.tag == "h1"), None)
    lede = doc.find("lede")
    intro = doc.find("intro")
    contact = doc.find("contact-links")
    facts = doc.find("about-facts")
    portrait = doc.find("portrait")
    email = doc.find("email-link")

    if title is None or lede is None or intro is None or contact is None:
        raise SystemExit("index.html: hero/contact blocks not found — parser needs updating")

    experience = []
    for row in doc.find_tags("article"):
        if not row.has_class("experience-row"):
            continue
        body = row.find("experience-body")
        paragraphs = [p for p in body.children if isinstance(p, Node) and p.tag == "p"]
        description = next((p for p in paragraphs if p.has_class("experience-body") is False
                            and "company" not in p.classes), None)
        experience.append({
            "date": (row.find("date") or Node("span", {}, None)).text(),
            "category": (row.find("category") or Node("span", {}, None)).text(),
            "title": next((h.text() for h in row.walk() if h.tag == "h3"), ""),
            "company": (row.find("company") or Node("p", {}, None)).text(),
            "body": description.text() if description else "",
            "tags": [t.text() for t in row.find("tags").children if isinstance(t, Node)] if row.find("tags") else [],
        })

    practice = [{
        "title": next((h.text() for h in c.walk() if h.tag == "h3"), ""),
        "body": next((p.text() for p in c.children if isinstance(p, Node)
                      and p.tag == "p" and not p.has_class("tool-list")), ""),
        "tools": (c.find("tool-list") or Node("p", {}, None)).text(),
    } for c in doc.find_all("practice-card")]

    facts_list = []
    for block in facts.children if facts else []:
        if isinstance(block, Node) and block.tag == "div":
            heading = next((h.text() for h in block.walk() if h.tag == "h3"), "")
            body = next((p.text() for p in block.walk() if p.tag == "p"), "")
            facts_list.append((heading, body))

    links = [a for a in contact.children if isinstance(a, Node) and a.tag == "a"]
    phone = next((a.text() for a in links if (a.attrs.get("href") or "").startswith("tel:")), "")
    location = next((n.text() for n in contact.children
                     if isinstance(n, Node) and n.tag == "span"), "")

    if len(experience) != 4:
        raise SystemExit("index.html: expected 4 experience rows, found %d" % len(experience))
    if len(practice) != 3:
        raise SystemExit("index.html: expected 3 practice cards, found %d" % len(practice))

    return {
        "name": title.text(),
        "lede": lede.text(),
        "summary": intro.text(),
        "email": email.text() if email else "",
        "phone": phone,
        "location": location,
        "experience": experience,
        "practice": practice,
        "facts": facts_list,
        "portrait": ASSETS / "profile.webp" if portrait is not None else None,
    }


def styles() -> dict:
    base = ParagraphStyle("base", fontName="Helvetica", fontSize=9, leading=13,
                          textColor=INK_2, alignment=TA_LEFT)
    return {
        "base": base,
        "name": ParagraphStyle("name", parent=base, fontName="Helvetica-Bold", fontSize=25,
                               leading=27, textColor=INK, spaceAfter=2),
        "lede": ParagraphStyle("lede", parent=base, fontName="Helvetica", fontSize=10.5,
                               leading=14, textColor=ACCENT),
        "meta": ParagraphStyle("meta", parent=base, fontSize=8.6, leading=12, textColor=MUTED),
        "label": ParagraphStyle("label", parent=base, fontName="Helvetica-Bold", fontSize=8,
                                leading=10, textColor=ACCENT),
        "h2": ParagraphStyle("h2", parent=base, fontName="Helvetica-Bold", fontSize=9,
                             leading=11, textColor=INK, spaceBefore=2, spaceAfter=4),
        "role": ParagraphStyle("role", parent=base, fontName="Helvetica-Bold", fontSize=11,
                               leading=13.5, textColor=INK),
        "company": ParagraphStyle("company", parent=base, fontName="Helvetica-Oblique",
                                  fontSize=9, leading=12, textColor=MUTED),
        "desc": ParagraphStyle("desc", parent=base, fontSize=9, leading=12.6),
        "tags": ParagraphStyle("tags", parent=base, fontSize=7.8, leading=10, textColor=MUTED),
        "date": ParagraphStyle("date", parent=base, fontName="Helvetica-Bold", fontSize=8.4,
                               leading=11, textColor=ACCENT),
    }


def rule(width, space_before=3, space_after=5):
    return HRFlowable(width=width, thickness=0.5, color=LINE,
                      spaceBefore=space_before, spaceAfter=space_after)


def build(path: Path) -> None:
    data = build_data()
    st = styles()
    page_w, page_h = A4
    margin = 15 * mm
    width = page_w - 2 * margin

    doc = BaseDocTemplate(str(path), pagesize=A4, leftMargin=margin, rightMargin=margin,
                          topMargin=margin, bottomMargin=15 * mm,
                          title="%s — Curriculum Vitae" % data["name"],
                          author=data["name"], subject=data["lede"])
    frame = Frame(margin, 15 * mm, width, page_h - margin - 15 * mm, id="body")
    doc.addPageTemplates([PageTemplate(id="page", frames=[frame])])

    flow = []
    header_left = [
        Paragraph(esc(data["name"]), st["name"]),
        Spacer(1, 2),
        Paragraph(esc(data["lede"]), st["lede"]),
        Spacer(1, 5),
        Paragraph("%s &nbsp;·&nbsp; %s &nbsp;·&nbsp; %s"
                  % (esc(data["location"]), esc(data["phone"]), esc(data["email"])), st["meta"]),
    ]
    portrait = data["portrait"]
    portrait_cell = ""
    if portrait is not None and portrait.exists():
        from reportlab.lib.utils import ImageReader
        iw, ih = ImageReader(str(portrait)).getSize()
        pw = 25 * mm
        portrait_cell = Image(str(portrait), width=pw, height=pw * ih / iw)

    header = Table([[header_left, portrait_cell]], colWidths=[width * 0.7, width * 0.3])
    header.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"),
                                ("ALIGN", (1, 0), (1, 0), "RIGHT"),
                                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                                ("TOPPADDING", (0, 0), (-1, -1), 0),
                                ("BOTTOMPADDING", (0, 0), (-1, -1), 0)]))
    flow.append(header)
    flow.append(rule(width, 7, 7))

    flow.append(Paragraph(esc(data["summary"]), ParagraphStyle(
        "intro", parent=st["base"], fontSize=9.4, leading=13)))
    flow.append(Spacer(1, 7))

    flow.append(Paragraph("EXPERIENCE", st["label"]))
    flow.append(rule(width, 2, 6))
    for job in data["experience"]:
        entry = Table([
            [Paragraph(esc(job["date"]).replace(" ", "&nbsp;"), st["date"]),
             Paragraph(esc(job["title"]), st["role"])],
            ["", Paragraph(esc(job["company"]), st["company"])],
            ["", Paragraph(esc(job["body"]), st["desc"])],
            ["", Paragraph(esc(" · ".join(job["tags"])), st["tags"])],
        ], colWidths=[34 * mm, width - 34 * mm])
        entry.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (0, -1), 4 * mm),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 1),
            ("BOTTOMPADDING", (0, -1), (-1, -1), 5),
        ]))
        flow.append(entry)

    flow.append(Spacer(1, 1))
    flow.append(Paragraph("PRACTICE", st["label"]))
    flow.append(rule(width, 2, 6))
    cells = [[Paragraph("<b>%s</b>" % esc(c["title"]), st["role"]) for c in data["practice"]],
             [Paragraph(esc(c["body"]), st["desc"]) for c in data["practice"]],
             [Paragraph(esc(c["tools"]), st["tags"]) for c in data["practice"]]]
    grid = Table(cells, colWidths=[width / 3] * 3)
    grid.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (0, -1), 0),
        ("LEFTPADDING", (1, 0), (-1, -1), 4 * mm),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4 * mm),
        ("TOPPADDING", (0, 0), (-1, -1), 1),
        ("BOTTOMPADDING", (0, 0), (-1, 1), 3),
        ("BOTTOMPADDING", (0, 2), (-1, 2), 0),
    ]))
    flow.append(grid)

    if data["facts"]:
        flow.append(Spacer(1, 7))
        flow.append(Paragraph("DETAILS", st["label"]))
        flow.append(rule(width, 2, 6))
        left = [Paragraph("<b>%s</b> &nbsp; %s" % (esc(h), esc(b)), st["desc"])
                for h, b in data["facts"]]
        flow.extend(left)

    doc.build(flow)
    print("wrote %s (%d bytes)" % (path.relative_to(ROOT), path.stat().st_size))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default=str(ASSETS / "Milad-Nasrollahi-CV.pdf"))
    build(Path(parser.parse_args().out))
