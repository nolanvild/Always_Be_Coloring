"""
Publishing module — generates placeholder SVG coloring pages, bundles them
into per-theme ZIPs, writes a human-reviewable Gumroad preview JSON, and
(on demand) publishes draft products to Gumroad.

Public API
----------
generate_previews(themes_path, date_str=None)
    Read a themes JSON file, generate SVG placeholders + ZIPs, write preview JSON.
    Returns the path to the preview JSON file.

publish_previews(date_str=None)
    Read the preview JSON for the given date and push each un-published product
    to Gumroad as a draft. Updates the preview JSON with returned IDs/URLs.
    Returns a list of (theme_name, gumroad_url) tuples.
"""

from .gumroad_preview import generate_previews
from .gumroad_publisher import publish_previews

__all__ = ["generate_previews", "publish_previews"]
