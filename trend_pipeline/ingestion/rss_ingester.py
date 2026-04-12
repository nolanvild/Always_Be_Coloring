"""
RSS feed ingester using feedparser.

Fetches the most recent entries from each configured feed,
returning one RawSignal per article (title used as the term).
No authentication required.
"""

from __future__ import annotations

import socket
import time
from typing import List

import feedparser

import config
from ingestion.base_ingester import BaseIngester, RawSignal


class RSSIngester(BaseIngester):
    SOURCE_NAME = "rss"

    def fetch(self) -> List[RawSignal]:
        socket.setdefaulttimeout(config.RSS_TIMEOUT_S)
        signals: List[RawSignal] = []

        for feed_name, url in config.RSS_FEEDS.items():
            try:
                feed = feedparser.parse(url)
                if feed.bozo and not feed.entries:
                    self.logger.warning("Feed '%s' returned bozo error: %s", feed_name, feed.bozo_exception)
                    continue

                for entry in feed.entries[: config.RSS_ENTRIES_PER_FEED]:
                    title   = entry.get("title", "").strip()
                    summary = entry.get("summary", "").strip()
                    link    = entry.get("link", "")
                    tags    = [t.term for t in entry.get("tags", [])]

                    if not title:
                        continue

                    published_struct = entry.get("published_parsed")
                    ts = (
                        time.mktime(published_struct)
                        if published_struct
                        else time.time()
                    )

                    signals.append(
                        RawSignal(
                            term=title,
                            source=self.SOURCE_NAME,
                            raw_score=1.0,
                            timestamp=ts,
                            url=link,
                            metadata={
                                "feed_name": feed_name,
                                "summary": summary[:300],
                                "tags": tags,
                            },
                        )
                    )

                self.logger.info("RSS '%s': collected %d entries", feed_name, len(feed.entries[: config.RSS_ENTRIES_PER_FEED]))

            except Exception as exc:
                self.logger.error("RSS '%s' failed: %s", feed_name, exc)

        self.logger.info("RSS total signals: %d", len(signals))
        return signals
