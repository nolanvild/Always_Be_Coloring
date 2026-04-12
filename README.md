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

## Stripe Test Mode

Use Stripe test keys in `.env.local` and run the app locally. On the payment page, the test helper panel lists fake card numbers you can paste into Stripe Elements.

Common cards:
- Success: `4242 4242 4242 4242`
- Generic decline: `4000 0000 0000 0002`
- Insufficient funds: `4000 0000 0000 9995`
- Incorrect CVC: `4000 0000 0000 0127`

Use any future expiry, such as `12/34`, and any 3-digit CVC unless you are testing a specific CVC case. Official reference: https://docs.stripe.com/testing
