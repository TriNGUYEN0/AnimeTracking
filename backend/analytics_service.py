import pandas as pd
from anime_repository import AnimeRepository

class AnalyticsService:
    def __init__(self):
        self.repository = AnimeRepository()

    def _get_dataframe(self):
        data = self.repository.get_top_anime_data()
        # Nếu không có data, trả về DataFrame rỗng ngay
        if not data:
            return pd.DataFrame()
        return pd.DataFrame(data)

    def get_genre_distribution(self, year=None):
        df = self._get_dataframe()
        
        # Kiểm tra dữ liệu rỗng
        if df.empty or 'genres' not in df.columns:
            return {"labels": [], "data": []}
        
        if year:
            try:
                target_year = int(year)
                # Kiểm tra cột year có tồn tại không trước khi lọc
                if 'year' in df.columns:
                    df = df[df['year'] == target_year]
            except ValueError:
                pass

        genres_list = []
        for index, row in df.iterrows():
            if 'genres' in row and isinstance(row['genres'], list):
                for genre in row['genres']:
                    genres_list.append(genre.get('name'))
        
        genres_series = pd.Series(genres_list)
        if genres_series.empty:
            return {"labels": [], "data": []}

        distribution = genres_series.value_counts().head(10)
        return {
            "labels": distribution.index.tolist(),
            "data": distribution.values.tolist()
        }

    def get_score_by_year(self):
        df = self._get_dataframe()
        
        # Kiểm tra các cột cần thiết
        if df.empty or 'year' not in df.columns or 'score' not in df.columns:
            return {"labels": [], "data": []}
        
        df['year'] = df['year'].fillna(0).astype(int)
        df = df[df['year'] > 0]
        
        score_by_year = df.groupby('year')['score'].mean().sort_index()
        
        return {
            "labels": score_by_year.index.tolist(),
            "data": score_by_year.values.tolist()
        }

    def get_popularity_vs_score(self):
        df = self._get_dataframe()
        
        # Kiểm tra cột để tránh KeyError
        required_cols = ['popularity', 'score', 'title']
        if df.empty or not all(col in df.columns for col in required_cols):
            return []
        
        scatter_data = df[required_cols].dropna()
        
        data = []
        for index, row in scatter_data.iterrows():
            data.append({
                "x": row['popularity'],
                "y": row['score'],
                "label": row['title']
            })
            
        return data

    def get_key_metrics(self):
        df = self._get_dataframe()
        
        # Kiểm tra nếu dataframe rỗng
        if df.empty:
            return {
                "total_anime": 0,
                "avg_score": 0,
                "total_members": 0,
                "active_years": 0
            }

        # Kiểm tra các cột cần thiết trước khi tính toán
        avg_score = 0
        if 'score' in df.columns:
            avg_score = round(df['score'].mean(), 2)
            
        total_members = 0
        if 'members' in df.columns:
            total_members = int(df['members'].sum())
            
        active_years = 0
        if 'year' in df.columns:
            active_years = int(df['year'].nunique())

        return {
            "total_anime": int(df.shape[0]),
            "avg_score": avg_score,
            "total_members": total_members,
            "active_years": active_years
        }
    

    def get_top_genres_by_score(self):
        df = self._get_dataframe()
        
        # Kiểm tra dữ liệu
        if df.empty or 'genres' not in df.columns or 'score' not in df.columns:
            return {"labels": [], "data": []}

        # Tạo danh sách phẳng chứa (Genre, Score)
        genre_scores = []
        for index, row in df.iterrows():
            if isinstance(row['genres'], list) and pd.notna(row['score']):
                for g in row['genres']:
                    genre_scores.append({
                        'genre': g.get('name'),
                        'score': row['score']
                    })
        
        if not genre_scores:
             return {"labels": [], "data": []}

        # Tạo DataFrame tạm để tính toán
        df_genres = pd.DataFrame(genre_scores)
        
        # Gom nhóm theo Genre, tính trung bình Score, sắp xếp giảm dần, lấy top 10
        avg_scores = df_genres.groupby('genre')['score'].mean().sort_values(ascending=False).head(10)
        
        return {
            "labels": avg_scores.index.tolist(),
            "data": [round(x, 2) for x in avg_scores.values.tolist()]
        }