"""
Abstract base class for all data ingesters.

Each ingester must:
  - Set SOURCE_NAME class attribute
  - Implement fetch() returning List[RawSignal]
  - Handle all exceptions internally (never raise from fetch())
  - Complete within 300 seconds
"""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class RawSignal:
    term: str                               # Normalized noun phrase or raw title
    source: str                             # "reddit" | "google_trends" | "rss" | "twitter"
    raw_score: float                        # Source-specific relevance score
    timestamp: float                        # Unix UTC timestamp
    url: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


class BaseIngester(ABC):
    SOURCE_NAME: str = ""

    def __init__(self):
        self.logger = logging.getLogger(
            f"{self.__class__.__module__}.{self.__class__.__name__}"
        )

    @abstractmethod
    def fetch(self) -> List[RawSignal]:
        """
        Fetch raw signals from the source.
        Must catch all exceptions internally and return whatever was collected.
        Returns an empty list on complete failure — never raises.
        """
        raise NotImplementedError
