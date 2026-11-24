"""Vercel function: /api/contact — a Flask (WSGI) app named `app`."""
import os
import sys

# Make backend/ importable no matter how the platform loads this file.
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "backend"))

from app import contact_route, make_function_app  # noqa: E402

app = make_function_app(contact_route, ["POST"])
