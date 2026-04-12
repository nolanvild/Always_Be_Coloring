"""
Pipeline orchestrator: wires all stages together into a single run_pipeline() call.
Also provides APScheduler setup for daily scheduled runs.
"""

from __future__ import annotations

import logging
import logging.handlers
import uuid
from typing import List

import config

logger = logging.getLogger(__name__)


def _setup_logging():
    root = logging.getLogger()
    if root.handlers:
        return
    root.setLevel(config.LOG_LEVEL)
    fmt = logging.Formatter("%(asctime)s %(levelname)-8s %(name)s: %(message)s")

    sh = logging.StreamHandler()
    sh.setFormatter(fmt)
    root.addHandler(sh)

    fh = logging.handlers.RotatingFileHandler(
        config.LOG_FILE,
        maxBytes=config.LOG_MAX_BYTES,
        backupCount=config.LOG_BACKUP_COUNT,
        encoding="utf-8",
    )
    fh.setFormatter(fmt)
    root.addHandler(fh)


def run_pipeline() -> str:
    """
    Execute the full trend → coloring book theme pipeline.
    Returns path of the output JSON file (or empty string on abort).
    """
    _setup_logging()
    run_id = str(uuid.uuid4())
    logger.info("=" * 60)
    logger.info("Pipeline run started  run_id=%s", run_id)

    # ── Stage 1: Ingestion ────────────────────────────────────────
    from ingestion.rss_ingester          import RSSIngester
    from ingestion.reddit_ingester       import RedditIngester
    from ingestion.google_trends_ingester import GoogleTrendsIngester
    from ingestion.twitter_ingester      import TwitterIngester

    raw_signals     = []
    sources_active: List[str] = []
    sources_failed: List[str] = []
    twitter_available = False

    for IngesterClass in [RSSIngester, RedditIngester, GoogleTrendsIngester]:
        try:
            ingester = IngesterClass()
            sigs = ingester.fetch()
            raw_signals.extend(sigs)
            if sigs:
                sources_active.append(IngesterClass.SOURCE_NAME)
            else:
                sources_failed.append(IngesterClass.SOURCE_NAME)
        except Exception as exc:
            logger.error("Ingester %s failed: %s", IngesterClass.__name__, exc)
            sources_failed.append(IngesterClass.SOURCE_NAME)

    # Twitter: confirmation only, non-blocking
    try:
        tw = TwitterIngester()
        tw_signals = tw.fetch()   # returns [] unless bearer token set
        if tw_signals:
            raw_signals.extend(tw_signals)
            sources_active.append("twitter")
            twitter_available = True
    except Exception as exc:
        logger.warning("Twitter ingester skipped: %s", exc)

    if len(sources_active) < 1:
        logger.error("No sources returned data — aborting run")
        return ""

    logger.info("Ingestion complete: %d raw signals from %s", len(raw_signals), sources_active)

    # ── Stage 2: Normalize ────────────────────────────────────────
    from processing.normalizer import normalize_signals
    normalized = normalize_signals(raw_signals)

    # ── Stage 3: Detect trends ────────────────────────────────────
    from processing.trend_detector import detect_trends
    candidates = detect_trends(normalized)
    logger.info("Trend detection: %d candidates", len(candidates))

    if not candidates:
        logger.warning("No trend candidates — writing empty output")

    # ── Stage 4: Dedup ────────────────────────────────────────────
    from memory.memory_store import MemoryStore
    memory = MemoryStore(config.DB_PATH)

    deduped = []
    for c in candidates:
        is_dup, matched_id = memory.check_duplicate(
            c.keywords,
            lookback_days=config.DEDUP_LOOKBACK_DAYS,
            threshold=config.DEDUP_SIMILARITY_THRESHOLD,
        )
        if not is_dup:
            deduped.append(c)
        else:
            logger.debug("Dedup: '%s' matches existing theme %s", c.concept, matched_id)

    logger.info("After dedup: %d candidates remain", len(deduped))

    # ── Stage 5: Filter ───────────────────────────────────────────
    from filtering.content_filter import run_filter_pipeline

    filtered = []
    for c in deduped:
        accepted, results, safety_notes = run_filter_pipeline(c.concept, c.keywords)
        if accepted:
            c.safety_notes = safety_notes
            filtered.append(c)

    logger.info("After filtering: %d candidates remain", len(filtered))

    # ── Stage 6: Transform ────────────────────────────────────────
    from transformation.ip_sanitizer       import strip_ip_entities
    from transformation.concept_generalizer import generalize_concept
    from transformation.theme_builder       import build_theme

    # IP sanitizer artifact strings — concepts that reduce to these after
    # entity removal are meaningless and should be skipped.
    _SANITIZER_ARTIFACTS = {"a figure", "an organization", "a creative work", "a product"}

    theme_pairs = []
    for c in filtered:
        clean = strip_ip_entities(c.concept)
        # Skip concepts that are dominated by sanitizer placeholder text
        clean_tokens = set(clean.lower().split())
        artifact_tokens = {"figure", "organization", "creative", "work", "product"}
        if len(clean_tokens) <= 3 and clean_tokens & artifact_tokens:
            logger.debug("Skipping artifact-dominated concept: '%s'", clean)
            continue
        # Collect full headlines from all signals in this candidate for richer matching
        all_headlines = []
        for sigs in c.source_signals.values():
            for s in sigs:
                h = s.metadata.get("full_headline", "")
                if h:
                    all_headlines.append(h)
        abstract_theme, category = generalize_concept(clean, c.keywords, full_headlines=all_headlines)
        # Skip if the generalized theme name still contains artifact text
        if any(art in abstract_theme.lower() for art in ["creative work", "a figure", "organization"]):
            logger.debug("Skipping garbled theme: '%s'", abstract_theme)
            continue
        theme = build_theme(c, abstract_theme, category)
        theme_pairs.append((theme, c))

    # ── Stage 7: Score ────────────────────────────────────────────
    from scoring.coloring_book_scorer import apply_score_to_theme

    final_themes = []
    for theme, candidate in theme_pairs:
        apply_score_to_theme(theme, candidate)
        if theme.coloring_book_score >= config.MIN_SCORE_THRESHOLD:
            final_themes.append(theme)

    final_themes.sort(key=lambda t: t.coloring_book_score, reverse=True)
    logger.info(
        "After scoring: %d themes accepted (min score %d)",
        len(final_themes), config.MIN_SCORE_THRESHOLD,
    )

    # ── Stage 8: Write output ─────────────────────────────────────
    from output.json_writer import write_output_with_counts

    total_candidates = len(candidates)
    total_rejected   = total_candidates - len(final_themes)

    out_path = write_output_with_counts(
        themes=final_themes,
        run_id=run_id,
        sources_active=sources_active,
        sources_failed=sources_failed,
        total_candidates=total_candidates,
        total_rejected=total_rejected,
        twitter_available=twitter_available,
    )

    # ── Stage 9: Update memory ────────────────────────────────────
    for theme in final_themes:
        from transformation.concept_generalizer import generalize_concept
        # Re-extract keywords for storage (theme name + category are good dedup keys)
        kw = list(set(theme.theme_name.lower().split() + [theme.category] + theme.page_ideas[0].lower().split()[:4]))
        memory.store_theme(
            theme_id=theme.theme_id,
            theme_name=theme.theme_name,
            category=theme.category,
            keywords=kw,
            run_id=run_id,
            score=theme.coloring_book_score,
        )

    memory.log_run(
        run_id=run_id,
        sources_used=sources_active,
        candidates=total_candidates,
        accepted=len(final_themes),
    )
    memory.close()

    logger.info("Pipeline complete. %d themes written to %s", len(final_themes), out_path)
    logger.info("=" * 60)
    return out_path


def build_scheduler():
    """Build and return a blocking APScheduler for daily runs."""
    from apscheduler.schedulers.blocking import BlockingScheduler
    from apscheduler.triggers.cron      import CronTrigger

    scheduler = BlockingScheduler(timezone="UTC")
    scheduler.add_job(
        func=run_pipeline,
        trigger=CronTrigger(
            hour=config.SCHEDULE_HOUR,
            minute=config.SCHEDULE_MINUTE,
            timezone="UTC",
        ),
        id="daily_trend_pipeline",
        name="Daily Trend to Coloring Book Pipeline",
        replace_existing=True,
        max_instances=1,
        misfire_grace_time=config.SCHEDULER_MISFIRE_GRACE,
        coalesce=True,
    )
    return scheduler
