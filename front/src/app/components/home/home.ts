import { Component, computed, inject, signal, HostListener } from '@angular/core';
import { DatePipe } from '@angular/common';
import { DataStore, Anime, posterUrl } from '../../services/data-store';
import { AnimeCardComponent } from '../anime-card/anime-card';
import { RouletteComponent } from '../roulette/roulette';

interface Mood {
  icon: string;
  label: string;
  genre: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [AnimeCardComponent, RouletteComponent, DatePipe],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class HomeComponent {
  readonly store = inject(DataStore);
  readonly posterUrl = posterUrl;

  readonly moods: Mood[] = [
    { icon: '🔥', label: 'Action', genre: 'Action' },
    { icon: '😭', label: 'Emotional', genre: 'Drama' },
    { icon: '🤣', label: 'Funny', genre: 'Comedy' },
    { icon: '✨', label: 'Fantasy', genre: 'Fantasy' },
    { icon: '🚀', label: 'Sci-Fi', genre: 'Sci-Fi' },
    { icon: '🔄', label: 'All', genre: 'All' },
  ];
  readonly selectedMood = signal('All');
  readonly index = signal(0);
  readonly perPage = signal(this.computePerPage());

  /** Ranked, scored anime only: the carousel shows the best of each mood. */
  private readonly ranked = computed(() =>
    this.store
      .animes()
      .filter((a) => a.score > 0)
      .sort((a, b) => (a.rank || 1e9) - (b.rank || 1e9) || b.score - a.score),
  );

  readonly hero = computed<Anime | null>(() => this.ranked()[0] ?? null);

  readonly list = computed(() => {
    const mood = this.selectedMood();
    const all = this.ranked();
    return (mood === 'All' ? all : all.filter((a) => a.genres.includes(mood))).slice(0, 60);
  });

  readonly maxIndex = computed(() => Math.max(0, this.list().length - this.perPage()));

  @HostListener('window:resize')
  onResize() {
    this.perPage.set(this.computePerPage());
    this.index.update((i) => Math.min(i, this.maxIndex()));
  }

  private computePerPage(): number {
    const w = typeof window === 'undefined' ? 1200 : window.innerWidth;
    return w < 560 ? 2 : w < 820 ? 3 : w < 1100 ? 4 : 5;
  }

  selectMood(genre: string) {
    this.selectedMood.set(genre);
    this.index.set(0);
  }

  next() {
    this.index.update((i) => Math.min(i + this.perPage(), this.maxIndex()));
  }

  prev() {
    this.index.update((i) => Math.max(0, i - this.perPage()));
  }
}
