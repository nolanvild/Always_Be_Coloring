"""
Generates placeholder SVG coloring pages.

Each page is A4 portrait (595 × 842 pt at 72 dpi) and contains:
  - Thin outer border
  - Page idea title at the top
  - Large dashed "coloring area" rectangle in the centre
  - PLACEHOLDER watermark inside the coloring area
  - Page number + theme name footer

No external dependencies — pure stdlib string formatting.
"""

import textwrap
from pathlib import Path


# ── SVG canvas dimensions (A4 at 72 dpi) ────────────────────────────────────
W, H = 595, 842
MARGIN = 36           # outer margin (pt)
TITLE_AREA_H = 80     # height reserved for the title block at the top
FOOTER_H = 30         # height reserved for the footer at the bottom


def _wrap_text(text: str, max_chars: int = 55) -> list[str]:
    """Wrap a string to multiple lines, returning a list of lines."""
    return textwrap.wrap(text, width=max_chars) or [text]


def _tspan_lines(lines: list[str], x: int, y0: int, dy: int = 22) -> str:
    """Build <tspan> elements for each line of wrapped text."""
    parts = []
    for i, line in enumerate(lines):
        y = y0 + i * dy
        parts.append(f'<tspan x="{x}" y="{y}">{_escape(line)}</tspan>')
    return "\n        ".join(parts)


def _escape(s: str) -> str:
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def generate_svg(
    page_idea: str,
    theme_name: str,
    page_number: int,
    total_pages: int,
) -> str:
    """
    Return an SVG string for one placeholder coloring page.

    Parameters
    ----------
    page_idea   : The descriptive text for this coloring page.
    theme_name  : The parent theme name (shown in the footer).
    page_number : 1-based page index.
    total_pages : Total number of pages in this theme's book.
    """
    title_lines = _wrap_text(page_idea, max_chars=55)
    title_block_h = len(title_lines) * 22 + 10
    title_block_h = max(title_block_h, TITLE_AREA_H)

    # Coloring area sits between the title block and footer
    ca_x = MARGIN
    ca_y = MARGIN + title_block_h + 10
    ca_w = W - 2 * MARGIN
    ca_h = H - ca_y - FOOTER_H - MARGIN
    ca_cx = ca_x + ca_w // 2
    ca_cy = ca_y + ca_h // 2

    title_tspans = _tspan_lines(title_lines, x=W // 2, y0=MARGIN + 28)

    footer_text = (
        f"Page {page_number} of {total_pages}  ·  {_escape(theme_name)} Coloring Book"
    )

    svg = f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     width="{W}" height="{H}"
     viewBox="0 0 {W} {H}">

  <!-- Outer border -->
  <rect x="{MARGIN}" y="{MARGIN}" width="{W - 2*MARGIN}" height="{H - 2*MARGIN}"
        fill="white" stroke="#333" stroke-width="1.5"/>

  <!-- Title -->
  <text font-family="Georgia, serif" font-size="17" fill="#111"
        text-anchor="middle" dominant-baseline="auto">
        {title_tspans}
  </text>

  <!-- Coloring area border (dashed) -->
  <rect x="{ca_x}" y="{ca_y}" width="{ca_w}" height="{ca_h}"
        fill="#fafafa" stroke="#aaa" stroke-width="1"
        stroke-dasharray="8 4" rx="4"/>

  <!-- PLACEHOLDER label -->
  <text x="{ca_cx}" y="{ca_cy - 18}"
        font-family="Arial, sans-serif" font-size="22" font-weight="bold"
        fill="#ccc" text-anchor="middle" dominant-baseline="middle"
        letter-spacing="4">PLACEHOLDER</text>

  <!-- Sub-label -->
  <text x="{ca_cx}" y="{ca_cy + 14}"
        font-family="Arial, sans-serif" font-size="12"
        fill="#bbb" text-anchor="middle" dominant-baseline="middle">
    replace with generated coloring art
  </text>

  <!-- Footer -->
  <text x="{W // 2}" y="{H - MARGIN - 8}"
        font-family="Arial, sans-serif" font-size="10" fill="#999"
        text-anchor="middle">{footer_text}</text>

</svg>"""
    return svg


def write_svg(
    out_dir: Path,
    page_idea: str,
    theme_name: str,
    page_number: int,
    total_pages: int,
) -> Path:
    """
    Write a single placeholder SVG to *out_dir* and return its path.

    The filename is zero-padded: ``01_first_six_words.svg``.
    """
    out_dir.mkdir(parents=True, exist_ok=True)
    slug = "_".join(page_idea.lower().split()[:6])
    # Sanitise slug for filesystem
    safe = "".join(c if c.isalnum() or c == "_" else "" for c in slug)[:50]
    filename = f"{page_number:02d}_{safe}.svg"
    path = out_dir / filename
    path.write_text(generate_svg(page_idea, theme_name, page_number, total_pages), encoding="utf-8")
    return path
