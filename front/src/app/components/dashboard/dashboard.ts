import { Component, OnInit, inject, signal } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { AnalyticsService } from '../../services/analytics.service';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [BaseChartDirective],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit {
  private analyticsService = inject(AnalyticsService);

  // Danh sách các năm có dữ liệu để hiển thị trong bộ lọc
  availableYears = signal<number[]>([]);

  // --- SỬA LỖI Ở ĐÂY: Thêm <'pie'> vào ChartConfiguration ---
  public pieChartOptions: ChartConfiguration<'pie'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '60%', // Giờ đây TypeScript sẽ hiểu thuộc tính này
    layout: {
      padding: 20
    },
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: '#e0e0e0',
          font: { size: 12 },
          padding: 15
        }
      },
      title: { display: false }
    },
    elements: {
      arc: {
        borderWidth: 2,
        borderColor: '#1e1e1e'
      }
    }
  };

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

  // Line Chart Data
  // Tương tự, thêm <'line'> để chặt chẽ hơn (tùy chọn)
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
  public lineChartData = signal<ChartData<'line'>>({ labels: [], datasets: [{ data: [], label: 'Score Moyen' }] });

  // Scatter Chart Data
  public scatterChartOptions: ChartConfiguration<'scatter'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { 
        title: { display: true, text: 'Popularity Rank', color: '#b3b3b3' },
        ticks: { color: '#b3b3b3' },
        grid: { color: '#333' }
      },
      y: { 
        title: { display: true, text: 'Score', color: '#b3b3b3' },
        ticks: { color: '#b3b3b3' },
        grid: { color: '#333' }
      }
    },
    plugins: {
      legend: { labels: { color: '#e0e0e0' } }
    }
  };
  public scatterChartData = signal<ChartData<'scatter'>>({ datasets: [] });

  ngOnInit() {
    this.loadInitialData();
  }

  loadInitialData() {
    this.analyticsService.getScoreByYear().subscribe(res => {
      this.lineChartData.set({
        labels: res.labels,
        datasets: [{
          data: res.data,
          label: 'Score Moyen',
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
    this.loadScatterData();
  }

  loadGenreData(year?: number) {
    this.analyticsService.getGenreDistribution(year).subscribe(res => {
      this.pieChartData.set({
        labels: res.labels,
        datasets: [{
          data: res.data,
          backgroundColor: this.pieChartData().datasets[0].backgroundColor,
          hoverOffset: 10
        }]
      });
    });
  }

  loadScatterData() {
    this.analyticsService.getPopularityVsScore().subscribe(res => {
      this.scatterChartData.set({
        datasets: [{
          data: res,
          label: 'Anime',
          pointRadius: 4,
          pointHoverRadius: 6,
          backgroundColor: '#03dac6',
          pointBackgroundColor: '#03dac6'
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
}