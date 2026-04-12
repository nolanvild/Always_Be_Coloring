"""
trend_pipeline — autonomous coloring book idea generator.

Exposes run_pipeline() for integration with other modules in this repo.

Usage from repo root:
    uv run python main.py --run-now

Usage from another module:
    from trend_pipeline import run_pipeline
    out_path = run_pipeline()
"""
import sys
from pathlib import Path

# Allow bare imports (import config, from ingestion.xxx …) to resolve
# to files inside this package, regardless of caller working directory.
_HERE = Path(__file__).parent
if str(_HERE) not in sys.path:
    sys.path.insert(0, str(_HERE))

from scheduler.job_runner import run_pipeline, build_scheduler  # noqa: E402

__all__ = ["run_pipeline", "build_scheduler"]
