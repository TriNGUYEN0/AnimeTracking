import { Component, ElementRef, ViewChild, inject, signal, computed, effect, OnDestroy, AfterViewInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import * as echarts from 'echarts/core';
import { GraphChart } from 'echarts/charts';
import { TooltipComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { DataStore, Anime, posterUrl, malUrl } from '../../services/data-store';

// Modular ECharts: only the graph chart is bundled, not the whole library.
echarts.use([GraphChart, TooltipComponent, LegendComponent, CanvasRenderer]);

@Component({
  selector: 'app-graphe',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './graphe.html',
  styleUrl: './graphe.css',
})
export class GrapheComponent implements AfterViewInit, OnDestroy {
  @ViewChild('conteneurGraphe', { static: true }) conteneurGraphe!: ElementRef<HTMLDivElement>;

  readonly store = inject(DataStore);
  readonly posterUrl = posterUrl;
  readonly malUrl = malUrl;
  private chart: echarts.ECharts | null = null;
  private resizeObserver: ResizeObserver | null = null;

  filtreStudio = 'Tous';
  filtreAnnee = 'Toutes';
  filtreGenre = 'Tous';
  termeRecherche = '';
  limiteNoeuds = 50;

  animeSelectionne: Anime | null = null;
  readonly synopsis = signal('');

  readonly anneesDisponibles = computed(() =>
    [...new Set(this.store.animes().map((a) => a.year).filter((y) => y > 0))].sort((a, b) => b - a),
  );

  constructor() {
    // Draw as soon as the dataset is available (and redraw if it changes).
    effect(() => {
      if (this.store.animes().length && this.chart) this.dessinerGraphe();
    });
  }

  ngAfterViewInit(): void {
    this.chart = echarts.init(this.conteneurGraphe.nativeElement);
    this.chart.on('click', (p: any) => {
      if (p.dataType === 'node') this.ouvrirDetails(p.data.anime as Anime);
    });
    this.resizeObserver = new ResizeObserver(() => this.chart?.resize());
    this.resizeObserver.observe(this.conteneurGraphe.nativeElement);
    if (this.store.animes().length) this.dessinerGraphe();
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.chart?.dispose();
  }

  appliquerFiltres(): void {
    this.fermerDetails();
    this.dessinerGraphe();
  }

  ouvrirDetails(anime: Anime): void {
    this.animeSelectionne = anime;
    this.synopsis.set('');
    this.store.synopsis(anime.id).then((s) => {
      if (this.animeSelectionne?.id === anime.id) this.synopsis.set(s || 'No synopsis available.');
    });
  }

  fermerDetails(): void {
    this.animeSelectionne = null;
  }

  private dessinerGraphe(): void {
    if (!this.chart) return;
    const terme = this.termeRecherche.toLowerCase().trim();

    const selection = this.store
      .animes()
      .filter((a) => {
        if (this.filtreStudio !== 'Tous' && !a.studios.includes(this.filtreStudio)) return false;
        if (this.filtreAnnee !== 'Toutes' && a.year !== Number(this.filtreAnnee)) return false;
        if (this.filtreGenre !== 'Tous' && !a.genres.includes(this.filtreGenre)) return false;
        if (terme) {
          const hay = `${a.title} ${a.titleEn} ${a.studios.join(' ')}`.toLowerCase();
          if (!hay.includes(terme)) return false;
        }
        return true;
      })
      .slice(0, Math.min(this.limiteNoeuds, 300));

    const categories = [...new Set(selection.map((a) => a.genres[0] ?? 'Unknown'))].map((name) => ({ name }));
    const nodes = selection.map((a) => ({
      id: String(a.id),
      name: a.title,
      value: a.score,
      symbol: a.img ? 'image://' + posterUrl(a) : 'circle',
      symbolSize: Math.max(20, (a.score || 5) * 8),
      category: a.genres[0] ?? 'Unknown',
      anime: a,
    }));

    // An edge means "same studio", or "same year AND same main genre" — not merely the same year.
    const links: { source: string; target: string; lineStyle: object }[] = [];
    for (let i = 0; i < selection.length; i++) {
      for (let j = i + 1; j < selection.length; j++) {
        const a = selection[i];
        const b = selection[j];
        const studio = a.studios.some((s) => b.studios.includes(s));
        const yearGenre = a.year > 0 && a.year === b.year && a.genres[0] && a.genres[0] === b.genres[0];
        if (studio || yearGenre) {
          links.push({
            source: String(a.id),
            target: String(b.id),
            lineStyle: { width: studio ? 1.5 : 1, opacity: studio ? 0.45 : 0.2, curveness: 0.2 },
          });
        }
      }
    }

    this.chart.setOption(
      {
        backgroundColor: 'transparent',
        animationDurationUpdate: 1000,
        animationEasingUpdate: 'quinticInOut',
        tooltip: { trigger: 'item', formatter: '{b}' },
        legend: { data: categories.map((c) => c.name), textStyle: { color: '#b3b3b3' }, top: '2%', type: 'scroll' },
        series: [
          {
            type: 'graph',
            layout: 'force',
            data: nodes,
            links,
            categories,
            roam: true,
            draggable: true,
            label: {
              show: true,
              position: 'right',
              formatter: '{b}',
              color: '#e8e4d9',
              fontSize: 11,
              fontWeight: 'bold',
              textBorderColor: '#121a14',
              textBorderWidth: 2,
            },
            emphasis: { focus: 'adjacency', lineStyle: { width: 4 } },
            force: { repulsion: 400, edgeLength: 150, gravity: 0.1, friction: 0.2, layoutAnimation: true },
          },
        ],
      },
      { notMerge: true },
    );
  }
}
