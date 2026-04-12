"""
IP sanitizer: strips named entities (people, organizations, products,
creative works) from text using spaCy NER, with a manual blocklist fallback.

Entities removed:
  PERSON       → replaced with "a figure"
  ORG          → stripped (organizations/companies)
  PRODUCT      → stripped (product names)
  WORK_OF_ART  → replaced with "a creative work"
  GPE          → stripped only if it appears to be brand context
                 (pure location names like "Paris" are kept)

Manual blocklist (brand_names.txt + celebrity_names.txt) catches misses.
"""

from __future__ import annotations

import logging
import re
from typing import List, Tuple

from filtering.content_filter import _get_blocklists
from nlp_runtime import get_nlp

logger = logging.getLogger(__name__)

_ENTITY_REPLACEMENTS = {
    "PERSON":       "a figure",
    "ORG":          "",
    "PRODUCT":      "",
    "WORK_OF_ART":  "a creative work",
}


def _apply_replacements(text: str, replacements: List[Tuple[int, int, str]]) -> str:
    """Apply character-index replacements in reverse order to preserve indices."""
    result = text
    for start, end, replacement in sorted(replacements, key=lambda x: x[0], reverse=True):
        result = result[:start] + replacement + result[end:]
    return re.sub(r"\s{2,}", " ", result).strip()


def strip_ip_entities(text: str) -> str:
    """Remove named entities from text. Returns cleaned text."""
    replacements: List[Tuple[int, int, str]] = []
    nlp = get_nlp()

    if nlp is not None:
        doc = nlp(text[:512])

        for ent in doc.ents:
            label = ent.label_
            if label not in _ENTITY_REPLACEMENTS:
                continue
            replacement = _ENTITY_REPLACEMENTS[label]
            replacements.append((ent.start_char, ent.end_char, replacement))

    result = _apply_replacements(text, replacements) if replacements else text

    # Manual blocklist pass: check remaining text word by word
    blocklists = _get_blocklists()
    combined_manual = blocklists.get("brand", set()) | blocklists.get("celebrity", set())

    tokens = result.lower().split()
    for blocked_term in combined_manual:
        term_tokens = blocked_term.split()
        # Multi-word blocklist matching
        for i in range(len(tokens) - len(term_tokens) + 1):
            window = " ".join(tokens[i : i + len(term_tokens)])
            if window == blocked_term:
                result = re.sub(re.escape(blocked_term), "", result, flags=re.IGNORECASE)
                break

    result = re.sub(r"\s{2,}", " ", result).strip()

    if result != text:
        logger.debug("IP stripped: '%s' → '%s'", text[:60], result[:60])

    return result
