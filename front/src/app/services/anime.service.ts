import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// Interface pour le typage des données
export interface Anime {
  title: string;
  image_url: string;
  score: number;
  rank: number;
}

@Injectable({
  providedIn: 'root'
})
export class AnimeService {
  // Injection du client HTTP
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:5000/api/anime/top';

  // Méthode pour récupérer les animes depuis le backend Flask
  getTopAnime(): Observable<Anime[]> {
    return this.http.get<Anime[]>(this.apiUrl);
  }
}