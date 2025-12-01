from flask import Blueprint, jsonify, request
from analytics_service import AnalyticsService

analytics_bp = Blueprint('analytics', __name__)
service = AnalyticsService()

@analytics_bp.route('/genre-distribution', methods=['GET'])
def get_genre_distribution():
    year = request.args.get('year')
    data = service.get_genre_distribution(year)
    return jsonify(data)

@analytics_bp.route('/score-by-year', methods=['GET'])
def get_score_by_year():
    data = service.get_score_by_year()
    return jsonify(data)

@analytics_bp.route('/popularity-vs-score', methods=['GET'])
def get_popularity_vs_score():
    data = service.get_popularity_vs_score()
    return jsonify(data)

@analytics_bp.route('/key-metrics', methods=['GET'])
def get_key_metrics():
    data = service.get_key_metrics()
    return jsonify(data)

# ... (các import và route khác) ...

@analytics_bp.route('/top-genres-by-score', methods=['GET'])
def get_top_genres_by_score():
    data = service.get_top_genres_by_score()
    return jsonify(data)