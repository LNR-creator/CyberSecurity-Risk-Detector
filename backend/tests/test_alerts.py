import io
import pytest

def test_alerts_workflow(client, auth_headers):
    # Upload and analyze dataset to generate alerts
    csv_content = (
        "source_ip,destination_ip,protocol,source_port,destination_port,packet_count,bytes_transferred,connection_duration,failed_connection_count\n"
        "10.0.0.5,198.51.100.45,TCP,50000,4444,500,20000000,10.0,30\n"
        "10.0.0.6,8.8.8.8,UDP,50001,53,10,400,0.2,0\n"
    )
    up = client.post(
        '/api/analysis/upload',
        data={'file': (io.BytesIO(csv_content.encode('utf-8')), 'alert_test.csv')},
        content_type='multipart/form-data',
        headers=auth_headers
    )
    analysis_id = up.get_json()["analysis_id"]

    client.post(
        f'/api/analysis/{analysis_id}/run',
        json={"contamination": 0.50, "model_type": "isolation_forest"},
        headers=auth_headers
    )

    # 1. Fetch alerts
    alerts_res = client.get('/api/alerts', headers=auth_headers)
    assert alerts_res.status_code == 200
    alerts_data = alerts_res.get_json()
    assert alerts_data["count"] > 0
    target_alert = alerts_data["alerts"][0]
    alert_id = target_alert["_id"]

    # 2. Get alert detail
    detail_res = client.get(f'/api/alerts/{alert_id}', headers=auth_headers)
    assert detail_res.status_code == 200
    assert detail_res.get_json()["alert"]["_id"] == alert_id

    # 3. Update status
    patch_res = client.patch(
        f'/api/alerts/{alert_id}/status',
        json={"status": "Investigating", "notes": "Analyst triage started on port 4444"},
        headers=auth_headers
    )
    assert patch_res.status_code == 200
    assert patch_res.get_json()["status"] == "Investigating"

    # Verify updated status
    updated_detail = client.get(f'/api/alerts/{alert_id}', headers=auth_headers).get_json()["alert"]
    assert updated_detail["investigation_status"] == "Investigating"
