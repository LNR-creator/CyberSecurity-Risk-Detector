import io
import pytest

def test_report_generation_and_download(client, auth_headers):
    # Upload and analyze
    csv_content = (
        "source_ip,destination_ip,protocol,source_port,destination_port,packet_count,bytes_transferred,connection_duration,failed_connection_count\n"
        "172.16.0.4,198.51.100.45,TCP,51234,4444,200,5000000,15.2,14\n"
        "172.16.0.5,8.8.8.8,UDP,51235,53,10,300,0.1,0\n"
    )
    up = client.post(
        '/api/analysis/upload',
        data={'file': (io.BytesIO(csv_content.encode('utf-8')), 'report_sample.csv')},
        content_type='multipart/form-data',
        headers=auth_headers
    )
    analysis_id = up.get_json()["analysis_id"]

    client.post(
        f'/api/analysis/{analysis_id}/run',
        json={"contamination": 0.50},
        headers=auth_headers
    )

    # Generate PDF report
    gen_res = client.post(
        '/api/reports/generate',
        json={"analysis_id": analysis_id, "report_type": "pdf"},
        headers=auth_headers
    )
    assert gen_res.status_code == 201
    gen_data = gen_res.get_json()
    assert gen_data["success"] is True
    report_id = gen_data["report"]["id"]

    # List reports
    list_res = client.get('/api/reports', headers=auth_headers)
    assert list_res.status_code == 200
    assert len(list_res.get_json()["reports"]) > 0

    # Download report
    dl_res = client.get(f'/api/reports/{report_id}/download', headers=auth_headers)
    assert dl_res.status_code == 200
    assert dl_res.mimetype == "application/pdf"
    assert dl_res.data.startswith(b'%PDF')
