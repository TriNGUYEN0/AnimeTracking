import { Routes } from '@angular/router';
import { App } from './app'; 
import { DashboardComponent } from './components/dashboard/dashboard';

export const routes: Routes = [
  { path: '', component: App },
  { path: 'dashboard', component: DashboardComponent },
];