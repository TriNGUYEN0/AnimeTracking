import { Component, OnInit, inject, signal } from '@angular/core';
import { AnimeService, Anime } from '../../services/anime.service';
import { AnimeCardComponent } from '../anime-card/anime-card';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [AnimeCardComponent],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class HomeComponent implements OnInit {
  private animeService = inject(AnimeService);
  protected animeList = signal<Anime[]>([]);

  ngOnInit() {
    this.animeService.getTopAnime().subscribe({
      next: (data) => {
        const sortedData = data.sort((a, b) => a.rank - b.rank);
        
        this.animeList.set(sortedData);
      },
      error: (err) => console.error('Erreur:', err)
    });
  }
}