from flask import Flask
from flask_cors import CORS
from anime_controller import anime_bp

app = Flask(__name__)
# Activer CORS pour permettre les requêtes depuis Angular
CORS(app)

# Enregistrement des contrôleurs
app.register_blueprint(anime_bp, url_prefix='/api/anime')

if __name__ == '__main__':
    # Lancement du serveur en mode debug
    app.run(debug=True, port=5000)