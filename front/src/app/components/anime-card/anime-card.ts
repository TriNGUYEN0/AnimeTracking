import { Component, Input } from '@angular/core';
import { Anime } from '../../services/anime.service';

@Component({
  selector: 'app-anime-card',
  standalone: true,
  templateUrl: './anime-card.html',
  styleUrl: './anime-card.css'
})
export class AnimeCardComponent {
  // Propriété d'entrée requise
  @Input({ required: true }) anime!: Anime;
}