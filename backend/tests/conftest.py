import os
import sys
import pytest

# Add backend directory to sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app import create_app
from app.database import db_manager

@pytest.fixture(scope='session')
def app():
    # Use test configuration
    test_app = create_app()
    test_app.config['TESTING'] = True
    return test_app

@pytest.fixture(scope='session')
def client(app):
    return app.test_client()

@pytest.fixture
def auth_headers(client):
    # Register and login a test analyst
    user_payload = {
        "username": "test_analyst",
        "email": "analyst@cybersec.test",
        "password": "Password123!"
    }
    client.post('/api/auth/register', json=user_payload)
    login_res = client.post('/api/auth/login', json={
        "username": "test_analyst",
        "password": "Password123!"
    })
    token = login_res.get_json()['access_token']
    return {"Authorization": f"Bearer {token}"}
