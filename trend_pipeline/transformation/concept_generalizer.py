"""
Concept generalizer: maps a specific trend term to an abstract, IP-free
coloring book theme using a rule table (config/generalization_rules.json).

Matching algorithm:
  - Tokenize the input text
  - For each rule, count keyword overlaps with pattern_keywords
  - Select the rule with the highest overlap (>= 1 match required)
  - Fall back to "general interest" if no rule matches

The rule table is loaded once and cached.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import List, Optional, Tuple

import config

logger = logging.getLogger(__name__)

_rules: Optional[List[dict]] = None


def _load_rules() -> List[dict]:
    global _rules
    if _rules is None:
        path = config.CONFIG_DIR / "generalization_rules.json"
        if not path.exists():
            logger.error("generalization_rules.json not found at %s", path)
            _rules = []
        else:
            with open(path, encoding="utf-8") as f:
                data = json.load(f)
            _rules = data.get("category_rules", [])
            logger.info("Loaded %d generalization rules", len(_rules))
    return _rules


def generalize_concept(text: str, extra_keywords: List[str] = None, full_headlines: List[str] = None) -> Tuple[str, str]:
    """
    Returns (abstract_theme, category).

    Args:
        text: The IP-sanitized concept text.
        extra_keywords: Optional additional keywords from the signal (related queries, etc.)
    """
    rules = _load_rules()
    if not rules:
        return text.title(), "general"

    extra_keywords = extra_keywords or []
    full_headlines = full_headlines or []
    # Include full headlines so multi-word rule keywords (e.g. "rocket launch") can match
    all_text = f"{text} {' '.join(extra_keywords)} {' '.join(full_headlines)}".lower()
    tokens = set(all_text.split())

    best_rule    = None
    best_overlap = 0

    for rule in rules:
        pattern_set = set(kw.lower() for kw in rule.get("pattern_keywords", []))
        overlap = len(tokens & pattern_set)
        # Multi-word pattern keywords get weighted higher
        for kw in pattern_set:
            if " " in kw and kw in all_text:
                overlap += 1
        if overlap > best_overlap:
            best_overlap = overlap
            best_rule    = rule

    if best_rule and best_overlap >= 1:
        theme    = best_rule["abstract_theme"]
        category = best_rule.get("category", "general")
        logger.debug("Generalized '%s' → '%s' (%s), overlap=%d", text[:40], theme, category, best_overlap)
        return theme, category

    # Fallback: use the first 3–5 words of the cleaned text as the theme name
    words = text.split()[:5]
    fallback = " ".join(words).title()
    logger.debug("No rule matched for '%s' → fallback: '%s'", text[:40], fallback)
    return fallback, "general"
