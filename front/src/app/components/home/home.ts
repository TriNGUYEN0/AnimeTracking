import { Component, OnInit, inject, signal } from '@angular/core';
import { AnimeService, Anime } from '../../services/anime.service';
import { AnimeCardComponent } from '../anime-card/anime-card';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [AnimeCardComponent],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class HomeComponent implements OnInit {
  private animeService = inject(AnimeService);
  protected animeList = signal<Anime[]>([]);
  
  // Biến theo dõi vị trí slider
  protected currentIndex = signal(0);
  protected readonly itemsPerPage = 5; // Số thẻ hiển thị cùng lúc

  ngOnInit() {
    this.animeService.getTopAnime().subscribe({
      next: (data) => {
        // Sắp xếp theo rank
        const sortedData = data.sort((a, b) => a.rank - b.rank);
        this.animeList.set(sortedData);
      },
      error: (err) => console.error('Erreur:', err)
    });
  }

  // Hàm qua phải (Next)
  nextSlide() {
    // Chỉ cho phép next nếu chưa đến cuối danh sách
    if (this.currentIndex() < this.animeList().length - this.itemsPerPage) {
      this.currentIndex.update(v => v + 1);
    }
  }

  // Hàm qua trái (Prev)
  prevSlide() {
    // Chỉ cho phép prev nếu không phải đang ở đầu
    if (this.currentIndex() > 0) {
      this.currentIndex.update(v => v - 1);
    }
  }
}