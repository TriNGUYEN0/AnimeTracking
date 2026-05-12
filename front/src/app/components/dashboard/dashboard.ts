import { Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { AnalyticsService, MetriquesCles } from '../../services/analytics.service';
import { ChartConfiguration, ChartData } from 'chart.js';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  // DecimalPipe conservé car utilisé dans le template : {{ ... | number }}
  imports: [BaseChartDirective, DecimalPipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit {
  private serviceAnalytique = inject(AnalyticsService);

  metriquesCles = signal<MetriquesCles | null>(null);

  // ── Graphe Ligne ──────────────────────────────────────────────────────────
  public configGrapheLigne: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    elements: { line: { tension: 0.4 } },
    plugins: { legend: { labels: { color: '#e0e0e0' } } },
    scales: {
      y: { ticks: { color: '#b3b3b3' }, grid: { color: '#333' } },
      x: { ticks: { color: '#b3b3b3' }, grid: { color: '#333' } }
    }
  };
  public donneesGrapheLigne = signal<ChartData<'line'>>({ labels: [], datasets: [] });

  // ── Graphe Polaire ────────────────────────────────────────────────────────
  public configGraphePolaire: ChartConfiguration<'polarArea'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: { r: { grid: { color: '#333' }, ticks: { display: false } } },
    plugins: { legend: { position: 'right', labels: { color: '#e0e0e0' } } }
  };
  public donneesGraphePolaire = signal<ChartData<'polarArea'>>({ labels: [], datasets: [] });

  // ── Graphe Barres ─────────────────────────────────────────────────────────
  public configGrapheBarres: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { color: '#333' }, ticks: { color: '#b3b3b3' } },
      y: { grid: { display: false }, ticks: { color: '#e0e0e0' } }
    }
  };
  public donneesGrapheBarres = signal<ChartData<'bar'>>({ labels: [], datasets: [] });

  // ── Graphe Anneau ─────────────────────────────────────────────────────────
  public configGrapheAnneau: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '60%',
    plugins: { legend: { position: 'right', labels: { color: '#e0e0e0' } } }
  };
  public donneesGrapheAnneau = signal<ChartData<'doughnut'>>({ labels: [], datasets: [] });

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit() {
    this.chargerMetriques();
    this.chargerGraphes();
  }

  chargerMetriques() {
    this.serviceAnalytique.obtenirMetriquesCles().subscribe(donnees => {
      this.metriquesCles.set(donnees);
    });
  }

  chargerGraphes() {
    this.serviceAnalytique.obtenirEvolutionScores().subscribe(res => {
      this.donneesGrapheLigne.set({
        labels: res.etiquettes,
        datasets: [{
          data: res.valeurs,
          label: 'Score Moyen',
          borderColor: '#bb86fc',
          backgroundColor: 'rgba(187, 134, 252, 0.2)',
          // 'origin' est une valeur valide du plugin Filler de Chart.js
          fill: 'origin' as const,
          pointBackgroundColor: '#fff'
        }]
      });
    });

    this.serviceAnalytique.obtenirDistributionGenres().subscribe(res => {
      this.donneesGraphePolaire.set({
        labels: res.etiquettes,
        datasets: [{
          data: res.valeurs,
          backgroundColor: [
            'rgba(255, 99, 132, 0.8)', 'rgba(54, 162, 235, 0.8)',
            'rgba(255, 206, 86, 0.8)', 'rgba(75, 192, 192, 0.8)',
            'rgba(153, 102, 255, 0.8)', 'rgba(255, 159, 64, 0.8)',
            'rgba(231, 233, 237, 0.8)', 'rgba(118, 215, 196, 0.8)'
          ],
          borderColor: '#1e1e1e'
        }]
      });
    });

    this.serviceAnalytique.obtenirTopStudios().subscribe(res => {
      this.donneesGrapheBarres.set({
        labels: res.etiquettes,
        datasets: [{
          data: res.valeurs,
          backgroundColor: '#03dac6',
          borderRadius: 4
        }]
      });
    });

    this.serviceAnalytique.obtenirDistributionEpisodes().subscribe(res => {
      this.donneesGrapheAnneau.set({
        labels: res.etiquettes,
        datasets: [{
          data: res.valeurs,
          backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#C9CBCF'],
          borderWidth: 2,
          borderColor: '#1e1e1e'
        }]
      });
    });
  }

  // ── Export PDF ────────────────────────────────────────────────────────────
  async exporterVersPDF() {
    const element = document.getElementById('contenu-dashboard');
    if (!element) return;

    const html2canvas = (await import('html2canvas')).default;
    const jsPDF = (await import('jspdf')).default;

    html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#121212'
    }).then(canvas => {
      const imgDonnees = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const largeurPdf = 210;
      const hauteurPdf = (canvas.height * largeurPdf) / canvas.width;

      pdf.setFontSize(22);
      pdf.text('Rapport Analytique', 105, 20, { align: 'center' });
      pdf.addImage(imgDonnees, 'PNG', 0, 40, largeurPdf, hauteurPdf);
      pdf.save('Dashboard_Animes.pdf');
    });
  }
}