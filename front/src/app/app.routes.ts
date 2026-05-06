import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home'; 
import { DashboardComponent } from './components/dashboard/dashboard';
import { GrapheComponent } from './components/graphe/graphe';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'graphe', component: GrapheComponent }
];