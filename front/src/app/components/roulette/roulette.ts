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
  animeGagnant: Anime | null = null;
  
  // NOUVEAU : État pour afficher l'écran de résultat final
  resultatAffiche: boolean = false;

  ngOnInit(): void {
    this.serviceAnime.getTopAnime().subscribe({
      next: (donnees) => {
        // Astuce : Mélanger (shuffle) le tableau pour que les images paraissent aléatoires
        this.listeAnimes = donnees.sort(() => 0.5 - Math.random()).slice(0, 20);
        
        // Placer l'index de départ au milieu
        this.indexActif = Math.floor(this.listeAnimes.length / 2);
      },
      error: (erreur) => console.error("Erreur API:", erreur)
    });
  }

  // NOUVEAU : Calculer le décalage (translation) pour centrer la carte active
  get decalagePiste(): string {
    // 155px = 140px (largeur d'une carte) + 15px (espace entre les cartes)
    // 70px = la moitié d'une carte (pour cibler son centre)
    return `translateX(calc(50% - ${this.indexActif * 155}px - 70px))`;
  }

  tournerRoulette(): void {
    if (this.enRotation || this.listeAnimes.length === 0) return;

    this.enRotation = true;
    this.resultatAffiche = false; // Cacher le résultat précédent
    this.animeGagnant = null;
    let tours = 0;
    const maxTours = 40; 

    // Requête API en arrière-plan
    this.serviceAnime.obtenirAnimeAleatoire().subscribe({
      next: (anime) => { this.animeGagnant = anime; },
      error: () => { 
        this.animeGagnant = this.listeAnimes[Math.floor(Math.random() * this.listeAnimes.length)]; 
      }
    });

    const intervalle = setInterval(() => {
      this.indexActif = (this.indexActif + 1) % this.listeAnimes.length;
      tours++;

      if (tours >= maxTours && this.animeGagnant) {
        clearInterval(intervalle);
        this.listeAnimes[this.indexActif] = this.animeGagnant;
        this.enRotation = false;
        
        // NOUVEAU : Attendre 1 seconde (suspense) avant d'afficher les détails
        setTimeout(() => {
          this.resultatAffiche = true;
        }, 1000);

      } else if (tours > 80) { // Sécurité anti-boucle infinie
        clearInterval(intervalle);
        this.enRotation = false;
      }
    }, 100);
  }
}