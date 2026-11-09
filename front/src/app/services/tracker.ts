import { Injectable, computed, signal } from '@angular/core';

export type TrackStatus = 'watching' | 'completed' | 'planned' | 'paused' | 'dropped';

export interface TrackEntry {
  status: TrackStatus;
  ep: number;
  rating: number; // 0 = not rated, 1..10
  updated: string;
}

export const STATUS_LABELS: Record<TrackStatus, string> = {
  watching: 'Watching',
  completed: 'Completed',
  planned: 'Plan to watch',
  paused: 'On hold',
  dropped: 'Dropped',
};

const KEY = 'tracker:v1';

/** Personal list stored only in this browser (localStorage); export/import as JSON. */
@Injectable({ providedIn: 'root' })
export class Tracker {
  readonly entries = signal<Record<number, TrackEntry>>(this.load());
  readonly count = computed(() => Object.keys(this.entries()).length);

  get(id: number): TrackEntry | undefined {
    return this.entries()[id];
  }

  set(id: number, patch: Partial<TrackEntry>, totalEpisodes = 0) {
    this.entries.update((all) => {
      const prev = all[id] ?? { status: 'planned' as TrackStatus, ep: 0, rating: 0, updated: '' };
      const next: TrackEntry = { ...prev, ...patch, updated: new Date().toISOString() };
      if (totalEpisodes) next.ep = Math.min(next.ep, totalEpisodes);
      next.ep = Math.max(0, next.ep);
      // Reaching the last episode completes the show; completing fills the episode count.
      if (patch.ep !== undefined && totalEpisodes && next.ep === totalEpisodes) next.status = 'completed';
      if (patch.status === 'completed' && totalEpisodes) next.ep = totalEpisodes;
      if (patch.ep !== undefined && next.ep > 0 && next.status === 'planned') next.status = 'watching';
      return { ...all, [id]: next };
    });
    this.save();
  }

  remove(id: number) {
    this.entries.update((all) => {
      const { [id]: _, ...rest } = all;
      return rest;
    });
    this.save();
  }

  exportJson(): string {
    return JSON.stringify({ app: 'AnimeTracking', version: 1, exported: new Date().toISOString(), entries: this.entries() }, null, 1);
  }

  importJson(text: string): number {
    const data = JSON.parse(text);
    const incoming = (data?.entries ?? {}) as Record<number, TrackEntry>;
    const valid = Object.entries(incoming).filter(([id, e]) => Number(id) > 0 && e && e.status in STATUS_LABELS);
    this.entries.update((all) => ({ ...all, ...Object.fromEntries(valid) }));
    this.save();
    return valid.length;
  }

  private load(): Record<number, TrackEntry> {
    try {
      return JSON.parse(localStorage.getItem(KEY) ?? '{}');
    } catch {
      return {};
    }
  }

  private save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.entries()));
    } catch {
      /* storage full or disabled: list lives for this session only */
    }
  }
}
