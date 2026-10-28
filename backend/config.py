import os
from datetime import timedelta
from dotenv import load_dotenv

# Load environment variables from backend/.env or root .env
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env'))

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'default-dev-secret-key-change-me')
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'default-jwt-secret-key-change-me')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES_HOURS', '24')))
    
    # Database
    MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/cybersecurity_db')
    DB_NAME = os.getenv('DB_NAME', 'cybersecurity_db')
    SQLITE_PATH = os.path.join(BASE_DIR, os.getenv('SQLITE_PATH', 'cybersecurity.db'))
    
    # File Storage
    UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
    REPORTS_FOLDER = os.path.join(BASE_DIR, 'reports')
    MAX_CONTENT_LENGTH = int(os.getenv('MAX_CONTENT_LENGTH_MB', '25')) * 1024 * 1024
    MAX_CSV_ROWS = int(os.getenv('MAX_CSV_ROWS', '100000'))
    ALLOWED_EXTENSIONS = {'csv'}
    
    # ML Defaults
    DEFAULT_CONTAMINATION = float(os.getenv('DEFAULT_CONTAMINATION', '0.08'))
    RANDOM_STATE = int(os.getenv('RANDOM_STATE', '42'))
    
    # CORS
    CORS_ORIGINS = [origin.strip() for origin in os.getenv('CORS_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173').split(',')]
