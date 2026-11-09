import { Component, inject, signal } from '@angular/core';
import { DataStore, Anime, posterUrl, malUrl } from '../../services/data-store';

interface Fortune {
  kanji: string;
  label: string;
}

/** Omikuji fortune level derived from the MAL score of the drawn anime. */
function fortuneOf(score: number): Fortune {
  if (score >= 8.5) return { kanji: '大吉', label: 'Great Blessing' };
  if (score >= 7.8) return { kanji: '中吉', label: 'Middle Blessing' };
  if (score >= 7.2) return { kanji: '小吉', label: 'Small Blessing' };
  return { kanji: '吉', label: 'Blessing' };
}

@Component({
  selector: 'app-roulette',
  standalone: true,
  templateUrl: './roulette.html',
  styleUrl: './roulette.css',
})
export class RouletteComponent {
  private store = inject(DataStore);
  readonly posterUrl = posterUrl;
  readonly malUrl = malUrl;

  readonly selected = signal<Anime | null>(null);
  readonly synopsis = signal('');
  readonly fortune = signal<Fortune | null>(null);
  readonly state = signal<'idle' | 'shaking' | 'revealed'>('idle');

  draw(): void {
    // Only reasonably good, scored titles: a fortune should be worth watching.
    const pool = this.store.animes().filter((a) => a.score >= 7 && a.img);
    if (pool.length === 0) return;

    this.state.set('shaking');
    this.selected.set(null);
    const pick = pool[Math.floor(Math.random() * pool.length)];
    this.synopsis.set('');
    this.store.synopsis(pick.id).then((s) => this.synopsis.set(s));

    setTimeout(() => {
      this.selected.set(pick);
      this.fortune.set(fortuneOf(pick.score));
      this.state.set('revealed');
    }, 2000);
  }

  reset(): void {
    this.state.set('idle');
    this.selected.set(null);
  }
}
