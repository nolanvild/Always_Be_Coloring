"""
Twitter/X ingester — confirmation-only, best-effort.

The X free tier does NOT provide access to trending topics endpoints.
This ingester is used only to CONFIRM trends already identified by other
sources by searching for recent tweets mentioning them.

Behavior:
  - If TWITTER_BEARER_TOKEN is empty → skip entirely, log info
  - If rate-limited (429) or access denied (403) → set available=False, continue
  - On success → one RawSignal per term that has tweet_count >= 5

The pipeline works correctly without this ingester.
"""

from __future__ import annotations

import time
from typing import List

import config
from ingestion.base_ingester import BaseIngester, RawSignal

_TWITTER_AVAILABLE = False
try:
    import tweepy
    _TWITTER_AVAILABLE = True
except ImportError:
    pass

# Rate limit: 10 requests per 15 minutes on free tier
_SLEEP_BETWEEN_SEARCHES_S = 100  # ~10/15min → 90s, using 100s to be safe


class TwitterIngester(BaseIngester):
    SOURCE_NAME = "twitter"

    def _build_client(self):
        if not _TWITTER_AVAILABLE:
            raise ImportError("tweepy is not installed")
        if not config.TWITTER_BEARER_TOKEN:
            raise ValueError("TWITTER_BEARER_TOKEN not set")
        return tweepy.Client(
            bearer_token=config.TWITTER_BEARER_TOKEN,
            wait_on_rate_limit=False,
        )

    def fetch(self) -> List[RawSignal]:
        if not config.TWITTER_BEARER_TOKEN:
            self.logger.info("Twitter: TWITTER_BEARER_TOKEN not set — skipping")
            return []

        if not _TWITTER_AVAILABLE:
            self.logger.warning("Twitter: tweepy not installed — skipping")
            return []

        try:
            client = self._build_client()
        except Exception as exc:
            self.logger.error("Twitter client init failed: %s", exc)
            return []

        # This ingester expects to be called with candidate terms pre-loaded
        # from other sources. In the pipeline, the orchestrator passes them
        # via confirm_terms(). The bare fetch() returns empty — it's a
        # confirmation tool, not a discovery tool.
        self.logger.info(
            "Twitter: bare fetch() called — use confirm_terms() for confirmation"
        )
        return []

    def confirm_terms(self, terms: List[str]) -> List[RawSignal]:
        """
        For each term, search recent tweets and return a RawSignal if
        at least 5 recent tweets are found. Used for cross-source confirmation.
        """
        if not config.TWITTER_BEARER_TOKEN or not _TWITTER_AVAILABLE:
            return []

        try:
            client = self._build_client()
        except Exception as exc:
            self.logger.error("Twitter client init failed: %s", exc)
            return []

        signals: List[RawSignal] = []

        for term in terms:
            try:
                response = client.search_recent_tweets(  # type: ignore[attr-defined]
                    query=f"{term} -is:retweet lang:en",
                    max_results=10,
                    tweet_fields=["created_at", "public_metrics"],
                )
                count = len(response.data) if response.data else 0

                if count >= 5:
                    signals.append(
                        RawSignal(
                            term=term,
                            source=self.SOURCE_NAME,
                            raw_score=float(count),
                            timestamp=time.time(),
                            metadata={
                                "tweet_count": count,
                                "available":   True,
                            },
                        )
                    )
                    self.logger.debug("Twitter confirmed '%s': %d tweets", term, count)

            except tweepy.TooManyRequests:  # type: ignore[attr-defined]
                self.logger.warning("Twitter rate limit hit — stopping confirmation")
                break
            except tweepy.Forbidden:  # type: ignore[attr-defined]
                self.logger.warning("Twitter access denied — stopping confirmation")
                break
            except Exception as exc:
                self.logger.error("Twitter search for '%s' failed: %s", term, exc)

            time.sleep(_SLEEP_BETWEEN_SEARCHES_S)

        self.logger.info("Twitter confirmed %d / %d terms", len(signals), len(terms))
        return signals
