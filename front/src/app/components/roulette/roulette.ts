import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnimeService, Anime } from '../../services/anime.service';

@Component({
  selector: 'app-roulette',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './roulette.html',
  styleUrls: ['./roulette.css']
})
export class RouletteComponent implements OnInit {
  private serviceAnime = inject(AnimeService);

  listeAnimes: Anime[] = [];
  indexActif: number = 0;
  enRotation: boolean = false;
  
  // Variable pour stocker la réponse de l'API
  animeGagnant: Anime | null = null; 

  ngOnInit(): void {
    // Charger la liste initiale pour créer l'effet visuel de la roulette
    this.serviceAnime.getTopAnime().subscribe({
      next: (donnees) => {
        this.listeAnimes = donnees.slice(0, 15);
      },
      error: (erreur) => console.error("Erreur API:", erreur)
    });
  }

  tournerRoulette(): void {
    if (this.enRotation || this.listeAnimes.length === 0) return;

    this.enRotation = true;
    this.animeGagnant = null; // Réinitialiser le résultat précédent
    let tours = 0;
    const maxTours = 30; // Nombre minimum de sauts

    // Lancer la requête API en arrière-plan (Appel asynchrone)
    this.serviceAnime.obtenirAnimeAleatoire().subscribe({
      next: (anime) => {
        this.animeGagnant = anime; // Stocker le résultat quand il arrive
      },
      error: (erreur) => {
        console.error("Échec de la récupération aléatoire", erreur);
        // Solution de secours : choisir un anime dans la liste existante
        this.animeGagnant = this.listeAnimes[Math.floor(Math.random() * this.listeAnimes.length)];
      }
    });

    // Lancer l'animation visuelle
    const intervalle = setInterval(() => {
      this.indexActif = (this.indexActif + 1) % this.listeAnimes.length;
      tours++;

      // Condition d'arrêt : On a fait assez de tours ET l'API a répondu
      if (tours >= maxTours && this.animeGagnant) {
        clearInterval(intervalle);
        
        // L'astuce : Remplacer la carte actuelle par le vrai gagnant
        this.listeAnimes[this.indexActif] = this.animeGagnant;
        
        this.enRotation = false;
      } 
      // Sécurité : Si l'API est trop lente (timeout serveur), arrêter au bout de 60 tours
      else if (tours > 60) {
        clearInterval(intervalle);
        this.enRotation = false;
      }
    }, 100);
  }
}