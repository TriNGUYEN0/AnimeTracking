import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive], // Import các module điều hướng
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  // Không cần logic lấy anime ở đây nữa
}