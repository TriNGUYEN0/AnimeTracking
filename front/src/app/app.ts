import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { SearchComponent } from './components/search/search';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, SearchComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
