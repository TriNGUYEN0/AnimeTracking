import requests
import json
import time

def extraire_donnees_anime(nombre_de_pages):
    liste_animes = []
    url_base = "https://api.jikan.moe/v4/top/anime"

    for page in range(1, nombre_de_pages + 1):
        url = f"{url_base}?page={page}"
        reponse = requests.get(url)

        if reponse.status_code == 200:
            donnees_brutes = reponse.json().get('data', [])
            
            for anime in donnees_brutes:
                noms_studios = [studio.get('name') for studio in anime.get('studios', [])]
                noms_genres = [genre.get('name') for genre in anime.get('genres', [])]

                anime_filtre = {
                    "id": anime.get('mal_id'),
                    "titre": anime.get('title'),
                    "annee": anime.get('year'),
                    "score": anime.get('score'),
                    "episodes": anime.get('episodes'),
                    "synopsis": anime.get('synopsis'),
                    "studios": noms_studios,
                    "genres": noms_genres,
                    "image_url": anime.get('images', {}).get('jpg', {}).get('image_url'),
                    "large_image_url": anime.get('images', {}).get('jpg', {}).get('large_image_url')
                }
                
                liste_animes.append(anime_filtre)
            
            print(f"Page {page} terminee.")
        else:
            print(f"Erreur a la page {page}.")

        time.sleep(1.5)

    with open('animes_graphe.json', 'w', encoding='utf-8') as fichier:
        json.dump(liste_animes, fichier, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    extraire_donnees_anime(1000)