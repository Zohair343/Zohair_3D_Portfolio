"""Vercel function: /api/health — a Flask (WSGI) app named `app`."""
import os
import sys

# Make backend/ importable no matter how the platform loads this file.
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "backend"))

from app import health, make_function_app  # noqa: E402

app = make_function_app(health, ["GET"])
