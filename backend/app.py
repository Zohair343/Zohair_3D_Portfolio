"""Playable Pages API (chat + contact) and, when built, the static frontend."""
from __future__ import annotations

import logging
import threading

from flask import Flask, jsonify, request, send_from_directory
from werkzeug.exceptions import HTTPException

import config
import mailer as contact  # backend/mailer.py; not to be confused with api/contact.py
import rag
from ratelimit import make_limiter

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("app")

app = Flask(__name__, static_folder=None)
app.config["MAX_CONTENT_LENGTH"] = 32 * 1024
chat_limiter = make_limiter(*config.CHAT_RATE, prefix="chat")
contact_limiter = make_limiter(*config.CONTACT_RATE, prefix="contact")
contact_attempts = make_limiter(*config.CONTACT_ATTEMPT_RATE, prefix="contact-attempt")


def client_ip() -> str:
    if config.TRUST_PROXY:
        fwd = request.headers.get("X-Forwarded-For", "")
        if fwd:
            return fwd.split(",")[0].strip()
    return request.remote_addr or "unknown"


def err(code: str, message: str, status: int, **extra):
    return jsonify({"error": code, "message": message, **extra}), status


@app.after_request
def headers(resp):
    origin = request.headers.get("Origin")
    if origin and origin in config.ALLOWED_ORIGINS and request.path.startswith("/api/"):
        resp.headers["Access-Control-Allow-Origin"] = origin
        resp.headers["Vary"] = "Origin"
        resp.headers["Access-Control-Allow-Headers"] = "Content-Type"
        resp.headers["Access-Control-Allow-Methods"] = "POST, GET, OPTIONS"
    resp.headers.setdefault("X-Content-Type-Options", "nosniff")
    resp.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    resp.headers.setdefault("X-Frame-Options", "DENY")
    if request.path.startswith("/api/"):
        resp.headers["Cache-Control"] = "no-store"
    return resp


@app.errorhandler(HTTPException)
def http_error(e: HTTPException):
    if request.path.startswith("/api/"):
        return err("http_error", e.description or e.name, e.code or 500)
    return e


@app.route("/api/<path:_any>", methods=["OPTIONS"])
def preflight(_any):
    return ("", 204)


@app.get("/api/health")
def health():
    ok_mail, why = contact.is_configured()
    try:
        idx = rag.get_index()
        index = {"ok": True, "chunks": idx.meta["count"], "content_hash": idx.meta["content_hash"], "embed_model": idx.meta["embed_model"], "source": idx.source}
    except rag.ProviderUnavailable as e:
        index = {"ok": False, "reason": e.code}
    except Exception as e:  # noqa: BLE001
        index = {"ok": False, "reason": type(e).__name__}
    import os
    return jsonify({
        "env": config.APP_ENV, "index": index,
        "chat": {"provider": config.LLM_PROVIDER, "model": config.GEMINI_CHAT_MODEL if config.LLM_PROVIDER == "gemini" else config.CHAT_MODEL,
                 "configured": bool(os.getenv("GEMINI_API_KEY") if config.LLM_PROVIDER == "gemini" else os.getenv("ANTHROPIC_API_KEY"))},
        "rate_limit": "upstash" if (config.UPSTASH_URL and config.UPSTASH_TOKEN) else "memory",
        "contact": {"provider": config.EMAIL_PROVIDER, "configured": ok_mail, **({"reason": why} if not ok_mail else {})},
    })


@app.post("/api/chat")
def chat():
    allowed, retry = chat_limiter.check(client_ip())
    if not allowed:
        return err("rate_limited", f"Too many questions in a short time. Try again in {retry} seconds.", 429)
    body = request.get_json(silent=True) or {}
    q = body.get("question")
    if not isinstance(q, str) or not q.strip():
        return err("invalid_question", "Please type a question.", 400)
    if len(q) > 500:
        return err("invalid_question", "Please keep questions under 500 characters.", 400)
    history = body.get("history") if isinstance(body.get("history"), list) else []
    try:
        result = rag.answer(q.strip(), history[-6:])
    except rag.ProviderUnavailable as e:
        log.warning("chat unavailable: %s", e.code)
        return err(e.code, e.message, e.status)
    except FileNotFoundError:
        return err("index_missing", "The knowledge index hasn’t been built on this server.", 503)
    result.pop("retrieved", None)
    return jsonify(result)


@app.post("/api/contact")
def contact_route():
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return jsonify({"ok": False, "message": "Send the form as JSON."}), 400
    ip = client_ip()
    allowed, retry = contact_attempts.check(ip)
    if not allowed:
        return jsonify({"ok": False, "message": f"Too many attempts from this connection. Try again in about {max(1, retry // 60)} minutes."}), 429
    if str(body.get("website", "")).strip():
        # Honeypot filled: answer like a success without sending, so bots learn nothing.
        log.info("contact honeypot triggered")
        return jsonify({"ok": True, "delivered": True, "mode": "filtered", "message": "Thanks."})
    fields, errors = contact.validate(body)
    if errors:
        return jsonify({"ok": False, "message": "Please fix the highlighted fields.", "fields": errors}), 422
    ok, why = contact.is_configured()
    if not ok:
        log.error("contact not configured: %s", why)
        return jsonify({"ok": False, "message": "Email delivery isn’t configured on this server yet."}), 503
    # Only letters that go to the mail service count toward the per-hour limit.
    allowed, retry = contact_limiter.check(ip)
    if not allowed:
        return jsonify({"ok": False, "message": f"Too many letters from this connection. Try again in about {max(1, retry // 60)} minutes."}), 429
    try:
        result = contact.send(fields)
    except contact.DeliveryError:
        contact_limiter.release(ip)  # the service's failure shouldn't use up the visitor's quota
        return jsonify({"ok": False, "message": "The mail service didn’t accept the letter. Please try again later."}), 502
    return jsonify({"ok": True, **result})


# ---------- Static frontend (single-service deployment) ----------
@app.get("/", defaults={"path": ""})
@app.get("/<path:path>")
def spa(path: str):
    dist = config.FRONTEND_DIST
    if path.startswith("api/"):
        return err("not_found", "No such API route.", 404)
    if not (dist / "index.html").exists():
        return ("Frontend not built. Run `npm run build` in frontend/, or use the Vite dev server.", 404)
    target = dist / path
    if path and target.is_file() and dist.resolve() in target.resolve().parents:
        resp = send_from_directory(dist, path)
        if path == "index.html":
            resp.headers["Cache-Control"] = "no-cache"
        elif path.startswith("assets/"):
            resp.headers["Cache-Control"] = "public, max-age=31536000, immutable"
        return resp
    resp = send_from_directory(dist, "index.html")  # SPA route: /projects/scorched etc.
    resp.headers["Cache-Control"] = "no-cache"  # always pick up a new build's asset names
    return resp


def make_function_app(handler, methods: list[str]) -> Flask:
    """A one-endpoint app for a serverless function file (api/chat.py etc.).
    It answers whatever path the platform routes to it, with the same headers and errors."""
    fn = Flask(handler.__name__)
    fn.config["MAX_CONTENT_LENGTH"] = app.config["MAX_CONTENT_LENGTH"]
    fn.add_url_rule("/", handler.__name__, handler, methods=methods)
    fn.add_url_rule("/<path:_any>", handler.__name__ + "_any", lambda _any: handler(), methods=methods)
    fn.add_url_rule("/", "preflight", lambda: ("", 204), methods=["OPTIONS"])
    fn.add_url_rule("/<path:_any>", "preflight_any", lambda _any: ("", 204), methods=["OPTIONS"])
    fn.after_request(headers)
    fn.register_error_handler(HTTPException, lambda e: err("http_error", e.description or e.name, e.code or 500))
    return fn


def warm_index():
    try:
        rag.get_index()
        log.info("knowledge index loaded")
    except Exception as e:  # noqa: BLE001
        log.error("index not loaded: %s (run python ingest.py)", e)


threading.Thread(target=warm_index, daemon=True).start()

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)
