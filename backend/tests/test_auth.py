import uuid
import pytest
from app.utils.security import hash_password, check_password

def test_password_hashing():
    raw_pass = "SecurePass123!"
    hashed = hash_password(raw_pass)
    assert hashed != raw_pass
    assert check_password(raw_pass, hashed) is True
    assert check_password("WrongPassword!", hashed) is False

def test_user_registration_and_login(client):
    uid = uuid.uuid4().hex[:8]
    unique_user = f"sec_officer_{uid}"
    unique_email = f"officer_{uid}@security.local"
    pass_word = "SuperSecret99"


    # 1. Register
    reg_res = client.post('/api/auth/register', json={
        "username": unique_user,
        "email": unique_email,
        "password": pass_word
    })
    assert reg_res.status_code == 201
    reg_data = reg_res.get_json()
    assert reg_data["success"] is True
    assert "access_token" in reg_data

    # 2. Duplicate registration rejection
    dup_res = client.post('/api/auth/register', json={
        "username": unique_user,
        "email": "different@local.com",
        "password": pass_word
    })
    assert dup_res.status_code == 409

    # 3. Successful Login
    login_res = client.post('/api/auth/login', json={
        "username": unique_user,
        "password": pass_word
    })
    assert login_res.status_code == 200
    token = login_res.get_json()["access_token"]
    assert token is not None

    # 4. Check protected /me endpoint
    me_res = client.get('/api/auth/me', headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    me_data = me_res.get_json()
    assert me_data["user"]["username"] == unique_user

def test_unauthorized_access(client):
    res = client.get('/api/auth/me')
    assert res.status_code == 401

    res_dash = client.get('/api/dashboard/summary')
    assert res_dash.status_code == 401
