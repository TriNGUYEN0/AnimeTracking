class Anime:
    # Thêm tham số large_image_url vào constructor
    def __init__(self, title, image_url, large_image_url, score, rank, episodes, year, synopsis, genres):
        self.title = title
        self.image_url = image_url
        self.large_image_url = large_image_url # <-- Mới
        self.score = score
        self.rank = rank
        self.episodes = episodes
        self.year = year
        self.synopsis = synopsis
        self.genres = genres

    def to_dict(self):
        return {
            "title": self.title,
            "image_url": self.image_url,
            "large_image_url": self.large_image_url, # <-- Mới
            "score": self.score,
            "rank": self.rank,
            "episodes": self.episodes,
            "year": self.year,
            "synopsis": self.synopsis,
            "genres": self.genres
        }