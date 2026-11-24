import base64
import io
import json
import math
import struct
import wave
from types import SimpleNamespace

import generate_narration as gn


def fake_wav(seconds=0.5, rate=24000):
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate)
        w.writeframes(b"".join(struct.pack("<h", int(8000 * math.sin(i / 20))) for i in range(int(seconds * rate))))
    return buf.getvalue()


class FakeClient:
    def __init__(self):
        self.calls = []
        self.interactions = SimpleNamespace(create=self.create)

    def create(self, **kw):
        self.calls.append(kw)
        return SimpleNamespace(output_audio=SimpleNamespace(data=base64.b64encode(fake_wav()).decode()))


def test_records_pages_skips_unchanged_and_rerecords_edits(tmp_path, monkeypatch):
    script = {"style": "warm", "pages": {"cover": "Hello there.", "about": "About me."}}
    (tmp_path / "narration.json").write_text(json.dumps(script))
    monkeypatch.setattr(gn, "SCRIPT", tmp_path / "narration.json")
    monkeypatch.setattr(gn, "OUT", tmp_path / "out")
    fake = FakeClient()
    monkeypatch.setattr(gn, "client", lambda: fake)
    monkeypatch.setenv("NARRATION_VOICE", "Orus")

    assert gn.main([]) == 0
    m = json.loads((tmp_path / "out" / "manifest.json").read_text())
    assert m["voice"] == "Orus" and set(m["pages"]) == {"cover", "about"}
    assert m["pages"]["cover"]["file"] == "cover.mp3" and (tmp_path / "out" / "cover.mp3").stat().st_size > 0
    assert 0.4 < m["pages"]["cover"]["seconds"] < 0.6
    req = fake.calls[0]
    assert req["generation_config"] == {"speech_config": [{"voice": "Orus"}]} and req["response_format"] == {"type": "audio"}
    assert req["input"][0]["content"][0]["annotations"][0]["style"] == "warm"

    fake.calls.clear()
    assert gn.main([]) == 0 and fake.calls == []                 # nothing changed: nothing re-recorded

    script["pages"]["about"] = "About me, edited."
    (tmp_path / "narration.json").write_text(json.dumps(script))
    assert gn.main([]) == 0
    assert [c["input"][0]["content"][0]["text"] for c in fake.calls] == ["About me, edited."]   # only the edited page


def test_rate_limit_waits_then_continues(monkeypatch):
    slept = []

    class Busy(FakeClient):
        def __init__(self):
            super().__init__(); self.n = 0

        def create(self, **kw):
            self.n += 1
            if self.n == 1:
                raise RuntimeError('429 RESOURCE_EXHAUSTED {"retryDelay": "37s"} quota per minute')
            return super().create(**kw)

    wav = gn.speak(Busy(), "hi", "Achird", "warm", sleep=slept.append)
    assert wav[:4] == b"RIFF" and slept == [39]   # waited what Google asked (+2 s), then succeeded


def test_daily_limit_stops_and_keeps_progress(tmp_path, monkeypatch):
    script = {"style": "warm", "pages": {"cover": "Hello.", "about": "About me."}}
    (tmp_path / "narration.json").write_text(json.dumps(script))
    monkeypatch.setattr(gn, "SCRIPT", tmp_path / "narration.json")
    monkeypatch.setattr(gn, "OUT", tmp_path / "out")

    class DayCap(FakeClient):
        def create(self, **kw):
            if kw["input"][0]["content"][0]["text"] == "About me.":
                raise RuntimeError("429 RESOURCE_EXHAUSTED: quota exceeded for requests per day")
            return super().create(**kw)

    monkeypatch.setattr(gn, "client", lambda: DayCap())
    assert gn.main([]) == 2
    m = json.loads((tmp_path / "out" / "manifest.json").read_text())
    assert list(m["pages"]) == ["cover"]          # the finished page is kept for the next run
