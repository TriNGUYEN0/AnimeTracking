import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// Interface mise à jour correspondante au Backend
export interface Anime {
  title: string;
  image_url: string;
  large_image_url: string;
  score: number;
  rank: number;
  episodes: number;
  year: number;
  synopsis: string;
  genres: string[];
}

@Injectable({
  providedIn: 'root'
})
export class AnimeService {
  private http = inject(HttpClient);
  private apiUrl = 'https://animetracking.onrender.com/api/anime/top';
  private urlHasardApi = 'https://animetracking.onrender.com/api/anime/hasard';

  getTopAnime(): Observable<Anime[]> {
    return this.http.get<Anime[]>(this.apiUrl);
  }

  obtenirAnimeAleatoire(): Observable<Anime> {
    return this.http.get<Anime>(this.urlHasardApi);
  }
}