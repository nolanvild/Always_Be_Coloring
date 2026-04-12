"""
Reads a pipeline themes JSON and produces a human-reviewable Gumroad preview.

No API calls are made here — this is a pure local step. The resulting
``YYYY-MM-DD_gumroad_preview.json`` is what you inspect and approve before
running ``publish_previews()``.

Output path: data/previews/YYYY-MM-DD_gumroad_preview.json
SVG + ZIP:   data/previews/YYYY-MM-DD/<theme_id>/
"""

import json
import sys
from pathlib import Path

from .product_compiler import compile_theme


def generate_previews(themes_path: str | Path, date_str: str | None = None) -> Path:
    """
    Generate SVG placeholders and a Gumroad preview JSON for all themes
    in *themes_path*.

    Parameters
    ----------
    themes_path : Path to the pipeline output JSON (``data/output/YYYY-MM-DD_themes.json``).
    date_str    : Optional override for the date label (``YYYY-MM-DD``).
                  Inferred from *themes_path* filename if omitted.

    Returns
    -------
    Path to the written preview JSON file.
    """
    themes_path = Path(themes_path)
    if not themes_path.exists():
        print(f"[preview] themes file not found: {themes_path}", file=sys.stderr)
        raise FileNotFoundError(themes_path)

    # Infer date from filename if not provided (e.g. "2026-04-12_themes.json")
    if date_str is None:
        stem = themes_path.stem                  # "2026-04-12_themes"
        date_str = stem.split("_themes")[0]      # "2026-04-12"

    # Load pipeline output
    with open(themes_path, encoding="utf-8") as f:
        pipeline_data = json.load(f)

    themes = pipeline_data.get("themes", [])
    if not themes:
        print("[preview] No themes found in pipeline output.", file=sys.stderr)

    # Resolve config (trend_pipeline is on sys.path when invoked via main.py)
    try:
        import config as cfg
    except ImportError:
        _pkg_root = Path(__file__).parent.parent.parent   # repo root
        sys.path.insert(0, str(_pkg_root / "trend_pipeline"))
        import config as cfg

    previews_dir: Path = cfg.PREVIEWS_DIR
    date_dir = previews_dir / date_str
    date_dir.mkdir(parents=True, exist_ok=True)

    # Compile each theme
    products = []
    for theme in themes:
        try:
            product = compile_theme(theme, date_dir)
            products.append(product)
            print(
                f"  [preview] {product['theme_name']}  "
                f"({product['svg_count']} pages)  →  {product['zip_path']}"
            )
        except Exception as exc:
            print(f"  [preview] SKIP {theme.get('theme_name', '?')}: {exc}", file=sys.stderr)

    # Write preview JSON
    preview = {
        "date":               date_str,
        "source_themes_file": str(themes_path),
        "products":           products,
    }
    preview_path = previews_dir / f"{date_str}_gumroad_preview.json"
    with open(preview_path, "w", encoding="utf-8") as f:
        json.dump(preview, f, indent=2, ensure_ascii=False)

    print(f"\n[preview] Preview JSON written → {preview_path}")
    print(f"[preview] {len(products)} product(s) ready for review.")
    return preview_path
