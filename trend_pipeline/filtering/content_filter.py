"""
Content filter with per-category confidence scoring.

Five filter categories:
  politics, violence, religion, celebrity, brand

Confidence thresholds (from config):
  >= FILTER_REJECT_CONFIDENCE (0.6) → reject
  >= FILTER_FLAG_CONFIDENCE   (0.3) → flag for human review
  <  FILTER_FLAG_CONFIDENCE         → pass

Layered approach:
  1. Exact n-gram match against blocklist  (high confidence)
  2. Partial substring match               (medium confidence)
  3. Ambiguity resolution for edge cases   (contextual)
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Set, Tuple

import config

logger = logging.getLogger(__name__)

# ── Blocklist loading ─────────────────────────────────────────────────────────

def _load_blocklist(filename: str) -> Set[str]:
    path = config.BLOCKLIST_DIR / filename
    if not path.exists():
        logger.warning("Blocklist not found: %s", path)
        return set()
    terms: Set[str] = set()
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip().lower()
            if line and not line.startswith("#"):
                terms.add(line)
    return terms


_BLOCKLISTS: Dict[str, Set[str]] = {}


def _get_blocklists() -> Dict[str, Set[str]]:
    global _BLOCKLISTS
    if not _BLOCKLISTS:
        _BLOCKLISTS = {
            "politics":  _load_blocklist("political_terms.txt"),
            "violence":  _load_blocklist("violent_terms.txt"),
            "religion":  _load_blocklist("religious_terms.txt"),
            "celebrity": _load_blocklist("celebrity_names.txt"),
            "brand":     _load_blocklist("brand_names.txt"),
        }
        logger.info(
            "Blocklists loaded: %s",
            {k: len(v) for k, v in _BLOCKLISTS.items()},
        )
    return _BLOCKLISTS


# ── Ambiguity resolution ──────────────────────────────────────────────────────

_AMBIGUOUS_TERMS: Dict[str, Dict[str, List[str]]] = {
    "cross": {
        "risky":  ["church", "prayer", "faith", "worship", "jesus", "christian"],
        "safe":   ["shape", "pattern", "street", "intersection", "bridge"],
    },
    "star": {
        "risky":  ["famous", "celebrity", "singer", "actor", "hollywood"],
        "safe":   ["night", "sky", "constellation", "space", "galaxy"],
    },
    "crown": {
        "risky":  ["monarchy", "king", "queen", "throne", "royalty", "politics"],
        "safe":   ["flower", "nature", "decorative", "jewelry", "cactus"],
    },
    "flag": {
        "risky":  ["protest", "government", "patriot", "nation", "political"],
        "safe":   ["pattern", "color", "design", "ocean", "wind"],
    },
    "temple": {
        "risky":  ["worship", "prayer", "religion", "deity"],
        "safe":   ["ancient", "architecture", "ruins", "history", "jungle"],
    },
    "angel": {
        "risky":  ["prayer", "heaven", "god", "divine", "worship"],
        "safe":   ["decorative", "sculpture", "art", "wings", "nature"],
    },
}


def _resolve_ambiguity(term: str, full_text: str) -> str:
    """Returns 'safe', 'risky', or 'ambiguous'."""
    if term not in _AMBIGUOUS_TERMS:
        return "safe"
    context_tokens = set(full_text.lower().split())
    risky_words  = set(_AMBIGUOUS_TERMS[term].get("risky", []))
    safe_words   = set(_AMBIGUOUS_TERMS[term].get("safe", []))
    risky_overlap = len(context_tokens & risky_words)
    safe_overlap  = len(context_tokens & safe_words)
    if risky_overlap > safe_overlap:
        return "risky"
    if safe_overlap > 0:
        return "safe"
    return "ambiguous"


# ── Filter result ─────────────────────────────────────────────────────────────

@dataclass
class FilterResult:
    category: str
    confidence: float
    matched_terms: List[str]
    disposition: str   # "pass" | "flag_for_review" | "reject"


def _generate_ngrams(text: str, n: int) -> Set[str]:
    tokens = text.lower().split()
    if n == 1:
        return set(tokens)
    return {" ".join(tokens[i:i+n]) for i in range(len(tokens) - n + 1)}


def _score_category(text: str, blocklist: Set[str], category: str) -> FilterResult:
    all_ngrams = _generate_ngrams(text, 1) | _generate_ngrams(text, 2) | _generate_ngrams(text, 3)

    exact_matches: List[str] = [term for term in blocklist if term in all_ngrams]
    exact_confidence = min(len(exact_matches) * config.FILTER_EXACT_WEIGHT, 0.95)

    partial_matches: List[str] = []
    for term in blocklist:
        if term not in all_ngrams:
            if any(term in ngram or ngram in term for ngram in all_ngrams if len(ngram) > 2):
                partial_matches.append(term)
    partial_confidence = min(len(partial_matches) * config.FILTER_PARTIAL_WEIGHT, 0.50)

    combined = min(exact_confidence + (partial_confidence * 0.3), 1.0)
    combined = round(combined, 4)

    if combined >= config.FILTER_REJECT_CONFIDENCE:
        disposition = "reject"
    elif combined >= config.FILTER_FLAG_CONFIDENCE:
        disposition = "flag_for_review"
    else:
        disposition = "pass"

    return FilterResult(
        category=category,
        confidence=combined,
        matched_terms=list(set(exact_matches + partial_matches)),
        disposition=disposition,
    )


# ── Pipeline orchestrator ─────────────────────────────────────────────────────

def run_filter_pipeline(
    concept: str,
    keywords: List[str],
) -> Tuple[bool, List[FilterResult], List[str]]:
    """
    Returns:
      (accepted: bool, results: List[FilterResult], safety_notes: List[str])

    accepted=False means at least one category hit >= FILTER_REJECT_CONFIDENCE.
    safety_notes are human-readable flags for borderline content.
    """
    text = f"{concept} {' '.join(keywords)}"
    blocklists = _get_blocklists()

    results = [
        _score_category(text, blocklists["politics"],  "politics"),
        _score_category(text, blocklists["violence"],  "violence"),
        _score_category(text, blocklists["religion"],  "religion"),
        _score_category(text, blocklists["celebrity"], "celebrity"),
        _score_category(text, blocklists["brand"],     "brand"),
    ]

    safety_notes: List[str] = []
    extra_rejections: List[FilterResult] = []

    # Ambiguity resolution
    for token in set(concept.split() + keywords):
        resolution = _resolve_ambiguity(token, text)
        if resolution == "risky":
            extra_rejections.append(
                FilterResult("ambiguous", 0.65, [token], "reject")
            )
            logger.debug("Ambiguous term '%s' resolved as risky in '%s'", token, concept)
        elif resolution == "ambiguous":
            safety_notes.append(
                f"Term '{token}' is contextually ambiguous — human review recommended"
            )

    all_results = results + extra_rejections
    rejections = [r for r in all_results if r.disposition == "reject"]
    flags      = [r for r in all_results if r.disposition == "flag_for_review"]

    for flag in flags:
        safety_notes.append(
            f"Category '{flag.category}' flagged (confidence {flag.confidence:.2f}): {flag.matched_terms[:3]}"
        )

    accepted = len(rejections) == 0

    if not accepted:
        rejection_summary = "; ".join(
            f"{r.category}({r.confidence:.2f})" for r in rejections
        )
        logger.info("Rejected '%s': %s", concept, rejection_summary)

    return accepted, all_results, safety_notes
