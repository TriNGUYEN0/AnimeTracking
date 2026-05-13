import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { HttpClient } from '@angular/common/http';
import { ChartConfiguration, ChartData } from 'chart.js';

export interface MetriquesCles {
  total_anime: number;
  score_moyen: number;
  total_episodes: number;
  meilleur_studio: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [BaseChartDirective, DecimalPipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit {
  private http = inject(HttpClient);

  /* ── 1. ETAT GLOBAL (Signals) ── */
  rawData = signal<any[]>([]);
  selectedDecade = signal<string>('All');

  // NOUVEAU: Signaux pour les filtres interactifs
  selectedStudio = signal<string | null>(null);
  selectedGenre = signal<string | null>(null);

  /* ── 2. DONNEES FILTREES (Multi-dimensionnelle) ── */
  filteredData = computed(() => {
    let data = this.rawData();

    // 1. Filtre par décennie
    const decade = this.selectedDecade();

    if (decade !== 'All') {
      const startYear = Number(decade);

      if (startYear === 1990) {
        data = data.filter(
          d => d.annee < 2000 && d.annee > 0
        );
      } else {
        data = data.filter(
          d =>
            d.annee >= startYear &&
            d.annee < startYear + 10
        );
      }
    }

    // 2. Filtre par studio
    const studio = this.selectedStudio();

    if (studio) {
      data = data.filter(
        d =>
          d.studios &&
          d.studios.includes(studio)
      );
    }

    // 3. Filtre par genre
    const genre = this.selectedGenre();

    if (genre) {
      data = data.filter(
        d =>
          d.genres &&
          d.genres.includes(genre)
      );
    }

    return data;
  });

  /* ── 3. METRIQUES CLES ── */
  keyMetrics = computed<MetriquesCles | null>(() => {
    const data = this.filteredData();

    if (data.length === 0) return null;

    let sumScore = 0;
    let sumEpisodes = 0;

    const studiosCount: Record<string, number> = {};

    data.forEach(anime => {
      if (anime.score) {
        sumScore += anime.score;
      }

      if (anime.episodes) {
        sumEpisodes += anime.episodes;
      }

      if (anime.studios) {
        anime.studios.forEach((s: string) => {
          studiosCount[s] =
            (studiosCount[s] || 0) + 1;
        });
      }
    });

    const topStudio = Object.entries(studiosCount)
      .sort((a, b) => b[1] - a[1]);

    return {
      total_anime: data.length,
      score_moyen: Number(
        (sumScore / data.length).toFixed(2)
      ),
      total_episodes: sumEpisodes,
      meilleur_studio:
        topStudio.length > 0
          ? topStudio[0][0]
          : 'Inconnu'
    };
  });

  /* ── 4. ACTIONS D'INTERACTION ── */
  onStudioChartClick(event: any): void {
    if (event.active && event.active.length > 0) {
      const chartElement = event.active[0];

      const studioName =
        this.barChartData().labels?.[
          chartElement.index
        ] as string;

      this.selectedStudio.set(
        studioName === this.selectedStudio()
          ? null
          : studioName
      );
    }
  }

  onGenreChartClick(event: any): void {
    if (event.active && event.active.length > 0) {
      const chartElement = event.active[0];

      const genreName =
        this.polarChartData().labels?.[
          chartElement.index
        ] as string;

      this.selectedGenre.set(
        genreName === this.selectedGenre()
          ? null
          : genreName
      );
    }
  }

  resetFilters(): void {
    this.selectedStudio.set(null);
    this.selectedGenre.set(null);
    this.selectedDecade.set('All');
  }

  /* ── 5. GRAPHIQUES ── */
  lineChartData = computed<ChartData<'line'>>(() => {
    const data = this.filteredData();

    const yearStats: Record<
      number,
      { sum: number; count: number }
    > = {};

    data.forEach(anime => {
      if (
        anime.annee &&
        anime.score &&
        anime.annee > 1960
      ) {
        if (!yearStats[anime.annee]) {
          yearStats[anime.annee] = {
            sum: 0,
            count: 0
          };
        }

        yearStats[anime.annee].sum += anime.score;
        yearStats[anime.annee].count += 1;
      }
    });

    const years = Object.keys(yearStats)
      .map(Number)
      .sort((a, b) => a - b);

    return {
      labels: years.map(String),
      datasets: [
        {
          data: years.map(y =>
            Number(
              (
                yearStats[y].sum /
                yearStats[y].count
              ).toFixed(2)
            )
          ),
          label: 'Average Score',
          borderColor: '#bb86fc',
          backgroundColor:
            'rgba(187, 134, 252, 0.2)',
          fill: 'origin' as const,
          pointBackgroundColor: '#fff',
          tension: 0.4
        }
      ]
    };
  });

  polarChartData = computed<ChartData<'polarArea'>>(() => {
    const data = this.filteredData();

    const genresCount: Record<string, number> = {};

    data.forEach(anime => {
      if (anime.genres) {
        anime.genres.forEach((g: string) => {
          genresCount[g] =
            (genresCount[g] || 0) + 1;
        });
      }
    });

    const top = Object.entries(genresCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    return {
      labels: top.map(i => i[0]),
      datasets: [
        {
          data: top.map(i => i[1]),
          backgroundColor: [
            'rgba(255, 99, 132, 0.8)',
            'rgba(54, 162, 235, 0.8)',
            'rgba(255, 206, 86, 0.8)',
            'rgba(75, 192, 192, 0.8)',
            'rgba(153, 102, 255, 0.8)',
            'rgba(255, 159, 64, 0.8)',
            'rgba(231, 233, 237, 0.8)',
            'rgba(118, 215, 196, 0.8)'
          ],
          borderColor: '#1e1e1e'
        }
      ]
    };
  });

  barChartData = computed<ChartData<'bar'>>(() => {
    const data = this.filteredData();

    const studiosCount: Record<string, number> = {};

    data.forEach(anime => {
      if (anime.studios) {
        anime.studios.forEach((s: string) => {
          studiosCount[s] =
            (studiosCount[s] || 0) + 1;
        });
      }
    });

    const top10 = Object.entries(studiosCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    return {
      labels: top10.map(i => i[0]),
      datasets: [
        {
          data: top10.map(i => i[1]),
          backgroundColor: '#03dac6',
          borderRadius: 4
        }
      ]
    };
  });

  doughnutChartData = computed<ChartData<'doughnut'>>(() => {
    const data = this.filteredData();

    let short = 0;
    let medium = 0;
    let long = 0;
    let unknown = 0;

    data.forEach(anime => {
      const ep = anime.episodes;

      if (!ep || ep === 0) {
        unknown++;
      } else if (ep <= 13) {
        short++;
      } else if (ep <= 26) {
        medium++;
      } else {
        long++;
      }
    });

    return {
      labels: [
        '1-13 eps',
        '14-26 eps',
        '27+ eps',
        'Unknown'
      ],
      datasets: [
        {
          data: [short, medium, long, unknown],
          backgroundColor: [
            '#FF6384',
            '#36A2EB',
            '#FFCE56',
            '#C9CBCF'
          ],
          borderWidth: 2,
          borderColor: '#1e1e1e'
        }
      ]
    };
  });

  qualityChartData = computed<ChartData<'bar'>>(() => {
    const data = this.filteredData();

    const genreStats: Record<
      string,
      { sum: number; count: number }
    > = {};

    data.forEach(anime => {
      if (anime.genres && anime.score) {
        anime.genres.forEach((g: string) => {
          if (!genreStats[g]) {
            genreStats[g] = {
              sum: 0,
              count: 0
            };
          }

          genreStats[g].sum += anime.score;
          genreStats[g].count += 1;
        });
      }
    });

    const topGenres = Object.entries(genreStats)
      .filter(([, stats]) => stats.count >= 5)
      .map(([genre, stats]) => ({
        genre,
        avg: Number(
          (stats.sum / stats.count).toFixed(2)
        )
      }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 10);

    return {
      labels: topGenres.map(i => i.genre),
      datasets: [
        {
          data: topGenres.map(i => i.avg),
          label: 'Average Score',
          backgroundColor: '#ffbd33',
          borderRadius: 4
        }
      ]
    };
  });

  /* ── Configurations Chart.js ── */
  public lineChartConfig:
    ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    elements: {
      line: {
        tension: 0.4
      }
    },
    plugins: {
      legend: {
        labels: {
          color: '#e0e0e0'
        }
      }
    },
    scales: {
      y: {
        ticks: {
          color: '#b3b3b3'
        },
        grid: {
          color: '#333'
        }
      },
      x: {
        ticks: {
          color: '#b3b3b3'
        },
        grid: {
          color: '#333'
        }
      }
    }
  };

  public polarChartConfig:
    ChartConfiguration<'polarArea'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        grid: {
          color: '#333'
        },
        ticks: {
          display: false
        }
      }
    },
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: '#e0e0e0'
        }
      }
    }
  };

  public barChartConfig:
    ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      x: {
        grid: {
          color: '#333'
        },
        ticks: {
          color: '#b3b3b3'
        }
      },
      y: {
        grid: {
          display: false
        },
        ticks: {
          color: '#e0e0e0'
        }
      }
    }
  };

  public doughnutChartConfig:
    ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '60%',
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: '#e0e0e0'
        }
      }
    }
  };

  public qualityChartConfig:
    ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: ctx =>
            ` Average Rating: ${ctx.raw}`
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: '#333'
        },
        ticks: {
          color: '#b3b3b3'
        },
        min: 0,
        max: 10
      },
      y: {
        grid: {
          display: false
        },
        ticks: {
          color: '#e0e0e0'
        }
      }
    }
  };

  /* ── Lifecycle ── */
  ngOnInit(): void {
    this.http
      .get<any>('assets/animes_graphe.json')
      .subscribe(res => {
        const donnees = Array.isArray(res)
          ? res
          : (res.data || []);

        this.rawData.set(donnees);
      });
  }

  onDecadeChange(event: Event): void {
    this.selectedDecade.set(
      (event.target as HTMLSelectElement).value
    );
  }

  async exportToPDF(): Promise<void> {
    const element =
      document.getElementById(
        'dashboard-content'
      );

    if (!element) return;

    const html2canvas =
      (await import('html2canvas')).default;

    const jsPDF =
      (await import('jspdf')).default;

    html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#121212'
    }).then(canvas => {
      const imgData =
        canvas.toDataURL('image/png');

      const pdf = new jsPDF(
        'p',
        'mm',
        'a4'
      );

      const pdfWidth = 210;

      const pdfHeight =
        (canvas.height * pdfWidth) /
        canvas.width;

      pdf.setFontSize(22);

      pdf.text(
        'Analytics Report',
        105,
        20,
        {
          align: 'center'
        }
      );

      pdf.addImage(
        imgData,
        'PNG',
        0,
        40,
        pdfWidth,
        pdfHeight
      );

      pdf.save('Anime_Dashboard.pdf');
    });
  }
}