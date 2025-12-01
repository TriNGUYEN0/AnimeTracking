import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface KeyMetrics {
  total_anime: number;
  avg_score: number;
  total_members: number;
  active_years: number;
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private http = inject(HttpClient);
  private apiUrl = 'https://animetracking-backend.onrender.com';

  getGenreDistribution(year?: number): Observable<any> {
    let url = `${this.apiUrl}/genre-distribution`;
    if (year) {
      url += `?year=${year}`;
    }
    return this.http.get(url);
  }

  getScoreByYear(): Observable<any> {
    return this.http.get(`${this.apiUrl}/score-by-year`);
  }

  getKeyMetrics(): Observable<KeyMetrics> {
    return this.http.get<KeyMetrics>(`${this.apiUrl}/key-metrics`);
  }

  getTopGenresByScore(): Observable<any> {
    return this.http.get(`${this.apiUrl}/top-genres-by-score`);
  }


  getTopStudios(): Observable<any> {
    return this.http.get(`${this.apiUrl}/top-studios`);
  }

  getSourceDistribution(): Observable<any> {
    return this.http.get(`${this.apiUrl}/source-distribution`);
  }

}