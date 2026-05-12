import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, shareReplay, catchError } from 'rxjs/operators';

export interface MetriquesCles {
  total_anime: number;
  score_moyen: number;
  total_episodes: number;
  meilleur_studio: string;
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private http = inject(HttpClient);
  private urlJson = 'assets/animes_graphe.json';

  private donneesBrutes$ = this.http.get<any>(this.urlJson).pipe(
  map(reponse => Array.isArray(reponse) ? reponse : (reponse.data || [])),
    shareReplay(1),
    catchError(erreur => {
      console.error("Erreur de chargement", erreur);
      return of([]);
    })
  );

  obtenirMetriquesCles(): Observable<MetriquesCles> {
    return this.donneesBrutes$.pipe(
      map(donnees => {
        let sommeScore = 0;
        let sommeEpisodes = 0;
        const compteStudios: Record<string, number> = {};

        donnees.forEach((anime: any) => {
          if (anime.score) sommeScore += anime.score;
          if (anime.episodes) sommeEpisodes += anime.episodes;
          if (anime.studios) {
            anime.studios.forEach((s: string) => {
              compteStudios[s] = (compteStudios[s] || 0) + 1;
            });
          }
        });

        let topStudio = 'Inconnu';
        let maxCount = 0;
        for (const [studio, count] of Object.entries(compteStudios)) {
          if (count > maxCount) {
            maxCount = count;
            topStudio = studio;
          }
        }

        return {
          total_anime: donnees.length,
          score_moyen: donnees.length ? Number((sommeScore / donnees.length).toFixed(2)) : 0,
          total_episodes: sommeEpisodes,
          meilleur_studio: topStudio
        };
      })
    );
  }

  obtenirEvolutionScores(): Observable<any> {
    return this.donneesBrutes$.pipe(
      map(donnees => {
        const statsAnnees: Record<number, { somme: number, count: number }> = {};
        
        donnees.forEach((anime: any) => {
          const annee = anime.annee;
          const score = anime.score;
          if (annee && score && annee > 1960) {
            if (!statsAnnees[annee]) statsAnnees[annee] = { somme: 0, count: 0 };
            statsAnnees[annee].somme += score;
            statsAnnees[annee].count += 1;
          }
        });

        const anneesTriees = Object.keys(statsAnnees).map(Number).sort((a, b) => a - b);
        return {
          etiquettes: anneesTriees.map(String),
          valeurs: anneesTriees.map(a => Number((statsAnnees[a].somme / statsAnnees[a].count).toFixed(2)))
        };
      })
    );
  }

  obtenirTopStudios(): Observable<any> {
    return this.donneesBrutes$.pipe(
      map(donnees => {
        const compteurs: Record<string, number> = {};
        donnees.forEach((anime: any) => {
          if (anime.studios) {
            anime.studios.forEach((s: string) => {
              compteurs[s] = (compteurs[s] || 0) + 1;
            });
          }
        });
        
        const tries = Object.entries(compteurs).sort((a, b) => b[1] - a[1]).slice(0, 10);
        return {
          etiquettes: tries.map(i => i[0]),  // string name
          valeurs: tries.map(i => i[1])      // number count
        };
      })
    );
  }

  obtenirDistributionGenres(): Observable<any> {
    return this.donneesBrutes$.pipe(
      map(donnees => {
        const compteurs: Record<string, number> = {};
        donnees.forEach((anime: any) => {
          if (anime.genres) {
            anime.genres.forEach((g: string) => {
              compteurs[g] = (compteurs[g] || 0) + 1;
            });
          }
        });

        const tries = Object.entries(compteurs).sort((a, b) => b[1] - a[1]).slice(0, 10);
return {
  etiquettes: tries.map(i => i[0]),  // string name
  valeurs: tries.map(i => i[1])      // number count
};
      })
    );
  }

  obtenirDistributionEpisodes(): Observable<any> {
    return this.donneesBrutes$.pipe(
      map(donnees => {
        let courts = 0;
        let moyens = 0;
        let longs = 0;
        let inconnus = 0;

        donnees.forEach((anime: any) => {
          const ep = anime.episodes;
          if (!ep || ep === 0) inconnus++;
          else if (ep <= 13) courts++;
          else if (ep <= 26) moyens++;
          else longs++;
        });

        return {
          etiquettes: ['1-13 eps', '14-26 eps', '27+ eps', 'Inconnu'],
          valeurs: [courts, moyens, longs, inconnus]
        };
      })
    );
  }
}