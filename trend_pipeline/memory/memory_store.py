"""
SQLite-backed memory store for deduplication and run logging.

Tables:
  themes   — every accepted theme, with keywords for Jaccard similarity checks
  run_log  — one row per pipeline run
"""

import hashlib
import json
import logging
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import List, Optional, Tuple

logger = logging.getLogger(__name__)

_CREATE_THEMES = """
CREATE TABLE IF NOT EXISTS themes (
    id           TEXT PRIMARY KEY,
    theme_name   TEXT NOT NULL,
    category     TEXT,
    keywords     TEXT NOT NULL,
    keyword_hash TEXT NOT NULL,
    created_at   TEXT NOT NULL,
    run_id       TEXT NOT NULL,
    score        INTEGER
);
CREATE INDEX IF NOT EXISTS idx_themes_created_at   ON themes(created_at);
CREATE INDEX IF NOT EXISTS idx_themes_category     ON themes(category);
CREATE INDEX IF NOT EXISTS idx_themes_keyword_hash ON themes(keyword_hash);
"""

_CREATE_RUN_LOG = """
CREATE TABLE IF NOT EXISTS run_log (
    run_id        TEXT PRIMARY KEY,
    run_timestamp TEXT NOT NULL,
    sources_used  TEXT,
    candidates    INTEGER,
    accepted      INTEGER
);
"""


class MemoryStore:
    def __init__(self, db_path: str):
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        self.conn = sqlite3.connect(db_path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self._init_tables()

    def _init_tables(self):
        self.conn.executescript(_CREATE_THEMES)
        self.conn.executescript(_CREATE_RUN_LOG)
        self.conn.commit()

    # ── Theme storage ─────────────────────────────────────────────────────────

    def store_theme(
        self,
        theme_id: str,
        theme_name: str,
        category: str,
        keywords: List[str],
        run_id: str,
        score: int,
    ) -> None:
        sorted_kw = sorted(set(k.lower() for k in keywords))
        kw_json   = json.dumps(sorted_kw)
        kw_hash   = hashlib.sha256(kw_json.encode()).hexdigest()
        created   = datetime.now(timezone.utc).isoformat()

        self.conn.execute(
            "INSERT OR IGNORE INTO themes VALUES (?,?,?,?,?,?,?,?)",
            (theme_id, theme_name, category, kw_json, kw_hash, created, run_id, score),
        )
        self.conn.commit()
        logger.debug("Stored theme '%s' (id=%s)", theme_name, theme_id)

    # ── Deduplication ─────────────────────────────────────────────────────────

    def check_duplicate(
        self,
        candidate_keywords: List[str],
        lookback_days: int = 30,
        threshold: float = 0.45,
    ) -> Tuple[bool, Optional[str]]:
        """
        Returns (is_duplicate, matching_theme_id_or_None).
        Uses Jaccard similarity on keyword sets within the lookback window.
        """
        cutoff = (datetime.now(timezone.utc) - timedelta(days=lookback_days)).isoformat()
        rows = self.conn.execute(
            "SELECT id, keywords FROM themes WHERE created_at >= ?",
            (cutoff,),
        ).fetchall()

        candidate_set = set(k.lower() for k in candidate_keywords)
        if not candidate_set:
            return False, None

        for row in rows:
            stored_set = set(json.loads(row["keywords"]))
            union = candidate_set | stored_set
            if not union:
                continue
            jaccard = len(candidate_set & stored_set) / len(union)
            if jaccard >= threshold:
                logger.debug(
                    "Duplicate detected: Jaccard=%.2f >= %.2f (matched theme %s)",
                    jaccard, threshold, row["id"],
                )
                return True, row["id"]

        return False, None

    # ── Run logging ───────────────────────────────────────────────────────────

    def log_run(
        self,
        run_id: str,
        sources_used: List[str],
        candidates: int,
        accepted: int,
    ) -> None:
        ts = datetime.now(timezone.utc).isoformat()
        self.conn.execute(
            "INSERT OR IGNORE INTO run_log VALUES (?,?,?,?,?)",
            (run_id, ts, json.dumps(sources_used), candidates, accepted),
        )
        self.conn.commit()

    # ── Queries ───────────────────────────────────────────────────────────────

    def get_recent_themes(self, days: int = 7) -> List[dict]:
        cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
        rows = self.conn.execute(
            """SELECT theme_name, category, score, created_at
               FROM themes WHERE created_at >= ?
               ORDER BY score DESC""",
            (cutoff,),
        ).fetchall()
        return [dict(r) for r in rows]

    def close(self):
        self.conn.close()
