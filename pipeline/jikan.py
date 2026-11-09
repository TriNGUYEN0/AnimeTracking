"""Polite Jikan v4 client: <= ~55 req/min, exponential backoff, aborts fast when the API is down."""
import random
import sys
import time

import requests

BASE = "https://api.jikan.moe/v4"
GAP = 1.1  # seconds between requests (~55/min, Jikan hard cap is 60/min)
RETRY_STATUS = {429, 500, 502, 503, 504}
MAX_CONSECUTIVE_FAILURES = 8  # API considered down -> abort instead of burning the job timeout


class JikanDown(RuntimeError):
    pass


class Jikan:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers["User-Agent"] = (
            "AnimeTracking-pipeline (+https://github.com/TriNGUYEN0/AnimeTracking)")
        self._last = 0.0
        self._failures = 0
        self.calls = 0

    def get(self, path, params=None, tries=5):
        for attempt in range(tries):
            wait = self._last + GAP - time.time()
            if wait > 0:
                time.sleep(wait)
            self._last = time.time()
            self.calls += 1
            try:
                r = self.session.get(BASE + path, params=params, timeout=30)
            except requests.RequestException as exc:
                r, err = None, str(exc)
            else:
                err = f"HTTP {r.status_code}"
                if r.ok:
                    self._failures = 0
                    return r.json()
                if r.status_code not in RETRY_STATUS:
                    raise RuntimeError(f"{path} {params}: {err}")
            self._failures += 1
            print(f"  ! {path} {params or ''} -> {err} (attempt {attempt + 1})", file=sys.stderr, flush=True)
            if self._failures >= MAX_CONSECUTIVE_FAILURES:
                raise JikanDown(f"{self._failures} consecutive failures, last: {err}")
            retry_after = 0
            if r is not None and r.headers.get("Retry-After", "").isdigit():
                retry_after = int(r.headers["Retry-After"])
            time.sleep(max(retry_after, 2 ** attempt + random.random()))
        raise RuntimeError(f"giving up on {path} {params}")

    def paged(self, path, params=None, max_pages=10_000):
        params = dict(params or {})
        page = 1
        while page <= max_pages:
            params["page"] = page
            js = self.get(path, params)
            yield from js.get("data", [])
            pag = js.get("pagination") or {}
            if page % 50 == 0:
                print(f"  {path}: page {page}/{pag.get('last_visible_page')}", flush=True)
            if not pag.get("has_next_page"):
                return
            page += 1
