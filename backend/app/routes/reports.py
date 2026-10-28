import os
import uuid
from datetime import datetime
from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity

from config import Config
from app.database import db_manager
from app.services.report_generator import ReportGenerator

reports_bp = Blueprint('reports', __name__, url_prefix='/api/reports')

@reports_bp.route('/generate', methods=['POST'])
@jwt_required()
def generate_report():
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    analysis_id = data.get('analysis_id')
    report_type = data.get('report_type', 'pdf').lower()

    if not analysis_id:
        return jsonify({"success": False, "message": "analysis_id is required."}), 400

    analysis = db_manager.analyses.find_one({"_id": analysis_id, "user_id": user_id})
    if not analysis:
        return jsonify({"success": False, "message": "Analysis record not found or access denied."}), 404

    # Fetch alerts for this analysis
    alerts = db_manager.alerts.find({"analysis_id": analysis_id, "user_id": user_id}, sort=[("risk_score", -1)])

    os.makedirs(Config.REPORTS_FOLDER, exist_ok=True)
    report_id = str(uuid.uuid4())
    clean_base = analysis.get('dataset_filename', 'analysis').replace('.csv', '')

    if report_type == 'pdf':
        report_filename = f"SOC_Report_{report_id[:8]}_{clean_base}.pdf"
        report_path = os.path.join(Config.REPORTS_FOLDER, report_filename)
        try:
            ReportGenerator.generate_pdf_report(analysis, alerts, report_path)
        except Exception as e:
            return jsonify({"success": False, "message": f"PDF report generation failed: {str(e)}"}), 500
    else:
        # Fallback to enriched CSV
        enriched_path = analysis.get('enriched_filepath')
        if not enriched_path or not os.path.exists(enriched_path):
            return jsonify({"success": False, "message": "Enriched analysis CSV not available."}), 400
        report_filename = f"Analyzed_Data_{clean_base}.csv"
        report_path = enriched_path

    report_doc = {
        "_id": report_id,
        "analysis_id": analysis_id,
        "user_id": user_id,
        "dataset_filename": analysis.get('dataset_filename'),
        "report_type": report_type,
        "filename": report_filename,
        "filepath": report_path,
        "created_at": datetime.utcnow().isoformat(),
        "summary": {
            "row_count": analysis.get('row_count', 0),
            "anomaly_count": analysis.get('anomaly_count', 0),
            "risk_summary": analysis.get('risk_summary', {})
        }
    }

    db_manager.reports.insert_one(report_doc)

    return jsonify({
        "success": True,
        "message": f"Report generated successfully ({report_type.upper()}).",
        "report": {
            "id": report_id,
            "filename": report_filename,
            "report_type": report_type,
            "created_at": report_doc["created_at"],
            "summary": report_doc["summary"]
        }
    }), 201

@reports_bp.route('', methods=['GET'])
@jwt_required()
def list_reports():
    user_id = get_jwt_identity()
    reports = db_manager.reports.find({"user_id": user_id}, sort=[("created_at", -1)])

    clean_list = [
        {
            "id": str(r["_id"]),
            "analysis_id": r.get("analysis_id"),
            "dataset_filename": r.get("dataset_filename"),
            "report_type": r.get("report_type"),
            "filename": r.get("filename"),
            "created_at": r.get("created_at"),
            "summary": r.get("summary", {})
        }
        for r in reports
    ]

    return jsonify({"success": True, "reports": clean_list}), 200

@reports_bp.route('/<report_id>/download', methods=['GET'])
@jwt_required()
def download_report(report_id):
    user_id = get_jwt_identity()
    report = db_manager.reports.find_one({"_id": report_id, "user_id": user_id})
    if not report:
        return jsonify({"success": False, "message": "Report record not found or access denied."}), 404

    filepath = report.get('filepath')
    if not filepath or not os.path.exists(filepath):
        return jsonify({"success": False, "message": "Report file is missing from server storage."}), 404

    mime = "application/pdf" if report.get("report_type") == "pdf" else "text/csv"
    return send_file(
        filepath,
        mimetype=mime,
        as_attachment=True,
        download_name=report.get("filename")
    )
