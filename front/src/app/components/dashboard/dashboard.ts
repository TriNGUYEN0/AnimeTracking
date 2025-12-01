import { Component, OnInit, inject, signal } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { AnalyticsService, KeyMetrics } from '../../services/analytics.service';
import { ChartConfiguration, ChartData } from 'chart.js';
import { DecimalPipe } from '@angular/common'; // 1. Import DecimalPipe

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    BaseChartDirective, 
    DecimalPipe // 2. Thêm vào imports để sử dụng được pipe '| number'
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit {
  private analyticsService = inject(AnalyticsService);

  // Danh sách các năm có dữ liệu để hiển thị trong bộ lọc
  availableYears = signal<number[]>([]);

  keyMetrics = signal<KeyMetrics | null>(null);

  // Pie Chart Configuration
  public genreChartOptions: ChartConfiguration<'polarArea'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        grid: { color: '#333' }, // Màu lưới tối
        ticks: { 
          display: false, // Ẩn số trên trục bán kính cho gọn
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

  // Đổi tên biến cho rõ nghĩa: pieChartData -> genreChartData
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
    // indexAxis: 'y', // <-- XÓA DÒNG NÀY để trở về mặc định (Cột đứng)
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => ` Score moyen: ${context.raw}`
        }
      }
    },
    scales: {
      y: { // Trục Y bây giờ là Điểm số (Score)
        beginAtZero: false,
        min: 5, // Chỉnh min lên 6 để cột trông cao và rõ sự chênh lệch hơn
        max: 10,
        grid: { color: '#333' },
        ticks: { color: '#b3b3b3' }
      },
      x: { // Trục X bây giờ là Tên Thể loại
        ticks: { 
          color: '#e0e0e0', 
          font: { size: 11 },
          maxRotation: 45, // Xoay chữ nghiêng nếu tên quá dài
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
    indexAxis: 'y', // Biểu đồ ngang để hiển thị tên Studio dài cho dễ đọc
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
    cutout: '50%', // Độ rỗng ở giữa (Vành khuyên)
    plugins: {
      legend: { 
        position: 'right', 
        labels: { color: '#e0e0e0', padding: 15 } 
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            // Hiển thị thêm % cho dễ hình dung
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
    // Doughnut không cần scales
  };
  
  // Lưu ý: Đổi type 'polarArea' thành 'doughnut'
  public sourceChartData = signal<ChartData<'doughnut'>>({ labels: [], datasets: [] });


  

  async exportToPDF() {
  const data = document.getElementById('dashboard-content');
  
  if (data) {
    // Import thư viện động (Lazy load)
    const html2canvas = (await import('html2canvas')).default;
    const jsPDF = (await import('jspdf')).default;

    html2canvas(data, { 
      scale: 2,
      useCORS: true,
      backgroundColor: '#121212'
    }).then(canvas => {
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = canvas.height * imgWidth / canvas.width;
      
      const contentDataURL = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const today = new Date();
      const dateStr = today.toLocaleDateString('fr-FR');
      
      pdf.setFontSize(22);
      pdf.setTextColor(40);
      pdf.text('Anime Analytics Report', 105, 20, { align: 'center' });

      pdf.setFontSize(15);
      pdf.setTextColor(40);
      pdf.text('Made by: Tri NGUYEN', 105, 27, { align: 'center' });
      
      pdf.setFontSize(11);
      pdf.setTextColor(100);
      pdf.text(`Generated on: ${dateStr}`, 105, 32, { align: 'center' });

      const imageY = 40;
      pdf.addImage(contentDataURL, 'PNG', 0, imageY, imgWidth, imgHeight);
      
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
          // Sử dụng bảng màu rực rỡ
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
          borderColor: '#1e1e1e' // Viền trùng màu nền để tạo khoảng cách đẹp
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
          backgroundColor: '#03dac6', // Màu xanh ngọc
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
            '#FF6384', // Manga (Màu nổi nhất)
            '#36A2EB', // Original
            '#FFCE56', // Light Novel
            '#4BC0C0', // Game
            '#9966FF', // Visual Novel
            '#FF9F40', // Khác
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