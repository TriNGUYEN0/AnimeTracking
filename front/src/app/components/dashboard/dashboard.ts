import { Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { AnalyticsService, MetriquesCles } from '../../services/analytics.service';
import { ChartConfiguration, ChartData } from 'chart.js';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [BaseChartDirective, DecimalPipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit {
  private analyticsService = inject(AnalyticsService);

  keyMetrics = signal<MetriquesCles | null>(null);

  // ── Chart Configurations ──────────────────────────────────────────────────
  public lineChartConfig: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    elements: { line: { tension: 0.4 } },
    plugins: { legend: { labels: { color: '#e0e0e0' } } },
    scales: {
      y: { ticks: { color: '#b3b3b3' }, grid: { color: '#333' } },
      x: { ticks: { color: '#b3b3b3' }, grid: { color: '#333' } }
    }
  };
  public lineChartData = signal<ChartData<'line'>>({ labels: [], datasets: [] });

  public polarChartConfig: ChartConfiguration<'polarArea'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: { r: { grid: { color: '#333' }, ticks: { display: false } } },
    plugins: { legend: { position: 'right', labels: { color: '#e0e0e0' } } }
  };
  public polarChartData = signal<ChartData<'polarArea'>>({ labels: [], datasets: [] });

  public barChartConfig: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { color: '#333' }, ticks: { color: '#b3b3b3' } },
      y: { grid: { display: false }, ticks: { color: '#e0e0e0' } }
    }
  };
  public barChartData = signal<ChartData<'bar'>>({ labels: [], datasets: [] });

  public doughnutChartConfig: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '60%',
    plugins: { legend: { position: 'right', labels: { color: '#e0e0e0' } } }
  };
  public doughnutChartData = signal<ChartData<'doughnut'>>({ labels: [], datasets: [] });

  public qualityChartConfig: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx) => ` Average Rating: ${ctx.raw}` } }
    },
    scales: {
      x: { grid: { color: '#333' }, ticks: { color: '#b3b3b3' }, min: 0, max: 10 },
      y: { grid: { display: false }, ticks: { color: '#e0e0e0' } }
    }
  };
  public qualityChartData = signal<ChartData<'bar'>>({ labels: [], datasets: [] });

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit() {
    this.loadMetrics();
    this.loadCharts();
  }

  loadMetrics() {
    this.analyticsService.obtenirMetriquesCles().subscribe(data => {
      this.keyMetrics.set(data);
    });
  }

  loadCharts() {
    this.analyticsService.obtenirEvolutionScores().subscribe(res => {
      this.lineChartData.set({
        labels: res.etiquettes,
        datasets: [{
          data: res.valeurs,
          label: 'Average Score',
          borderColor: '#bb86fc',
          backgroundColor: 'rgba(187, 134, 252, 0.2)',
          fill: 'origin' as const,
          pointBackgroundColor: '#fff'
        }]
      });
    });

    this.analyticsService.obtenirDistributionGenres().subscribe(res => {
      this.polarChartData.set({
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

    this.analyticsService.obtenirTopStudios().subscribe(res => {
      this.barChartData.set({
        labels: res.etiquettes,
        datasets: [{
          data: res.valeurs,
          backgroundColor: '#03dac6',
          borderRadius: 4
        }]
      });
    });

    this.analyticsService.obtenirDistributionEpisodes().subscribe(res => {
      this.doughnutChartData.set({
        labels: res.etiquettes,
        datasets: [{
          data: res.valeurs,
          backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#C9CBCF'],
          borderWidth: 2,
          borderColor: '#1e1e1e'
        }]
      });
    });

    /* Correctly placed subscription inside loadCharts method */
    this.analyticsService.getTopGenresByScore().subscribe(res => {
      this.qualityChartData.set({
        labels: res.labels,
        datasets: [{
          data: res.data,
          label: 'Average Score',
          backgroundColor: '#ffbd33',
          borderRadius: 4
        }]
      });
    });
  }

  // ── Export PDF ────────────────────────────────────────────────────────────
  async exportToPDF() {
    const element = document.getElementById('dashboard-content');
    if (!element) return;

    const html2canvas = (await import('html2canvas')).default;
    const jsPDF = (await import('jspdf')).default;

    html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#121212'
    }).then(canvas => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = 210;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.setFontSize(22);
      pdf.text('Analytics Report', 105, 20, { align: 'center' });
      pdf.addImage(imgData, 'PNG', 0, 40, pdfWidth, pdfHeight);
      pdf.save('Anime_Dashboard.pdf');
    });
  }
}