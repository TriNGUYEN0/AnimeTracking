import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { DataStore, Anime, posterUrl } from '../../services/data-store';
import { Tracker, TrackEntry, TrackStatus, STATUS_LABELS } from '../../services/tracker';

interface Item { anime: Anime; entry: TrackEntry }
interface Badge { icon: string; name: string; desc: string; earned: boolean }

const MINUTES_PER_EP = 24;

@Component({
  selector: 'app-my-list',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  templateUrl: './my-list.html',
  styleUrl: './my-list.css',
})
export class MyListComponent {
  private data = inject(DataStore);
  readonly tracker = inject(Tracker);
  readonly posterUrl = posterUrl;
  readonly labels = STATUS_LABELS;
  readonly tabs = Object.keys(STATUS_LABELS) as TrackStatus[];
  readonly tab = signal<TrackStatus>('watching');
  readonly message = signal('');

  readonly items = computed<Item[]>(() => {
    const byId = this.data.byId();
    return Object.entries(this.tracker.entries())
      .map(([id, entry]) => ({ anime: byId.get(Number(id)), entry }))
      .filter((x): x is Item => !!x.anime)
      .sort((a, b) => b.entry.updated.localeCompare(a.entry.updated));
  });

  readonly counts = computed(() => {
    const c = Object.fromEntries(this.tabs.map((t) => [t, 0])) as Record<TrackStatus, number>;
    for (const i of this.items()) c[i.entry.status]++;
    return c;
  });

  readonly visible = computed(() => this.items().filter((i) => i.entry.status === this.tab()));

  readonly stats = computed(() => {
    const items = this.items();
    const episodes = items.reduce((n, i) => n + i.entry.ep, 0);
    const rated = items.filter((i) => i.entry.rating > 0);
    const genres = new Map<string, number>();
    for (const i of items) for (const g of i.anime.genres) genres.set(g, (genres.get(g) ?? 0) + 1);
    const topGenre = [...genres.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
    const decades = new Set(items.filter((i) => i.anime.year).map((i) => Math.floor(i.anime.year / 10)));
    return {
      episodes,
      days: (episodes * MINUTES_PER_EP) / 1440,
      mean: rated.length ? rated.reduce((n, i) => n + i.entry.rating, 0) / rated.length : 0,
      topGenre,
      genreCount: genres.size,
      decades: decades.size,
      completed: items.filter((i) => i.entry.status === 'completed').length,
    };
  });

  readonly badges = computed<Badge[]>(() => {
    const s = this.stats();
    return [
      { icon: '🌱', name: 'First step', desc: 'Track your first anime', earned: this.items().length > 0 },
      { icon: '🏅', name: '100 episodes', desc: 'Watch 100 episodes', earned: s.episodes >= 100 },
      { icon: '🏆', name: 'Marathoner', desc: 'Watch 1,000 episodes', earned: s.episodes >= 1000 },
      { icon: '✅', name: 'Finisher', desc: 'Complete 10 anime', earned: s.completed >= 10 },
      { icon: '🧭', name: 'Time traveller', desc: 'Anime from 3 different decades', earned: s.decades >= 3 },
      { icon: '🎨', name: 'Omnivore', desc: '10 different genres', earned: s.genreCount >= 10 },
    ];
  });

  step(i: Item, delta: number) {
    this.tracker.set(i.anime.id, { ep: i.entry.ep + delta }, i.anime.episodes);
  }

  exportList() {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([this.tracker.exportJson()], { type: 'application/json' }));
    a.download = `animetracking-list-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async importList(ev: Event) {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const n = this.tracker.importJson(await file.text());
      this.message.set(`Imported ${n} entries.`);
    } catch {
      this.message.set('This file is not an AnimeTracking export.');
    }
    (ev.target as HTMLInputElement).value = '';
  }
}
