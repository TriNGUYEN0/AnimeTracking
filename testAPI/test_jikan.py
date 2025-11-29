import requests
import json

def explore_jikan_data():
    # URL de l'API pour récupérer le top des animes
    url = "https://api.jikan.moe/v4/top/anime"
    
    try:
        # Envoi de la requête GET
        response = requests.get(url)
        
        # Vérification du statut de la réponse (200 OK)
        if response.status_code == 200:
            # Conversion de la réponse en JSON
            full_data = response.json()
            
            # Récupération de la liste 'data' (contient les animes)
            anime_list = full_data.get('data', [])
            
            if anime_list:
                # Prenons le premier élément pour l'analyser
                first_anime = anime_list[0]
                
                print(f"=== Titre: {first_anime.get('title')} ===")
                
                # Afficher toutes les clés disponibles (champs de données)
                print("\n--- Liste des clés disponibles (Champs) ---")
                print(list(first_anime.keys()))
                
                # Afficher la structure complète joliment (Pretty Print)
                print("\n--- Structure complète du premier anime ---")
                print(json.dumps(first_anime, indent=4, ensure_ascii=False))
            else:
                print("Aucune donnée trouvée.")
        else:
            print(f"Erreur API: {response.status_code}")
            
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    explore_jikan_data()