import { Component, OnInit, inject, signal } from '@angular/core';
import { AnimeService, Anime } from '../../services/anime.service';
import { AnimeCardComponent } from '../anime-card/anime-card';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs/operators';
import { RouletteComponent } from '../roulette/roulette';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [AnimeCardComponent, CommonModule, RouletteComponent],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class HomeComponent implements OnInit {
  private serviceAnime = inject(AnimeService);
  
  private listeComplete: Anime[] = [];

  /* Signaux pour la gestion de l'etat de la page */
  chargementEnCours = signal(true);
  messageErreur = signal(''); 

  animeEnVedette = signal<Anime | null>(null);
  listeAffichage = signal<Anime[]>([]);
  indexActuel = signal(0);
  readonly elementsParPage = 5;

  humeurs = [
    { icon: '🔥', label: 'Action', genre: 'Action' },
    { icon: '😭', label: 'Émotionnel', genre: 'Drama' },
    { icon: '🤣', label: 'Drôle', genre: 'Comedy' },
    { icon: '✨', label: 'Fantaisie', genre: 'Fantasy' },
    { icon: '🚀', label: 'Sci-Fi', genre: 'Sci-Fi' },
    { icon: '🔄', label: 'Tout', genre: 'All' }
  ];
  humeurSelectionnee = signal('All');

  ngOnInit() {
    this.chargementEnCours.set(true);
    this.messageErreur.set(''); 

    this.serviceAnime.getTopAnime()
      .pipe(
        finalize(() => {
          this.chargementEnCours.set(false);
        })
      )
      .subscribe({
        next: (donnees) => {
          const donneesTriees = donnees.sort((a, b) => a.rank - b.rank);
          this.listeComplete = donneesTriees;
          if (donneesTriees.length > 0) {
            this.animeEnVedette.set(donneesTriees[0]);
          }
          this.listeAffichage.set(donneesTriees);
        },
        error: (erreur) => {
          console.error('Erreur de lecture du fichier local:', erreur);
          this.messageErreur.set(`Impossible de charger le fichier JSON local.`);
        }
      });
  }

  filtrerParHumeur(genreHumeur: string) {
    this.humeurSelectionnee.set(genreHumeur);
    this.indexActuel.set(0); 

    if (genreHumeur === 'All') {
      this.listeAffichage.set(this.listeComplete);
    } else {
      const filtres = this.listeComplete.filter(anime => 
        anime.genres && anime.genres.includes(genreHumeur)
      );
      this.listeAffichage.set(filtres);
    }
  }

  diapositiveSuivante() {
    if (this.indexActuel() < this.listeAffichage().length - this.elementsParPage) {
      this.indexActuel.update(v => v + 1);
    }
  }

  diapositivePrecedente() {
    if (this.indexActuel() > 0) {
      this.indexActuel.update(v => v - 1);
    }
  }
}