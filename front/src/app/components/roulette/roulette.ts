import { Component, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

export interface RouletteAnime {
  id: number;
  titre: string; // Keeping JSON key mapping
  image_url: string;
  score: number;
  genres: string[];
  synopsis: string;
}

@Component({
  selector: 'app-roulette',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './roulette.html',
  styleUrl: './roulette.css'
})
export class RouletteComponent implements OnInit {
  animeList: RouletteAnime[] = [];
  
  // State management using Signals
  selectedAnime = signal<RouletteAnime | null>(null);
  animationState = signal<'idle' | 'shaking' | 'revealed'>('idle');

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    this.http.get<RouletteAnime[]>('assets/animes_graphe.json').subscribe({
      next: (data) => {
        this.animeList = data;
      },
      error: (err) => console.error(err)
    });
  }

  drawOmikuji(): void {
    if (this.animeList.length === 0) return;

    this.animationState.set('shaking');
    this.selectedAnime.set(null);

    // Wait for the shake animation to complete before revealing
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * this.animeList.length);
      this.selectedAnime.set(this.animeList[randomIndex]);
      this.animationState.set('revealed');
    }, 2000);
  }

  resetDraw(): void {
    this.animationState.set('idle');
    this.selectedAnime.set(null);
  }
}