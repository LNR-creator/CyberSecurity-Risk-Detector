from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.database import db_manager

dashboard_bp = Blueprint('dashboard', __name__, url_prefix='/api/dashboard')

@dashboard_bp.route('/summary', methods=['GET'])
@jwt_required()
def get_dashboard_summary():
    user_id = get_jwt_identity()

    # Get all analyses completed by this user
    analyses = db_manager.analyses.find({"user_id": user_id})

    total_records = 0
    total_anomalies = 0
    risk_summary = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}

    for a in analyses:
        total_records += a.get("row_count", 0)
        total_anomalies += a.get("anomaly_count", 0)
        rs = a.get("risk_summary", {})
        for sev in risk_summary:
            risk_summary[sev] += rs.get(sev, 0)

    # Alerts status counts
    total_alerts = db_manager.alerts.count_documents({"user_id": user_id})
    investigating_count = db_manager.alerts.count_documents({"user_id": user_id, "investigation_status": "Investigating"})
    resolved_count = db_manager.alerts.count_documents({"user_id": user_id, "investigation_status": "Resolved"})
    new_count = db_manager.alerts.count_documents({"user_id": user_id, "investigation_status": "New"})

    # Recent alerts
    recent_alerts = db_manager.alerts.find(
        {"user_id": user_id},
        sort=[("created_at", -1), ("risk_score", -1)],
        limit=8
    )

    # Top suspicious source IPs
    all_alerts = db_manager.alerts.find({"user_id": user_id})
    ip_counter = {}
    for alert in all_alerts:
        src = alert.get("source_ip")
        if src and src not in ["None", "null", ""]:
            ip_counter[src] = ip_counter.get(src, 0) + 1

    top_ips = [
        {"ip": ip, "count": count, "severity": "Critical" if count >= 5 else "High"}
        for ip, count in sorted(ip_counter.items(), key=lambda x: x[1], reverse=True)[:6]
    ]

    # Top flagged indicators
    feature_counter = {}
    for alert in all_alerts:
        rf = alert.get("relevant_features", {})
        for f in rf.keys():
            if f not in ["source_ip", "destination_ip"]:
                feature_counter[f] = feature_counter.get(f, 0) + 1

    top_indicators = [
        {"indicator": k, "count": v}
        for k, v in sorted(feature_counter.items(), key=lambda x: x[1], reverse=True)[:5]
    ]

    return jsonify({
        "success": True,
        "summary": {
            "total_datasets": len(analyses),
            "total_records_analyzed": total_records,
            "total_anomalies_detected": total_anomalies,
            "normal_records": max(0, total_records - total_anomalies),
            "critical_risk": risk_summary["Critical"],
            "high_risk": risk_summary["High"],
            "medium_risk": risk_summary["Medium"],
            "low_risk": risk_summary["Low"],
            "total_alerts": total_alerts,
            "new_alerts": new_count,
            "investigating_alerts": investigating_count,
            "resolved_alerts": resolved_count
        },
        "top_ips": top_ips,
        "top_indicators": top_indicators,
        "recent_alerts": recent_alerts
    }), 200

@dashboard_bp.route('/trends', methods=['GET'])
@jwt_required()
def get_dashboard_trends():
    user_id = get_jwt_identity()

    # Pull user analyses sorted chronologically
    analyses = db_manager.analyses.find(
        {"user_id": user_id, "status": "completed"},
        sort=[("uploaded_at", 1)],
        limit=12
    )

    trend_points = []
    for a in analyses:
        dt_str = a.get("uploaded_at", "")[:10] # YYYY-MM-DD
        fname = a.get("dataset_filename", "")
        rs = a.get("risk_summary", {})
        trend_points.append({
            "name": fname[:12] if fname else dt_str,
            "date": dt_str,
            "records": a.get("row_count", 0),
            "anomalies": a.get("anomaly_count", 0),
            "critical": rs.get("Critical", 0),
            "high": rs.get("High", 0),
            "medium": rs.get("Medium", 0),
            "low": rs.get("Low", 0)
        })

    return jsonify({
        "success": True,
        "trends": trend_points
    }), 200

@dashboard_bp.route('/severity-distribution', methods=['GET'])
@jwt_required()
def get_severity_distribution():
    user_id = get_jwt_identity()
    analyses = db_manager.analyses.find({"user_id": user_id, "status": "completed"})

    crit, high, med, low = 0, 0, 0, 0
    for a in analyses:
        rs = a.get("risk_summary", {})
        crit += rs.get("Critical", 0)
        high += rs.get("High", 0)
        med += rs.get("Medium", 0)
        low += rs.get("Low", 0)

    distribution = [
        {"name": "Critical", "value": crit, "color": "#ef4444"},
        {"name": "High", "value": high, "color": "#f97316"},
        {"name": "Medium", "value": med, "color": "#eab308"},
        {"name": "Low", "value": low, "color": "#10b981"}
    ]

    return jsonify({
        "success": True,
        "distribution": distribution
    }), 200
