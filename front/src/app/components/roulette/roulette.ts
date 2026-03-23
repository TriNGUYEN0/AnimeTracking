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
  // Injection du service API
  private serviceAnime = inject(AnimeService);

  // Tableau pour stocker les données de l'API
  listeAnimes: Anime[] = [];
  indexActif: number = 0;
  enRotation: boolean = false;

  ngOnInit(): void {
    // Récupérer les vraies données depuis le serveur
    this.serviceAnime.getTopAnime().subscribe({
      next: (donnees) => {
        // Garder seulement les 15 premiers animes pour la roulette
        this.listeAnimes = donnees.slice(0, 15);
      },
      error: (erreur) => {
        console.error("Erreur lors du chargement des animes", erreur);
      }
    });
  }

  // Fonction pour animer la sélection aléatoire
  tournerRoulette(): void {
    if (this.enRotation || this.listeAnimes.length === 0) return;

    this.enRotation = true;
    let tours = 0;
    const maxTours = 30; // Nombre de sauts avant l'arrêt

    const intervalle = setInterval(() => {
      // Passer à la carte suivante en boucle
      this.indexActif = (this.indexActif + 1) % this.listeAnimes.length;
      tours++;

      // Arrêter la roulette après maxTours
      if (tours >= maxTours) {
        clearInterval(intervalle);
        // Sélectionner le gagnant final au hasard
        this.indexActif = Math.floor(Math.random() * this.listeAnimes.length);
        this.enRotation = false;
      }
    }, 100); // Vitesse de rotation (100 millisecondes)
  }
}