from anime_repository import AnimeRepository
from anime import Anime

class AnimeService:
    def __init__(self):
        # Injection de dépendance du dépôt
        self.repository = AnimeRepository()

    def get_top_anime(self):
        raw_data = self.repository.get_top_anime_data()
        anime_list = []
        
        for item in raw_data:
            year = item.get('year')
            if not year and item.get('aired') and item.get('aired').get('prop'):
                year = item.get('aired').get('prop').get('from', {}).get('year')

            raw_genres = item.get('genres', [])
            genres = [g.get('name') for g in raw_genres]

            # Lấy ảnh chất lượng cao
            images = item.get('images', {}).get('jpg', {})
            image_url = images.get('image_url')
            large_image_url = images.get('large_image_url') or image_url # Fallback nếu không có ảnh lớn

            anime = Anime(
                title=item.get('title'),
                image_url=image_url,
                large_image_url=large_image_url, # <-- Truyền vào đây
                score=item.get('score'),
                rank=item.get('rank'),
                episodes=item.get('episodes'),
                year=year,
                synopsis=item.get('synopsis'),
                genres=genres
            )
            anime_list.append(anime.to_dict())
            
        return anime_list
    
    def get_random_anime(self):
        # Récupérer les données brutes d'un seul anime
        item = self.repository.get_random_anime_data()
        if not item:
            return None
            
        # Extraction de l'année
        year = item.get('year')
        if not year and item.get('aired') and item.get('aired').get('prop'):
            year = item.get('aired').get('prop').get('from', {}).get('year')

        # Extraction des genres
        raw_genres = item.get('genres', [])
        genres = [g.get('name') for g in raw_genres]

        # Récupération des images haute qualité
        images = item.get('images', {}).get('jpg', {})
        image_url = images.get('image_url')
        large_image_url = images.get('large_image_url') or image_url

        # Création de l'objet Anime
        anime = Anime(
            title=item.get('title'),
            image_url=image_url,
            large_image_url=large_image_url,
            score=item.get('score'),
            rank=item.get('rank'),
            episodes=item.get('episodes'),
            year=year,
            synopsis=item.get('synopsis'),
            genres=genres
        )
        return anime.to_dict()