import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home'; 
import { DashboardComponent } from './components/dashboard/dashboard';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'dashboard', component: DashboardComponent }, // Trang thống kê
];