import { Component, OnInit, inject, signal } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { AnalyticsService, KeyMetrics } from '../../services/analytics.service';
import { ChartConfiguration, ChartData } from 'chart.js';
import { DecimalPipe } from '@angular/common'; 

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    BaseChartDirective, 
    DecimalPipe
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit {
  private analyticsService = inject(AnalyticsService);

  availableYears = signal<number[]>([]);

  keyMetrics = signal<KeyMetrics | null>(null);

  // Pie Chart Configuration
  public genreChartOptions: ChartConfiguration<'polarArea'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        grid: { color: '#333' }, 
        ticks: { 
          display: false, 
          backdropColor: 'transparent' 
        }
      }
    },
    plugins: {
      legend: {
        position: 'right',
        labels: { color: '#e0e0e0', font: { size: 12 }, padding: 15 }
      }
    }
  };

  public genreChartData = signal<ChartData<'polarArea'>>({ labels: [], datasets: [] });
  public pieChartData = signal<ChartData<'pie'>>({ 
    labels: [], 
    datasets: [{ 
      data: [],
      backgroundColor: [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
        '#FF9F40', '#E7E9ED', '#76D7C4', '#F1948A', '#85C1E9'
      ],
      hoverOffset: 4
    }] 
  });

  // Line Chart Configuration
  public lineChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    elements: { line: { tension: 0.4 } },
    plugins: {
      legend: { labels: { color: '#e0e0e0' } }
    },
    scales: {
      y: { ticks: { color: '#b3b3b3' }, grid: { color: '#333' } },
      x: { ticks: { color: '#b3b3b3' }, grid: { color: '#333' } }
    }
  };
  public lineChartData = signal<ChartData<'line'>>({ labels: [], datasets: [{ data: [], label: 'Score average' }] });

 public barChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => ` Score moyen: ${context.raw}`
        }
      }
    },
    scales: {
      y: { 
        beginAtZero: false,
        min: 5, 
        max: 10,
        grid: { color: '#333' },
        ticks: { color: '#b3b3b3' }
      },
      x: {
        ticks: { 
          color: '#e0e0e0', 
          font: { size: 11 },
          maxRotation: 45, 
          minRotation: 45
        },
        grid: { display: false }
      }
    }
  };
  public barChartData = signal<ChartData<'bar'>>({ labels: [], datasets: [] });

  public studioChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y', 
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { color: '#333' }, ticks: { color: '#b3b3b3', stepSize: 1 } },
      y: { grid: { display: false }, ticks: { color: '#e0e0e0' } }
    }
  };
  public studioChartData = signal<ChartData<'bar'>>({ labels: [], datasets: [] });

  public sourceChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '50%', 
    plugins: {
      legend: { 
        position: 'right', 
        labels: { color: '#e0e0e0', padding: 15 } 
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.raw as number;

            const dataArray = context.dataset.data as number[];
            const total = dataArray.reduce((acc, curr) => acc + curr, 0);            
            const percentage = Math.round((value / total) * 100) + '%';
            return ` ${label}: ${value} (${percentage})`;
          }
        }
      }
    }
  };
  
  public sourceChartData = signal<ChartData<'doughnut'>>({ labels: [], datasets: [] });


  
async exportToPDF() {
  const data = document.getElementById('dashboard-content');
  
  if (data) {
    const html2canvas = (await import('html2canvas')).default;
    const jsPDF = (await import('jspdf')).default;

    html2canvas(data, { 
      scale: 2,
      useCORS: true,
      backgroundColor: '#121212',
      // CORRECTION 1: Réinitialiser le scroll pour éviter le décalage
      scrollY: -window.scrollY, 
      scrollX: 0,
      windowWidth: document.documentElement.offsetWidth,
      windowHeight: document.documentElement.offsetHeight
    }).then(canvas => {
      // Dimensions de la page A4 en mm
      const pdfWidth = 210;
      const pdfHeight = 297;
      const headerHeight = 40; // Espace réservé pour l'en-tête

      // Calculer la hauteur initiale basée sur la largeur de la page
      let imgWidth = pdfWidth;
      let imgHeight = (canvas.height * pdfWidth) / canvas.width;
      
      // CORRECTION 2: Logique "Fit-to-Page" 
      // Si l'image est trop longue pour l'espace restant, on la redimensionne
      const availableHeight = pdfHeight - headerHeight; // ~257mm
      
      if (imgHeight > availableHeight) {
        // Forcer la hauteur à l'espace disponible
        imgHeight = availableHeight;
        // Recalculer la largeur pour garder le ratio (proportions)
        imgWidth = (canvas.width * imgHeight) / canvas.height;
      }

      // Centrer l'image horizontalement si elle a été rétrécie
      const xPos = (pdfWidth - imgWidth) / 2;
      const yPos = headerHeight; // Commencer juste après l'en-tête

      const contentDataURL = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const today = new Date();
      const dateStr = today.toLocaleDateString('fr-FR');
      
      // --- Header Section ---
      pdf.setFontSize(22);
      pdf.setTextColor(40);
      pdf.text('Anime Analytics Report', 105, 20, { align: 'center' });

      pdf.setFontSize(15);
      pdf.setTextColor(40);
      pdf.text('Made by: Tri NGUYEN', 105, 27, { align: 'center' });
      
      pdf.setFontSize(11);
      pdf.setTextColor(100);
      pdf.text(`Generated on: ${dateStr}`, 105, 32, { align: 'center' });

      // --- Body Section ---
      pdf.addImage(contentDataURL, 'PNG', xPos, yPos, imgWidth, imgHeight);
      
      const fileNameDate = today.toISOString().split('T')[0];
      pdf.save(`Anime_Dashboard_${fileNameDate}.pdf`);
    });
  }
}
  

  ngOnInit() {
    this.loadInitialData();
    this.loadKeyMetrics();
    this.loadTopStudios();
    this.loadSourceDistribution();
  }

  loadInitialData() {
    this.analyticsService.getScoreByYear().subscribe(res => {
      this.lineChartData.set({
        labels: res.labels,
        datasets: [{
          data: res.data,
          label: 'Average Score',
          borderColor: '#bb86fc',
          backgroundColor: 'rgba(187, 134, 252, 0.2)',
          fill: 'origin',
          pointBackgroundColor: '#fff',
          pointBorderColor: '#bb86fc'
        }]
      });

      if (res.labels && res.labels.length > 0) {
        const years = res.labels.map((y: any) => Number(y)).sort((a: number, b: number) => b - a);
        this.availableYears.set(years);
      }
    });

    this.loadGenreData();
    this.loadTopGenresByScore();
  }

  loadGenreData(year?: number) {
    this.analyticsService.getGenreDistribution(year).subscribe(res => {
      this.genreChartData.set({
        labels: res.labels,
        datasets: [{
          data: res.data,
          backgroundColor: [
            'rgba(255, 99, 132, 0.8)',
            'rgba(54, 162, 235, 0.8)',
            'rgba(255, 206, 86, 0.8)',
            'rgba(75, 192, 192, 0.8)',
            'rgba(153, 102, 255, 0.8)',
            'rgba(255, 159, 64, 0.8)',
            'rgba(231, 233, 237, 0.8)',
            'rgba(118, 215, 196, 0.8)',
            'rgba(241, 148, 138, 0.8)',
            'rgba(133, 193, 233, 0.8)'
          ],
          borderWidth: 1,
          borderColor: '#1e1e1e' 
        }]
      });
    });
  }

  loadTopGenresByScore() {
    this.analyticsService.getTopGenresByScore().subscribe(res => {
      const colors = [
        '#FF6384', 
        '#36A2EB', 
        '#FFCE56', 
        '#4BC0C0',
        '#9966FF', 
        '#FF9F40', 
        '#E7E9ED',
        '#76D7C4', 
        '#F1948A', 
        '#85C1E9'  
      ];

      this.barChartData.set({
        labels: res.labels,
        datasets: [{
          data: res.data,
          backgroundColor: colors, 
          borderRadius: 10,
          barThickness: 80
        }]
      });
    });
  }

  loadTopStudios() {
    this.analyticsService.getTopStudios().subscribe(res => {
      this.studioChartData.set({
        labels: res.labels,
        datasets: [{
          data: res.data,
          backgroundColor: '#03dac6', 
          borderRadius: 4,
          barThickness: 15
        }]
      });
    });
  }

  loadSourceDistribution() {
    this.analyticsService.getSourceDistribution().subscribe(res => {
      this.sourceChartData.set({
        labels: res.labels,
        datasets: [{
          data: res.data,
          backgroundColor: [
            '#FF6384', // Manga
            '#36A2EB', // Original
            '#FFCE56', // Light Novel
            '#4BC0C0', // Game
            '#9966FF', // Visual Novel
            '#FF9F40', // Other
            '#C9CBCF'
          ],
          hoverOffset: 10,
          borderWidth: 2,
          borderColor: '#1e1e1e'
        }]
      });
    });
  }

  onYearFilterChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const value = select.value;
    const year = value ? Number(value) : undefined;
    this.loadGenreData(year);
  }

  loadKeyMetrics() {
    this.analyticsService.getKeyMetrics().subscribe(data => {
      this.keyMetrics.set(data);
    });
  }
}