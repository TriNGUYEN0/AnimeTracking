import { Component, computed, effect, inject, signal, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataStore, Anime, posterUrl } from '../../services/data-store';

type Hint = 'hit' | 'near' | 'miss';
interface Cell { text: string; hint: Hint; arrow?: '↑' | '↓' }
interface Row { anime: Anime; cells: Cell[]; win: boolean }
interface Stats { played: number; wins: number; streak: number; best: number; lastDay: number }

const MAX_GUESSES = 8;
const EPOCH = Date.UTC(2026, 10, 9); // puzzle #1 = 9 Nov 2026 (UTC)
const DAY = 86_400_000;
const COLUMNS = ['Year', 'Studio', 'Genres', 'Score', 'Episodes'];

const store = {
  get<T>(key: string, fallback: T): T {
    try {
      const v = localStorage.getItem(key);
      return v ? (JSON.parse(v) as T) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key: string, value: unknown) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* private mode: game still works, just not remembered */
    }
  },
};

/** Small deterministic hash so everybody gets the same answer on the same UTC day. */
function hash(n: number): number {
  let x = (n + 0x9e3779b9) | 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return (x ^ (x >>> 16)) >>> 0;
}

function compare(g: Anime, t: Anime): Cell[] {
  const num = (a: number, b: number, nearPct: number, fmt: (v: number) => string = String): Cell => {
    if (!a || !b) return { text: a ? fmt(a) : '?', hint: 'miss' };
    if (a === b) return { text: fmt(a), hint: 'hit' };
    const near = Math.abs(a - b) <= Math.max(nearPct * b, 0.0001);
    return { text: fmt(a), hint: near ? 'near' : 'miss', arrow: b > a ? '↑' : '↓' };
  };
  const sharedStudio = g.studios.some((s) => t.studios.includes(s));
  const sharedGenres = g.genres.filter((x) => t.genres.includes(x)).length;
  const sameGenres = sharedGenres === t.genres.length && g.genres.length === t.genres.length;
  return [
    g.year && t.year && Math.abs(g.year - t.year) <= 2 && g.year !== t.year
      ? { text: String(g.year), hint: 'near', arrow: t.year > g.year ? '↑' : '↓' }
      : num(g.year, t.year, 0),
    { text: g.studios[0] ?? '?', hint: sharedStudio ? 'hit' : 'miss' },
    { text: sameGenres ? 'All' : `${sharedGenres}/${t.genres.length}`, hint: sameGenres ? 'hit' : sharedGenres ? 'near' : 'miss' },
    num(g.score, t.score, 0.03, (v) => v.toFixed(2)),
    num(g.episodes, t.episodes, 0.2),
  ];
}

@Component({
  selector: 'app-animedle',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './animedle.html',
  styleUrl: './animedle.css',
})
export class AnimedleComponent implements OnDestroy {
  private data = inject(DataStore);
  readonly posterUrl = posterUrl;
  readonly columns = COLUMNS;
  readonly max = MAX_GUESSES;

  readonly day = Math.floor((Date.now() - EPOCH) / DAY) + 1;
  readonly practice = signal(false);
  private readonly practiceSeed = signal(0);
  readonly guessIds = signal<number[]>([]);
  readonly query = signal('');
  readonly copied = signal(false);
  readonly countdown = signal('');
  readonly stats = signal<Stats>(store.get('dle:stats', { played: 0, wins: 0, streak: 0, best: 0, lastDay: 0 }));
  private timer = setInterval(() => this.tick(), 1000);

  /** Well-known titles only, so the daily answer is fair. */
  private readonly pool = computed(() => {
    const all = this.data.animes().filter((a) => a.score > 0 && a.img && a.studios.length && a.genres.length);
    const byPopularity = all.some((a) => a.members > 0)
      ? [...all].sort((a, b) => b.members - a.members)
      : [...all].sort((a, b) => (a.rank || 1e9) - (b.rank || 1e9));
    return byPopularity.slice(0, 400).sort((a, b) => a.id - b.id);
  });

  readonly target = computed<Anime | null>(() => {
    const pool = this.pool();
    if (!pool.length) return null;
    const seed = this.practice() ? this.practiceSeed() : this.day;
    return pool[hash(seed) % pool.length];
  });

  readonly rows = computed<Row[]>(() => {
    const t = this.target();
    const byId = this.data.byId();
    if (!t) return [];
    return this.guessIds()
      .map((id) => byId.get(id))
      .filter((a): a is Anime => !!a)
      .map((a) => ({ anime: a, cells: compare(a, t), win: a.id === t.id }));
  });

  readonly won = computed(() => this.rows().some((r) => r.win));
  readonly over = computed(() => this.won() || this.rows().length >= MAX_GUESSES);
  readonly blur = computed(() => (this.over() ? 0 : Math.max(4, 30 - this.rows().length * 4)));

  readonly suggestions = computed(() => {
    const q = this.query().toLowerCase().trim();
    if (q.length < 2) return [];
    const taken = new Set(this.guessIds());
    return this.data
      .animes()
      .filter((a) => !taken.has(a.id) && a.score > 0 && (a.title.toLowerCase().includes(q) || a.titleEn.toLowerCase().includes(q)))
      .sort((a, b) => (a.rank || 1e9) - (b.rank || 1e9))
      .slice(0, 7);
  });

  constructor() {
    this.guessIds.set(store.get<number[]>(`dle:day:${this.day}`, []));
    this.tick();
    // Persist the daily game (not practice rounds).
    effect(() => {
      if (!this.practice()) store.set(`dle:day:${this.day}`, this.guessIds());
    });
  }

  ngOnDestroy() {
    clearInterval(this.timer);
  }

  guess(a: Anime) {
    if (this.over()) return;
    this.guessIds.update((ids) => [...ids, a.id]);
    this.query.set('');
    if (this.over() && !this.practice()) this.recordResult();
  }

  newPractice() {
    this.practice.set(true);
    this.practiceSeed.set(Math.floor(Math.random() * 1e9));
    this.guessIds.set([]);
    this.copied.set(false);
  }

  backToDaily() {
    this.practice.set(false);
    this.guessIds.set(store.get<number[]>(`dle:day:${this.day}`, []));
    this.copied.set(false);
  }

  async share() {
    const squares = this.rows()
      .map((r) => r.cells.map((c) => (c.hint === 'hit' ? '🟩' : c.hint === 'near' ? '🟨' : '⬛')).join(''))
      .join('\n');
    const score = this.won() ? `${this.rows().length}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`;
    const text = `Animedle #${this.day} ${score}\n${squares}\n${location.href.split('#')[0]}#/dle`;
    try {
      await navigator.clipboard.writeText(text);
      this.copied.set(true);
    } catch {
      prompt('Copy your result:', text);
    }
  }

  private recordResult() {
    const s = { ...this.stats() };
    if (s.lastDay === this.day) return;
    s.played++;
    if (this.won()) {
      s.wins++;
      s.streak = s.lastDay === this.day - 1 ? s.streak + 1 : 1;
      s.best = Math.max(s.best, s.streak);
    } else {
      s.streak = 0;
    }
    s.lastDay = this.day;
    this.stats.set(s);
    store.set('dle:stats', s);
  }

  private tick() {
    const left = DAY - ((Date.now() - EPOCH) % DAY);
    const h = Math.floor(left / 3_600_000);
    const m = Math.floor((left % 3_600_000) / 60_000);
    const sec = Math.floor((left % 60_000) / 1000);
    this.countdown.set([h, m, sec].map((n) => String(n).padStart(2, '0')).join(':'));
  }
}
