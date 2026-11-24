"""In-memory sliding-window rate limiter. Per process: with several workers or
instances, put a shared store (e.g. Redis) behind the same interface."""
import threading
import time
from collections import defaultdict, deque


class RateLimiter:
    def __init__(self, max_hits: int, window_s: int):
        self.max, self.window = max_hits, window_s
        self.hits: dict[str, deque] = defaultdict(deque)
        self.lock = threading.Lock()

    def check(self, key: str) -> tuple[bool, int]:
        """Returns (allowed, retry_after_seconds)."""
        now = time.monotonic()
        with self.lock:
            q = self.hits[key]
            while q and now - q[0] > self.window:
                q.popleft()
            if len(q) >= self.max:
                return False, int(self.window - (now - q[0])) + 1
            q.append(now)
            return True, 0

    def release(self, key: str) -> None:
        """Gives back the most recent hit (e.g. the request failed for reasons that aren't the visitor's)."""
        with self.lock:
            q = self.hits.get(key)
            if q:
                q.pop()


class UpstashRateLimiter:
    """Fixed-window limiter shared by every serverless instance (Upstash Redis REST API).
    Falls back to a per-process limiter if Upstash is unreachable."""

    def __init__(self, url: str, token: str, max_hits: int, window_s: int, prefix: str):
        self.url, self.token, self.max, self.window, self.prefix = url, token, max_hits, window_s, prefix
        self.fallback = RateLimiter(max_hits, window_s)

    def check(self, key: str) -> tuple[bool, int]:
        import json
        import urllib.request

        bucket = int(time.time() // self.window)
        k = f"pp:{self.prefix}:{key}:{bucket}"
        body = json.dumps([["INCR", k], ["EXPIRE", k, str(self.window)]]).encode()
        req = urllib.request.Request(f"{self.url}/pipeline", data=body, method="POST",
                                     headers={"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=3) as r:
                count = int(json.loads(r.read())[0]["result"])
        except Exception:  # noqa: BLE001 — never let the limiter take the site down
            return self.fallback.check(key)
        if count > self.max:
            return False, int(self.window - time.time() % self.window) + 1
        return True, 0

    def release(self, key: str) -> None:
        import urllib.request

        k = f"pp:{self.prefix}:{key}:{int(time.time() // self.window)}"
        req = urllib.request.Request(f"{self.url}/pipeline", data=__import__("json").dumps([["DECR", k]]).encode(), method="POST",
                                     headers={"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"})
        try:
            urllib.request.urlopen(req, timeout=3).close()
        except Exception:  # noqa: BLE001
            self.fallback.release(key)


def make_limiter(max_hits: int, window_s: int, prefix: str):
    import config

    if config.UPSTASH_URL and config.UPSTASH_TOKEN:
        return UpstashRateLimiter(config.UPSTASH_URL, config.UPSTASH_TOKEN, max_hits, window_s, prefix)
    return RateLimiter(max_hits, window_s)
