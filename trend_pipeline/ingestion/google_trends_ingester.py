"""
Google Trends ingester using pytrends (unofficial wrapper).

IMPORTANT: Google throttles aggressively. This ingester includes mandatory
sleeps between API calls. The whole fetch may take 5-15 minutes.

Collects:
  1. Today's top trending searches (up to 20 terms)
  2. 90-day interest history for each term (batched, max 5 per call)
  3. Related rising queries for context
"""

from __future__ import annotations

import time
from typing import Any, Dict, List, Optional

import pandas as pd
from pytrends.request import TrendReq
from pytrends.exceptions import ResponseError

import config
from ingestion.base_ingester import BaseIngester, RawSignal


class GoogleTrendsIngester(BaseIngester):
    SOURCE_NAME = "google_trends"

    def _build_client(self) -> TrendReq:
        # Do not pass retries or backoff_factor — they trigger a method_whitelist
        # incompatibility in newer urllib3 via pytrends internals.
        return TrendReq(
            hl="en-US",
            tz=360,
            timeout=(10, 25),
        )

    def _fetch_trending_terms(self, pt: TrendReq) -> List[str]:
        # Try both parameter variants — pytrends API changed pn format across versions
        for pn_value in ("united_states", "US", "united states"):
            try:
                df = pt.trending_searches(pn=pn_value)
                terms = df[0].tolist()
                if terms:
                    self.logger.info("trending_searches succeeded with pn='%s'", pn_value)
                    return terms
            except Exception as exc:
                self.logger.warning("trending_searches pn='%s' failed: %s", pn_value, exc)
        return []

    def _fetch_history(
        self, pt: TrendReq, batch: List[str]
    ) -> Optional[pd.DataFrame]:
        try:
            pt.build_payload(
                batch,
                timeframe=config.PYTRENDS_TIMEFRAME,
                geo=config.PYTRENDS_GEO,
            )
            df = pt.interest_over_time()
            return df if not df.empty else None
        except ResponseError as exc:
            self.logger.warning("interest_over_time ResponseError: %s", exc)
            return None
        except Exception as exc:
            self.logger.error("interest_over_time failed: %s", exc)
            return None

    def _fetch_related(
        self, pt: TrendReq, batch: List[str]
    ) -> Dict[str, Any]:
        try:
            return pt.related_queries()
        except Exception as exc:
            self.logger.warning("related_queries failed: %s", exc)
            return {}

    @staticmethod
    def _compute_spike_score(series: List[float]) -> float:
        if len(series) < 7:
            return 0.0
        current = series[-1]
        mean_30 = sum(series[-30:]) / len(series[-30:]) if len(series) >= 30 else sum(series) / len(series)
        if mean_30 == 0:
            return float(current)
        ratio = current / mean_30
        if current >= config.TREND_SPIKE_THRESHOLD and ratio >= config.TREND_SPIKE_RATIO:
            return min(current * (ratio / config.TREND_SPIKE_RATIO), 100.0)
        if current >= 50 and ratio >= 1.8:
            return current * 0.6
        return 0.0

    @staticmethod
    def _compute_sustained_weeks(series: List[float]) -> float:
        threshold = config.TREND_INTEREST_FLOOR
        weeks = 0
        for value in reversed(series):
            if value >= threshold:
                weeks += 1
            else:
                break
        # pytrends returns weekly data by default for 3-month timeframe
        return float(weeks)

    def fetch(self) -> List[RawSignal]:
        try:
            pt = self._build_client()
        except Exception as exc:
            self.logger.error("pytrends client init failed: %s", exc)
            return []

        terms = self._fetch_trending_terms(pt)
        if not terms:
            self.logger.warning("No trending terms returned from Google Trends")
            return []

        self.logger.info("Google Trends: %d trending terms found", len(terms))
        signals: List[RawSignal] = []

        for i in range(0, len(terms), config.PYTRENDS_MAX_KEYWORDS):
            batch = terms[i : i + config.PYTRENDS_MAX_KEYWORDS]
            self.logger.info("Processing batch %d: %s", i // config.PYTRENDS_MAX_KEYWORDS + 1, batch)

            history_df = self._fetch_history(pt, batch)
            time.sleep(config.PYTRENDS_SLEEP_S)

            related = self._fetch_related(pt, batch)
            time.sleep(config.PYTRENDS_SLEEP_S // 2)

            for term in batch:
                series: List[float] = []
                if history_df is not None and term in history_df.columns:
                    series = history_df[term].tolist()

                spike_score     = self._compute_spike_score(series)
                sustained_weeks = self._compute_sustained_weeks(series)
                current_index   = float(series[-1]) if series else 0.0
                mean_30d        = (
                    sum(series[-30:]) / len(series[-30:])
                    if len(series) >= 30
                    else (sum(series) / len(series) if series else 0.0)
                )

                related_rising: List[str] = []
                if term in related and related[term] and "rising" in related[term]:
                    df_rising = related[term]["rising"]
                    if df_rising is not None and not df_rising.empty:
                        related_rising = df_rising["query"].tolist()[:5]

                # raw_score: blend of current index and spike intensity
                raw_score = (current_index * 0.4) + (spike_score * 0.6)

                signals.append(
                    RawSignal(
                        term=term,
                        source=self.SOURCE_NAME,
                        raw_score=raw_score,
                        timestamp=time.time(),
                        url=f"https://trends.google.com/trends/explore?q={term}&geo={config.PYTRENDS_GEO}",
                        metadata={
                            "current_index":   current_index,
                            "mean_30d_index":  round(mean_30d, 2),
                            "spike_score":     round(spike_score, 2),
                            "sustained_weeks": sustained_weeks,
                            "history_series":  series,
                            "related_queries": related_rising,
                        },
                    )
                )

        self.logger.info("Google Trends total signals: %d", len(signals))
        return signals
