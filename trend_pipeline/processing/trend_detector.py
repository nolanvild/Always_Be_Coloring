"""
Trend detector: groups normalized signals by concept and qualifies trends.

Qualification criteria (at least ONE must be met):
  - source_count >= TREND_MIN_SOURCE_COUNT (appears in 3+ distinct sources)
  - spike_score  >= TREND_SPIKE_THRESHOLD  (sudden Google Trends spike)
  - sustained_weeks >= TREND_SUSTAINED_WEEKS (2+ consecutive weeks of interest)

Outputs a sorted list of TrendCandidate objects.
"""

from __future__ import annotations

import logging
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set, Tuple

import config
from ingestion.base_ingester import RawSignal

logger = logging.getLogger(__name__)


@dataclass
class TrendCandidate:
    concept: str                                    # Primary normalized term
    source_signals: Dict[str, List[RawSignal]]      # Keyed by source name
    source_count: int                               # Number of distinct sources
    spike_score: float                              # 0–100 from Google Trends
    sustained_weeks: float                          # Weeks of sustained interest
    aggregate_score: float                          # Composite 0–100 score
    keywords: List[str]                             # Keyword set for dedup
    safety_notes: List[str] = field(default_factory=list)  # Filled by filter


def _tokenize(text: str) -> Set[str]:
    return set(text.lower().split())


def _jaccard(a: Set[str], b: Set[str]) -> float:
    union = a | b
    if not union:
        return 0.0
    return len(a & b) / len(union)


def _extract_spike_score(signals: List[RawSignal]) -> float:
    for sig in signals:
        if sig.source == "google_trends":
            return sig.metadata.get("spike_score", 0.0)
    return 0.0


def _extract_sustained_weeks(signals: List[RawSignal]) -> float:
    for sig in signals:
        if sig.source == "google_trends":
            return sig.metadata.get("sustained_weeks", 0.0)
    return 0.0


def _extract_keywords(concept: str, signals: List[RawSignal]) -> List[str]:
    """Collect tokens from concept, noun phrases, full headlines, and related queries."""
    kw_set: Set[str] = set(concept.split())
    for sig in signals:
        for phrase in sig.metadata.get("noun_phrases", []):
            kw_set.update(phrase.split())
        headline = sig.metadata.get("full_headline", "")
        if headline:
            kw_set.update(headline.split())
        for rq in sig.metadata.get("related_queries", []):
            kw_set.update(rq.lower().split())
    return [k for k in kw_set if len(k) > 2]


def _aggregate_score(
    source_count: int,
    spike_score: float,
    sustained_weeks: float,
    max_sources: int = 4,
) -> float:
    source_component    = (min(source_count, max_sources) / max_sources) * 40.0
    spike_component     = (min(spike_score, 100.0) / 100.0) * 35.0
    sustained_component = (min(sustained_weeks / config.TREND_SUSTAINED_WEEKS, 1.0) * 25.0)
    return round(source_component + spike_component + sustained_component, 2)


def _group_signals(
    signals: List[RawSignal],
    similarity_threshold: float = 0.50,
) -> Dict[str, List[RawSignal]]:
    """
    Group signals by concept using Jaccard similarity on unigram sets.
    Two terms are merged if their unigram Jaccard >= similarity_threshold.
    The first-seen term becomes the group representative.
    """
    groups: Dict[str, List[RawSignal]] = {}  # concept → signals
    group_tokens: Dict[str, Set[str]]  = {}  # concept → token set

    for sig in signals:
        term_tokens = _tokenize(sig.term)
        matched_concept: Optional[str] = None

        for existing_concept, existing_tokens in group_tokens.items():
            if _jaccard(term_tokens, existing_tokens) >= similarity_threshold:
                matched_concept = existing_concept
                break

        if matched_concept:
            groups[matched_concept].append(sig)
            # Grow the representative token set slightly
            group_tokens[matched_concept] |= term_tokens
        else:
            groups[sig.term] = [sig]
            group_tokens[sig.term] = term_tokens

    return groups


def detect_trends(signals: List[RawSignal]) -> List[TrendCandidate]:
    """
    Main entry point. Returns qualified TrendCandidate list sorted by
    aggregate_score descending, capped at TREND_TOP_CANDIDATES.
    """
    if not signals:
        logger.warning("TrendDetector: no signals provided")
        return []

    groups = _group_signals(signals, similarity_threshold=0.30)
    logger.info("TrendDetector: %d signals → %d concept groups", len(signals), len(groups))

    candidates: List[TrendCandidate] = []

    for concept, group_signals in groups.items():
        # Count distinct sources. RSS feeds each count as a separate sub-source
        # (bbc_top, nbc_news, etc.) so a story in 3 feeds = source_count 3.
        sub_sources: set = set()
        for s in group_signals:
            feed_name = s.metadata.get("feed_name")
            sub_sources.add(feed_name if feed_name else s.source)
        source_count    = len(sub_sources)
        spike_score     = _extract_spike_score(group_signals)
        sustained_weeks = _extract_sustained_weeks(group_signals)

        qualifies = (
            source_count    >= config.TREND_MIN_SOURCE_COUNT
            or spike_score  >= config.TREND_SPIKE_THRESHOLD
            or sustained_weeks >= config.TREND_SUSTAINED_WEEKS
        )

        if not qualifies:
            continue

        by_source: Dict[str, List[RawSignal]] = defaultdict(list)
        for s in group_signals:
            by_source[s.source].append(s)

        candidates.append(
            TrendCandidate(
                concept=concept,
                source_signals=dict(by_source),
                source_count=source_count,
                spike_score=spike_score,
                sustained_weeks=sustained_weeks,
                aggregate_score=_aggregate_score(source_count, spike_score, sustained_weeks),
                keywords=_extract_keywords(concept, group_signals),
            )
        )

    candidates.sort(key=lambda c: c.aggregate_score, reverse=True)
    result = candidates[: config.TREND_TOP_CANDIDATES]

    logger.info(
        "TrendDetector: %d qualified candidates (top %d returned)",
        len(candidates), len(result),
    )
    return result
