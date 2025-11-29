import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AnimeService, Anime } from './services/anime.service';
import { AnimeCardComponent } from './components/anime-card/anime-card';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, AnimeCardComponent],
  template: `
    <div class="container">
      <header>
        <h1>Anime Tracking</h1>
      </header>
      
      <main class="grid">
        @for (anime of animeList(); track anime.rank) {
          <app-anime-card [anime]="anime" />
        }
      </main>
    </div>
  `,
  styles: [`
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    header {
      margin-bottom: 30px;
      border-bottom: 1px solid #333;
    }
    h1 {
      color: var(--accent-color);
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 20px;
    }
  `]
})
export class App implements OnInit {
  // Utilisation des Signals pour la gestion d'état réactive
  private animeService = inject(AnimeService);
  protected animeList = signal<Anime[]>([]);

  ngOnInit() {
    // Appel du service au chargement
    this.animeService.getTopAnime().subscribe({
      next: (data) => this.animeList.set(data),
      error: (err) => console.error('Erreur:', err)
    });
  }
}