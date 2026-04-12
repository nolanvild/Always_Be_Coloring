"""
Shared NLP runtime helpers for optional spaCy usage.

The pipeline can run in degraded mode when the configured spaCy model is
unavailable. Callers should treat `get_nlp()` returning None as "NLP disabled".
"""

from __future__ import annotations

import logging
from typing import Any, Optional

import config

logger = logging.getLogger(__name__)

_nlp: Optional[Any] = None
_load_attempted = False
_warning_logged = False


def _load_nlp_model() -> Any:
    import spacy

    return spacy.load(config.SPACY_MODEL)


def _log_degraded_mode(exc: Exception) -> None:
    global _warning_logged

    if _warning_logged:
        return

    logger.warning(
        "spaCy model '%s' unavailable (%s). Running in degraded NLP mode. "
        "For full NLP support run: uv run python -m spacy download %s",
        config.SPACY_MODEL,
        exc,
        config.SPACY_MODEL,
    )
    _warning_logged = True


def get_nlp() -> Optional[Any]:
    global _load_attempted, _nlp

    if _load_attempted:
        return _nlp

    _load_attempted = True
    try:
        _nlp = _load_nlp_model()
        logger.info("spaCy model '%s' loaded", config.SPACY_MODEL)
    except (ImportError, OSError) as exc:
        _nlp = None
        _log_degraded_mode(exc)
    return _nlp


def _reset_state_for_tests() -> None:
    global _nlp, _load_attempted, _warning_logged

    _nlp = None
    _load_attempted = False
    _warning_logged = False
