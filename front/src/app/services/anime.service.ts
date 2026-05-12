import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, shareReplay, catchError } from 'rxjs/operators';

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
  
  private jsonUrl = '/assets/animes_graphe.json';

  private animesCache$: Observable<Anime[]> = this.http.get<any>(this.jsonUrl).pipe(
    map(reponse => {
      /* Gerer le cas ou le JSON a une racine 'data' ou est directement un tableau */
      const donnees = Array.isArray(reponse) ? reponse : (reponse.data || []);
      
      return donnees.map((item: any, index: number) => ({
        title: item.titre || item.title || 'Inconnu',
        image_url: item.image_url || '',
        large_image_url: item.large_image_url || item.image_url || '',
        score: Number(item.score || 0),
        rank: index + 1,
        episodes: Number(item.episodes || 0),
        year: Number(item.annee || item.year || 0),
        synopsis: item.synopsis || 'Aucun synopsis disponible.',
        genres: Array.isArray(item.genres) ? item.genres : []
      } as Anime));
    }),
    shareReplay(1),
    catchError(erreur => {
      console.error("Erreur lors du chargement du fichier JSON :", erreur);
      /* Retourner un tableau vide pour ne pas bloquer l'application */
      return of([]);
    })
  );

  getTopAnime(): Observable<Anime[]> {
    return this.animesCache$.pipe(
      map(animes => [...animes].sort((a, b) => b.score - a.score))
    );
  }

  obtenirAnimeAleatoire(): Observable<Anime> {
    return this.animesCache$.pipe(
      map(animes => {
        if (animes.length === 0) {
          return {} as Anime;
        }
        const indexAleatoire = Math.floor(Math.random() * animes.length);
        return animes[indexAleatoire];
      })
    );
  }
}