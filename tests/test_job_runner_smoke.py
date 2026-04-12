from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

PIPELINE_DIR = Path(__file__).resolve().parents[1] / "trend_pipeline"
if str(PIPELINE_DIR) not in sys.path:
    sys.path.insert(0, str(PIPELINE_DIR))

import config
from ingestion.base_ingester import RawSignal
import nlp_runtime
from scheduler.job_runner import run_pipeline


class JobRunnerSmokeTests(unittest.TestCase):
    def setUp(self) -> None:
        nlp_runtime._reset_state_for_tests()

    def tearDown(self) -> None:
        nlp_runtime._reset_state_for_tests()

    def test_run_pipeline_writes_output_when_spacy_model_is_missing(self) -> None:
        rss_signal = RawSignal(
            term="Rocket launch over ocean",
            source="rss",
            raw_score=10.0,
            timestamp=123.0,
            metadata={"feed_name": "bbc_top"},
        )

        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_path = Path(tmpdir)
            output_dir = tmp_path / "output"
            db_path = tmp_path / "memory.db"
            log_file = tmp_path / "pipeline.log"

            with mock.patch.object(config, "OUTPUT_DIR", output_dir), mock.patch.object(
                config, "DB_PATH", str(db_path)
            ), mock.patch.object(config, "LOG_FILE", str(log_file)), mock.patch(
                "ingestion.rss_ingester.RSSIngester.fetch",
                return_value=[rss_signal],
            ), mock.patch(
                "ingestion.reddit_ingester.RedditIngester.fetch",
                return_value=[],
            ), mock.patch(
                "ingestion.google_trends_ingester.GoogleTrendsIngester.fetch",
                return_value=[],
            ), mock.patch(
                "ingestion.twitter_ingester.TwitterIngester.fetch",
                return_value=[],
            ), mock.patch(
                "nlp_runtime._load_nlp_model",
                side_effect=OSError("missing model"),
            ):
                out_path = run_pipeline()

            self.assertTrue(out_path)
            payload = json.loads(Path(out_path).read_text(encoding="utf-8"))
            self.assertEqual(payload["run_metadata"]["sources_active"], ["rss"])
            self.assertEqual(payload["run_metadata"]["total_accepted"], 0)


if __name__ == "__main__":
    unittest.main()
