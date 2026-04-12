"""
Autonomous Coloring Books — repo root entry point.

Delegates to the trend_pipeline package.  All pipeline code lives under
trend_pipeline/; data and logs write to data/ at the repo root.

Usage:
  uv run python main.py --run-now          # Run the pipeline immediately
  uv run python main.py --schedule         # Daily scheduler at 06:00 UTC
  uv run python main.py --list-recent 7    # Themes from last N days
"""
import sys
from pathlib import Path

# Register trend_pipeline/ on sys.path so bare imports resolve correctly
# (import config, from ingestion.xxx …)
_pipeline_dir = Path(__file__).parent / "trend_pipeline"
if str(_pipeline_dir) not in sys.path:
    sys.path.insert(0, str(_pipeline_dir))

from pipeline_cli import main  # noqa: E402

if __name__ == "__main__":
    main()
