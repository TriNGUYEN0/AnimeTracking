import { Component, OnInit, inject, signal } from '@angular/core';
import { AnimeService, Anime } from '../../services/anime.service';
import { AnimeCardComponent } from '../anime-card/anime-card';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs/operators';
import { RouletteComponent } from '../roulette/roulette';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [AnimeCardComponent, CommonModule, RouletteComponent],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class HomeComponent implements OnInit {
  private animeService = inject(AnimeService);
  
  private fullList: Anime[] = [];

  // Signal trạng thái
  isLoading = signal(true);
  errorMessage = signal(''); // [NEW] Thêm signal lưu lỗi

  protected featuredAnime = signal<Anime | null>(null);
  protected displayList = signal<Anime[]>([]);
  protected currentIndex = signal(0);
  protected readonly itemsPerPage = 5;

  moods = [
    { icon: '🔥', label: 'Action', genre: 'Action' },
    { icon: '😭', label: 'Emotional', genre: 'Drama' },
    { icon: '🤣', label: 'Funny', genre: 'Comedy' },
    { icon: '✨', label: 'Fantasy', genre: 'Fantasy' },
    { icon: '🚀', label: 'Sci-Fi', genre: 'Sci-Fi' },
    { icon: '🔄', label: 'All', genre: 'All' }
  ];
  selectedMood = signal('All');

  ngOnInit() {
    this.isLoading.set(true);
    this.errorMessage.set(''); // Reset lỗi

    this.animeService.getTopAnime()
      .pipe(
        finalize(() => {
          this.isLoading.set(false);
        })
      )
      .subscribe({
        next: (data) => {
          const sortedData = data.sort((a, b) => a.rank - b.rank);
          this.fullList = sortedData;
          if (sortedData.length > 0) {
            this.featuredAnime.set(sortedData[0]);
          }
          this.displayList.set(sortedData);
        },
        error: (err) => {
          console.error('Erreur API:', err);
          // [NEW] Hiển thị lỗi ra màn hình để biết chuyện gì xảy ra
          this.errorMessage.set(`Erreur chargement API (${err.status}): ${err.statusText || 'Unknown Error'}`);
        }
      });
  }

  filterByMood(moodGenre: string) {
    this.selectedMood.set(moodGenre);
    this.currentIndex.set(0); 

    if (moodGenre === 'All') {
      this.displayList.set(this.fullList);
    } else {
      const filtered = this.fullList.filter(anime => 
        anime.genres && anime.genres.includes(moodGenre)
      );
      this.displayList.set(filtered);
    }
  }

  nextSlide() {
    if (this.currentIndex() < this.displayList().length - this.itemsPerPage) {
      this.currentIndex.update(v => v + 1);
    }
  }

  prevSlide() {
    if (this.currentIndex() > 0) {
      this.currentIndex.update(v => v - 1);
    }
  }
}