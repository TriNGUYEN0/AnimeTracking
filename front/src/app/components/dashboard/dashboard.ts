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

  // Pie Chart Data
  public pieChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    plugins: { legend: { position: 'top' } }
  };
  public pieChartData = signal<ChartData<'pie'>>({ labels: [], datasets: [{ data: [] }] });

  // Line Chart Data
  public lineChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    elements: { line: { tension: 0.5 } }
  };
  public lineChartData = signal<ChartData<'line'>>({ labels: [], datasets: [{ data: [], label: 'Score Moyen' }] });

  // Scatter Chart Data
  public scatterChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    scales: {
      x: { title: { display: true, text: 'Popularity Rank' } },
      y: { title: { display: true, text: 'Score' } }
    }
  };
  public scatterChartData = signal<ChartData<'scatter'>>({ datasets: [] });

  ngOnInit() {
    this.loadGenreData();
    this.loadScoreData();
    this.loadScatterData();
  }

  loadGenreData() {
    this.analyticsService.getGenreDistribution().subscribe(res => {
      this.pieChartData.set({
        labels: res.labels,
        datasets: [{ data: res.data }]
      });
    });
  }

  loadScoreData() {
    this.analyticsService.getScoreByYear().subscribe(res => {
      this.lineChartData.set({
        labels: res.labels,
        datasets: [{
          data: res.data,
          label: 'Score Moyen',
          borderColor: '#bb86fc',
          backgroundColor: 'rgba(187, 134, 252, 0.3)',
          fill: true
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
          backgroundColor: '#03dac6'
        }]
      });
    });
  }
}