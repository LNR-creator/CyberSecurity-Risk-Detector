import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from config import Config
from app.database import db_manager

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize CORS
    CORS(
        app,
        resources={r"/api/*": {"origins": app.config.get('CORS_ORIGINS', ['http://localhost:5173', 'http://127.0.0.1:5173'])}},
        supports_credentials=True
    )

    # Initialize JWT
    jwt = JWTManager(app)

    from app.routes.auth import BLACKLISTED_TOKENS

    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(jwt_header, jwt_payload: dict) -> bool:
        jti = jwt_payload["jti"]
        return jti in BLACKLISTED_TOKENS

    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({"success": False, "message": "The access token has expired. Please re-authenticate."}), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({"success": False, "message": "Invalid token signature or malformed token."}), 401

    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return jsonify({"success": False, "message": "Authorization header is required."}), 401

    # Register Blueprints
    from app.routes.auth import auth_bp
    from app.routes.dashboard import dashboard_bp
    from app.routes.analysis import analysis_bp
    from app.routes.alerts import alerts_bp
    from app.routes.reports import reports_bp
    from app.routes.settings import settings_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(analysis_bp)
    app.register_blueprint(alerts_bp)
    app.register_blueprint(reports_bp)
    app.register_blueprint(settings_bp)

    # System Health Check Endpoint
    @app.route('/api/health', methods=['GET'])
    def health_check():
        db_status = db_manager.get_status()
        return jsonify({
            "status": "online",
            "service": "CyberSecurity Risk Detector API",
            "version": "1.0.0",
            "database": db_status
        }), 200

    # Centralized Error Handlers
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({"success": False, "message": "Bad request format."}), 400

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"success": False, "message": "Requested resource was not found."}), 404

    @app.errorhandler(413)
    def request_entity_too_large(error):
        return jsonify({
            "success": False,
            "message": f"Uploaded file exceeds server limit ({app.config.get('MAX_CONTENT_LENGTH', 25*1024*1024) // (1024*1024)}MB)."
        }), 413

    @app.errorhandler(500)
    def internal_server_error(error):
        return jsonify({"success": False, "message": "An unexpected server error occurred."}), 500

    # Ensure required directories exist
    os.makedirs(app.config.get('UPLOAD_FOLDER', 'uploads'), exist_ok=True)
    os.makedirs(app.config.get('REPORTS_FOLDER', 'reports'), exist_ok=True)

    return app
