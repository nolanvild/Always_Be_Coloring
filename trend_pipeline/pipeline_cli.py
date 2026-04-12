"""
Entry point for the Autonomous Coloring Books trend pipeline.

Usage:
  python main.py --run-now          # Run the pipeline immediately
  python main.py --schedule         # Run daily at 06:00 UTC (blocking)
  python main.py --list-recent 7    # Show themes from the last N days
"""

import argparse
import sys


def main():
    parser = argparse.ArgumentParser(
        description="Autonomous Coloring Books — Trend Pipeline"
    )
    parser.add_argument(
        "--run-now",
        action="store_true",
        help="Run the full pipeline immediately",
    )
    parser.add_argument(
        "--schedule",
        action="store_true",
        help="Start the daily scheduler (blocking, fires at 06:00 UTC)",
    )
    parser.add_argument(
        "--list-recent",
        type=int,
        metavar="DAYS",
        help="List accepted themes from the last N days",
    )
    args = parser.parse_args()

    if args.run_now:
        from scheduler.job_runner import run_pipeline
        out = run_pipeline()
        if out:
            print(f"\nDone. Output: {out}")
        else:
            print("\nPipeline produced no output (check logs).")
            sys.exit(1)

    elif args.schedule:
        from scheduler.job_runner import build_scheduler
        scheduler = build_scheduler()
        print("Scheduler started — will run daily at 06:00 UTC. Press Ctrl+C to stop.")
        try:
            scheduler.start()
        except (KeyboardInterrupt, SystemExit):
            print("\nScheduler stopped.")

    elif args.list_recent is not None:
        import config
        from memory.memory_store import MemoryStore
        store  = MemoryStore(config.DB_PATH)
        themes = store.get_recent_themes(days=args.list_recent)
        store.close()
        if not themes:
            print(f"No themes found in the last {args.list_recent} days.")
        else:
            print(f"\n{'Date':<12} {'Score':>5}  {'Category':<16} Theme")
            print("-" * 70)
            for t in themes:
                date = t["created_at"][:10]
                print(f"{date:<12} {t['score']:>5}  {t['category']:<16} {t['theme_name']}")

    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
