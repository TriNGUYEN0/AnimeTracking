from anime_repository import AnimeRepository
from anime import Anime

class AnimeService:
    def __init__(self):
        # Injection de dépendance du dépôt
        self.repository = AnimeRepository()

    # Logique métier pour transformer les données brutes en modèles
    def get_top_anime(self):
        raw_data = self.repository.get_top_anime_data()
        anime_list = []
        
        for item in raw_data:
            # Création d'objets Anime
            anime = Anime(
                title=item.get('title'),
                image_url=item.get('images', {}).get('jpg', {}).get('image_url'),
                score=item.get('score'),
                rank=item.get('rank')
            )
            anime_list.append(anime.to_dict())
            
        return anime_list 