from __future__ import annotations

import sys
import unittest
from pathlib import Path
from unittest import mock

PIPELINE_DIR = Path(__file__).resolve().parents[1] / "trend_pipeline"
if str(PIPELINE_DIR) not in sys.path:
    sys.path.insert(0, str(PIPELINE_DIR))

from ingestion.base_ingester import RawSignal
import nlp_runtime
from processing.normalizer import normalize_signals


class NormalizerFallbackTests(unittest.TestCase):
    def setUp(self) -> None:
        nlp_runtime._reset_state_for_tests()

    def tearDown(self) -> None:
        nlp_runtime._reset_state_for_tests()

    def test_normalize_signals_continues_without_spacy_model(self) -> None:
        signals = [
            RawSignal(
                term="Rocket launch over ocean",
                source="rss",
                raw_score=10.0,
                timestamp=123.0,
                metadata={"feed_name": "bbc_top"},
            )
        ]

        with mock.patch(
            "nlp_runtime._load_nlp_model",
            side_effect=OSError("missing model"),
        ):
            normalized = normalize_signals(signals)

        self.assertEqual(len(normalized), 1)
        self.assertEqual(normalized[0].term, "rocket launch over ocean")
        self.assertEqual(normalized[0].metadata["original_term"], "Rocket launch over ocean")
        self.assertEqual(normalized[0].metadata["full_headline"], "rocket launch over ocean")
        self.assertEqual(normalized[0].metadata["noun_phrases"], [])


if __name__ == "__main__":
    unittest.main()
