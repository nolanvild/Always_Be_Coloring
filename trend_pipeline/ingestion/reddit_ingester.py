"""
Reddit ingester using PRAW (Python Reddit API Wrapper).

Requires a free "script" OAuth app:
  https://www.reddit.com/prefs/apps

Credentials set via .env:
  REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USER_AGENT

Fetches the top-N "hot" posts from each subreddit in the configured list.
Signal score: log10(upvotes+1) * comment_weight (capped multiplier).
"""

from __future__ import annotations

import math
import time
from typing import List

import praw
import praw.exceptions

import config
from ingestion.base_ingester import BaseIngester, RawSignal


class RedditIngester(BaseIngester):
    SOURCE_NAME = "reddit"

    def _build_client(self) -> praw.Reddit:
        if not config.REDDIT_CLIENT_ID or not config.REDDIT_CLIENT_SECRET:
            raise ValueError(
                "REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET must be set in .env"
            )
        return praw.Reddit(
            client_id=config.REDDIT_CLIENT_ID,
            client_secret=config.REDDIT_CLIENT_SECRET,
            user_agent=config.REDDIT_USER_AGENT,
            read_only=True,
        )

    @staticmethod
    def _signal_score(post_score: int, num_comments: int) -> float:
        comment_weight = min(num_comments / 100.0, 2.0)
        return math.log10(post_score + 1) * max(comment_weight, 0.1)

    def fetch(self) -> List[RawSignal]:
        try:
            reddit = self._build_client()
        except Exception as exc:
            self.logger.error("Reddit client init failed: %s", exc)
            return []

        signals: List[RawSignal] = []

        for sub_name in config.REDDIT_SUBREDDITS:
            try:
                subreddit = reddit.subreddit(sub_name)
                posts = list(subreddit.hot(limit=config.REDDIT_POSTS_PER_SUB))

                for post in posts:
                    if post.over_18:
                        continue

                    score = self._signal_score(post.score, post.num_comments)
                    signals.append(
                        RawSignal(
                            term=post.title,
                            source=self.SOURCE_NAME,
                            raw_score=score,
                            timestamp=post.created_utc,
                            url=f"https://reddit.com{post.permalink}",
                            metadata={
                                "subreddit":    sub_name,
                                "post_score":   post.score,
                                "num_comments": post.num_comments,
                                "flair":        post.link_flair_text or "",
                            },
                        )
                    )

                self.logger.info(
                    "Reddit r/%s: collected %d posts", sub_name, len(posts)
                )

            except praw.exceptions.PRAWException as exc:
                self.logger.error("Reddit r/%s PRAW error: %s", sub_name, exc)
            except Exception as exc:
                self.logger.error("Reddit r/%s unexpected error: %s", sub_name, exc)

            time.sleep(config.REDDIT_SLEEP_BETWEEN_S)

        self.logger.info("Reddit total signals: %d", len(signals))
        return signals
