import { Injectable } from '@angular/core';

const BASE = 'https://api.jikan.moe/v4';
const GAP_MS = 400; // <= 2.5 req/s (Jikan: 3/s)
const PER_MIN = 50; // keep 10 spare for retries (Jikan: 60/min)
const TTL_MS = 24 * 3600_000; // Jikan itself caches every response for 24 h
const CACHE_NAME = 'jikan-v1';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Entry<T> {
  t: number;
  v: T;
}

/**
 * Browser-side Jikan client shared by the whole app:
 * - one sequential queue: >= 400 ms between calls and <= 50 calls per rolling minute
 * - identical in-flight requests are merged
 * - responses cached 24 h (Cache Storage, falls back to memory)
 * - 429 / 5xx / network errors retried with exponential backoff, then stale data if any
 */
@Injectable({ providedIn: 'root' })
export class JikanClient {
  private sent: number[] = [];
  private gate: Promise<void> = Promise.resolve();
  private inflight = new Map<string, Promise<unknown>>();
  private memory = new Map<string, Entry<unknown>>();
  /** Circuit breaker: after a request exhausts its retries, fail fast for a while instead of queueing more. */
  private downUntil = 0;

  isDown(): boolean {
    return Date.now() < this.downUntil;
  }

  get<T>(path: string): Promise<T> {
    const pending = this.inflight.get(path);
    if (pending) return pending as Promise<T>;
    const p = (async () => {
      const hit = await this.read<T>(path);
      if (hit && Date.now() - hit.t < TTL_MS) return hit.v;
      return this.fetchWithRetry<T>(path, hit?.v);
    })().finally(() => this.inflight.delete(path));
    this.inflight.set(path, p);
    return p;
  }

  private async fetchWithRetry<T>(path: string, stale?: T): Promise<T> {
    for (let attempt = 0; attempt < 3 && !this.isDown(); attempt++) {
      await this.slot();
      if (this.isDown()) break;
      try {
        const res = await fetch(BASE + path, { signal: AbortSignal.timeout(8_000) });
        if (res.ok) {
          const v = (await res.json()) as T;
          await this.write(path, { t: Date.now(), v });
          return v;
        }
        if (res.status !== 429 && res.status < 500) {
          // 400/404: the API works, this resource just does not exist; retrying will not help.
          if (stale !== undefined) return stale;
          throw new Error(`Jikan ${res.status} for ${path}`);
        }
      } catch (err) {
        if (err instanceof Error && err.message.startsWith('Jikan ')) throw err;
        /* timeout or network error: retry */
      }
      await sleep(1000 * 2 ** attempt + Math.random() * 300);
    }
    if (!this.isDown()) this.downUntil = Date.now() + 5 * 60_000;
    if (stale !== undefined) return stale;
    throw new Error(`Jikan did not answer for ${path}`);
  }

  /** Sequential gate: >= GAP_MS between calls and <= PER_MIN calls in the last 60 s. */
  private slot(): Promise<void> {
    const turn = this.gate.then(async () => {
      const now = Date.now();
      this.sent = this.sent.filter((t) => now - t < 60_000);
      let wait = Math.max(0, (this.sent.at(-1) ?? 0) + GAP_MS - now);
      if (this.sent.length >= PER_MIN) wait = Math.max(wait, this.sent[0] + 60_000 - now);
      await sleep(wait);
      this.sent.push(Date.now());
    });
    this.gate = turn;
    return turn;
  }

  private async read<T>(path: string): Promise<Entry<T> | undefined> {
    const mem = this.memory.get(path) as Entry<T> | undefined;
    if (mem) return mem;
    try {
      const res = await (await caches.open(CACHE_NAME)).match(BASE + path);
      if (!res) return undefined;
      const entry = (await res.json()) as Entry<T>;
      this.memory.set(path, entry);
      return entry;
    } catch {
      return undefined;
    }
  }

  private async write<T>(path: string, entry: Entry<T>): Promise<void> {
    this.memory.set(path, entry);
    try {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(BASE + path, new Response(JSON.stringify(entry), { headers: { 'Content-Type': 'application/json' } }));
    } catch {
      /* Cache Storage unavailable (private mode, http): memory only */
    }
  }
}
