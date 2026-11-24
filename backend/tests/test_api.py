import json
import re
from pathlib import Path

import pytest

import config
import mailer as contact
import ingest
import rag
from providers import llm
from providers.errors import ProviderUnavailable
from app import app, chat_limiter, contact_attempts, contact_limiter

ROOT = Path(__file__).resolve().parents[2]
GOOD = {"name": "Ayesha Khan", "email": "ayesha@example.com", "subject": "Internship", "message": "Hello Zohair, I enjoyed the Scorched spread a lot.", "website": ""}


@pytest.fixture
def client(monkeypatch):
    chat_limiter.hits.clear(); contact_limiter.hits.clear(); contact_attempts.hits.clear()
    monkeypatch.setattr(config, "CONTACT_TO_EMAIL", "owner@example.com")
    monkeypatch.setattr(config, "EMAIL_PROVIDER", "dev-log")
    monkeypatch.setattr(config, "IS_PROD", False)
    return app.test_client()


# ---------- knowledge base ----------
def test_chunks_have_anchor_metadata_and_no_private_data():
    chunks = ingest.build_chunks()
    assert len(chunks) > 30
    resume_phone = re.compile(r"343|0079213")
    for c in chunks:
        assert c["title"] and c["section"] and c["url"].startswith("/")
        assert "@" not in c["text"] and not resume_phone.search(c["text"])


def test_every_citation_anchor_exists_in_frontend():
    """A cited panel must exist: anchors in chunk URLs must match ids rendered by the frontend."""
    src = "\n".join(p.read_text() for p in (ROOT / "frontend/src").rglob("*.tsx"))
    portfolio = json.loads((ROOT / "content/portfolio.json").read_text())
    panel_ids = {p["id"] for pr in portfolio["projects"] for p in pr["panels"]} | {p["id"] for p in portfolio["about"]["panels"]}
    for c in ingest.build_chunks():
        if "#" not in c["url"]:
            continue
        anchor = c["url"].split("#")[1]
        dynamic = anchor in panel_ids or anchor.startswith("skills-") or anchor in {"ned", "cega", "indus", "practice"}
        literal = f'id="{anchor}"' in src or f"id: '{anchor}'" in src
        assert dynamic or literal, f"no element renders #{anchor} ({c['id']})"
    assert 'id="earlier-education"' in src


def test_mechanics_stay_attached_to_their_game():
    for c in ingest.build_chunks():
        if c["project"]:
            assert c["text"].startswith("Project: "), c["id"]


# ---------- chat ----------
def test_chat_rejects_empty_and_long(client):
    assert client.post("/api/chat", json={"question": " "}).status_code == 400
    assert client.post("/api/chat", json={"question": "x" * 501}).status_code == 400


class FakeLLM:
    """Stands in for Gemini/Claude: returns a fixed JSON answer and records the request."""
    def __init__(self, payload=None, error=None):
        self.payload, self.error, self.calls = payload, error, []

    def __call__(self, system, messages, schema):
        self.calls.append({"system": system, "messages": messages, "schema": schema})
        if self.error:
            raise self.error
        return self.payload


def test_uncited_answer_is_downgraded_and_bogus_citations_dropped(monkeypatch):
    monkeypatch.setattr(llm, "complete_json", FakeLLM({"status": "answered", "answer": "It sold a million copies.", "citations": ["made.up"]}))
    out = rag.answer("How much did Scorched sell?")
    assert out["status"] == "insufficient" and out["citations"] == []


def test_valid_citations_map_to_panel_urls(monkeypatch):
    fake = FakeLLM({"status": "answered", "answer": "Three connected hits unlock the slow-motion gun.", "citations": ["scorched.slow-motion", "nope"]})
    monkeypatch.setattr(llm, "complete_json", fake)
    out = rag.answer("How does the three-hit combo work in Scorched?")
    assert out["citations"] == [{"id": "scorched.slow-motion", "title": "Scorched: Hit three: time slows", "url": "/projects/scorched#slow-motion", "section": "slow-motion"}]
    sent = fake.calls[0]
    assert sent["schema"]["required"] == ["status", "answer", "citations"]
    assert "[scorched.slow-motion]" in sent["messages"][-1]["content"]


def test_comparison_retrieves_both_projects():
    ids = [h.chunk["project"] for h in rag.retrieve("Compare the enemy AI in Scorched and Darkness Within")]
    assert "scorched" in ids and "darkness-within" in ids


def test_navmesh_question_finds_both_navmesh_panels():
    ids = [h.chunk["id"] for h in rag.retrieve("How did Zohair use NavMesh in his games?")][:6]
    assert "scorched.enemies" in ids and "darkness-within.threat" in ids


def test_provider_failure_is_not_an_answer(client, monkeypatch):
    monkeypatch.setattr(llm, "complete_json", FakeLLM(error=ProviderUnavailable("provider_declined", "declined", 502)))
    r = client.post("/api/chat", json={"question": "anything about Scorched"})
    assert r.status_code == 502 and "answer" not in r.get_json()


def test_gemini_without_key_is_explicit(client, monkeypatch):
    monkeypatch.setattr(config, "LLM_PROVIDER", "gemini")
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    r = client.post("/api/chat", json={"question": "How does the three-hit combo work in Scorched?"})
    assert r.status_code == 503 and r.get_json()["error"] == "provider_unconfigured"


def test_gemini_response_parsing(monkeypatch):
    from types import SimpleNamespace
    resp = SimpleNamespace(text='{"status":"answered","answer":"x","citations":[]}', candidates=[SimpleNamespace(finish_reason="STOP")])
    blocked = SimpleNamespace(text=None, candidates=[SimpleNamespace(finish_reason="SAFETY")])
    calls = []

    class Models:
        def generate_content(self, **kw):
            calls.append(kw); return calls and (blocked if len(calls) > 1 else resp)

    class Client:
        models = Models()

    import google.genai as genai
    monkeypatch.setattr(genai, "Client", lambda **kw: Client())
    monkeypatch.setenv("GEMINI_API_KEY", "test")
    assert llm._gemini("sys", [{"role": "user", "content": "q"}, ], {"type": "object"})["status"] == "answered"
    cfg = calls[0]["config"]
    assert cfg.response_mime_type == "application/json" and cfg.system_instruction == "sys"
    with pytest.raises(ProviderUnavailable) as e:
        llm._gemini("sys", [{"role": "user", "content": "q"}], {"type": "object"})
    assert e.value.code == "provider_declined"


# ---------- contact ----------
def test_contact_validation_errors_are_field_level(client):
    r = client.post("/api/contact", json={**GOOD, "email": "bad", "message": "short"})
    assert r.status_code == 422
    assert set(r.get_json()["fields"]) == {"email", "message"}


def test_contact_rejects_header_injection(client):
    r = client.post("/api/contact", json={**GOOD, "subject": "Hi\r\nBcc: victim@example.com"})
    assert r.status_code == 422 and "subject" in r.get_json()["fields"]
    r = client.post("/api/contact", json={**GOOD, "email": "a@b.com\nBcc: x@y.com"})
    assert r.status_code == 422


def test_dev_log_mode_never_claims_delivery(client):
    body = client.post("/api/contact", json=GOOD).get_json()
    assert body["ok"] is True and body["delivered"] is False


def test_dev_log_disabled_in_production(client, monkeypatch):
    monkeypatch.setattr(config, "IS_PROD", True)
    assert client.post("/api/contact", json=GOOD).status_code == 503


def test_honeypot_does_not_send(client, monkeypatch):
    monkeypatch.setattr(contact, "send", lambda f: (_ for _ in ()).throw(AssertionError("must not send")))
    assert client.post("/api/contact", json={**GOOD, "website": "http://spam"}).status_code == 200


def test_contact_rate_limit(client):
    codes = [client.post("/api/contact", json=GOOD).status_code for _ in range(7)]
    assert codes[:5] == [200] * 5 and codes[5] == 429


def test_message_headers_fixed_recipient_and_reply_to(monkeypatch):
    monkeypatch.setattr(config, "CONTACT_TO_EMAIL", "owner@example.com")
    monkeypatch.setattr(config, "MAIL_FROM", "portfolio@example.org")
    msg = contact.build_message(contact.validate(GOOD)[0], "abc")
    assert msg["To"] == "owner@example.com" and "ayesha@example.com" in msg["Reply-To"]
    assert msg["From"].endswith("<portfolio@example.org>")


def test_smtp_failure_is_reported(client, monkeypatch):
    monkeypatch.setattr(config, "EMAIL_PROVIDER", "smtp")
    for k, v in {"SMTP_HOST": "127.0.0.1", "SMTP_PORT": 1, "SMTP_USERNAME": "u", "SMTP_PASSWORD": "p", "MAIL_FROM": "a@example.org"}.items():
        monkeypatch.setattr(config, k, v)
    r = client.post("/api/contact", json=GOOD)
    assert r.status_code == 502 and r.get_json()["ok"] is False


def test_api_unknown_route_is_json(client):
    assert client.get("/api/nope").status_code == 404


# ---------- serverless pieces ----------
def test_upstash_limiter_counts_and_falls_back(monkeypatch):
    import io
    import urllib.request
    from ratelimit import UpstashRateLimiter

    counts = {}

    def fake_urlopen(req, timeout=0):
        cmds = json.loads(req.data)
        assert req.full_url.endswith("/pipeline") and req.headers["Authorization"] == "Bearer tok"
        k = cmds[0][1]; counts[k] = counts.get(k, 0) + 1
        return io.BytesIO(json.dumps([{"result": counts[k]}, {"result": 1}]).encode())

    monkeypatch.setattr(urllib.request, "urlopen", fake_urlopen)
    lim = UpstashRateLimiter("https://x.upstash.io", "tok", 2, 60, "t")
    assert [lim.check("ip")[0] for _ in range(3)] == [True, True, False]

    def down(req, timeout=0):
        raise OSError("unreachable")
    monkeypatch.setattr(urllib.request, "urlopen", down)
    assert lim.check("other")[0] is True  # falls back to the in-memory limiter instead of failing


def test_vercel_function_files_route_any_path():
    import importlib.util
    root = Path(__file__).resolve().parents[2] / "api"
    for name, method, code in [("chat", "post", 400), ("contact", "post", 400), ("health", "get", 200)]:
        spec = importlib.util.spec_from_file_location(f"fn_{name}", root / f"{name}.py")
        mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
        r = getattr(mod.app.test_client(), method)(f"/api/{name}", data="x" if name == "contact" else None)
        assert r.status_code == code, (name, r.status_code)


def test_gemini_busy_model_falls_back(monkeypatch):
    from types import SimpleNamespace
    from google.genai import errors
    import google.genai as genai
    tried = []

    class Models:
        def generate_content(self, model, contents, config):
            tried.append(model)
            if model == "main":
                raise errors.ServerError(503, {"error": {"code": 503, "message": "high demand", "status": "UNAVAILABLE"}})
            return SimpleNamespace(text='{"status":"answered","answer":"ok","citations":[]}', candidates=[SimpleNamespace(finish_reason="STOP")])

    monkeypatch.setattr(genai, "Client", lambda **kw: SimpleNamespace(models=Models()))
    monkeypatch.setenv("GEMINI_API_KEY", "test")
    monkeypatch.setattr(config, "GEMINI_CHAT_MODEL", "main")
    monkeypatch.setattr(config, "GEMINI_FALLBACK_MODELS", ["backup"])
    monkeypatch.setattr(llm.time, "sleep", lambda s: None)
    assert llm._gemini("sys", [{"role": "user", "content": "q"}], {"type": "object"})["answer"] == "ok"
    assert tried == ["main", "main", "backup"]

    monkeypatch.setattr(config, "GEMINI_FALLBACK_MODELS", [])
    with pytest.raises(ProviderUnavailable) as e:
        llm._gemini("sys", [{"role": "user", "content": "q"}], {"type": "object"})
    assert e.value.code == "provider_busy"


def test_resend_request_shape(client, monkeypatch):
    """The exact request sent to Resend: fixed recipient, verified sender, visitor in reply_to."""
    import io
    import urllib.request
    sent = {}

    class Resp(io.BytesIO):
        status = 200
        def __enter__(self): return self
        def __exit__(self, *a): return False

    def fake_urlopen(req, timeout=0):
        sent["url"], sent["auth"], sent["body"] = req.full_url, req.headers["Authorization"], json.loads(req.data)
        sent["ua"] = req.get_header("User-agent")
        return Resp(b'{"id":"abc"}')

    monkeypatch.setattr(urllib.request, "urlopen", fake_urlopen)
    for k, v in {"EMAIL_PROVIDER": "resend", "RESEND_API_KEY": "re_test", "MAIL_FROM": "onboarding@resend.dev", "CONTACT_TO_EMAIL": "owner@example.com"}.items():
        monkeypatch.setattr(config, k, v)
    r = client.post("/api/contact", json={**GOOD, "email": "attacker@example.com"})
    body = r.get_json()
    assert r.status_code == 200 and body["delivered"] is True
    assert sent["url"] == "https://api.resend.com/emails" and sent["auth"] == "Bearer re_test"
    assert sent["body"]["to"] == ["owner@example.com"]           # never the visitor's address
    assert sent["body"]["reply_to"] == "attacker@example.com"    # visitor only in reply_to
    assert sent["body"]["from"].endswith("<onboarding@resend.dev>")
    assert sent["body"]["subject"] == "[Playable Pages] Internship"
    assert sent["ua"] and "urllib" not in sent["ua"].lower()   # avoid firewall blocks on the default identity


def test_resend_rejection_is_logged_with_reason(client, monkeypatch, caplog):
    import io
    import urllib.error
    import urllib.request

    def reject(req, timeout=0):
        raise urllib.error.HTTPError(req.full_url, 403, "Forbidden", {}, io.BytesIO(b'{"message":"You can only send testing emails to your own email address"}'))

    monkeypatch.setattr(urllib.request, "urlopen", reject)
    for k, v in {"EMAIL_PROVIDER": "resend", "RESEND_API_KEY": "re_test", "MAIL_FROM": "onboarding@resend.dev", "CONTACT_TO_EMAIL": "owner@example.com"}.items():
        monkeypatch.setattr(config, k, v)
    with caplog.at_level("WARNING"):
        assert client.post("/api/contact", json=GOOD).status_code == 502
    assert "403" in caplog.text and "your own email address" in caplog.text


def test_failed_attempts_do_not_use_the_letter_quota(client, monkeypatch):
    # invalid letters and an unconfigured server don't count toward the 5 letters per hour…
    for _ in range(6):
        assert client.post("/api/contact", json={**GOOD, "message": "short"}).status_code == 422
    monkeypatch.setattr(config, "CONTACT_TO_EMAIL", "")
    for _ in range(3):
        assert client.post("/api/contact", json=GOOD).status_code == 503
    monkeypatch.setattr(config, "CONTACT_TO_EMAIL", "owner@example.com")
    assert client.post("/api/contact", json=GOOD).status_code == 200   # …so a real letter still goes out


def test_mail_service_failure_is_refunded(client, monkeypatch):
    monkeypatch.setattr(contact, "send", lambda f: (_ for _ in ()).throw(contact.DeliveryError("down")))
    for _ in range(7):
        assert client.post("/api/contact", json=GOOD).status_code == 502   # never 429: failures are refunded


def test_attempt_cap_stops_hammering(client, monkeypatch):
    monkeypatch.setattr(contact_attempts, "max", 3)
    codes = [client.post("/api/contact", json={**GOOD, "message": "short"}).status_code for _ in range(4)]
    assert codes == [422, 422, 422, 429]
