class Anime:
    # Constructeur de la classe Anime
    def __init__(self, title, image_url, score, rank):
        self.title = title
        self.image_url = image_url
        self.score = score
        self.rank = rank

    # Convertir l'objet en dictionnaire pour la réponse JSON
    def to_dict(self):
        return {
            "title": self.title,
            "image_url": self.image_url,
            "score": self.score,
            "rank": self.rank
        }