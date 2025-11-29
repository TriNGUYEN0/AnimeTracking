import { Component, Input } from '@angular/core';
import { Anime } from '../../services/anime.service';

@Component({
  selector: 'app-anime-card',
  standalone: true,
  // Lien vers le fichier de template externe
  templateUrl: './anime-card.html',
  // Lien vers le fichier de style externe
  styleUrl: './anime-card.css'
})
export class AnimeCardComponent {
  // Propriété d'entrée requise
  @Input({ required: true }) anime!: Anime;
}