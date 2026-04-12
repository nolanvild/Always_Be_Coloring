from __future__ import annotations

import sys
import unittest
from pathlib import Path
from unittest import mock

PIPELINE_DIR = Path(__file__).resolve().parents[1] / "trend_pipeline"
if str(PIPELINE_DIR) not in sys.path:
    sys.path.insert(0, str(PIPELINE_DIR))

import nlp_runtime


class NLPRuntimeTests(unittest.TestCase):
    def setUp(self) -> None:
        nlp_runtime._reset_state_for_tests()

    def tearDown(self) -> None:
        nlp_runtime._reset_state_for_tests()

    def test_missing_model_is_cached_and_warns_once(self) -> None:
        with mock.patch(
            "nlp_runtime._load_nlp_model",
            side_effect=OSError("missing model"),
        ) as load_model:
            with self.assertLogs("nlp_runtime", level="WARNING") as logs:
                first = nlp_runtime.get_nlp()
                second = nlp_runtime.get_nlp()

        self.assertIsNone(first)
        self.assertIsNone(second)
        self.assertEqual(load_model.call_count, 1)
        self.assertEqual(len(logs.output), 1)
        self.assertIn("degraded NLP mode", logs.output[0])


if __name__ == "__main__":
    unittest.main()
