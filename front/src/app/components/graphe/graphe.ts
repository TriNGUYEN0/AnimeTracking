import { Component, OnInit, ElementRef, ViewChild, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as echarts from 'echarts';

export interface AnimeGraphe {
  id: number;
  titre: string;
  annee: number;
  score: number;
  episodes: number;
  synopsis: string;
  studios: string[];
  genres: string[];
  image_url: string;
  large_image_url: string;
}

@Component({
  selector: 'app-graphe',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './graphe.html',
  styleUrl: './graphe.css'
})
export class GrapheComponent implements OnInit {
  @ViewChild('conteneurGraphe', { static: true }) conteneurGraphe!: ElementRef;
  
  private http = inject(HttpClient);
  private instanceGraphe: any;
  private listeComplete: AnimeGraphe[] = [];

  studiosDisponibles: string[] = [];
  anneesDisponibles: number[] = [];
  genresDisponibles: string[] = [];
  
  filtreStudio: string = 'Tous';
  filtreAnnee: string = 'Toutes';
  filtreGenre: string = 'Tous';
  
  termeRecherche: string = '';
  limiteNoeuds: number = 200;
  animeSelectionne: AnimeGraphe | null = null;

  ngOnInit(): void {
    this.initialiserEcharts();
    this.chargerDonnees();
  }

  private chargerDonnees(): void {
    this.http.get<AnimeGraphe[]>('assets/animes_graphe.json').subscribe({
      next: (donnees) => {
        this.listeComplete = donnees;
        this.extraireFiltres(donnees);
        this.dessinerGraphe();
      },
      error: (erreur) => {
        console.error(erreur);
      }
    });
  }

  private extraireFiltres(donnees: AnimeGraphe[]): void {
    const ensembleStudios = new Set<string>();
    const ensembleAnnees = new Set<number>();
    const ensembleGenres = new Set<string>();

    donnees.forEach(anime => {
      if (anime.annee) ensembleAnnees.add(anime.annee);
      if (anime.studios) {
        anime.studios.forEach(s => ensembleStudios.add(s));
      }
      if (anime.genres) {
        anime.genres.forEach(g => ensembleGenres.add(g));
      }
    });

    this.studiosDisponibles = Array.from(ensembleStudios).sort();
    this.anneesDisponibles = Array.from(ensembleAnnees).sort((a, b) => b - a);
    this.genresDisponibles = Array.from(ensembleGenres).sort();
  }

  private initialiserEcharts(): void {
    this.instanceGraphe = echarts.init(this.conteneurGraphe.nativeElement);
    
    this.instanceGraphe.on('click', (parametres: any) => {
      if (parametres.dataType === 'node') {
        this.animeSelectionne = parametres.data.donneesOriginales;
      }
    });

    window.addEventListener('resize', () => {
      this.instanceGraphe.resize();
    });
  }

  appliquerFiltres(): void {
    this.fermerDetails();
    this.dessinerGraphe();
  }

  fermerDetails(): void {
    this.animeSelectionne = null;
  }

  private dessinerGraphe(): void {
    /* Optimisation : Ne pas utiliser clear() ici pour permettre les animations fluides d'ECharts */
    
    const terme = this.termeRecherche.toLowerCase().trim();

    let donneesFiltrees = this.listeComplete.filter(anime => {
      let correspondStudio = this.filtreStudio === 'Tous' || (anime.studios && anime.studios.includes(this.filtreStudio));
      let correspondAnnee = this.filtreAnnee === 'Toutes' || anime.annee === Number(this.filtreAnnee);
      let correspondGenre = this.filtreGenre === 'Tous' || (anime.genres && anime.genres.includes(this.filtreGenre));
      
      /* Recherche plein texte avancee : Titre, Studio, ou Synopsis */
      let correspondRecherche = true;
      if (terme !== '') {
        const dansTitre = anime.titre && anime.titre.toLowerCase().includes(terme);
        const dansStudio = anime.studios && anime.studios.some(s => s.toLowerCase().includes(terme));
        const dansSynopsis = anime.synopsis && anime.synopsis.toLowerCase().includes(terme);
        
        correspondRecherche = Boolean(dansTitre || dansStudio || dansSynopsis);
      }
      
      return correspondStudio && correspondAnnee && correspondGenre && correspondRecherche;
    });

    const animesUniques = new Map<number, AnimeGraphe>();
    donneesFiltrees.forEach(anime => {
      if (anime.id) {
        animesUniques.set(anime.id, anime);
      }
    });
    
    donneesFiltrees = Array.from(animesUniques.values()).slice(0, this.limiteNoeuds);

    const noeuds: any[] = [];
    const liens: any[] = [];
    const ensembleCategories = new Set<string>();

    donneesFiltrees.forEach(anime => {
      const genrePrincipal = anime.genres && anime.genres.length > 0 ? anime.genres[0] : 'Inconnu';
      ensembleCategories.add(genrePrincipal);

      noeuds.push({
        id: anime.id.toString(),
        name: anime.titre || 'Inconnu',
        value: anime.score || 0,
        symbolSize: (anime.score || 5) * 4,
        category: genrePrincipal,
        donneesOriginales: anime,
        itemStyle: {
          shadowBlur: 10,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      });
    });

    const categories = Array.from(ensembleCategories).map(nom => ({ name: nom }));

    for (let i = 0; i < donneesFiltrees.length; i++) {
      for (let j = i + 1; j < donneesFiltrees.length; j++) {
        const animeA = donneesFiltrees[i];
        const animeB = donneesFiltrees[j];
        
        let lier = false;

        if (animeA.studios && animeB.studios) {
          const studioCommun = animeA.studios.find(s => animeB.studios.includes(s));
          if (studioCommun) {
            lier = true;
          }
        }

        if (animeA.annee && animeB.annee && animeA.annee === animeB.annee) {
          lier = true;
        }
        
        if (lier) {
          liens.push({
            source: animeA.id.toString(),
            target: animeB.id.toString(),
            lineStyle: { width: 1.5, opacity: 0.4, curveness: 0.2 }
          });
        }
      }
    }

    const options = {
      backgroundColor: 'transparent',
      /* Ajout des animations globales pour des transitions douces */
      animationDurationUpdate: 1000,
      animationEasingUpdate: 'quinticInOut',
      tooltip: {
        trigger: 'item',
        formatter: '{b}'
      },
      legend: {
        data: categories.map(c => c.name),
        textStyle: { color: '#b3b3b3' },
        top: '2%',
        type: 'scroll'
      },
      series: [
        {
          type: 'graph',
          layout: 'force',
          data: noeuds,
          links: liens,
          categories: categories,
          roam: true,
          draggable: true,
          label: {
            show: true,
            position: 'right',
            formatter: '{b}',
            color: '#ffffff',
            fontSize: 10
          },
          emphasis: {
            focus: 'adjacency',
            lineStyle: {
              width: 4
            }
          },
          force: {
            repulsion: 400,
            edgeLength: 150,
            gravity: 0.1,
            /* Amelioration de la stabilite physique */
            friction: 0.2,
            layoutAnimation: true
          }
        }
      ]
    };

    /* Remplacement des donnees sans utiliser clear() pour animer le changement */
    this.instanceGraphe.setOption(options, { notMerge: true });
  }
}