import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { DataStore, Anime, posterUrl, malUrl } from '../../services/data-store';
import { JikanClient } from '../../services/jikan-client';
import { Tracker, TrackStatus, STATUS_LABELS } from '../../services/tracker';

interface Named { mal_id: number; name: string; type?: string }
interface FullAnime {
  title: string;
  images: { webp?: { large_image_url: string }; jpg: { large_image_url: string } };
  score: number | null;
  rank: number | null;
  year: number | null;
  episodes: number | null;
  type: string | null;
  synopsis: string | null;
  genres: Named[];
  themes: Named[];
  demographics: Named[];
  studios: Named[];
  title_english: string | null;
  title_japanese: string | null;
  trailer: { youtube_id: string | null } | null;
  rating: string | null;
  source: string | null;
  duration: string | null;
  status: string | null;
  aired: { string: string } | null;
  members: number | null;
  popularity: number | null;
  favorites: number | null;
  scored_by: number | null;
  theme: { openings: string[]; endings: string[] } | null;
  relations: { relation: string; entry: Named[] }[];
  streaming: { name: string; url: string }[];
}
interface CharacterRole {
  character: { mal_id: number; name: string; images: { webp?: { image_url: string }; jpg: { image_url: string } } };
  role: string;
  voice_actors: { person: { mal_id: number; name: string }; language: string }[];
}
interface Stats {
  watching: number; completed: number; on_hold: number; dropped: number; plan_to_watch: number; total: number;
  scores: { score: number; votes: number; percentage: number }[];
}
interface Reco { entry: { mal_id: number; title: string; images: { webp?: { image_url: string }; jpg: { image_url: string } } }; votes: number }

@Component({
  selector: 'app-anime-detail',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  templateUrl: './anime-detail.html',
  styleUrl: './anime-detail.css',
})
export class AnimeDetailComponent {
  private store = inject(DataStore);
  private jikan = inject(JikanClient);
  private sanitizer = inject(DomSanitizer);
  readonly posterUrl = posterUrl;
  readonly malUrl = malUrl;

  readonly id = signal(0);
  readonly anime = computed<Anime | undefined>(() => this.store.byId().get(this.id()));
  readonly synopsis = signal('');
  readonly full = signal<FullAnime | null>(null);
  readonly characters = signal<CharacterRole[]>([]);
  readonly stats = signal<Stats | null>(null);
  readonly recos = signal<Reco[]>([]);
  readonly live = signal<'loading' | 'ok' | 'down'>('loading');
  readonly trailerOn = signal(false);
  readonly tracker = inject(Tracker);
  readonly statusLabels = STATUS_LABELS;
  readonly statuses = Object.keys(STATUS_LABELS) as TrackStatus[];
  readonly entry = computed(() => this.tracker.entries()[this.id()]);
  readonly ratings = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

  /** Header data: the local snapshot when we have it, otherwise whatever the live API returned. */
  readonly header = computed(() => {
    const a = this.anime();
    const f = this.full();
    if (a) return { ...a, poster: posterUrl(a, true) };
    if (!f) return null;
    return {
      id: this.id(), title: f.title, titleEn: f.title_english ?? '', score: f.score ?? 0, rank: f.rank ?? 0,
      year: f.year ?? 0, episodes: f.episodes ?? 0, type: f.type ?? '', members: f.members ?? 0,
      genres: f.genres.map((g) => g.name), themes: [...f.themes, ...f.demographics].map((t) => t.name),
      studios: f.studios.map((s) => s.name), poster: f.images.webp?.large_image_url || f.images.jpg.large_image_url,
    };
  });

  readonly trailerUrl = computed<SafeResourceUrl | null>(() => {
    const yt = this.full()?.trailer?.youtube_id || this.anime()?.yt;
    return yt ? this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0`) : null;
  });

  /** Score distribution (1..10) + derived "Score DNA" metrics. */
  readonly dna = computed(() => {
    const s = this.stats();
    if (!s || !s.scores?.length) return null;
    const votes = s.scores.reduce((n, x) => n + x.votes, 0);
    if (!votes) return null;
    const mean = s.scores.reduce((n, x) => n + x.score * x.votes, 0) / votes;
    const sd = Math.sqrt(s.scores.reduce((n, x) => n + x.votes * (x.score - mean) ** 2, 0) / votes);
    const max = Math.max(...s.scores.map((x) => x.percentage));
    const finished = s.completed + s.dropped;
    return {
      bars: s.scores.map((x) => ({ score: x.score, pct: x.percentage, h: (x.percentage / max) * 100 })),
      sd,
      dropRate: finished ? (100 * s.dropped) / finished : 0,
      planShare: s.total ? (100 * s.plan_to_watch) / s.total : 0,
      verdict: sd >= 2.2 ? 'Divisive' : sd <= 1.4 ? 'Strong consensus' : 'Mostly agreed',
    };
  });

  readonly mainCharacters = computed(() =>
    [...this.characters()].sort((a, b) => (a.role === 'Main' ? 0 : 1) - (b.role === 'Main' ? 0 : 1)).slice(0, 12),
  );

  readonly related = computed(() =>
    (this.full()?.relations ?? [])
      .flatMap((r) => r.entry.filter((e) => e.type === 'anime').map((e) => ({ ...e, relation: r.relation, local: this.store.byId().get(e.mal_id) })))
      .slice(0, 12),
  );

  constructor() {
    inject(ActivatedRoute).paramMap.subscribe((p) => this.load(Number(p.get('id'))));
  }

  private totalEps(): number {
    return this.header()?.episodes || 0;
  }

  track(patch: { status?: TrackStatus; ep?: number; rating?: number }) {
    this.tracker.set(this.id(), patch, this.totalEps());
  }

  untrack() {
    this.tracker.remove(this.id());
  }

  japaneseVoice(c: CharacterRole): string {
    return c.voice_actors.find((v) => v.language === 'Japanese')?.person.name ?? '';
  }

  charImage(c: CharacterRole): string {
    return c.character.images.webp?.image_url || c.character.images.jpg.image_url;
  }

  recoImage(r: Reco): string {
    return r.entry.images.webp?.image_url || r.entry.images.jpg.image_url;
  }

  songSearch(song: string): string {
    const clean = song.replace(/^\d+:\s*/, '').replace(/\(eps?[^)]*\)/gi, '').trim();
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(clean)}`;
  }

  private async load(id: number) {
    this.id.set(id);
    this.full.set(null);
    this.characters.set([]);
    this.stats.set(null);
    this.recos.set([]);
    this.trailerOn.set(false);
    this.live.set('loading');
    window.scrollTo({ top: 0 });

    this.store.synopsis(id).then((s) => this.id() === id && this.synopsis.set(s));

    // Four calls through the shared rate-limited queue; each part renders as soon as it arrives.
    const parts = [
      this.jikan.get<{ data: FullAnime }>(`/anime/${id}/full`).then((r) => {
        if (this.id() !== id) return;
        this.full.set(r.data);
        if (!this.synopsis() && r.data.synopsis) this.synopsis.set(r.data.synopsis);
      }),
      this.jikan.get<{ data: Stats }>(`/anime/${id}/statistics`).then((r) => this.id() === id && this.stats.set(r.data)),
      this.jikan.get<{ data: CharacterRole[] }>(`/anime/${id}/characters`).then((r) => this.id() === id && this.characters.set(r.data)),
      this.jikan.get<{ data: Reco[] }>(`/anime/${id}/recommendations`).then((r) => this.id() === id && this.recos.set(r.data.slice(0, 10))),
    ];
    const results = await Promise.allSettled(parts);
    if (this.id() === id) this.live.set(results.some((r) => r.status === 'fulfilled') ? 'ok' : 'down');
  }
}
