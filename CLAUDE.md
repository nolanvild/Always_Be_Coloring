# Autonomous Coloring Books — Agent Context

## What this repo does

Daily pipeline that turns trending news/social data into ranked coloring book theme ideas. No LLM involved — pure rule-based signal processing. Output is a structured JSON file for human or downstream-agent review.

**Pipeline stages (in order):**
RSS feeds → Reddit → Google Trends → normalize (spaCy NLP) → group by concept (Jaccard) → qualify trends → dedup (SQLite) → content filter (blocklists) → IP sanitizer (spaCy NER) → generalize concept (rule table) → build theme → score (0-100) → write JSON

## How to run

```bash
# Install deps (one-time)
uv sync

# Run immediately
uv run python main.py --run-now

# List themes from last 7 days
uv run python main.py --list-recent 7

# Start daily scheduler (06:00 UTC, blocking)
uv run python main.py --schedule
```

**Required for Reddit:** copy `.env.example` to `.env` and fill in `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET`. Without it the pipeline still runs on RSS only.

## Integrate from another module

```python
# Option A: import and call directly
from trend_pipeline import run_pipeline
out_path = run_pipeline()   # returns path to today's JSON, or "" on failure

# Option B: read the latest output file
import json, pathlib
output_dir = pathlib.Path("data/output")
latest = sorted(output_dir.glob("*_themes.json"))[-1]
with open(latest, encoding="utf-8") as f:
    data = json.load(f)
themes = data["themes"]   # list of theme dicts — see schema below
```

## Output JSON schema

File: `data/output/YYYY-MM-DD_themes.json`

```
{
  "run_metadata": {
    "run_id":           string (uuid4),
    "run_timestamp":    ISO-8601,
    "sources_active":   ["rss", "reddit", "google_trends"],
    "sources_failed":   [],
    "total_candidates": int,
    "total_accepted":   int,
    "total_rejected":   int,
    "twitter_available": bool
  },

  "run_summary": {
    "themes_ranked": [
      {
        "rank": 1,
        "theme_name": "Space Exploration",
        "category": "space",
        "coloring_book_score": 78,
        "high_priority": false,
        "review_required": false,
        "key_strengths": ["visual_richness", "line_art_suitability"],
        "improvement_opportunities": ["page_variety", "trend_relevance"]
      }
    ],
    "score_spread":               { "highest": 78, "lowest": 70, "mean": 74.4 },
    "primary_score_differentiator": "line_art_suitability",
    "dimension_variance":          { "visual_richness": 0.0, ... },
    "session_notes":               "plain-English notes about this run's limitations"
  },

  "themes": [
    {
      "theme_id":           string (uuid4),
      "theme_name":         "Space Exploration",
      "description":        "2-3 sentence visual scope",
      "category":           "space",
      "raw_concept":        "artemis ii return",   // original trend text for audit
      "source_signals": {
        "rss":          { "present": true, "article_count": 10, "feed_sources": [...], "headline_sample": "..." },
        "reddit":       { "present": false },
        "google_trends":{ "present": false },
        "twitter":      { "present": false, "available": false }
      },
      "trending_reason":    "appeared in 6 sources",
      "target_audience":    "children_9_12",
      "coloring_book_score": 78,
      "score_breakdown": {
        "visual_richness":      25.0,   // /25
        "page_variety":          7.5,   // /20
        "audience_clarity":     15.0,   // /15
        "line_art_suitability": 18.0,   // /20
        "trend_relevance":       4.8,   // /12  (low when only RSS active)
        "safety_score":          8.0    // /8
      },
      "page_ideas":   ["A sea turtle swimming through kelp...", ...],  // 8 ideas
      "safety_notes": [],
      "review_required": false,
      "high_priority":   false,
      "created_at":      ISO-8601,

      "analysis": {
        "why_trending":      "plain-English explanation of trend signals",
        "why_coloring_book": "plain-English explanation of visual/artistic suitability",
        "score_rationale": {
          "visual_richness":      { "score": 25.0, "max": 25.0, "pct": 100.0, "summary": "..." },
          "page_variety":         { ... },
          "audience_clarity":     { ... },
          "line_art_suitability": { ... },
          "trend_relevance":      { ... },
          "safety_score":         { ... }
        },
        "key_strengths":             ["visual_richness", ...],
        "improvement_opportunities": ["page_variety", "trend_relevance"]
      }
    }
  ]
}
```

## Key thresholds (all in `trend_pipeline/config.py`)

| Config key | Default | Effect |
|---|---|---|
| `MIN_SCORE_THRESHOLD` | 55 | Themes below this are dropped entirely |
| `REVIEW_REQUIRED_SCORE` | 59 | Themes 55-59 get `review_required: true` |
| `HIGH_PRIORITY_SCORE` | 80 | Themes >= 80 get `high_priority: true` |
| `TREND_MIN_SOURCE_COUNT` | 2 | Minimum distinct feeds/sources to qualify a trend |
| `DEDUP_SIMILARITY_THRESHOLD` | 0.45 | Jaccard threshold: above this = duplicate, skip |
| `DEDUP_LOOKBACK_DAYS` | 30 | How far back dedup checks SQLite memory |
| `FILTER_REJECT_CONFIDENCE` | 0.6 | Content filter confidence >= this = reject |

## Data paths (relative to repo root)

```
data/
  memory.db          SQLite dedup store (themes + run_log tables)
  pipeline.log       Rotating log, max 10 MB
  output/
    YYYY-MM-DD_themes.json    One file per day (overwritten on re-run)
```

## Current source status

| Source | Status | Notes |
|---|---|---|
| RSS (6 feeds) | Active | BBC Top, BBC Science, NBC, ABC, NASA, Smithsonian |
| RSS (2 feeds) | Failing | Reuters, AP News (DNS issues — feed URLs may have changed) |
| Reddit | Inactive | Needs `REDDIT_CLIENT_ID` + `REDDIT_CLIENT_SECRET` in `.env` |
| Google Trends | Failing | `trending_searches` endpoint returning 404 (Google-side issue) |
| Twitter | Inactive | Optional; needs `TWITTER_BEARER_TOKEN` |

**RSS-only operation produces ~5 themes/run.** With Reddit active, expect 15-30.

## Score dimensions explained

| Dimension | Max | What drives it |
|---|---|---|
| `visual_richness` | 25 | Diversity of visual types across page ideas (landscapes, creatures, vehicles...) |
| `page_variety` | 20 | Raw count of page ideas; 10+ hits the sweet spot |
| `audience_clarity` | 15 | Specificity of `target_audience` (`children_9_12` = 15, `general` = 7) |
| `line_art_suitability` | 20 | Category-level rating: animals/ocean/nature = 20, technology = 12, general = 8 |
| `trend_relevance` | 12 | `(aggregate_trend_score / 100) * 12`; low when only RSS active |
| `safety_score` | 8 | Starts at 8; -2 per content safety flag |

## Content filtering

Five blocklist categories (in `trend_pipeline/filtering/blocklists/`):
- `political_terms.txt` — elections, politicians, policy debates, geopolitics
- `violent_terms.txt` — weapons, war, crime
- `religious_terms.txt` — denominational content
- `celebrity_names.txt` — named individuals (public figures)
- `brand_names.txt` — trademarked products and companies

Confidence >= 0.6 = reject. Confidence 0.3-0.59 = flag (`safety_notes`).

## Generalization rules

`trend_pipeline/config/generalization_rules.json` — 25 rules mapping keyword sets to abstract themes (e.g. `["rocket", "orbit", "launch"]` → "space exploration" / "space"). Extend this file to improve coverage for new topic areas.

## Extending the pipeline

- **New RSS feed:** add to `RSS_FEEDS` in `config.py`
- **New generalization rule:** append to `config/generalization_rules.json`
- **New page idea templates:** append to `config/page_idea_templates.json`
- **New blocklist entry:** add a line to the relevant `.txt` file in `filtering/blocklists/`
- **New data source:** implement `BaseIngester` from `trend_pipeline/ingestion/base_ingester.py` and add to `job_runner.py` Stage 1
