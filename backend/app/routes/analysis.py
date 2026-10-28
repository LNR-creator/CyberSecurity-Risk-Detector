import os
import uuid
import logging
import pandas as pd
from datetime import datetime
from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity

from config import Config
from app.database import db_manager
from app.utils.security import sanitize_safe_filename, sanitize_csv_cell
from app.utils.validators import validate_csv_content, validate_analysis_params
from app.ml.preprocessor import MLPreprocessor
from app.ml.anomaly_detector import IsolationForestDetector
from app.ml.classifier import RandomForestSecurityClassifier
from app.ml.risk_engine import RiskScoringEngine

logger = logging.getLogger(__name__)

analysis_bp = Blueprint('analysis', __name__, url_prefix='/api/analysis')


@analysis_bp.route('/upload', methods=['POST'])
@jwt_required()
def upload_dataset():
    user_id = get_jwt_identity()

    if 'file' not in request.files:
        return jsonify({"success": False, "message": "No file uploaded in multipart form data."}), 400

    file = request.files['file']
    if not file or not file.filename:
        return jsonify({"success": False, "message": "Empty filename received."}), 400

    if not file.filename.lower().endswith('.csv'):
        return jsonify({"success": False, "message": "Invalid file format. Only .csv files are supported."}), 400

    # Ensure upload directory exists
    os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)

    safe_name = sanitize_safe_filename(file.filename)
    analysis_id = str(uuid.uuid4())
    stored_filename = f"{analysis_id}_{safe_name}"
    filepath = os.path.join(Config.UPLOAD_FOLDER, stored_filename)

    file.save(filepath)

    # Validate file contents
    is_valid, error_msg, metadata = validate_csv_content(filepath, max_rows=Config.MAX_CSV_ROWS)
    if not is_valid:
        if os.path.exists(filepath):
            os.remove(filepath)
        return jsonify({"success": False, "message": error_msg}), 400

    # Create analysis record in database
    analysis_doc = {
        "_id": analysis_id,
        "user_id": user_id,
        "dataset_filename": file.filename,
        "stored_filename": stored_filename,
        "filepath": filepath,
        "uploaded_at": datetime.utcnow().isoformat(),
        "row_count": metadata["row_count"],
        "columns": metadata["columns"],
        "status": "ready",
        "anomaly_count": 0,
        "risk_summary": {
            "Critical": 0,
            "High": 0,
            "Medium": 0,
            "Low": 0
        },
        "model_type": "isolation_forest"
    }

    db_manager.analyses.insert_one(analysis_doc)

    return jsonify({
        "success": True,
        "message": "Dataset uploaded and verified successfully.",
        "analysis_id": analysis_id,
        "dataset": {
            "id": analysis_id,
            "filename": file.filename,
            "row_count": metadata["row_count"],
            "columns": metadata["columns"],
            "preview": metadata["preview"]
        }
    }), 201

@analysis_bp.route('', methods=['GET'])
@jwt_required()
def list_analyses():
    user_id = get_jwt_identity()
    records = db_manager.analyses.find({"user_id": user_id}, sort=[("uploaded_at", -1)])
    
    clean_records = []
    for r in records:
        clean_records.append({
            "id": str(r["_id"]),
            "filename": r.get("dataset_filename"),
            "uploaded_at": r.get("uploaded_at"),
            "row_count": r.get("row_count", 0),
            "anomaly_count": r.get("anomaly_count", 0),
            "risk_summary": r.get("risk_summary", {}),
            "model_type": r.get("model_type"),
            "status": r.get("status", "ready")
        })

    return jsonify({"success": True, "analyses": clean_records}), 200

@analysis_bp.route('/<analysis_id>', methods=['GET'])
@jwt_required()
def get_analysis_details(analysis_id):
    user_id = get_jwt_identity()
    analysis = db_manager.analyses.find_one({"_id": analysis_id, "user_id": user_id})
    if not analysis:
        return jsonify({"success": False, "message": "Analysis record not found or unauthorized."}), 404

    return jsonify({
        "success": True,
        "analysis": {
            "id": str(analysis["_id"]),
            "filename": analysis.get("dataset_filename"),
            "uploaded_at": analysis.get("uploaded_at"),
            "row_count": analysis.get("row_count", 0),
            "columns": analysis.get("columns", []),
            "anomaly_count": analysis.get("anomaly_count", 0),
            "risk_summary": analysis.get("risk_summary", {}),
            "model_type": analysis.get("model_type"),
            "status": analysis.get("status"),
            "metrics": analysis.get("metrics"),
            "completed_at": analysis.get("completed_at")
        }
    }), 200

@analysis_bp.route('/<analysis_id>/run', methods=['POST'])
@jwt_required()
def run_analysis(analysis_id):
    user_id = get_jwt_identity()
    analysis = db_manager.analyses.find_one({"_id": analysis_id, "user_id": user_id})
    if not analysis:
        return jsonify({"success": False, "message": "Analysis record not found or access denied."}), 404

    payload = request.get_json() or {}
    val_errors = validate_analysis_params(payload)
    if val_errors:
        return jsonify({"success": False, "errors": val_errors}), 400

    contamination = float(payload.get('contamination', Config.DEFAULT_CONTAMINATION))
    model_type = payload.get('model_type', 'isolation_forest')
    target_column = payload.get('target_column')

    filepath = analysis.get('filepath')
    if not filepath or not os.path.exists(filepath):
        return jsonify({"success": False, "message": "Uploaded dataset file is missing from server storage."}), 404

    try:
        # Load dataset
        df = pd.read_csv(filepath)
        
        # 1. Feature Preprocessing
        preprocessor = MLPreprocessor()
        X, y, feature_names = preprocessor.fit_transform(df, custom_label_col=target_column)

        # 2. Unsupervised Isolation Forest Anomaly Detection
        iso_detector = IsolationForestDetector(contamination=contamination, random_state=Config.RANDOM_STATE)
        iso_results = iso_detector.fit_predict(X, feature_names=feature_names)

        is_anomaly = iso_results["is_anomaly"]
        anomaly_scores = iso_results["anomaly_scores"]
        top_deviations = iso_results["top_deviations"]

        # 3. Supervised Classification (if labels available and requested)
        classifier_metrics = None
        threat_probs = [None] * len(df)
        has_supervised = False

        if (model_type in ['random_forest', 'hybrid']) and (y is not None) and (len(set(y)) >= 2):
            rf_classifier = RandomForestSecurityClassifier(random_state=Config.RANDOM_STATE)
            rf_res = rf_classifier.fit_evaluate(X, y, feature_names=feature_names)
            classifier_metrics = rf_res["metrics"]
            threat_probs = rf_res["threat_probabilities"]
            has_supervised = True

        # 4. Composite Risk Scoring & Alert Generation
        risk_summary = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
        alerts_to_insert = []
        enriched_records = []

        now_str = datetime.utcnow().isoformat()
        records_dict = df.to_dict(orient='records')

        for idx, row in enumerate(records_dict):
            prob = threat_probs[idx] if has_supervised else None
            risk_info = RiskScoringEngine.calculate_risk(
                row_dict=row,
                anomaly_score=anomaly_scores[idx],
                is_anomaly=is_anomaly[idx],
                top_deviations=top_deviations[idx],
                supervised_prob=prob
            )

            severity = risk_info["severity"]
            risk_summary[severity] += 1

            enriched_row = dict(row)
            enriched_row["_is_anomaly"] = int(is_anomaly[idx])
            enriched_row["_anomaly_score"] = float(anomaly_scores[idx])
            enriched_row["_risk_score"] = int(risk_info["risk_score"])
            enriched_row["_severity"] = severity
            enriched_row["_detection_reason"] = risk_info["detection_reason"]
            enriched_records.append(enriched_row)

            # Generate alerts for anomalies OR High/Critical risk findings
            if is_anomaly[idx] or severity in ['Critical', 'High']:
                src_ip = risk_info["relevant_features"].get("source_ip") or row.get("source_ip") or row.get("src_ip")
                dst_ip = risk_info["relevant_features"].get("destination_ip") or row.get("destination_ip") or row.get("dst_ip")
                proto = risk_info["relevant_features"].get("protocol") or row.get("protocol") or row.get("proto")

                alert_doc = {
                    "_id": str(uuid.uuid4()),
                    "analysis_id": analysis_id,
                    "user_id": user_id,
                    "record_index": idx,
                    "source_ip": str(src_ip) if src_ip else None,
                    "destination_ip": str(dst_ip) if dst_ip else None,
                    "protocol": str(proto) if proto else None,
                    "risk_score": risk_info["risk_score"],
                    "severity": severity,
                    "detection_reason": risk_info["detection_reason"],
                    "relevant_features": risk_info["relevant_features"],
                    "recommended_investigation_steps": risk_info["recommended_investigation_steps"],
                    "investigation_status": "New",
                    "created_at": now_str,
                    "updated_at": now_str
                }
                alerts_to_insert.append(alert_doc)

        # Save enriched CSV file for quick export
        enriched_filepath = os.path.join(Config.UPLOAD_FOLDER, f"enriched_{analysis.get('stored_filename')}")
        pd.DataFrame(enriched_records).to_csv(enriched_filepath, index=False)

        # Persist alerts
        if alerts_to_insert:
            db_manager.alerts.insert_many(alerts_to_insert)

        # Update analysis record
        update_data = {
            "status": "completed",
            "model_type": model_type if has_supervised else "isolation_forest",
            "anomaly_count": int(iso_results["anomaly_count"]),
            "risk_summary": risk_summary,
            "metrics": {
                "contamination": contamination,
                "supervised_used": has_supervised,
                "supervised_metrics": classifier_metrics,
                "feature_count": len(feature_names),
                "features_analyzed": feature_names[:15]
            },
            "enriched_filepath": enriched_filepath,
            "completed_at": datetime.utcnow().isoformat()
        }

        db_manager.analyses.update_one({"_id": analysis_id}, update_data)

        return jsonify({
            "success": True,
            "message": "Analysis completed successfully.",
            "results": {
                "analysis_id": analysis_id,
                "total_records": len(df),
                "anomaly_count": int(iso_results["anomaly_count"]),
                "risk_summary": risk_summary,
                "alerts_generated": len(alerts_to_insert),
                "supervised_used": has_supervised,
                "supervised_metrics": classifier_metrics
            }
        }), 200

    except Exception as e:
        logger.exception("Analysis execution failed:")
        db_manager.analyses.update_one({"_id": analysis_id}, {"status": "failed", "error": str(e)})
        return jsonify({"success": False, "message": f"Analysis failed: {str(e)}"}), 500

@analysis_bp.route('/<analysis_id>/results', methods=['GET'])
@jwt_required()
def get_analysis_results(analysis_id):
    user_id = get_jwt_identity()
    analysis = db_manager.analyses.find_one({"_id": analysis_id, "user_id": user_id})
    if not analysis:
        return jsonify({"success": False, "message": "Analysis record not found."}), 404

    # Fetch alerts for this analysis
    alerts = db_manager.alerts.find({"analysis_id": analysis_id, "user_id": user_id}, sort=[("risk_score", -1)], limit=50)

    # Top suspicious IPs
    ip_counts = {}
    for a in alerts:
        src = a.get("source_ip")
        if src and src != "None":
            ip_counts[src] = ip_counts.get(src, 0) + 1
    
    top_ips = [{"ip": ip, "count": cnt} for ip, cnt in sorted(ip_counts.items(), key=lambda x: x[1], reverse=True)[:5]]

    return jsonify({
        "success": True,
        "analysis": {
            "id": str(analysis["_id"]),
            "filename": analysis.get("dataset_filename"),
            "uploaded_at": analysis.get("uploaded_at"),
            "completed_at": analysis.get("completed_at"),
            "row_count": analysis.get("row_count", 0),
            "anomaly_count": analysis.get("anomaly_count", 0),
            "risk_summary": analysis.get("risk_summary", {}),
            "model_type": analysis.get("model_type"),
            "status": analysis.get("status"),
            "metrics": analysis.get("metrics", {})
        },
        "top_ips": top_ips,
        "sample_alerts": alerts[:15]
    }), 200

@analysis_bp.route('/<analysis_id>/export', methods=['GET'])
@jwt_required()
def export_enriched_csv(analysis_id):
    user_id = get_jwt_identity()
    analysis = db_manager.analyses.find_one({"_id": analysis_id, "user_id": user_id})
    if not analysis:
        return jsonify({"success": False, "message": "Analysis record not found."}), 404

    enriched_filepath = analysis.get("enriched_filepath")
    if not enriched_filepath or not os.path.exists(enriched_filepath):
        return jsonify({"success": False, "message": "Enriched export file not found on server."}), 404

    clean_filename = f"analyzed_{analysis.get('dataset_filename', 'export.csv')}"
    return send_file(
        enriched_filepath,
        mimetype="text/csv",
        as_attachment=True,
        download_name=clean_filename
    )
