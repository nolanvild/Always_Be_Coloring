# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo does

Hybrid app: a **Next.js web UI** where users generate and purchase custom coloring PDFs, backed by an **autonomous Python pipeline** that runs daily (06:00 UTC) to surface trending coloring-book themes. The pipeline is rule-based (no LLM). The frontend consumes pipeline output via `/api/themes`.

**User flow:** Landing → pick creation mode (trending theme / image search / upload) → preview generated pages → Stripe payment → download PDF

**Generation:** Recraft API converts prompts or source images into printable black-and-white line art.

## Commands

### Frontend (Next.js)

```bash
pnpm install        # install deps
pnpm dev            # dev server at localhost:3000
pnpm build          # production build
pnpm lint           # ESLint
```

Requires `.env.local` (copy from `.env.local.example`). Key vars: `RECRAFT_API_KEY`, `STRIPE_PUBLIC_KEY`, `STRIPE_SECRET_KEY`, `AUTH_SECRET`.

### Python pipeline

```bash
uv sync                                            # install deps
uv run python -m spacy download en_core_web_sm    # one-time NLP model install
uv run python main.py --run-now                   # run pipeline immediately
uv run python main.py --list-recent 7             # show last 7 days of output
uv run python main.py --schedule                  # start daily scheduler (blocking)
```

Requires `.env` (copy from `.env.example`) for Reddit credentials. Pipeline runs RSS-only without them (~5 themes/run vs 15-30 with Reddit).

### Tests

```bash
cd tests/
uv run python -m pytest test_job_runner_smoke.py  # pipeline smoke test
uv run python -m pytest test_normalizer.py        # NLP normalizer
uv run python -m pytest test_nlp_runtime.py       # spaCy runtime
uv run python -m pytest test_ip_sanitizer.py      # IP sanitizer
```

## Architecture

### Frontend (`src/`)

**State:** Single Zustand store (`src/store/useColorBookStore.ts`) holds the entire order lifecycle: selected images → coloring pages → plan → payment intent → download URL. Max 10 images selectable.

**Three creation modes:**
- `src/app/create/business/` — picks a trending theme from pipeline JSON output, generates via Recraft text-to-image
- `src/app/create/search/` — searches for images, generates via Recraft image-to-image
- `src/app/create/upload/` — user uploads image, generates via Recraft image-to-image

**API routes** (`src/app/api/`):
- `/api/convert` — calls Recraft to generate coloring pages
- `/api/themes` — reads pipeline JSON files from `data/output/` (does NOT run pipeline inline)
- `/api/search` — image search
- `/api/upload` — image upload processing
- `/api/stripe/` — payment intent creation + webhook
- `/api/download` — PDF download handler

**Auth:** NextAuth.js (JWT). Middleware at `src/middleware.ts` protects `/create`, `/preview`, `/payment`, `/download`.

**Recraft integration** (`src/lib/server/recraft.ts`):
- `generateBusinessColoringPage()` — text-to-image for pipeline themes
- `generateSearchColoringPage()` — image-to-image for search/upload modes
- Two art profiles: `children_line_art` (bold contours) and `adult_engraving` (finer detail)
- All Recraft calls are server-only (`import "server-only"`)

### Python pipeline (`trend_pipeline/`)

**8 stages in order:**

| Stage | Module | Purpose |
|---|---|---|
| 1. Ingest | `ingestion/` | RSS, Reddit, Google Trends, Twitter |
| 2. Normalize | `processing/normalizer.py` | spaCy NLP noun-phrase extraction |
| 3. Qualify | `processing/trend_detector.py` | Threshold-based trend filtering |
| 4. Dedup | `memory/memory_store.py` | SQLite Jaccard-similarity check |
| 5. Filter | `filtering/content_filter.py` | Blocklist matching (5 categories) |
| 6. Sanitize | `transformation/ip_sanitizer.py` | Remove PII via spaCy NER |
| 7. Generalize | `transformation/concept_generalizer.py` | Keyword → abstract theme mapping |
| 8. Build+Score | `transformation/theme_builder.py` + `scoring/` | Construct theme objects, score 0-100 |

**All config thresholds in `trend_pipeline/config.py`.** Key values:
- `MIN_SCORE_THRESHOLD = 55` — themes below this are dropped
- `DEDUP_SIMILARITY_THRESHOLD = 0.45` — Jaccard threshold for duplicate detection
- `TREND_MIN_SOURCE_COUNT = 2` — minimum distinct feeds to qualify

**Static data files** (edit these to extend behavior):
- `trend_pipeline/config/generalization_rules.json` — 25 keyword→theme mappings
- `trend_pipeline/config/page_idea_templates.json` — 500+ page description templates
- `trend_pipeline/filtering/blocklists/*.txt` — content filter word lists

**Output:** `data/output/YYYY-MM-DD_themes.json` — one file per day, overwritten on re-run. `data/memory.db` — SQLite dedup store.

### Data flow between halves

```
Python pipeline → data/output/YYYY-MM-DD_themes.json
                           ↓
            src/lib/server/trend-themes.ts  (reads files)
                           ↓
                    /api/themes  (serves to frontend)
                           ↓
              src/app/create/business/  (displays themes)
```

## Extending the pipeline

- **New RSS feed:** add to `RSS_FEEDS` in `config.py`
- **New generalization rule:** append to `config/generalization_rules.json`
- **New page idea templates:** append to `config/page_idea_templates.json`
- **New blocklist entry:** add a line to the relevant `.txt` file in `filtering/blocklists/`
- **New data source:** implement `BaseIngester` from `trend_pipeline/ingestion/base_ingester.py` and add to `job_runner.py` Stage 1

## Current source status

| Source | Status | Notes |
|---|---|---|
| RSS (6 feeds) | Active | BBC Top, BBC Science, NBC, ABC, NASA, Smithsonian |
| RSS (2 feeds) | Failing | Reuters, AP News (DNS issues) |
| Reddit | Inactive | Needs `REDDIT_CLIENT_ID` + `REDDIT_CLIENT_SECRET` in `.env` |
| Google Trends | Failing | `trending_searches` endpoint returning 404 (Google-side issue) |
| Twitter | Inactive | Optional; needs `TWITTER_BEARER_TOKEN` |

## Stripe test cards

Use test keys in `.env.local`. On the payment page, a test helper panel shows card numbers.

- Success: `4242 4242 4242 4242`
- Generic decline: `4000 0000 0000 0002`
- Insufficient funds: `4000 0000 0000 9995`

Use any future expiry (e.g., `12/34`) and any 3-digit CVC.
