"""
Compiles a coloring book product for a single theme.

Steps:
1. Generate one placeholder SVG per page idea  →  data/previews/<date>/<theme_id>/NN_slug.svg
2. Zip all SVGs into                            →  data/previews/<date>/<theme_id>/theme_<theme_id>.zip

Returns a dict with the compiled product metadata (used by gumroad_preview).
"""

import zipfile
from pathlib import Path

from .image_placeholder import write_svg


def compile_theme(theme: dict, previews_date_dir: Path) -> dict:
    """
    Generate SVGs + ZIP for one theme and return product metadata.

    Parameters
    ----------
    theme             : A single theme dict from the pipeline output JSON.
    previews_date_dir : ``data/previews/YYYY-MM-DD/``

    Returns
    -------
    dict with keys:
        theme_id, theme_name, description, price_cents,
        zip_path (str), svg_count,
        gumroad_product_id (None), gumroad_url (None), published_at (None)
    """
    theme_id   = theme["theme_id"]
    theme_name = theme["theme_name"]
    page_ideas = theme.get("page_ideas", [])
    description = _build_description(theme)

    # ── 1. Write SVGs ────────────────────────────────────────────────────────
    theme_dir = previews_date_dir / theme_id
    theme_dir.mkdir(parents=True, exist_ok=True)

    svg_paths: list[Path] = []
    total = len(page_ideas)
    for i, idea in enumerate(page_ideas, start=1):
        path = write_svg(
            out_dir=theme_dir,
            page_idea=idea,
            theme_name=theme_name,
            page_number=i,
            total_pages=total,
        )
        svg_paths.append(path)

    # ── 2. Bundle into ZIP ───────────────────────────────────────────────────
    zip_path = theme_dir / f"theme_{theme_id}.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for svg in svg_paths:
            zf.write(svg, arcname=svg.name)

    return {
        "theme_id":            theme_id,
        "theme_name":          f"{theme_name} Coloring Book",
        "description":         description,
        "price_cents":         499,
        "zip_path":            str(zip_path),
        "svg_count":           len(svg_paths),
        "gumroad_product_id":  None,
        "gumroad_url":         None,
        "published_at":        None,
    }


# ── helpers ──────────────────────────────────────────────────────────────────

def _build_description(theme: dict) -> str:
    """Build a plain-text Gumroad product description from theme metadata."""
    lines = [
        f"{theme['theme_name']} — Coloring Book",
        "",
        theme.get("description", ""),
        "",
        f"Category: {theme.get('category', 'general')}",
        f"Audience: {theme.get('target_audience', 'general')}",
        f"Pages: {len(theme.get('page_ideas', []))}",
        "",
        "— Page previews —",
    ]
    for i, idea in enumerate(theme.get("page_ideas", []), start=1):
        lines.append(f"  {i}. {idea}")
    lines += [
        "",
        f"Trending reason: {theme.get('trending_reason', '')}",
        "",
        "Note: This is a placeholder product. Artwork will be updated before publication.",
    ]
    return "\n".join(lines)
