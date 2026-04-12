"""
Publishes draft Gumroad products from a preview JSON.

For each product entry where ``gumroad_product_id`` is null:
  1. POST /v2/products          → create draft product (published=false)
  2. POST /v2/products/:id/files → attach ZIP file
  3. Write back product ID, short URL, and timestamp to preview JSON

Requires ``GUMROAD_ACCESS_TOKEN`` in environment / .env.

Gumroad API reference: https://app.gumroad.com/api
"""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path


def publish_previews(date_str: str | None = None) -> list[tuple[str, str]]:
    """
    Read the preview JSON for *date_str* (defaults to today) and push each
    un-published product to Gumroad as an unpublished draft.

    Returns
    -------
    List of (theme_name, gumroad_url) for every product published this call.

    Raises
    ------
    FileNotFoundError   if the preview JSON for the date does not exist.
    RuntimeError        if GUMROAD_ACCESS_TOKEN is not set.
    """
    try:
        import config as cfg
    except ImportError:
        _pkg_root = Path(__file__).parent.parent.parent
        sys.path.insert(0, str(_pkg_root / "trend_pipeline"))
        import config as cfg

    if not cfg.GUMROAD_ACCESS_TOKEN:
        raise RuntimeError(
            "GUMROAD_ACCESS_TOKEN is not set. "
            "Add it to your .env file and try again."
        )

    if date_str is None:
        from datetime import date
        date_str = date.today().isoformat()

    preview_path = cfg.PREVIEWS_DIR / f"{date_str}_gumroad_preview.json"
    if not preview_path.exists():
        raise FileNotFoundError(
            f"Preview file not found: {preview_path}\n"
            f"Run --generate-previews {date_str} first."
        )

    with open(preview_path, encoding="utf-8") as f:
        preview = json.load(f)

    published: list[tuple[str, str]] = []

    for product in preview["products"]:
        if product.get("gumroad_product_id"):
            print(f"  [publish] SKIP (already published): {product['theme_name']}")
            continue

        try:
            product_id, short_url = _create_product(product, cfg.GUMROAD_ACCESS_TOKEN)
        except Exception as exc:
            print(f"  [publish] FAIL {product['theme_name']}: {exc}", file=sys.stderr)
            continue

        # Save ID immediately so a re-run never creates a duplicate product
        product["gumroad_product_id"] = product_id
        product["gumroad_url"]        = short_url
        product["published_at"]       = datetime.now(timezone.utc).isoformat()
        product["file_attached"]      = False

        # Persist after each product so partial runs are recoverable
        with open(preview_path, "w", encoding="utf-8") as f:
            json.dump(preview, f, indent=2, ensure_ascii=False)

        # File upload is best-effort — Gumroad's /files endpoint is unreliable;
        # if it fails the product listing is still created and the ZIP path is
        # recorded in the preview JSON for manual upload via the dashboard.
        try:
            _attach_file(product_id, product["zip_path"], cfg.GUMROAD_ACCESS_TOKEN)
            product["file_attached"] = True
            with open(preview_path, "w", encoding="utf-8") as f:
                json.dump(preview, f, indent=2, ensure_ascii=False)
        except Exception as exc:
            print(
                f"  [publish] WARNING: file attach failed for {product['theme_name']} — "
                f"upload manually via Gumroad dashboard.\n"
                f"    ZIP: {product['zip_path']}\n"
                f"    Reason: {exc}",
                file=sys.stderr,
            )

        published.append((product["theme_name"], short_url))
        print(f"  [publish] OK  {product['theme_name']}  →  {short_url}")

    return published


# ── Gumroad API helpers ───────────────────────────────────────────────────────

_GUMROAD_API = "https://api.gumroad.com/v2"


def _create_product(product: dict, token: str) -> tuple[str, str]:
    """
    POST /v2/products — create a draft (unpublished) product.

    Returns (product_id, short_url).
    """
    import requests

    resp = requests.post(
        f"{_GUMROAD_API}/products",
        data={
            "access_token": token,
            "name":         product["theme_name"],
            "price":        product["price_cents"],
            "description":  product["description"],
            "published":    "false",
        },
        timeout=30,
    )
    _check_response(resp, "create product")
    data = resp.json()["product"]
    return data["id"], data["short_url"]


def _attach_file(product_id: str, zip_path: str, token: str) -> None:
    """
    POST /v2/products/:id/files — upload ZIP as the product file.
    """
    import requests

    zip_file = Path(zip_path)
    if not zip_file.exists():
        raise FileNotFoundError(f"ZIP not found: {zip_path}")

    with open(zip_file, "rb") as fh:
        resp = requests.post(
            f"{_GUMROAD_API}/products/{product_id}/files",
            data={"access_token": token},
            files={"file": (zip_file.name, fh, "application/zip")},
            timeout=120,
        )
    _check_response(resp, "attach file")


def _check_response(resp, action: str) -> None:
    try:
        body = resp.json()
    except Exception:
        body = {"message": resp.text}

    if not body.get("success", True) or resp.status_code >= 400:
        msg = body.get("message", resp.text)
        raise RuntimeError(f"Gumroad {action} failed ({resp.status_code}): {msg}")
