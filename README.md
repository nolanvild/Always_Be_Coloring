# Autonomous Coloring Books

always-be-coloring.vercel.app

`integration-recraft-web` keeps the Next.js website from `origin/main`, uses `pnpm` for Node tooling, and consumes trend-pipeline output for the first live Recraft generation flow.

## Node App

```bash
pnpm install
pnpm dev
pnpm build
```

Create `.env.local` from `.env.local.example` and set `RECRAFT_API_KEY` for `/api/convert`.

## Trend Pipeline

```bash
uv sync
uv run python -m spacy download en_core_web_sm
uv run python main.py --run-now
uv run python main.py --list-recent 7
```

The pipeline can run without `en_core_web_sm`, but it will log a warning and use degraded NLP behavior. Installing the model keeps noun-phrase extraction and IP sanitization fully enabled.

The pipeline writes JSON files under `data/output/`. The business-theme UI reads those files through `/api/themes`; it does not run the pipeline inline.
