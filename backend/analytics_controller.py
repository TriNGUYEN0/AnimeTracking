from flask import Blueprint, jsonify
from analytics_service import AnalyticsService

analytics_bp = Blueprint('analytics', __name__)
service = AnalyticsService()

@analytics_bp.route('/genre-distribution', methods=['GET'])
def get_genre_distribution():
    data = service.get_genre_distribution()
    return jsonify(data)

@analytics_bp.route('/score-by-year', methods=['GET'])
def get_score_by_year():
    data = service.get_score_by_year()
    return jsonify(data)

@analytics_bp.route('/popularity-vs-score', methods=['GET'])
def get_popularity_vs_score():
    data = service.get_popularity_vs_score()
    return jsonify(data)