import bcrypt
import re
import os
from werkzeug.utils import secure_filename

def hash_password(password: str) -> str:
    """Hashes a password securely using bcrypt with salt."""
    if not password or len(password) < 6:
        raise ValueError("Password must be at least 6 characters long.")
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def check_password(password: str, hashed_password: str) -> bool:
    """Verifies a plain password against the stored bcrypt hash."""
    if not password or not hashed_password:
        return False
    try:
        return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def sanitize_safe_filename(filename: str) -> str:
    """
    Sanitizes filename and prevents directory traversal attacks.
    Ensures safe characters only and generates safe basename.
    """
    clean_name = secure_filename(filename)
    # Strip any remaining path characters
    clean_name = os.path.basename(clean_name)
    # Replace whitespace and unsafe symbols
    clean_name = re.sub(r'[^a-zA-Z0-9_.-]', '_', clean_name)
    if not clean_name.lower().endswith('.csv'):
        clean_name += '.csv'
    return clean_name

def sanitize_csv_cell(value):
    """
    Prevents CSV Formula Injection (DDE injection) where malicious cells
    start with =, +, -, @, or tab/return.
    """
    if isinstance(value, str):
        if value.startswith(('=', '+', '-', '@', '\t', '\r')):
            return f"'{value}"
    return value
