"""Server configuration, read from environment variables (see .env.example)."""
import os
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT / ".env")


def _bool(name: str, default: bool = False) -> bool:
    return os.getenv(name, str(default)).strip().lower() in {"1", "true", "yes", "on"}


APP_ENV = os.getenv("APP_ENV", "development")
IS_PROD = APP_ENV == "production"

CONTENT_DIR = Path(os.getenv("CONTENT_DIR", ROOT.parent / "content"))
INDEX_DIR = Path(os.getenv("INDEX_DIR", ROOT / "index"))
FRONTEND_DIST = Path(os.getenv("FRONTEND_DIST", ROOT.parent / "frontend" / "dist"))
PUBLIC_SITE_URL = os.getenv("PUBLIC_SITE_URL", "").rstrip("/")

ALLOWED_ORIGINS = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()]
TRUST_PROXY = _bool("TRUST_PROXY", False)

# --- RAG / chat ---
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "gemini")            # gemini | anthropic
EMBED_PROVIDER = os.getenv("EMBED_PROVIDER", "gemini")        # gemini | local
GEMINI_CHAT_MODEL = os.getenv("GEMINI_CHAT_MODEL", "gemini-3.8-flash")
# Tried in order when the main model is overloaded or unavailable (comma-separated; empty = none).
GEMINI_TIMEOUT_MS = int(os.getenv("GEMINI_TIMEOUT_MS", "10000"))  # per request; fails fast so fallbacks get a turn
GEMINI_FALLBACK_MODELS = [m.strip() for m in os.getenv("GEMINI_FALLBACK_MODELS", "gemini-3.5-flash-lite").split(",") if m.strip()]
GEMINI_EMBED_MODEL = os.getenv("GEMINI_EMBED_MODEL", "gemini-embedding-001")
EMBED_DIM = int(os.getenv("EMBED_DIM", "768"))
EMBED_MODEL = os.getenv("EMBED_MODEL", "BAAI/bge-small-en-v1.5")  # local provider only
EMBED_CACHE = os.getenv("EMBED_CACHE", str(ROOT / ".model-cache"))
CHAT_MODEL = os.getenv("CHAT_MODEL", "claude-opus-5-5")
CHAT_EFFORT = os.getenv("CHAT_EFFORT", "low")
CHAT_FALLBACKS = _bool("CHAT_FALLBACKS", True)
# Pinned explicitly so the app never inherits an unrelated ANTHROPIC_BASE_URL.
CHAT_API_BASE_URL = os.getenv("CHAT_API_BASE_URL", "https://api.anthropic.com")
CHAT_TIMEOUT_S = float(os.getenv("CHAT_TIMEOUT_S", "45"))
RETRIEVE_K = int(os.getenv("RETRIEVE_K", "6"))
CHAT_RATE = (int(os.getenv("CHAT_RATE_MAX", "20")), int(os.getenv("CHAT_RATE_WINDOW_S", "600")))

# --- Contact ---
CONTACT_TO_EMAIL = os.getenv("CONTACT_TO_EMAIL", "")
MAIL_FROM = os.getenv("MAIL_FROM", "")
EMAIL_PROVIDER = os.getenv("EMAIL_PROVIDER", "dev-log")  # smtp | resend | dev-log
SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_SECURITY = os.getenv("SMTP_SECURITY", "starttls")  # starttls | ssl
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
# Shared rate limiting for serverless (optional; falls back to per-process memory)
UPSTASH_URL = os.getenv("UPSTASH_REDIS_REST_URL", "").rstrip("/")
UPSTASH_TOKEN = os.getenv("UPSTASH_REDIS_REST_TOKEN", "")
# On serverless only /tmp is writable: cache a rebuilt index there.
INDEX_CACHE_DIR = Path(os.getenv("INDEX_CACHE_DIR", "/tmp/playable-pages-index"))
# Letters actually handed to the mail service, per IP (failed/invalid attempts don't count)…
CONTACT_RATE = (int(os.getenv("CONTACT_RATE_MAX", "5")), int(os.getenv("CONTACT_RATE_WINDOW_S", "3600")))
# …and a looser cap on every attempt, so nobody can hammer the endpoint.
CONTACT_ATTEMPT_RATE = (int(os.getenv("CONTACT_ATTEMPT_MAX", "30")), int(os.getenv("CONTACT_RATE_WINDOW_S", "3600")))
