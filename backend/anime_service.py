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
            # Extraction de l'année (soit le champ 'year', soit depuis 'aired')
            year = item.get('year')
            if not year and item.get('aired') and item.get('aired').get('prop'):
                year = item.get('aired').get('prop').get('from', {}).get('year')

            # Extraction des genres (liste de noms)
            raw_genres = item.get('genres', [])
            genres = [g.get('name') for g in raw_genres]

            # Création de l'objet Anime avec les nouvelles données
            anime = Anime(
                title=item.get('title'),
                image_url=item.get('images', {}).get('jpg', {}).get('image_url'),
                score=item.get('score'),
                rank=item.get('rank'),
                episodes=item.get('episodes'),
                year=year,
                synopsis=item.get('synopsis'),
                genres=genres
            )
            anime_list.append(anime.to_dict())
            
        return anime_list