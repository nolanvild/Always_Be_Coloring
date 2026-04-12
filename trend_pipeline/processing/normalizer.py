"""
Text normalizer: cleans raw signal terms and extracts noun phrases
using spaCy when available.

Setup (one-time):
  uv sync
  uv run python -m spacy download en_core_web_sm
"""

from __future__ import annotations

import logging
import re
from typing import List

from ingestion.base_ingester import RawSignal
from nlp_runtime import get_nlp

logger = logging.getLogger(__name__)


_STOP_PATTERN = re.compile(r"[^a-z0-9\s\-]")
_WHITESPACE   = re.compile(r"\s+")


def _clean_text(text: str) -> str:
    text = text.lower()
    text = _STOP_PATTERN.sub(" ", text)
    text = _WHITESPACE.sub(" ", text).strip()
    return text


def extract_noun_phrases(text: str) -> List[str]:
    """Return lemmatized noun chunks from text, filtered to meaningful length."""
    nlp = get_nlp()
    if nlp is None:
        return []

    doc  = nlp(text[:512])  # cap length to avoid slow processing
    phrases = []
    for chunk in doc.noun_chunks:
        lemmas = " ".join(
            tok.lemma_.lower()
            for tok in chunk
            if not tok.is_stop and not tok.is_punct and len(tok.text) > 1
        ).strip()
        if len(lemmas) >= 3:
            phrases.append(lemmas)
    return phrases


def normalize_signals(signals: List[RawSignal]) -> List[RawSignal]:
    """
    Normalize each signal's term:
      - Clean whitespace / punctuation
      - Use the full cleaned headline as the grouping term (preserves context)
      - Extract noun phrases as additional keywords stored in metadata
    Signals with empty terms after normalization are dropped.
    """
    normalized: List[RawSignal] = []
    seen: set = set()

    for sig in signals:
        raw = sig.term or ""
        cleaned = _clean_text(raw)
        if not cleaned:
            continue

        # Extract noun phrases for grouping. Prefer multi-word phrases (2+ tokens)
        # as they carry more semantic signal. Fall back to first phrase or cleaned text.
        phrases = extract_noun_phrases(cleaned)
        multi_word = [p for p in phrases if len(p.split()) >= 2]
        primary = (multi_word[0] if multi_word else (phrases[0] if phrases else cleaned[:60]))

        dedup_key = (sig.source, sig.metadata.get("feed_name", ""), primary)
        if dedup_key in seen:
            continue
        seen.add(dedup_key)

        # Store full cleaned headline in metadata so concept_generalizer has
        # the full context (individual noun phrase alone loses keywords like "space").
        normalized.append(
            RawSignal(
                term=primary,
                source=sig.source,
                raw_score=sig.raw_score,
                timestamp=sig.timestamp,
                url=sig.url,
                metadata={
                    **sig.metadata,
                    "original_term": raw,
                    "full_headline": cleaned,
                    "noun_phrases": phrases,
                },
            )
        )

    logger.info(
        "Normalizer: %d raw → %d normalized signals",
        len(signals), len(normalized),
    )
    return normalized
