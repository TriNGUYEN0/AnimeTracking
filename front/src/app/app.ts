import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AnimeService, Anime } from './services/anime.service';
import { AnimeCardComponent } from './components/anime-card/anime-card';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, AnimeCardComponent],
  // Utilisation des fichiers externes
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  // Injection de dépendance
  private animeService = inject(AnimeService);
  // Signal pour la réactivité
  protected animeList = signal<Anime[]>([]);

  ngOnInit() {
    this.animeService.getTopAnime().subscribe({
      next: (data) => this.animeList.set(data),
      error: (err) => console.error('Erreur:', err)
    });
  }
}