import re
import pandas as pd
import io

EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$')
USERNAME_REGEX = re.compile(r'^[a-zA-Z0-9_]{3,30}$')

def validate_registration(data: dict):
    """Validates user registration input fields."""
    errors = []
    username = data.get('username', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '')

    if not username:
        errors.append("Username is required.")
    elif not USERNAME_REGEX.match(username):
        errors.append("Username must be 3-30 characters long and contain only alphanumeric characters or underscores.")

    if not email:
        errors.append("Email is required.")
    elif not EMAIL_REGEX.match(email):
        errors.append("Invalid email address format.")

    if not password:
        errors.append("Password is required.")
    elif len(password) < 6:
        errors.append("Password must be at least 6 characters long.")

    return errors

def validate_login(data: dict):
    """Validates login credentials."""
    errors = []
    identity = data.get('username') or data.get('email')
    password = data.get('password')

    if not identity:
        errors.append("Username or email is required.")
    if not password:
        errors.append("Password is required.")

    return errors

def validate_csv_content(filepath: str, max_rows: int = 100000):
    """
    Validates CSV file content:
    - Parses header and sample rows safely
    - Verifies row count and column presence
    - Detects empty file or corrupt CSV
    """
    try:
        # Check first chunk for basic structure
        sample_df = pd.read_csv(filepath, nrows=10)
        if sample_df.empty or sample_df.columns.size == 0:
            return False, "CSV file is empty or missing headers.", None

        if len(sample_df.columns) < 2:
            return False, "CSV dataset must contain at least 2 columns to perform feature analysis.", None

        # Count total rows safely without loading all into memory at once
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            total_rows = sum(1 for _ in f) - 1

        if total_rows <= 0:
            return False, "CSV file contains no data rows.", None

        if total_rows > max_rows:
            return False, f"File exceeds maximum allowed dataset size of {max_rows:,} rows.", None

        preview = sample_df.head(10).fillna("").to_dict(orient='records')
        columns = list(sample_df.columns)

        return True, None, {
            "row_count": total_rows,
            "columns": columns,
            "preview": preview
        }
    except Exception as e:
        return False, f"Invalid or unreadable CSV file format: {str(e)}", None

def validate_analysis_params(params: dict):
    """Validates parameters for the ML analysis pipeline."""
    errors = []
    
    contamination = params.get('contamination', 0.08)
    try:
        contamination = float(contamination)
        if not (0.01 <= contamination <= 0.50):
            errors.append("Contamination factor must be between 0.01 (1%) and 0.50 (50%).")
    except (ValueError, TypeError):
        errors.append("Contamination must be a valid numeric floating point value.")

    model_type = params.get('model_type', 'isolation_forest')
    if model_type not in ['isolation_forest', 'random_forest', 'hybrid']:
        errors.append("Model type must be 'isolation_forest', 'random_forest', or 'hybrid'.")

    return errors
