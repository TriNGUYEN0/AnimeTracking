import { Component, OnInit, inject, signal } from '@angular/core';
import { AnimeService, Anime } from '../../services/anime.service';
import { AnimeCardComponent } from '../anime-card/anime-card';
import { CommonModule } from '@angular/common'; // Import CommonModule pour ngClass, etc.

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [AnimeCardComponent, CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class HomeComponent implements OnInit {
  private animeService = inject(AnimeService);
  
  // Dữ liệu gốc
  private fullList: Anime[] = [];
  
  // Signals cho giao diện
  protected featuredAnime = signal<Anime | null>(null); // Anime cho banner chính
  protected displayList = signal<Anime[]>([]); // Danh sách hiển thị bên dưới
  protected currentIndex = signal(0);
  protected readonly itemsPerPage = 5;

  // Mapping Mood -> Genre name (Dựa trên dữ liệu Jikan)
   moods = [
    { icon: '🔥', label: 'Action', genre: 'Action' },
    { icon: '😭', label: 'Emotional', genre: 'Drama' },
    { icon: '🤣', label: 'Funny', genre: 'Comedy' },
    { icon: '✨', label: 'Fantasy', genre: 'Fantasy' },
    { icon: '🚀', label: 'Sci-Fi', genre: 'Sci-Fi' },
    { icon: '🔄', label: 'All', genre: 'All' } // Reset
  ];
  selectedMood = signal('All');

  ngOnInit() {
    this.animeService.getTopAnime().subscribe({
      next: (data) => {
        // Trier par rang
        const sortedData = data.sort((a, b) => a.rank - b.rank);
        this.fullList = sortedData;

        // Prendre le premier anime pour la bannière héroïque
        if (sortedData.length > 0) {
          this.featuredAnime.set(sortedData[0]);
        }

        // Afficher le reste dans la liste
        this.displayList.set(sortedData);
      },
      error: (err) => console.error('Erreur:', err)
    });
  }

  // Filtrer la liste par humeur (Mood)
  filterByMood(moodGenre: string) {
    this.selectedMood.set(moodGenre);
    this.currentIndex.set(0); // Reset slider về đầu

    if (moodGenre === 'All') {
      this.displayList.set(this.fullList);
    } else {
      // Filtrer les animes qui contiennent le genre sélectionné
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