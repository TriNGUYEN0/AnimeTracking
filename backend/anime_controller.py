from flask import Blueprint, jsonify
from anime_service import AnimeService

# Création du plan (Blueprint) pour les routes d'anime
anime_bp = Blueprint('anime', __name__)
service = AnimeService()

@anime_bp.route('/top', methods=['GET'])
def get_top_anime():
    # Appel au service pour récupérer les données
    data = service.get_top_anime()
    return jsonify(data)