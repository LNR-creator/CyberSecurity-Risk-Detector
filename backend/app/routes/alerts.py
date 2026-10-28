from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from app.database import db_manager

alerts_bp = Blueprint('alerts', __name__, url_prefix='/api/alerts')

VALID_STATUSES = {'New', 'Investigating', 'Resolved', 'False Positive'}

@alerts_bp.route('', methods=['GET'])
@jwt_required()
def list_alerts():
    user_id = get_jwt_identity()

    severity = request.args.get('severity')
    status = request.args.get('status')
    source_ip = request.args.get('source_ip')
    analysis_id = request.args.get('analysis_id')
    min_risk = request.args.get('min_risk')
    max_risk = request.args.get('max_risk')
    search = request.args.get('search')
    limit = int(request.args.get('limit', 100))
    skip = int(request.args.get('skip', 0))

    query = {"user_id": user_id}

    if severity and severity != 'All':
        query["severity"] = severity
    if status and status != 'All':
        query["investigation_status"] = status
    if source_ip:
        query["source_ip"] = source_ip
    if analysis_id:
        query["analysis_id"] = analysis_id

    # Risk range filter
    if min_risk is not None and min_risk.isdigit():
        query.setdefault("risk_score", {})["$gte"] = int(min_risk)
    if max_risk is not None and max_risk.isdigit():
        query.setdefault("risk_score", {})["$lte"] = int(max_risk)

    total_count = db_manager.alerts.count_documents(query)
    alerts = db_manager.alerts.find(query, sort=[("risk_score", -1), ("created_at", -1)], limit=limit, skip=skip)

    # Optional text search filter if provided
    if search:
        search_lower = search.lower()
        alerts = [
            a for a in alerts if
            search_lower in (a.get('source_ip') or '').lower() or
            search_lower in (a.get('destination_ip') or '').lower() or
            search_lower in (a.get('detection_reason') or '').lower() or
            search_lower in (a.get('protocol') or '').lower()
        ]

    return jsonify({
        "success": True,
        "total": total_count,
        "count": len(alerts),
        "alerts": alerts
    }), 200

@alerts_bp.route('/<alert_id>', methods=['GET'])
@jwt_required()
def get_alert_detail(alert_id):
    user_id = get_jwt_identity()
    alert = db_manager.alerts.find_one({"_id": alert_id, "user_id": user_id})
    if not alert:
        return jsonify({"success": False, "message": "Alert not found or unauthorized."}), 404

    return jsonify({"success": True, "alert": alert}), 200

@alerts_bp.route('/<alert_id>/status', methods=['PATCH'])
@jwt_required()
def update_alert_status(alert_id):
    user_id = get_jwt_identity()
    alert = db_manager.alerts.find_one({"_id": alert_id, "user_id": user_id})
    if not alert:
        return jsonify({"success": False, "message": "Alert not found or access denied."}), 404

    data = request.get_json() or {}
    new_status = data.get('status')
    notes = data.get('notes', '')

    if new_status not in VALID_STATUSES:
        return jsonify({
            "success": False,
            "message": f"Invalid status. Must be one of: {', '.join(VALID_STATUSES)}"
        }), 400

    update_fields = {
        "investigation_status": new_status,
        "analyst_notes": notes,
        "updated_at": datetime.utcnow().isoformat()
    }

    db_manager.alerts.update_one({"_id": alert_id}, update_fields)

    return jsonify({
        "success": True,
        "message": f"Alert status updated to {new_status}.",
        "status": new_status,
        "updated_at": update_fields["updated_at"]
    }), 200
