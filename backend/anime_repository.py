import requests
import time

class AnimeRepository:
    JIKAN_API_URL = "https://api.jikan.moe/v4/top/anime"
    
    _cache_data = None
    _last_fetch_time = 0
    CACHE_DURATION = 600 

    def get_top_anime_data(self):
        current_time = time.time()
        
        # Kiểm tra Cache
        if AnimeRepository._cache_data and (current_time - AnimeRepository._last_fetch_time < self.CACHE_DURATION):
            print("Using Cached Data")
            return AnimeRepository._cache_data

        try:
            print("Fetching data from Jikan API...")
            response = requests.get(self.JIKAN_API_URL)
            if response.status_code == 200:
                data = response.json().get('data', [])
                if data:
                    AnimeRepository._cache_data = data
                    AnimeRepository._last_fetch_time = current_time
                return data
            
            print(f"API Error {response.status_code}. Using stale cache.")
            return AnimeRepository._cache_data if AnimeRepository._cache_data else []

        except Exception as e:
            print(f"Exception: {e}")
            return AnimeRepository._cache_data if AnimeRepository._cache_data else []