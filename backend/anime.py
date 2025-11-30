class Anime:
    # Cập nhật Constructor để nhận thêm episodes, year, synopsis, genres
    def __init__(self, title, image_url, score, rank, episodes, year, synopsis, genres):
        self.title = title
        self.image_url = image_url
        self.score = score
        self.rank = rank
        self.episodes = episodes
        self.year = year
        self.synopsis = synopsis
        self.genres = genres

    # Cập nhật hàm to_dict để trả về đầy đủ dữ liệu JSON
    def to_dict(self):
        return {
            "title": self.title,
            "image_url": self.image_url,
            "score": self.score,
            "rank": self.rank,
            "episodes": self.episodes,
            "year": self.year,
            "synopsis": self.synopsis,
            "genres": self.genres
        }