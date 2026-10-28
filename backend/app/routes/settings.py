from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.database import db_manager
from app.utils.security import hash_password, check_password
from config import Config

settings_bp = Blueprint('settings', __name__, url_prefix='/api/settings')

@settings_bp.route('', methods=['GET'])
@jwt_required()
def get_settings():
    user_id = get_jwt_identity()
    user = db_manager.users.find_one({"_id": user_id})
    if not user:
        return jsonify({"success": False, "message": "User not found."}), 404

    db_status = db_manager.get_status()

    return jsonify({
        "success": True,
        "profile": {
            "id": str(user["_id"]),
            "username": user.get("username"),
            "email": user.get("email"),
            "role": user.get("role", "SOC Analyst"),
            "created_at": user.get("created_at")
        },
        "system_info": {
            "platform_name": "CyberSecurity Risk Detector",
            "version": "1.0.0",
            "database_engine": db_status["engine"].upper(),
            "database_status": db_status["details"],
            "upload_limit_mb": Config.MAX_CONTENT_LENGTH // (1024 * 1024),
            "max_rows": Config.MAX_CSV_ROWS,
            "default_contamination": Config.DEFAULT_CONTAMINATION,
            "random_state": Config.RANDOM_STATE
        }
    }), 200

@settings_bp.route('', methods=['PATCH'])
@jwt_required()
def update_profile():
    user_id = get_jwt_identity()
    user = db_manager.users.find_one({"_id": user_id})
    if not user:
        return jsonify({"success": False, "message": "User not found."}), 404

    data = request.get_json() or {}
    allowed_updates = {}
    if 'role' in data and data['role']:
        allowed_updates['role'] = str(data['role'])[:50]
    if 'username' in data and data['username']:
        new_username = str(data['username']).strip()
        # Check if taken
        existing = db_manager.users.find_one({"username": new_username})
        if existing and str(existing["_id"]) != user_id:
            return jsonify({"success": False, "message": "Username is already taken."}), 409
        allowed_updates['username'] = new_username

    if allowed_updates:
        db_manager.users.update_one({"_id": user_id}, allowed_updates)

    return jsonify({"success": True, "message": "Profile updated successfully.", "updates": allowed_updates}), 200

@settings_bp.route('/password', methods=['POST'])
@jwt_required()
def change_password():
    user_id = get_jwt_identity()
    user = db_manager.users.find_one({"_id": user_id})
    if not user:
        return jsonify({"success": False, "message": "User not found."}), 404

    data = request.get_json() or {}
    current_pass = data.get('current_password', '')
    new_pass = data.get('new_password', '')

    if not current_pass or not new_pass:
        return jsonify({"success": False, "message": "Both current and new passwords are required."}), 400

    if not check_password(current_pass, user.get('password_hash', '')):
        return jsonify({"success": False, "message": "Current password verification failed."}), 401

    if len(new_pass) < 6:
        return jsonify({"success": False, "message": "New password must be at least 6 characters long."}), 400

    new_hash = hash_password(new_pass)
    db_manager.users.update_one({"_id": user_id}, {"password_hash": new_hash})

    return jsonify({"success": True, "message": "Password changed successfully."}), 200
