import pandas as pd
from anime_repository import AnimeRepository

class AnalyticsService:
    def __init__(self):
        self.repository = AnimeRepository()

    def _get_dataframe(self):
        # Lấy dữ liệu thô từ repository
        data = self.repository.get_top_anime_data()
        # Chuyển đổi thành Pandas DataFrame
        df = pd.DataFrame(data)
        return df

    def get_genre_distribution(self, year=None):
        df = self._get_dataframe()
        
        # Filtrer par année si le paramètre est fourni
        if year:
            try:
                # Chuyển đổi sang số nguyên để so sánh chính xác
                target_year = int(year)
                df = df[df['year'] == target_year]
            except ValueError:
                pass # Bỏ qua nếu year không phải số

        # Logic cũ: Explode genres và đếm
        genres_list = []
        for index, row in df.iterrows():
            if 'genres' in row and isinstance(row['genres'], list):
                for genre in row['genres']:
                    genres_list.append(genre.get('name'))
        
        genres_series = pd.Series(genres_list)
        
        if genres_series.empty:
            return {"labels": [], "data": []}

        # Lấy top 10
        distribution = genres_series.value_counts().head(10)
        
        return {
            "labels": distribution.index.tolist(),
            "data": distribution.values.tolist()
        }

    def get_score_by_year(self):
        df = self._get_dataframe()
        
        # Trích xuất năm từ cột 'year' hoặc 'aired'
        # Xử lý dữ liệu thiếu hoặc sai định dạng
        df['year'] = df['year'].fillna(0).astype(int)
        df = df[df['year'] > 0] # Lọc bỏ năm không hợp lệ
        
        # Gom nhóm theo năm và tính điểm trung bình
        score_by_year = df.groupby('year')['score'].mean().sort_index()
        
        return {
            "labels": score_by_year.index.tolist(),
            "data": score_by_year.values.tolist()
        }

    def get_popularity_vs_score(self):
        df = self._get_dataframe()
        
        # Lấy 2 cột cần thiết
        scatter_data = df[['popularity', 'score', 'title']].dropna()
        
        # Định dạng dữ liệu cho biểu đồ Scatter (x, y)
        data = []
        for index, row in scatter_data.iterrows():
            data.append({
                "x": row['popularity'],
                "y": row['score'],
                "label": row['title'] # Thêm tên để hiển thị khi hover
            })
            
        return data