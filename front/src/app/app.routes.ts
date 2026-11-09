import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  // Heavy pages (Chart.js, ECharts) are split into their own chunks and only loaded when visited.
  { path: 'dashboard', loadComponent: () => import('./components/dashboard/dashboard').then((m) => m.DashboardComponent) },
  { path: 'anime/:id', loadComponent: () => import('./components/anime-detail/anime-detail').then((m) => m.AnimeDetailComponent) },
  { path: 'airing', loadComponent: () => import('./components/airing/airing').then((m) => m.AiringComponent) },
  { path: 'my-list', loadComponent: () => import('./components/my-list/my-list').then((m) => m.MyListComponent) },
  { path: 'dle', loadComponent: () => import('./components/animedle/animedle').then((m) => m.AnimedleComponent) },
  { path: 'galaxy', loadComponent: () => import('./components/galaxy/galaxy').then((m) => m.GalaxyComponent) },
  { path: 'graphe', loadComponent: () => import('./components/graphe/graphe').then((m) => m.GrapheComponent) },
  { path: '**', redirectTo: '' },
];
