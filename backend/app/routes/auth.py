from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token,
    jwt_required,
    get_jwt_identity,
    get_jwt
)
from datetime import datetime
import uuid

from app.database import db_manager
from app.utils.security import hash_password, check_password
from app.utils.validators import validate_registration, validate_login

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

# In-memory blacklist for logged-out tokens
BLACKLISTED_TOKENS = set()

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    errors = validate_registration(data)
    if errors:
        return jsonify({"success": False, "errors": errors, "message": "Validation failed"}), 400

    username = data['username'].strip()
    email = data['email'].strip().lower()
    password = data['password']

    # Check for existing user
    if db_manager.users.find_one({"username": username}):
        return jsonify({"success": False, "message": "A user with this username already exists."}), 409
    if db_manager.users.find_one({"email": email}):
        return jsonify({"success": False, "message": "A user with this email address already exists."}), 409

    hashed = hash_password(password)
    user_id = str(uuid.uuid4())

    user_doc = {
        "_id": user_id,
        "username": username,
        "email": email,
        "password_hash": hashed,
        "role": data.get('role', 'analyst'),
        "created_at": datetime.utcnow().isoformat()
    }

    db_manager.users.insert_one(user_doc)

    # Automatically generate access token upon registration
    access_token = create_access_token(identity=user_id)

    return jsonify({
        "success": True,
        "message": "User registered successfully.",
        "access_token": access_token,
        "user": {
            "id": user_id,
            "username": username,
            "email": email,
            "role": user_doc["role"],
            "created_at": user_doc["created_at"]
        }
    }), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    errors = validate_login(data)
    if errors:
        return jsonify({"success": False, "errors": errors, "message": "Validation failed"}), 400

    identity = (data.get('username') or data.get('email', '')).strip()
    password = data.get('password', '')

    user = db_manager.users.find_one({"username": identity})
    if not user:
        user = db_manager.users.find_one({"email": identity.lower()})

    if not user or not check_password(password, user.get('password_hash', '')):
        return jsonify({"success": False, "message": "Invalid username/email or password."}), 401

    user_id = str(user['_id'])
    access_token = create_access_token(identity=user_id)

    return jsonify({
        "success": True,
        "message": "Authentication successful.",
        "access_token": access_token,
        "user": {
            "id": user_id,
            "username": user.get('username'),
            "email": user.get('email'),
            "role": user.get('role', 'analyst'),
            "created_at": user.get('created_at')
        }
    }), 200

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    user_id = get_jwt_identity()
    user = db_manager.users.find_one({"_id": user_id})
    if not user:
        return jsonify({"success": False, "message": "User not found."}), 404

    return jsonify({
        "success": True,
        "user": {
            "id": str(user['_id']),
            "username": user.get('username'),
            "email": user.get('email'),
            "role": user.get('role', 'analyst'),
            "created_at": user.get('created_at')
        }
    }), 200

@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    jti = get_jwt()["jti"]
    BLACKLISTED_TOKENS.add(jti)
    return jsonify({"success": True, "message": "Successfully logged out."}), 200
