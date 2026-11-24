"""Answer generation. LLM_PROVIDER=gemini (default) or anthropic. Both return parsed JSON."""
from __future__ import annotations

import json
import logging
import os
import time

import config
from providers.embeddings import _client_error
from providers.errors import ProviderUnavailable

log = logging.getLogger("llm")


def complete_json(system: str, messages: list[dict], schema: dict) -> dict:
    """messages: [{'role': 'user'|'assistant', 'content': str}, ...]; last one is the user turn."""
    return _anthropic(system, messages, schema) if config.LLM_PROVIDER == "anthropic" else _gemini(system, messages, schema)


def _gemini(system: str, messages: list[dict], schema: dict) -> dict:
    from google import genai
    from google.genai import errors, types

    if not os.getenv("GEMINI_API_KEY"):
        raise ProviderUnavailable("provider_unconfigured", "The chat service isn’t configured on this server yet, so it can’t answer questions.")
    client = gemini_client()
    contents = [{"role": "model" if m["role"] == "assistant" else "user", "parts": [{"text": m["content"]}]} for m in messages]
    cfg = types.GenerateContentConfig(system_instruction=system, response_mime_type="application/json",
                                      response_json_schema=schema, max_output_tokens=2048)
    # A busy model (503/500/429) shouldn't break the chat: retry once, then try the fallback models.
    attempts = [config.GEMINI_CHAT_MODEL, config.GEMINI_CHAT_MODEL, *config.GEMINI_FALLBACK_MODELS]
    last_busy: Exception | None = None
    resp = None
    for i, model in enumerate(attempts):
        try:
            resp = client.models.generate_content(model=model, contents=contents, config=cfg)
            if i:
                log.info("answered by %s after %d busy attempt(s)", model, i)
            break
        except errors.ServerError as e:
            last_busy = e
        except errors.ClientError as e:
            if getattr(e, "code", None) == 429 or (getattr(e, "code", None) == 404 and model != config.GEMINI_CHAT_MODEL):
                last_busy = e  # rate-limited, or a fallback model this key can't use: try the next one
                continue
            log.warning("gemini client error %s", getattr(e, "code", "?"))
            raise ProviderUnavailable(*_client_error(e)) from e
        except Exception as e:
            raise ProviderUnavailable("provider_unreachable", "The chat service couldn’t be reached. Please try again shortly.") from e
        if i == 0:
            time.sleep(0.8)  # brief pause before retrying the same model
    if resp is None:
        log.warning("all gemini models busy: %s", last_busy)
        raise ProviderUnavailable("provider_busy", "The AI service is very busy right now. Please try again in a minute.", 503)

    cand = (resp.candidates or [None])[0]
    reason = str(getattr(cand, "finish_reason", "") or "")
    if "SAFETY" in reason or "PROHIBITED" in reason or "BLOCKLIST" in reason:
        raise ProviderUnavailable("provider_declined", "The chat service declined this question.", 502)
    if "MAX_TOKENS" in reason:
        raise ProviderUnavailable("provider_truncated", "The answer was cut off, so it wasn’t shown. Try a narrower question.", 502)
    return _parse(resp.text)


def gemini_client():
    """One request per attempt (the SDK's own retries would delay our fallback by minutes)
    and a per-request time limit, so a stuck model fails fast and the next one is tried."""
    from google import genai
    from google.genai import types

    return genai.Client(http_options=types.HttpOptions(timeout=config.GEMINI_TIMEOUT_MS, retry_options=types.HttpRetryOptions(attempts=1)))


def _anthropic(system: str, messages: list[dict], schema: dict) -> dict:
    import anthropic

    if not os.getenv("ANTHROPIC_API_KEY"):
        raise ProviderUnavailable("provider_unconfigured", "The chat service isn’t configured on this server yet, so it can’t answer questions.")
    client = anthropic.Anthropic(base_url=config.CHAT_API_BASE_URL, timeout=config.CHAT_TIMEOUT_S, max_retries=1)
    try:
        resp = client.messages.create(model=config.CHAT_MODEL, max_tokens=4000, system=system, messages=messages,
                                      output_config={"effort": config.CHAT_EFFORT, "format": {"type": "json_schema", "schema": schema}})
    except anthropic.AuthenticationError as e:
        raise ProviderUnavailable("provider_auth", "The chat service’s key was rejected.") from e
    except anthropic.RateLimitError as e:
        raise ProviderUnavailable("provider_busy", "The chat service is busy right now. Please try again in a minute.") from e
    except anthropic.APIConnectionError as e:
        raise ProviderUnavailable("provider_unreachable", "The chat service couldn’t be reached.") from e
    except anthropic.APIStatusError as e:
        raise ProviderUnavailable("provider_error", "The chat service returned an error, so no answer was generated.", 502) from e
    if resp.stop_reason == "refusal":
        raise ProviderUnavailable("provider_declined", "The chat service declined this question.", 502)
    if resp.stop_reason == "max_tokens":
        raise ProviderUnavailable("provider_truncated", "The answer was cut off, so it wasn’t shown.", 502)
    return _parse(next((b.text for b in resp.content if b.type == "text"), ""))


def _parse(text: str | None) -> dict:
    try:
        data = json.loads(text or "")
        if isinstance(data, dict):
            return data
    except json.JSONDecodeError:
        pass
    raise ProviderUnavailable("provider_bad_output", "The chat service returned an unreadable answer, so it wasn’t shown.", 502)
