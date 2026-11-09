import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { DataStore } from '../../services/data-store';

type Mode = 'studios' | 'genres';
const TOP = 10;
const COLORS = ['#ff5d8f', '#b18cff', '#2ee6d0', '#ffc24b', '#7c9cff', '#49d17d', '#ff9e6b', '#c9a8ff', '#6fd3ff', '#ffd36b', '#e66767', '#8fe6b0'];

/** Animated "bar chart race": cumulative number of anime per studio or genre, year after year. */
@Component({
  selector: 'app-race',
  standalone: true,
  templateUrl: './race.html',
  styleUrl: './race.css',
})
export class RaceComponent implements OnDestroy {
  private data = inject(DataStore);
  readonly mode = signal<Mode>('studios');
  readonly playing = signal(false);
  private timer: ReturnType<typeof setInterval> | null = null;

  readonly years = computed(() => {
    const ys = this.data.animes().map((a) => a.year).filter((y) => y >= 1960);
    if (!ys.length) return { min: 1960, max: 2026 };
    return { min: Math.max(1960, Math.min(...ys)), max: Math.max(...ys) };
  });
  readonly year = signal(0);
  readonly coverage = computed(() => {
    const all = this.data.animes();
    return all.length ? all.filter((a) => a.year > 0).length / all.length : 0;
  });

  /** Cumulative counts per key, per year. */
  private readonly table = computed(() => {
    const mode = this.mode();
    const byYear = new Map<number, Map<string, number>>();
    for (const a of this.data.animes()) {
      if (a.year < 1960) continue;
      const keys = mode === 'studios' ? a.studios : a.genres;
      let m = byYear.get(a.year);
      if (!m) byYear.set(a.year, (m = new Map()));
      for (const k of keys) m.set(k, (m.get(k) ?? 0) + 1);
    }
    const { min, max } = this.years();
    const running = new Map<string, number>();
    const out = new Map<number, [string, number][]>();
    for (let y = min; y <= max; y++) {
      for (const [k, n] of byYear.get(y) ?? []) running.set(k, (running.get(k) ?? 0) + n);
      out.set(y, [...running.entries()].sort((a, b) => b[1] - a[1]).slice(0, TOP));
    }
    return out;
  });

  private colorOf = new Map<string, string>();
  readonly bars = computed(() => {
    const y = this.year() || this.years().max;
    const rows = this.table().get(y) ?? [];
    const max = rows[0]?.[1] || 1;
    return rows.map(([name, n], i) => {
      if (!this.colorOf.has(name)) this.colorOf.set(name, COLORS[this.colorOf.size % COLORS.length]);
      return { name, n, rank: i, pct: (100 * n) / max, color: this.colorOf.get(name)! };
    });
  });

  readonly shownYear = computed(() => this.year() || this.years().max);

  setMode(m: Mode) {
    this.mode.set(m);
    this.colorOf.clear();
  }

  toggle() {
    if (this.playing()) return this.stop();
    const { min, max } = this.years();
    if (!this.year() || this.year() >= max) this.year.set(min);
    this.playing.set(true);
    this.timer = setInterval(() => {
      if (this.year() >= this.years().max) return this.stop();
      this.year.update((y) => y + 1);
    }, 550);
  }

  scrub(v: string) {
    this.stop();
    this.year.set(+v);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.playing.set(false);
  }

  ngOnDestroy() {
    this.stop();
  }
}
