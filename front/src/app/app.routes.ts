import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  // Heavy pages (Chart.js, ECharts) are split into their own chunks and only loaded when visited.
  { path: 'dashboard', loadComponent: () => import('./components/dashboard/dashboard').then((m) => m.DashboardComponent) },
  { path: 'anime/:id', loadComponent: () => import('./components/anime-detail/anime-detail').then((m) => m.AnimeDetailComponent) },
  { path: 'graphe', loadComponent: () => import('./components/graphe/graphe').then((m) => m.GrapheComponent) },
  { path: '**', redirectTo: '' },
];
