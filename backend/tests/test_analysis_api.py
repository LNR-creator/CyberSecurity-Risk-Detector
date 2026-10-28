import os
import io
import pytest

def test_analysis_upload_and_run(client, auth_headers):
    # 1. Prepare sample CSV payload
    csv_content = (
        "source_ip,destination_ip,protocol,source_port,destination_port,packet_count,bytes_transferred,connection_duration,failed_connection_count\n"
        "192.168.1.10,8.8.8.8,UDP,54321,53,10,500,0.5,0\n"
        "192.168.1.15,104.244.42.1,TCP,55000,443,45,15000,2.1,0\n"
        "192.168.1.99,198.51.100.45,TCP,49152,4444,1200,9500000,120.5,18\n"
        "192.168.1.20,151.101.1.140,TCP,56789,80,25,8000,1.2,0\n"
        "192.168.1.22,93.184.216.34,TCP,57123,443,30,12000,1.8,0\n"
    )

    data = {
        'file': (io.BytesIO(csv_content.encode('utf-8')), 'test_traffic.csv')
    }

    # Upload CSV
    upload_res = client.post(
        '/api/analysis/upload',
        data=data,
        content_type='multipart/form-data',
        headers=auth_headers
    )
    assert upload_res.status_code == 201
    upload_data = upload_res.get_json()
    assert upload_data["success"] is True
    analysis_id = upload_data["analysis_id"]

    # Run Analysis
    run_res = client.post(
        f'/api/analysis/{analysis_id}/run',
        json={"contamination": 0.20, "model_type": "isolation_forest"},
        headers=auth_headers
    )
    assert run_res.status_code == 200
    run_data = run_res.get_json()
    assert run_data["success"] is True
    assert run_data["results"]["total_records"] == 5

    # Get Results
    results_res = client.get(f'/api/analysis/{analysis_id}/results', headers=auth_headers)
    assert results_res.status_code == 200
    res_data = results_res.get_json()
    assert "analysis" in res_data
    assert "top_ips" in res_data

    # Export Enriched CSV
    export_res = client.get(f'/api/analysis/{analysis_id}/export', headers=auth_headers)
    assert export_res.status_code == 200
    assert b'_risk_score' in export_res.data
    assert b'_severity' in export_res.data

def test_user_data_isolation(client, auth_headers):
    # Register user B
    user_b_payload = {
        "username": "user_b_analyst",
        "email": "user_b@cybersec.test",
        "password": "Password999!"
    }
    client.post('/api/auth/register', json=user_b_payload)
    login_b = client.post('/api/auth/login', json={
        "username": "user_b_analyst",
        "password": "Password999!"
    })
    token_b = login_b.get_json()['access_token']
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Upload analysis as user A
    csv_content = "source_ip,destination_ip,protocol,packet_count,bytes_transferred\n1.1.1.1,2.2.2.2,TCP,10,500\n"
    up_res = client.post(
        '/api/analysis/upload',
        data={'file': (io.BytesIO(csv_content.encode('utf-8')), 'secret_a.csv')},
        content_type='multipart/form-data',
        headers=auth_headers
    )
    analysis_a_id = up_res.get_json()["analysis_id"]

    # User B should receive 404 when attempting to access user A's analysis
    forbidden_res = client.get(f'/api/analysis/{analysis_a_id}', headers=headers_b)
    assert forbidden_res.status_code == 404
