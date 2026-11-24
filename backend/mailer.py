"""Contact form: validation and delivery. Visitor messages are never stored or indexed."""
from __future__ import annotations

import json
import logging
import re
import smtplib
import ssl
import urllib.error
import urllib.request
import uuid
from email.message import EmailMessage
from email.utils import formataddr, make_msgid

import config

log = logging.getLogger("contact")

# Mirrors frontend/src/lib/validation.ts
LIMITS = {"name": (2, 100), "email": (3, 254), "subject": (3, 150), "message": (20, 5000)}
LABELS = {"name": "Your name", "email": "Email address", "subject": "Subject", "message": "Message"}
EMAIL_RE = re.compile(r"^[^\s@<>()\",;:]+@[^\s@<>()\",;:]+\.[A-Za-z]{2,}$")
CTRL_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


class DeliveryError(Exception):
    pass


def validate(payload: dict) -> tuple[dict, dict]:
    """Returns (clean_fields, errors)."""
    clean, errors = {}, {}
    for k, (lo, hi) in LIMITS.items():
        v = payload.get(k, "")
        if not isinstance(v, str):
            errors[k] = f"{LABELS[k]} must be text."
            continue
        v = v.strip()
        if k != "message" and re.search(r"[\r\n]", v):
            errors[k] = f"{LABELS[k]} can’t contain line breaks."
        elif CTRL_RE.search(v):
            errors[k] = f"{LABELS[k]} contains characters that aren’t allowed."
        elif not v:
            errors[k] = f"{LABELS[k]} is required."
        elif len(v) < lo:
            errors[k] = f"{LABELS[k]} needs at least {lo} characters."
        elif len(v) > hi:
            errors[k] = f"{LABELS[k]} can be at most {hi} characters (now {len(v)})."
        clean[k] = v
    if "email" not in errors and not EMAIL_RE.match(clean.get("email", "")):
        errors["email"] = "Enter an email address like name@example.com."
    return clean, errors


def is_configured() -> tuple[bool, str]:
    if not config.CONTACT_TO_EMAIL or not EMAIL_RE.match(config.CONTACT_TO_EMAIL):
        return False, "CONTACT_TO_EMAIL is not set"
    if config.EMAIL_PROVIDER == "smtp":
        ok = all([config.SMTP_HOST, config.SMTP_USERNAME, config.SMTP_PASSWORD, config.MAIL_FROM])
        return ok, "" if ok else "SMTP_HOST/SMTP_USERNAME/SMTP_PASSWORD/MAIL_FROM missing"
    if config.EMAIL_PROVIDER == "resend":
        ok = bool(config.RESEND_API_KEY and config.MAIL_FROM)
        return ok, "" if ok else "RESEND_API_KEY/MAIL_FROM missing"
    if config.EMAIL_PROVIDER == "dev-log":
        return (not config.IS_PROD), "dev-log provider is disabled in production"
    return False, f"unknown EMAIL_PROVIDER {config.EMAIL_PROVIDER!r}"


def build_message(f: dict, ref: str) -> EmailMessage:
    msg = EmailMessage()
    msg["Subject"] = f"[Playable Pages] {f['subject']}"
    msg["From"] = formataddr(("Playable Pages contact form", config.MAIL_FROM or "no-reply@localhost"))
    msg["To"] = config.CONTACT_TO_EMAIL
    msg["Reply-To"] = formataddr((f["name"], f["email"]))  # visitor; recipient is fixed server-side
    msg["Message-ID"] = make_msgid(domain=(config.MAIL_FROM.split("@")[-1] if config.MAIL_FROM else "localhost"))
    msg["X-Playable-Pages-Ref"] = ref
    msg.set_content(
        f"New letter from the Playable Pages contact form.\n\n"
        f"From: {f['name']} <{f['email']}>\nSubject: {f['subject']}\nReference: {ref}\n\n"
        f"{f['message']}\n\n— Reply directly to this email to answer {f['name']}.\n"
    )
    return msg


def send(f: dict) -> dict:
    """Delivers the letter. Raises DeliveryError unless the provider accepted it."""
    ref = uuid.uuid4().hex[:10]
    provider = config.EMAIL_PROVIDER
    if provider == "dev-log":
        log.info("dev-log: contact letter ref=%s accepted locally, NOT emailed", ref)
        return {"delivered": False, "mode": "dev-log", "ref": ref,
                "message": "This server is in development mode, so the letter was checked but not emailed."}
    msg = build_message(f, ref)
    try:
        if provider == "smtp":
            ctx = ssl.create_default_context()
            if config.SMTP_SECURITY == "ssl":
                server = smtplib.SMTP_SSL(config.SMTP_HOST, config.SMTP_PORT, context=ctx, timeout=20)
            else:
                server = smtplib.SMTP(config.SMTP_HOST, config.SMTP_PORT, timeout=20)
                server.starttls(context=ctx)
            with server:
                server.login(config.SMTP_USERNAME, config.SMTP_PASSWORD)
                refused = server.send_message(msg)
            if refused:
                raise DeliveryError("recipient refused")
        elif provider == "resend":
            body = json.dumps({"from": msg["From"], "to": [config.CONTACT_TO_EMAIL], "reply_to": f["email"],
                               "subject": msg["Subject"], "text": msg.get_content(), "headers": {"X-Playable-Pages-Ref": ref}}).encode()
            req = urllib.request.Request("https://api.resend.com/emails", data=body, method="POST", headers={
                "Authorization": f"Bearer {config.RESEND_API_KEY}", "Content-Type": "application/json",
                # Python's default "Python-urllib" identity is commonly blocked by API firewalls.
                "User-Agent": "playable-pages-contact/1.0",
            })
            try:
                with urllib.request.urlopen(req, timeout=20) as r:
                    if r.status not in (200, 201, 202):
                        raise DeliveryError(f"resend status {r.status}")
            except urllib.error.HTTPError as e:
                # Resend explains rejections in the body (e.g. invalid key, unverified sender, wrong recipient).
                detail = e.read(400).decode("utf-8", "replace")
                log.warning("Resend rejected the letter ref=%s: HTTP %s %s", ref, e.code, detail)
                raise DeliveryError(f"resend {e.code}: {detail}") from e
        else:
            raise DeliveryError("unknown provider")
    except (smtplib.SMTPException, OSError, urllib.error.URLError) as e:
        log.warning("contact delivery failed ref=%s provider=%s: %s", ref, provider, type(e).__name__)
        raise DeliveryError(type(e).__name__) from e
    log.info("contact letter ref=%s accepted by %s", ref, provider)  # no names/emails/message bodies in logs
    return {"delivered": True, "mode": provider, "ref": ref,
            "message": f"Zohair will reply to the address you gave. Reference: {ref}."}
