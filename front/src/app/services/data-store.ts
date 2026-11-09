import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

/** One anime as used everywhere in the UI (decoded from data/index.json). */
export interface Anime {
  id: number;
  title: string;
  titleEn: string;
  year: number;
  score: number;
  members: number;
  episodes: number;
  type: string;
  genres: string[];
  studios: string[];
  themes: string[];
  img: string;
  rank: number;
  yt: string;
  airing: boolean;
  aired: string;
}

export interface DataMeta {
  updatedAt: string;
  count: number;
  source: string;
  airingUpdatedAt?: string;
}

interface IndexFile {
  v: number;
  fields: string[];
  genres: string[];
  studios: string[];
  themes: string[];
  types: string[];
  rows: unknown[][];
}

const CDN = 'https://cdn.myanimelist.net/images/anime/';
const SHARDS = 256;

/** Poster URL on MyAnimeList's CDN (webp is ~70% lighter than jpg). */
export function posterUrl(a: { img: string } | null | undefined, large = false): string {
  return a?.img ? `${CDN}${a.img}${large ? 'l' : ''}.webp` : '';
}

export function malUrl(a: { id: number }): string {
  return `https://myanimelist.net/anime/${a.id}`;
}

function decode(file: IndexFile): Anime[] {
  const { genres, studios, themes, types } = file;
  return file.rows.map((r) => {
    const [id, title, titleEn, year, score, members, episodes, type, g, s, th, img, rank, yt, airing, aired] =
      r as [number, string, string, number, number, number, number, number, number[], number[], number[], string, number, string, number, string];
    return {
      id,
      title,
      titleEn: titleEn || '',
      year: year || 0,
      score: score || 0,
      members: members || 0,
      episodes: episodes || 0,
      type: type >= 0 ? types[type] : '',
      genres: g.map((i) => genres[i]),
      studios: s.map((i) => studios[i]),
      themes: th.map((i) => themes[i]),
      img,
      rank: rank || 0,
      yt: yt || '',
      airing: !!airing,
      aired: aired || '',
    };
  });
}

/**
 * Single source of truth for the static dataset: fetched once, shared by every page.
 * Synopses live in 256 small shards (data/syn/xx.json) and are loaded on demand.
 */
@Injectable({ providedIn: 'root' })
export class DataStore {
  private http = inject(HttpClient);
  private synShards = new Map<number, Promise<Record<string, string>>>();

  readonly animes = signal<Anime[]>([]);
  readonly meta = signal<DataMeta | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');

  readonly byId = computed(() => new Map(this.animes().map((a) => [a.id, a])));
  readonly genres = computed(() => [...new Set(this.animes().flatMap((a) => a.genres))].sort());
  readonly studios = computed(() => [...new Set(this.animes().flatMap((a) => a.studios))].sort());

  constructor() {
    this.http.get<IndexFile>('data/index.json').subscribe({
      next: (file) => {
        this.animes.set(decode(file));
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Cannot load data/index.json', err);
        this.error.set('Could not load the anime dataset.');
        this.loading.set(false);
      },
    });
    this.http.get<DataMeta>('data/meta.json').subscribe({
      next: (m) => this.meta.set(m),
      error: () => this.meta.set(null),
    });
  }

  /** Resolves once the index is loaded (immediately if already there). */
  async ready(): Promise<Anime[]> {
    if (!this.loading()) return this.animes();
    return new Promise((resolve) => {
      const t = setInterval(() => {
        if (!this.loading()) {
          clearInterval(t);
          resolve(this.animes());
        }
      }, 30);
    });
  }

  async synopsis(id: number): Promise<string> {
    const n = id % SHARDS;
    let shard = this.synShards.get(n);
    if (!shard) {
      const name = n.toString(16).padStart(2, '0');
      shard = firstValueFrom(this.http.get<Record<string, string>>(`data/syn/${name}.json`)).catch(() => ({}));
      this.synShards.set(n, shard);
    }
    return (await shard)[id] ?? '';
  }
}
