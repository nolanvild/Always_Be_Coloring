"""
Coloring book scorer: evaluates themes on 6 weighted dimensions (0–100 total).

Dimensions and weights:
  Visual Richness      25  - distinct visual element categories in page_ideas
  Page Variety         20  - number of distinct page ideas
  Audience Clarity     15  - specificity of the target audience
  Line Art Suitability 20  - how well the category converts to line art
  Trend Relevance      12  - backed by aggregate_score from trend detection
  Safety Score          8  - penalty for safety_notes flags

Threshold gates (set in config):
  < 55  → excluded from output
  55–59 → review_required: true
  >= 80 → high_priority: true
"""

from __future__ import annotations

import logging
import re
from typing import Any, Dict, List, Tuple

import config
from processing.trend_detector import TrendCandidate
from transformation.theme_builder import ColoringTheme

logger = logging.getLogger(__name__)

# ── Lookup tables ─────────────────────────────────────────────────────────────

_AUDIENCE_SCORES: Dict[str, float] = {
    "children_5_8":  15.0,
    "children_9_12": 15.0,
    "family":        14.0,
    "teens":         13.0,
    "adults":        12.0,
    "seniors":       12.0,
    "general":        7.0,
}

_LINE_ART_SCORES: Dict[str, float] = {
    "animals":      20.0,
    "ocean":        20.0,
    "nature":       20.0,
    "plants":       19.0,
    "space":        18.0,
    "weather":      17.0,
    "architecture": 17.0,
    "food":         16.0,
    "vehicles":     15.0,
    "science":      14.0,
    "technology":   12.0,
    "art":          11.0,
    "general":       8.0,
}

# Why each category works well (or doesn't) as line art
_LINE_ART_REASONS: Dict[str, str] = {
    "animals":      "animals have clean, recognizable silhouettes that translate directly to satisfying line art",
    "ocean":        "underwater scenes offer flowing organic shapes (waves, coral, fish) with layered depth",
    "nature":       "natural landscapes provide rich organic detail - leaves, bark, terrain - without hard-to-draw mechanical elements",
    "plants":       "botanical subjects reward fine detail work: leaf veins, petal arrangements, stem textures",
    "space":        "space scenes combine geometric precision (spacecraft, stations) with organic forms (nebulae, planets)",
    "weather":      "weather phenomena - clouds, lightning, rain patterns - produce striking high-contrast line compositions",
    "architecture": "architectural subjects reward precise linework and offer satisfying complexity at multiple scales",
    "food":         "food illustrations are approachable, tactile, and produce immediately recognizable compositions",
    "vehicles":     "vehicles have strong geometric shapes that children and beginners find satisfying to colour",
    "science":      "scientific diagrams and natural phenomena offer a balance of precision and wonder",
    "technology":   "technology subjects work best as simplified diagrams; detail can look cluttered without careful editing",
    "art":          "meta-art themes can be visually rich but require careful curation to avoid abstract ambiguity",
    "general":      "general themes lack a clear visual language, reducing line-art coherence",
}

# Rough visual element category keywords - used to count distinct visual types
_VISUAL_CATEGORIES = [
    "landscape", "scene", "creature", "animal", "plant", "building", "machine",
    "person", "figure", "vehicle", "pattern", "food", "sky", "water", "space",
    "interior", "map", "diagram", "symbol", "tool", "instrument", "close-up",
]

_DIM_MAX: Dict[str, float] = {
    "visual_richness":      25.0,
    "page_variety":         20.0,
    "audience_clarity":     15.0,
    "line_art_suitability": 20.0,
    "trend_relevance":      12.0,
    "safety_score":          8.0,
}


def _count_visual_categories(page_ideas: List[str]) -> int:
    """Count how many distinct visual categories appear across page_ideas."""
    found: set = set()
    combined = " ".join(page_ideas).lower()
    for cat in _VISUAL_CATEGORIES:
        if cat in combined:
            found.add(cat)
    # Also add rough count from varied first nouns in each idea
    for idea in page_ideas:
        words = re.findall(r"\b[a-z]{4,}\b", idea.lower())
        if words:
            found.add(words[0])
    return len(found)


def _visual_richness_score(page_ideas: List[str]) -> float:
    """0–25: proxy for visual diversity."""
    unique_cats = _count_visual_categories(page_ideas)
    return round(min(unique_cats / 8.0, 1.0) * 25.0, 2)


def _page_variety_score(page_ideas: List[str]) -> float:
    """0–20: based on number of distinct page ideas."""
    count = len(page_ideas)
    if count < 6:
        return 0.0
    if count <= 10:
        return round(((count - 6) / 4.0) * 15.0, 2)
    return round(15.0 + ((count - 10) / 10.0) * 5.0, 2)


def _audience_clarity_score(target_audience: str) -> float:
    """0–15: based on specificity of audience."""
    return _AUDIENCE_SCORES.get(target_audience, 7.0)


def _line_art_suitability_score(category: str) -> float:
    """0–20: based on category's line-art-friendliness."""
    return _LINE_ART_SCORES.get(category.lower(), 8.0)


def _trend_relevance_score(aggregate_score: float) -> float:
    """0–12: directly from the trend detection aggregate score."""
    return round((min(aggregate_score, 100.0) / 100.0) * 12.0, 2)


def _safety_score(safety_notes: List[str]) -> float:
    """0–8: starts at 8, -2 per safety note (minimum 0)."""
    return max(8.0 - len(safety_notes) * 2.0, 0.0)


# ── Per-dimension narrative notes ─────────────────────────────────────────────

def _dim_note(dim: str, score: float, theme: ColoringTheme, candidate: TrendCandidate) -> str:
    """One-line human-readable note explaining a single dimension's score."""
    max_w = _DIM_MAX[dim]
    pct = (score / max_w * 100) if max_w else 0

    if dim == "visual_richness":
        unique = _count_visual_categories(theme.page_ideas)
        return (
            f"{unique} distinct visual element types detected across {len(theme.page_ideas)} page ideas "
            f"(8+ hits the cap)"
        )
    if dim == "page_variety":
        n = len(theme.page_ideas)
        tip = " - adding more page ideas to 10+ would increase this" if n < 10 else ""
        return f"{n} page ideas generated{tip}"
    if dim == "audience_clarity":
        aud = theme.target_audience.replace("_", " ")
        if pct >= 90:
            return f"'{aud}' is a highly specific, well-defined audience"
        elif pct >= 60:
            return f"'{aud}' is a reasonably specific audience segment"
        else:
            return f"'{aud}' is a broad audience - tighter targeting would score higher"
    if dim == "line_art_suitability":
        reason = _LINE_ART_REASONS.get(theme.category.lower(), "category has moderate line-art suitability")
        return reason
    if dim == "trend_relevance":
        agg = candidate.aggregate_score
        active = []
        if theme.source_signals.get("reddit", {}).get("present"):
            active.append("Reddit")
        if theme.source_signals.get("google_trends", {}).get("present"):
            active.append("Google Trends")
        if theme.source_signals.get("rss", {}).get("present"):
            active.append("RSS")
        sources_str = f" (sources active: {', '.join(active)})" if active else ""
        if pct < 50:
            return (
                f"Aggregate trend signal {agg:.1f}/100{sources_str}. "
                f"Activating more sources (Reddit, Google Trends) would significantly boost this dimension"
            )
        return f"Aggregate trend signal {agg:.1f}/100{sources_str}"
    if dim == "safety_score":
        if not theme.safety_notes:
            return "No content concerns flagged by any filter"
        return f"{len(theme.safety_notes)} content flag(s): {'; '.join(theme.safety_notes)}"
    return ""


# ── Analysis builder ──────────────────────────────────────────────────────────

def _build_analysis(
    theme: ColoringTheme,
    candidate: TrendCandidate,
    breakdown: Dict[str, float],
) -> Dict[str, Any]:
    """
    Build the full analysis block: why it's trending, why it works as a
    coloring book, per-dimension rationale, and improvement pointers.
    """
    # ── why_trending ──────────────────────────────────────────────
    trending_parts: List[str] = []

    rss_info    = theme.source_signals.get("rss", {})
    reddit_info = theme.source_signals.get("reddit", {})
    gt_info     = theme.source_signals.get("google_trends", {})

    if rss_info.get("present"):
        feeds     = rss_info.get("feed_sources", [])
        n_articles = rss_info.get("article_count", 0)
        feed_list = ", ".join(feeds[:4]) + ("..." if len(feeds) > 4 else "")
        trending_parts.append(
            f"Covered in {n_articles} articles across {len(feeds)} RSS feeds ({feed_list})"
        )

    if reddit_info.get("present"):
        trending_parts.append(
            f"Active on Reddit: {reddit_info['post_count']} posts across "
            f"{len(reddit_info.get('subreddits', []))} subreddits, "
            f"{reddit_info['total_upvotes']:,} total upvotes"
        )

    if gt_info.get("present"):
        spike = gt_info.get("spike_score", 0)
        if spike >= config.TREND_SPIKE_THRESHOLD:
            mean30 = gt_info.get("mean_30d_index", 0)
            ratio_str = f" ({spike / mean30:.1f}x above 30-day mean)" if mean30 > 0 else ""
            trending_parts.append(
                f"Google Trends spike: current index {gt_info['current_index']}{ratio_str}"
            )
        elif gt_info.get("sustained_weeks", 0) >= config.TREND_SUSTAINED_WEEKS:
            trending_parts.append(
                f"Sustained Google Trends interest for "
                f"{gt_info['sustained_weeks']:.0f}+ weeks"
            )

    why_trending = (
        ". ".join(trending_parts) + "."
        if trending_parts
        else "Qualified by multi-source signal overlap - no single dominant signal."
    )

    # Note inactive sources
    inactive = []
    if not reddit_info.get("present"):
        inactive.append("Reddit")
    if not gt_info.get("present"):
        inactive.append("Google Trends")
    if inactive:
        why_trending += (
            f" Note: {' and '.join(inactive)} not active this run - "
            f"trend signal strength is lower than it would be with full source coverage."
        )

    # ── why_coloring_book ─────────────────────────────────────────
    art_reason = _LINE_ART_REASONS.get(
        theme.category.lower(),
        f"{theme.category} themes adapt to line art with moderate effectiveness"
    )
    aud = theme.target_audience.replace("_", " ")
    vr  = breakdown.get("visual_richness", 0)

    why_cb = f"{theme.theme_name} works well as a coloring book because {art_reason}. "
    why_cb += f"The '{aud}' audience segment is a natural fit for this category. "
    if vr >= 20:
        why_cb += "Page ideas span a high variety of visual types, keeping the book engaging across all skill levels. "
    elif vr >= 12:
        why_cb += "Page ideas cover a reasonable variety of visual types. "
    else:
        why_cb += "Visual variety could be improved by expanding the page idea pool for this category. "
    if theme.safety_notes:
        why_cb += f"Content review flagged {len(theme.safety_notes)} item(s) - these have been assessed and accepted. "

    # ── score_rationale ───────────────────────────────────────────
    score_rationale: Dict[str, Any] = {}
    for dim, score in breakdown.items():
        max_w = _DIM_MAX.get(dim, 1.0)
        pct   = round(score / max_w * 100, 1) if max_w else 0.0
        note  = _dim_note(dim, score, theme, candidate)
        score_rationale[dim] = {
            "score":   score,
            "max":     max_w,
            "pct":     pct,
            "summary": f"{score:.1f}/{max_w:.0f} ({pct:.0f}%) - {note}",
        }

    # ── key strengths / improvement opportunities ─────────────────
    key_strengths            = [d for d, v in score_rationale.items() if v["pct"] >= 80]
    improvement_opportunities = [d for d, v in score_rationale.items() if v["pct"] < 50]

    return {
        "why_trending":              why_trending,
        "why_coloring_book":         why_cb,
        "score_rationale":           score_rationale,
        "key_strengths":             key_strengths,
        "improvement_opportunities": improvement_opportunities,
    }


# ── Public API ────────────────────────────────────────────────────────────────

def score_theme(
    theme: ColoringTheme,
    candidate: TrendCandidate,
) -> Tuple[int, Dict[str, float]]:
    """
    Returns (total_score: int, breakdown: Dict[str, float]).
    total_score is clamped to [0, 100].
    """
    breakdown = {
        "visual_richness":      _visual_richness_score(theme.page_ideas),
        "page_variety":         _page_variety_score(theme.page_ideas),
        "audience_clarity":     _audience_clarity_score(theme.target_audience),
        "line_art_suitability": _line_art_suitability_score(theme.category),
        "trend_relevance":      _trend_relevance_score(candidate.aggregate_score),
        "safety_score":         _safety_score(theme.safety_notes),
    }

    total = round(min(sum(breakdown.values()), 100.0))

    logger.debug(
        "Score for '%s': %d (breakdown: %s)",
        theme.theme_name, total,
        {k: round(v, 1) for k, v in breakdown.items()},
    )

    return total, breakdown


def apply_score_to_theme(theme: ColoringTheme, candidate: TrendCandidate) -> ColoringTheme:
    """
    Mutates theme in-place with score, score_breakdown, review_required,
    high_priority flags, and the analysis block. Returns the theme.
    """
    total, breakdown = score_theme(theme, candidate)
    theme.coloring_book_score = total
    theme.score_breakdown      = breakdown
    theme.review_required      = config.MIN_SCORE_THRESHOLD <= total <= config.REVIEW_REQUIRED_SCORE
    theme.high_priority        = total >= config.HIGH_PRIORITY_SCORE
    theme.analysis             = _build_analysis(theme, candidate, breakdown)
    return theme
