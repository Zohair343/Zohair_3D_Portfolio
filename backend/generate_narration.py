"""Records the narrator's voice for every page with Gemini text-to-speech.

    python generate_narration.py --samples        # a few voices to audition (frontend/public/media/voice-samples/)
    python generate_narration.py --list-voices    # male English voices available to your key
    python generate_narration.py                  # record all pages whose text changed (content/narration.json)
    python generate_narration.py --all            # re-record everything

Voice: NARRATION_VOICE in backend/.env (default Charon). Files go to
frontend/public/media/narration/ with a manifest.json the site reads. Rebuild the
site afterwards (npm run build) so the files are included.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import io
import json
import os
import sys
import re
import time
import wave
from pathlib import Path

import config

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "content" / "narration.json"
OUT = ROOT / "frontend" / "public" / "media" / "narration"
SAMPLES = ROOT / "frontend" / "public" / "media" / "voice-samples"
MODELS = [os.getenv("NARRATION_MODEL", "gemini-3.8-flash-tts"), "gemini-3.8-flash-lite-tts"]
SAMPLE_VOICES = ["Charon", "Puck", "Fenrir", "Orus", "Achird", "Sadachbia"]
SAMPLE_TEXT = "Hi, I'm Muhammad Zohair Shaikh, a game developer from Karachi. Open the book, and I'll show you how my games work."


def client():
    from google import genai

    if not os.getenv("GEMINI_API_KEY"):
        sys.exit("GEMINI_API_KEY is not set (backend/.env).")
    from google.genai import types

    # No silent SDK retries: this script reports and handles waits itself.
    return genai.Client(http_options=types.HttpOptions(api_version="v1beta", timeout=90_000, retry_options=types.HttpRetryOptions(attempts=1)))


class DailyLimit(Exception):
    pass


def _retry_seconds(err: Exception, default: int = 60) -> int:
    """Google includes the wait it wants (e.g. "retryDelay": "37s") in rate-limit errors."""
    m = re.search(r"retry[_ ]?delay\W+(\d+)", str(err), re.I) or re.search(r"retry in (\d+(?:\.\d+)?)\s*s", str(err), re.I)
    return int(float(m.group(1))) + 2 if m else default


def speak(c, text: str, voice: str, style: str, sleep=time.sleep) -> bytes:
    """Returns WAV bytes. Waits out per-minute rate limits (printing why), retries a busy model,
    then tries the lighter TTS model. Raises DailyLimit when the day's quota is used up."""
    last: Exception | None = None
    models = [MODELS[0], MODELS[0], *MODELS[1:]]
    i = waits = 0
    while i < len(models):
        model = models[i]
        try:
            it = c.interactions.create(
                model=model,
                input=[{"type": "user_input", "content": [{"type": "text", "text": text,
                                                            "annotations": [{"type": "speech_metadata", "style": style}]}]}],
                response_format={"type": "audio"},
                generation_config={"speech_config": [{"voice": voice}]},
            )
            return base64.b64decode(it.output_audio.data)
        except Exception as e:  # noqa: BLE001
            last = e
            msg = str(e)
            if "429" in msg or "RESOURCE_EXHAUSTED" in msg:
                if re.search(r"per ?day|PerDay|daily", msg, re.I):
                    raise DailyLimit(msg) from e
                if waits < 8:
                    wait = _retry_seconds(e)
                    waits += 1
                    print(f"   Rate limit reached (the free tier allows only a few voice requests per minute). Waiting {wait} s…", flush=True)
                    sleep(wait)
                    continue  # same model again
            print(f"   {model} failed: {msg[:120]}", flush=True)
            sleep(2)
            i += 1
    raise SystemExit(f"Text-to-speech failed: {last}")


def wav_seconds(data: bytes) -> float:
    with wave.open(io.BytesIO(data)) as w:
        return w.getnframes() / float(w.getframerate())


def to_mp3(data: bytes) -> bytes | None:
    """MP3 is ~10× smaller than WAV. Needs `pip install lameenc`; returns None without it."""
    try:
        import lameenc
    except ImportError:
        return None
    with wave.open(io.BytesIO(data)) as w:
        pcm, rate, ch = w.readframes(w.getnframes()), w.getframerate(), w.getnchannels()
    enc = lameenc.Encoder()
    enc.set_bit_rate(64); enc.set_in_sample_rate(rate); enc.set_channels(ch); enc.set_quality(2)
    return bytes(enc.encode(pcm) + enc.flush())


def save_audio(wav_bytes: bytes, path_no_ext: Path) -> str:
    mp3 = to_mp3(wav_bytes)
    path = path_no_ext.with_suffix(".mp3" if mp3 else ".wav")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(mp3 or wav_bytes)
    for other in (".mp3", ".wav"):  # remove a stale file in the other format
        p = path_no_ext.with_suffix(other)
        if p != path and p.exists():
            p.unlink()
    return path.name


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--samples", action="store_true")
    ap.add_argument("--list-voices", action="store_true")
    ap.add_argument("--all", action="store_true")
    args = ap.parse_args(argv)
    script = json.loads(SCRIPT.read_text(encoding="utf-8"))
    c = client()

    if args.list_voices:
        for v in c.voices.list(language_code=["en-US", "en-GB"], gender=["male"]):
            print(getattr(v, "name", v), "—", getattr(v, "description", "") or "")
        return 0

    if args.samples:
        for voice in SAMPLE_VOICES:
            print(f"Sample: {voice}")
            name = save_audio(speak(c, SAMPLE_TEXT, voice, script["style"]), SAMPLES / voice.lower())
            print(f"   → frontend/public/media/voice-samples/{name}")
        print("Listen, then put NARRATION_VOICE=<name> in backend/.env and run: python generate_narration.py")
        return 0

    voice = os.getenv("NARRATION_VOICE", "Charon")
    manifest_path = OUT / "manifest.json"
    old = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else {"pages": {}}
    pages = dict(old.get("pages", {}))

    def save():  # after every page, so an interrupted run loses nothing
        OUT.mkdir(parents=True, exist_ok=True)
        keep = {k: v for k, v in pages.items() if k in script["pages"]}
        manifest_path.write_text(json.dumps({"voice": voice, "model": MODELS[0], "generated_at": int(time.time()), "pages": keep}, indent=1), encoding="utf-8")

    todo = list(script["pages"].items())
    for n, (page_id, text) in enumerate(todo, 1):
        digest = hashlib.sha256(f"{voice}|{script['style']}|{text}".encode()).hexdigest()[:16]
        prev = pages.get(page_id)
        if prev and prev.get("hash") == digest and (OUT / prev["file"]).exists() and not args.all:
            print(f"= [{n}/{len(todo)}] {page_id} (unchanged)", flush=True)
            continue
        print(f"♪ [{n}/{len(todo)}] {page_id}", flush=True)
        try:
            data = speak(c, text, voice, script["style"])
        except DailyLimit:
            save()
            print("\nThe Gemini daily limit for voice generation is used up. Finished pages are saved;"
                  " run this again tomorrow and it continues from here. The site uses the browser voice for missing pages.")
            return 2
        pages[page_id] = {"file": save_audio(data, OUT / page_id), "seconds": round(wav_seconds(data), 2), "hash": digest}
        save()
    total = sum(p["seconds"] for k, p in pages.items() if k in script["pages"])
    print(f"Done: {len(script['pages'])} pages, {total:.0f} s of narration in voice {voice}. Now rebuild the site: cd ../frontend && npm run build")
    return 0


if __name__ == "__main__":
    sys.exit(main())
