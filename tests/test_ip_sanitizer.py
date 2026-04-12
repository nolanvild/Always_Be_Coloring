from __future__ import annotations

import sys
import unittest
from pathlib import Path
from unittest import mock

PIPELINE_DIR = Path(__file__).resolve().parents[1] / "trend_pipeline"
if str(PIPELINE_DIR) not in sys.path:
    sys.path.insert(0, str(PIPELINE_DIR))

import nlp_runtime
from transformation.ip_sanitizer import strip_ip_entities


class IPSanitizerFallbackTests(unittest.TestCase):
    def setUp(self) -> None:
        nlp_runtime._reset_state_for_tests()

    def tearDown(self) -> None:
        nlp_runtime._reset_state_for_tests()

    def test_manual_blocklist_still_runs_without_spacy_model(self) -> None:
        with mock.patch(
            "nlp_runtime._load_nlp_model",
            side_effect=OSError("missing model"),
        ):
            sanitized = strip_ip_entities("Nike garden patterns")
            unchanged = strip_ip_entities("Botanical garden patterns")

        self.assertEqual(sanitized, "garden patterns")
        self.assertEqual(unchanged, "Botanical garden patterns")


if __name__ == "__main__":
    unittest.main()
