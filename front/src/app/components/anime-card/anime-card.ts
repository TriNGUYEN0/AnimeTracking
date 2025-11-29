import { Component, Input } from '@angular/core';
import { Anime } from '../../services/anime.service';

@Component({
  selector: 'app-anime-card',
  standalone: true,
  template: `
    <div class="card">
      <div class="rank">#{{ anime.rank }}</div>
      <img [src]="anime.image_url" [alt]="anime.title" loading="lazy" />
      <div class="info">
        <h3>{{ anime.title }}</h3>
        <span class="score">⭐ {{ anime.score }}</span>
      </div>
    </div>
  `,
  styles: [`
    /* Styles spécifiques au composant */
    .card {
      background-color: var(--card-bg);
      border-radius: 8px;
      overflow: hidden;
      transition: transform 0.2s;
      position: relative;
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    .card:hover {
      transform: translateY(-5px);
    }
    .rank {
      position: absolute;
      top: 0;
      left: 0;
      background: var(--accent-color);
      color: black;
      padding: 4px 8px;
      font-weight: bold;
      border-bottom-right-radius: 8px;
    }
    img {
      width: 100%;
      height: 250px;
      object-fit: cover;
    }
    .info {
      padding: 12px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      flex-grow: 1;
    }
    h3 {
      font-size: 1rem;
      margin: 0 0 8px 0;
      color: var(--text-primary);
    }
    .score {
      color: var(--text-secondary);
      font-size: 0.9rem;
    }
  `]
})
export class AnimeCardComponent {
  // Propriété d'entrée pour recevoir les données
  @Input({ required: true }) anime!: Anime;
}