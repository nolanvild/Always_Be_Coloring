import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# ─── Paths ────────────────────────────────────────────────────────────────────
PIPELINE_DIR  = Path(__file__).parent          # trend_pipeline/
BASE_DIR      = PIPELINE_DIR.parent            # repo root  (data, logs live here)
DATA_DIR      = BASE_DIR / "data"
OUTPUT_DIR    = DATA_DIR / "output"
DB_PATH       = str(DATA_DIR / "memory.db")
LOG_FILE      = str(DATA_DIR / "pipeline.log")
BLOCKLIST_DIR = PIPELINE_DIR / "filtering" / "blocklists"
CONFIG_DIR    = PIPELINE_DIR / "config"

# Auto-create required directories
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
DATA_DIR.mkdir(parents=True, exist_ok=True)

# ─── Reddit Credentials ───────────────────────────────────────────────────────
REDDIT_CLIENT_ID     = os.getenv("REDDIT_CLIENT_ID", "")
REDDIT_CLIENT_SECRET = os.getenv("REDDIT_CLIENT_SECRET", "")
REDDIT_USER_AGENT    = os.getenv("REDDIT_USER_AGENT", "coloring_book_pipeline/1.0 by nolanvild")

# ─── Twitter (optional) ───────────────────────────────────────────────────────
TWITTER_BEARER_TOKEN = os.getenv("TWITTER_BEARER_TOKEN", "")

# ─── Ingestion: Reddit ────────────────────────────────────────────────────────
REDDIT_SUBREDDITS = [
    "popular", "todayilearned", "mildlyinteresting", "science", "space",
    "NatureIsFuckingLit", "EarthPorn", "DIY", "Art", "crafts",
    "food", "gardening", "Cooking", "travel", "hiking",
    "animals", "aww", "interestingasfuck", "Damnthatsinteresting", "LifeProTips",
]
REDDIT_POSTS_PER_SUB   = 25
REDDIT_SLEEP_BETWEEN_S = 1.0

# ─── Ingestion: Google Trends ─────────────────────────────────────────────────
PYTRENDS_GEO          = "US"
PYTRENDS_TIMEFRAME    = "today 3-m"
PYTRENDS_SLEEP_S      = 60      # Between interest_over_time calls (throttle avoidance)
PYTRENDS_MAX_KEYWORDS = 5       # Google hard limit per build_payload()

# ─── Ingestion: RSS Feeds ─────────────────────────────────────────────────────
RSS_FEEDS = {
    "bbc_top":     "http://feeds.bbci.co.uk/news/rss.xml",
    "bbc_science": "http://feeds.bbci.co.uk/news/science_and_environment/rss.xml",
    "reuters":     "https://feeds.reuters.com/reuters/topNews",
    "ap_news":     "https://feeds.apnews.com/rss/apf-topnews",
    "nbc_news":    "https://feeds.nbcnews.com/nbcnews/public/news",
    "abc_news":    "https://abcnews.go.com/abcnews/topstories",
    "nasa":        "https://www.nasa.gov/rss/dyn/breaking_news.rss",
    "smithsonian": "https://www.smithsonianmag.com/rss/latest_articles/",
}
RSS_ENTRIES_PER_FEED = 30
RSS_TIMEOUT_S        = 15

# ─── Trend Detection Thresholds ───────────────────────────────────────────────
TREND_MIN_SOURCE_COUNT = 2      # Qualifies if seen in this many distinct sources (feeds count individually)
TREND_SPIKE_THRESHOLD  = 70     # Google Trends index value to trigger spike detection
TREND_SPIKE_RATIO      = 2.5    # Current / mean_30d must exceed this to confirm spike
TREND_SUSTAINED_WEEKS  = 2      # Minimum consecutive weeks above interest floor
TREND_INTEREST_FLOOR   = 35     # Google index minimum for "sustained" counting
TREND_TOP_CANDIDATES   = 50     # Maximum candidates passed downstream

# ─── Deduplication ────────────────────────────────────────────────────────────
DEDUP_SIMILARITY_THRESHOLD = 0.45   # Jaccard threshold: above this = duplicate
DEDUP_LOOKBACK_DAYS        = 30     # Days to look back when checking for duplicates

# ─── Content Filtering ────────────────────────────────────────────────────────
FILTER_REJECT_CONFIDENCE = 0.6      # Confidence >= this → reject candidate
FILTER_FLAG_CONFIDENCE   = 0.3      # Confidence >= this → flag for human review
FILTER_EXACT_WEIGHT      = 0.35     # Confidence increment per exact match
FILTER_PARTIAL_WEIGHT    = 0.15     # Confidence increment per partial match

# ─── Scoring Thresholds ───────────────────────────────────────────────────────
MIN_SCORE_THRESHOLD   = 55      # Below this → excluded from output (general-category junk tends to score ~50)
REVIEW_REQUIRED_SCORE = 59      # Below this (and >= MIN) → review_required: true
HIGH_PRIORITY_SCORE   = 80      # Above this → high_priority: true

# ─── Scheduler ────────────────────────────────────────────────────────────────
SCHEDULE_HOUR           = 6     # UTC hour to run daily
SCHEDULE_MINUTE         = 0
SCHEDULER_MISFIRE_GRACE = 3600  # Run up to 1 hour late if missed

# ─── Logging ─────────────────────────────────────────────────────────────────
LOG_LEVEL        = os.getenv("LOG_LEVEL", "INFO")
LOG_MAX_BYTES    = 10 * 1024 * 1024  # 10 MB
LOG_BACKUP_COUNT = 5

# ─── NLP ─────────────────────────────────────────────────────────────────────
SPACY_MODEL = "en_core_web_sm"
