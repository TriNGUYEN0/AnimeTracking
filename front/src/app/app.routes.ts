import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home'; // Import Home mới
import { DashboardComponent } from './components/dashboard/dashboard';

export const routes: Routes = [
  { path: '', component: HomeComponent }, // Trang chủ
  { path: 'dashboard', component: DashboardComponent }, // Trang thống kê
];