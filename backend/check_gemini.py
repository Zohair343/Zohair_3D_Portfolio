"""Checks your Gemini setup before you rely on it.

    python check_gemini.py

Verifies the key, that the configured chat and embedding models exist for this key,
and makes one tiny call to each. Prints which models are available if one is missing.
"""
import os
import sys

import config


def main() -> int:
    key = os.getenv("GEMINI_API_KEY", "")
    if not key:
        print("✗ GEMINI_API_KEY is not set (put it in backend/.env).")
        return 1
    if key != key.strip() or key.startswith(("'", '"')):
        print("! GEMINI_API_KEY has spaces or quotes around it; remove them in backend/.env.")
    from google import genai
    from google.genai import errors, types

    from providers.llm import gemini_client
    client = gemini_client()
    try:
        names = {m.name.removeprefix("models/"): list(getattr(m, "supported_actions", None) or []) for m in client.models.list()}
    except errors.ClientError as e:
        print(f"✗ The key was rejected ({getattr(e, 'code', '?')}): {e}")
        return 1
    print(f"✓ Key accepted; {len(names)} models available.")
    ok = True
    for label, model, action in [("chat", config.GEMINI_CHAT_MODEL, "generateContent"), ("embedding", config.GEMINI_EMBED_MODEL, "embedContent")]:
        if model in names and action in names[model]:
            print(f"✓ {label} model {model} is available.")
        else:
            ok = False
            options = sorted(n for n, acts in names.items() if action in acts and ("flash" in n or "embedding" in n))
            print(f"✗ {label} model {model} isn't available to this key. Options: {', '.join(options[:12])}")
    if not ok:
        print("Set GEMINI_CHAT_MODEL / GEMINI_EMBED_MODEL in backend/.env to one of the options above.")
        return 1
    e = client.models.embed_content(model=config.GEMINI_EMBED_MODEL, contents=["Scorched combo"],
                                    config=types.EmbedContentConfig(task_type="RETRIEVAL_QUERY", output_dimensionality=config.EMBED_DIM))
    print(f"✓ Embedding works ({len(e.embeddings[0].values)} dimensions).")
    for model in [config.GEMINI_CHAT_MODEL, *config.GEMINI_FALLBACK_MODELS]:
        try:
            r = client.models.generate_content(model=model, contents="Reply with the single word: ready")
            print(f"✓ Chat works with {model}: {r.text.strip()[:40]!r}")
            break
        except (errors.ServerError, errors.ClientError) as e:
            print(f"! {model} answered {getattr(e, 'code', '?')} ({str(e)[:80]}…). The site will try the next model automatically.")
    else:
        print("✗ No chat model answered right now (Google's servers are busy). Wait a minute and run this again.")
        return 1
    print("All good. Next: python evaluate.py")
    return 0


if __name__ == "__main__":
    sys.exit(main())
