"""
JSON writer: serializes accepted themes to a dated output file.

Output path: data/output/YYYY-MM-DD_themes.json
If a file for today already exists, it is overwritten (idempotent re-runs).

Each theme includes an `analysis` block (populated by the scorer) with:
  - why_trending       - narrative about the trend signals that qualified it
  - why_coloring_book  - narrative about visual/artistic suitability
  - score_rationale    - per-dimension breakdown with human-readable notes
  - key_strengths      - dimensions scoring >= 80 % of their maximum
  - improvement_opportunities - dimensions scoring < 50 % of their maximum

The top-level `run_summary` block lets you compare themes within a run
and understand what drove the ranking.
"""

from __future__ import annotations

import dataclasses
import json
import logging
import statistics
from datetime import datetime, timezone
from typing import Any, Dict, List

import config
from transformation.theme_builder import ColoringTheme

logger = logging.getLogger(__name__)


def _theme_to_dict(theme: ColoringTheme) -> dict:
    return dataclasses.asdict(theme)


def _build_run_summary(themes: List[ColoringTheme], sources_active: List[str]) -> Dict[str, Any]:
    """
    Cross-theme comparison block written once per run.

    Includes a ranked table and identifies which scoring dimension has the
    most variance (i.e. what actually separates the top themes from the rest).
    """
    if not themes:
        return {"themes_ranked": [], "notes": "No themes accepted this run."}

    scores = [t.coloring_book_score for t in themes]

    # Per-dimension variance - tells us which dimension differentiates themes most
    dim_keys = list(themes[0].score_breakdown.keys()) if themes else []
    dim_variance: Dict[str, float] = {}
    for dim in dim_keys:
        vals = [t.score_breakdown.get(dim, 0.0) for t in themes]
        dim_variance[dim] = round(statistics.pvariance(vals), 3) if len(vals) > 1 else 0.0

    primary_differentiator = max(dim_variance, key=dim_variance.get) if dim_variance else "n/a"

    # Compact ranked table
    themes_ranked = [
        {
            "rank":                      i + 1,
            "theme_name":                t.theme_name,
            "category":                  t.category,
            "coloring_book_score":       t.coloring_book_score,
            "high_priority":             t.high_priority,
            "review_required":           t.review_required,
            "key_strengths":             t.analysis.get("key_strengths", []),
            "improvement_opportunities": t.analysis.get("improvement_opportunities", []),
        }
        for i, t in enumerate(themes)
    ]

    # Session-level notes
    notes_parts: List[str] = []
    if "reddit" not in sources_active:
        notes_parts.append(
            "Reddit was not active - activating it would add upvote-weighted "
            "signals and meaningfully raise trend_relevance scores"
        )
    if "google_trends" not in sources_active:
        notes_parts.append(
            "Google Trends was not active - spike and sustained-interest signals "
            "are missing; trend_relevance scores are conservatively low"
        )
    if primary_differentiator != "n/a":
        notes_parts.append(
            f"The dimension with the most score variance this run is "
            f"'{primary_differentiator}' - themes that differ most do so on this axis"
        )

    return {
        "themes_ranked":          themes_ranked,
        "score_spread": {
            "highest": max(scores),
            "lowest":  min(scores),
            "mean":    round(statistics.mean(scores), 1),
        },
        "primary_score_differentiator": primary_differentiator,
        "dimension_variance":           dim_variance,
        "session_notes":                " | ".join(notes_parts) if notes_parts else "All sources active.",
    }


def write_output_with_counts(
    themes: List[ColoringTheme],
    run_id: str,
    sources_active: List[str],
    sources_failed: List[str],
    total_candidates: int,
    total_rejected: int,
    twitter_available: bool = False,
) -> str:
    """Write themes to dated JSON file. Returns the absolute path written."""
    config.OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    filename = f"{date_str}_themes.json"
    out_path = config.OUTPUT_DIR / filename

    payload = {
        "run_metadata": {
            "run_id":            run_id,
            "run_timestamp":     datetime.now(timezone.utc).isoformat(),
            "sources_active":    sources_active,
            "sources_failed":    sources_failed,
            "total_candidates":  total_candidates,
            "total_accepted":    len(themes),
            "total_rejected":    total_rejected,
            "twitter_available": twitter_available,
        },
        "run_summary": _build_run_summary(themes, sources_active),
        "themes": [_theme_to_dict(t) for t in themes],
    }

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)

    logger.info(
        "Output written: %s (%d accepted / %d rejected)",
        out_path, len(themes), total_rejected,
    )
    return str(out_path)


# Kept for backwards compatibility - delegates to the counts variant
def write_output(
    themes: List[ColoringTheme],
    run_id: str,
    sources_active: List[str],
    sources_failed: List[str],
    twitter_available: bool = False,
) -> str:
    return write_output_with_counts(
        themes=themes,
        run_id=run_id,
        sources_active=sources_active,
        sources_failed=sources_failed,
        total_candidates=len(themes),
        total_rejected=0,
        twitter_available=twitter_available,
    )
