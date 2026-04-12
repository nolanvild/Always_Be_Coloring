"""
Theme builder: assembles the final ColoringTheme dataclass from a
TrendCandidate + generalization results.

Page ideas are drawn from templates in config/page_idea_templates.json.
Target audience is inferred from the theme category.
"""

from __future__ import annotations

import json
import logging
import random
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import config
from processing.trend_detector import TrendCandidate

logger = logging.getLogger(__name__)

_templates: Optional[Dict[str, List[str]]] = None


def _load_templates() -> Dict[str, List[str]]:
    global _templates
    if _templates is None:
        path = config.CONFIG_DIR / "page_idea_templates.json"
        if not path.exists():
            logger.error("page_idea_templates.json not found at %s", path)
            _templates = {}
        else:
            with open(path, encoding="utf-8") as f:
                _templates = json.load(f)
            logger.info("Loaded page idea templates for %d themes", len(_templates))
    return _templates


_AUDIENCE_MAP = {
    "animals":      "children_5_8",
    "nature":       "family",
    "ocean":        "family",
    "plants":       "adults",
    "space":        "children_9_12",
    "science":      "teens",
    "technology":   "teens",
    "food":         "family",
    "architecture": "adults",
    "vehicles":     "children_5_8",
    "art":          "adults",
    "weather":      "children_9_12",
    "general":      "general",
}

_GENERIC_TEMPLATES = [
    "A detailed close-up of {theme} textures and patterns",
    "A wide landscape scene featuring {theme}",
    "An intricate illustration of {theme} elements",
    "A collection of {theme} shapes arranged in a decorative border",
    "A central {theme} motif surrounded by ornamental details",
    "A bird's-eye view of a {theme} scene",
]


def _generate_page_ideas(abstract_theme: str, category: str, count: int = 8) -> List[str]:
    templates = _load_templates()
    theme_key = abstract_theme.lower()
    pool = templates.get(theme_key) or templates.get(category) or []

    if len(pool) >= count:
        return random.sample(pool, count)
    elif pool:
        ideas = list(pool)
    else:
        ideas = [t.format(theme=abstract_theme.lower()) for t in _GENERIC_TEMPLATES]

    # Pad with generic ideas if needed
    while len(ideas) < 5:
        generic = random.choice(_GENERIC_TEMPLATES).format(theme=abstract_theme.lower())
        if generic not in ideas:
            ideas.append(generic)

    return ideas[:count]


def _build_source_signals(candidate: TrendCandidate) -> Dict[str, Any]:
    """Serialize source signals to JSON-compatible dict."""
    signals: Dict[str, Any] = {}

    # Reddit
    reddit_sigs = candidate.source_signals.get("reddit", [])
    if reddit_sigs:
        top_post = max(reddit_sigs, key=lambda s: s.raw_score)
        signals["reddit"] = {
            "present":        True,
            "post_count":     len(reddit_sigs),
            "total_upvotes":  sum(int(s.metadata.get("post_score", 0)) for s in reddit_sigs),
            "subreddits":     list({s.metadata.get("subreddit", "") for s in reddit_sigs}),
            "top_post_title": top_post.metadata.get("original_term", top_post.term)[:200],
            "top_post_url":   top_post.url or "",
        }
    else:
        signals["reddit"] = {"present": False}

    # Google Trends
    gt_sigs = candidate.source_signals.get("google_trends", [])
    if gt_sigs:
        sig = gt_sigs[0]
        signals["google_trends"] = {
            "present":         True,
            "current_index":   sig.metadata.get("current_index", 0),
            "mean_30d_index":  sig.metadata.get("mean_30d_index", 0),
            "spike_score":     sig.metadata.get("spike_score", 0),
            "sustained_weeks": sig.metadata.get("sustained_weeks", 0),
            "related_queries": sig.metadata.get("related_queries", []),
        }
    else:
        signals["google_trends"] = {"present": False}

    # RSS
    rss_sigs = candidate.source_signals.get("rss", [])
    if rss_sigs:
        feed_sources = list({s.metadata.get("feed_name", "") for s in rss_sigs})
        all_headlines = [
            s.metadata.get("full_headline") or s.metadata.get("original_term") or s.term
            for s in rss_sigs
        ]
        signals["rss"] = {
            "present":               True,
            "article_count":         len(rss_sigs),
            "feed_sources":          feed_sources,
            "headline_sample":       all_headlines[0][:200],
            "contributing_headlines": [h[:200] for h in all_headlines],
        }
    else:
        signals["rss"] = {"present": False}

    # Twitter
    tw_sigs = candidate.source_signals.get("twitter", [])
    if tw_sigs:
        sig = tw_sigs[0]
        signals["twitter"] = {
            "present":     True,
            "available":   sig.metadata.get("available", True),
            "tweet_count": int(sig.raw_score),
        }
    else:
        signals["twitter"] = {
            "present":   False,
            "available": False,
            "error":     "not_checked",
        }

    return signals


def _pick_best_headline(candidate: TrendCandidate, abstract_theme: str, category: str) -> str:
    """
    Select the most representative headline from all signals in the group.

    Scores each full_headline by token overlap with the abstract theme + category
    so the displayed raw_concept reflects why the theme was chosen, not which
    NLP fragment happened to be seen first (which can be a dark/unrelated headline).
    """
    theme_tokens = set((abstract_theme + " " + category).lower().split())
    best_headline = candidate.concept   # fallback: original NLP fragment
    best_score    = -1.0

    for sigs in candidate.source_signals.values():
        for sig in sigs:
            headline = (
                sig.metadata.get("full_headline")
                or sig.metadata.get("original_term")
                or ""
            )
            if not headline:
                continue
            hl_tokens = set(headline.lower().split())
            union = theme_tokens | hl_tokens
            score = len(theme_tokens & hl_tokens) / len(union) if union else 0.0
            if score > best_score:
                best_score    = score
                best_headline = headline

    return best_headline[:300]


def _build_trending_reason(candidate: TrendCandidate) -> str:
    parts = []
    if candidate.source_count >= config.TREND_MIN_SOURCE_COUNT:
        parts.append(f"appeared in {candidate.source_count} sources")
    if candidate.spike_score >= config.TREND_SPIKE_THRESHOLD:
        gt_sigs = candidate.source_signals.get("google_trends", [])
        if gt_sigs:
            mean_30d = gt_sigs[0].metadata.get("mean_30d_index", 0)
            ratio_str = (
                f" ({candidate.spike_score:.0f}x above 30d mean of {mean_30d:.0f})"
                if mean_30d > 0 else ""
            )
        else:
            ratio_str = ""
        parts.append(f"Google Trends spike score {candidate.spike_score:.1f}{ratio_str}")
    if candidate.sustained_weeks >= config.TREND_SUSTAINED_WEEKS:
        parts.append(f"sustained interest for {candidate.sustained_weeks:.0f}+ weeks")
    return "; ".join(parts) if parts else "qualified by aggregate signal score"


@dataclass
class ColoringTheme:
    theme_id:           str
    theme_name:         str
    description:        str
    category:           str
    raw_concept:        str
    source_signals:     Dict[str, Any]
    trending_reason:    str
    target_audience:    str
    coloring_book_score: int
    score_breakdown:    Dict[str, float]
    page_ideas:         List[str]
    safety_notes:       List[str]
    review_required:    bool
    high_priority:      bool
    created_at:         str
    analysis:           Dict[str, Any] = field(default_factory=dict)


def build_theme(
    candidate: TrendCandidate,
    abstract_theme: str,
    category: str,
) -> ColoringTheme:
    page_ideas   = _generate_page_ideas(abstract_theme, category)
    audience     = _AUDIENCE_MAP.get(category, "general")
    source_sigs  = _build_source_signals(candidate)
    trending_why = _build_trending_reason(candidate)
    best_headline = _pick_best_headline(candidate, abstract_theme, category)

    description = (
        f"A coloring book exploring the world of {abstract_theme.lower()}. "
        f"This theme offers a rich variety of visual scenes and intricate details "
        f"suitable for {audience.replace('_', ' ')} coloring enthusiasts."
    )

    return ColoringTheme(
        theme_id=str(uuid.uuid4()),
        theme_name=abstract_theme.title(),
        description=description,
        category=category,
        raw_concept=best_headline,
        source_signals=source_sigs,
        trending_reason=trending_why,
        target_audience=audience,
        coloring_book_score=0,       # filled by scorer
        score_breakdown={},          # filled by scorer
        page_ideas=page_ideas,
        safety_notes=candidate.safety_notes,
        review_required=False,       # filled by scorer
        high_priority=False,         # filled by scorer
        created_at=datetime.now(timezone.utc).isoformat(),
    )
