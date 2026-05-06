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

  studios: string[] = [];
  annees: number[] = [];
  
  filtreStudio: string = 'Tous';
  filtreAnnee: string = 'Toutes';

  animeSelectionne: AnimeGraphe | null = null;

  ngOnInit(): void {
    this.initialiserEcharts();
    this.chargerDonnees();
  }

  private chargerDonnees(): void {
    // Assurez-vous que le nom du fichier correspond a celui dans assets
    this.http.get<AnimeGraphe[]>('assets/animes_graphe.json').subscribe(donnees => {
      this.listeComplete = donnees;
      this.extraireFiltres(donnees);
      this.dessinerGraphe();
    });
  }

  private extraireFiltres(donnees: AnimeGraphe[]): void {
    const ensembleStudios = new Set<string>();
    const ensembleAnnees = new Set<number>();

    donnees.forEach(anime => {
      if (anime.annee) ensembleAnnees.add(anime.annee);
      if (anime.studios) {
        anime.studios.forEach(s => ensembleStudios.add(s));
      }
    });

    this.studios = Array.from(ensembleStudios).sort();
    this.annees = Array.from(ensembleAnnees).sort((a, b) => b - a);
  }

  private initialiserEcharts(): void {
    this.instanceGraphe = echarts.init(this.conteneurGraphe.nativeElement);
    
    // Configurer l'evenement de clic sur un noeud
    this.instanceGraphe.on('click', (parametres: any) => {
      if (parametres.dataType === 'node') {
        this.animeSelectionne = parametres.data.animeOriginal;
      }
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
    // Filtrer les donnees
    let donneesFiltrees = this.listeComplete.filter(anime => {
      let correspondStudio = this.filtreStudio === 'Tous' || (anime.studios && anime.studios.includes(this.filtreStudio));
      let correspondAnnee = this.filtreAnnee === 'Toutes' || anime.annee === Number(this.filtreAnnee);
      return correspondStudio && correspondAnnee;
    });

    // Limiter le nombre de noeuds pour eviter de bloquer le navigateur
    donneesFiltrees = donneesFiltrees.slice(0, 150);

    const noeuds: any[] = [];
    const liens: any[] = [];

    // Creer les noeuds
    donneesFiltrees.forEach(anime => {
      noeuds.push({
        id: anime.id.toString(),
        name: anime.titre,
        value: anime.score,
        symbolSize: (anime.score || 5) * 4,
        animeOriginal: anime,
        itemStyle: {
          color: '#bb86fc'
        }
      });
    });

    // Creer les liens si les animes partagent le meme studio
    for (let i = 0; i < donneesFiltrees.length; i++) {
      for (let j = i + 1; j < donneesFiltrees.length; j++) {
        const animeA = donneesFiltrees[i];
        const animeB = donneesFiltrees[j];
        
        const studioCommun = animeA.studios.find(s => animeB.studios.includes(s));
        if (studioCommun) {
          liens.push({
            source: animeA.id.toString(),
            target: animeB.id.toString(),
            lineStyle: { width: 1, opacity: 0.3 }
          });
        }
      }
    }

    const options = {
      tooltip: {
        trigger: 'item',
        formatter: '{b}'
      },
      series: [
        {
          type: 'graph',
          layout: 'force',
          data: noeuds,
          links: liens,
          roam: true,
          label: {
            show: true,
            position: 'right',
            formatter: '{b}',
            color: '#fff'
          },
          force: {
            repulsion: 200,
            edgeLength: 100
          }
        }
      ]
    };

    this.instanceGraphe.setOption(options);
  }
}