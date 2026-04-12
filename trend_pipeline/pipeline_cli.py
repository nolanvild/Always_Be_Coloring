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
    parser.add_argument(
        "--generate-previews",
        nargs="?",
        const=True,
        metavar="DATE",
        help=(
            "Generate placeholder SVG pages + Gumroad preview JSON "
            "for the given date (YYYY-MM-DD, defaults to today). "
            "Reads data/output/DATE_themes.json."
        ),
    )
    parser.add_argument(
        "--publish-previews",
        nargs="?",
        const=True,
        metavar="DATE",
        help=(
            "Publish draft Gumroad products from the preview JSON "
            "for the given date (YYYY-MM-DD, defaults to today). "
            "Requires GUMROAD_ACCESS_TOKEN in .env."
        ),
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

    elif args.generate_previews is not None:
        import config
        from datetime import date as _date
        from pathlib import Path
        from publishing import generate_previews

        # Resolve date + themes file
        date_str = None if args.generate_previews is True else args.generate_previews
        if date_str is None:
            date_str = _date.today().isoformat()

        themes_file = config.OUTPUT_DIR / f"{date_str}_themes.json"
        if not themes_file.exists():
            print(
                f"Themes file not found: {themes_file}\n"
                f"Run --run-now first to generate it."
            )
            sys.exit(1)

        print(f"Generating previews for {date_str} …\n")
        preview_path = generate_previews(themes_file, date_str)
        print(f"\nReview the preview file before publishing:\n  {preview_path}")

    elif args.publish_previews is not None:
        from datetime import date as _date
        from publishing import publish_previews

        date_str = None if args.publish_previews is True else args.publish_previews
        if date_str is None:
            date_str = _date.today().isoformat()

        print(f"Publishing Gumroad drafts for {date_str} …\n")
        try:
            published = publish_previews(date_str)
        except (FileNotFoundError, RuntimeError) as exc:
            print(f"Error: {exc}")
            sys.exit(1)

        if published:
            print(f"\nPublished {len(published)} product(s):")
            for name, url in published:
                print(f"  {name}  →  {url}")
        else:
            print("No new products published (already done or nothing to publish).")

    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
