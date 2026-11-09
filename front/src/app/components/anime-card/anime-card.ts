import { Component, Input, inject, signal } from '@angular/core';
import { DataStore, Anime, posterUrl } from '../../services/data-store';

@Component({
  selector: 'app-anime-card',
  standalone: true,
  templateUrl: './anime-card.html',
  styleUrl: './anime-card.css',
})
export class AnimeCardComponent {
  @Input({ required: true }) anime!: Anime;

  private store = inject(DataStore);
  readonly posterUrl = posterUrl;
  readonly synopsis = signal<string | null>(null);

  /** Synopses are not in the index: fetch the small shard the first time the card is hovered. */
  async loadSynopsis() {
    if (this.synopsis() !== null) return;
    this.synopsis.set('');
    this.synopsis.set((await this.store.synopsis(this.anime.id)) || 'No synopsis available.');
  }
}
