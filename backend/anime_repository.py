import requests

class AnimeRepository:
    JIKAN_API_URL = "https://api.jikan.moe/v4/top/anime"

    # Méthode pour récupérer les données depuis l'API Jikan
    def get_top_anime_data(self):
        try:
            response = requests.get(self.JIKAN_API_URL)
            if response.status_code == 200:
                # Retourner la liste des animes (data)
                return response.json().get('data', [])
            return []
        except Exception as e:
            # Gestion des erreurs de connexion
            print(f"Erreur API: {e}")
            return []