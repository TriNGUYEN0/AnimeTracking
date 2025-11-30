import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:5000/api/analytics';

  getGenreDistribution(): Observable<any> {
    return this.http.get(`${this.apiUrl}/genre-distribution`);
  }

  getScoreByYear(): Observable<any> {
    return this.http.get(`${this.apiUrl}/score-by-year`);
  }

  getPopularityVsScore(): Observable<any> {
    return this.http.get(`${this.apiUrl}/popularity-vs-score`);
  }
}