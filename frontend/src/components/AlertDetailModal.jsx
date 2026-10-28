import React, { useState } from 'react';
import { X, ShieldAlert, CheckCircle2, ArrowRight, Activity, Terminal } from 'lucide-react';
import SeverityBadge from './SeverityBadge';
import StatusBadge from './StatusBadge';
import { alertService } from '../services/alertService';

const AlertDetailModal = ({ alert, onClose, onStatusUpdated }) => {
  const [currentStatus, setCurrentStatus] = useState(alert?.investigation_status || 'New');
  const [notes, setNotes] = useState(alert?.analyst_notes || '');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  if (!alert) return null;

  const handleUpdateStatus = async (newStatus) => {
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await alertService.updateStatus(alert._id, newStatus, notes);
      if (res.success) {
        setCurrentStatus(newStatus);
        setSuccessMsg(`Alert updated to "${newStatus}"`);
        if (onStatusUpdated) onStatusUpdated(alert._id, newStatus, notes);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to update alert status');
    } finally {
      setSaving(false);
    }
  };

  const relevantFeatures = alert.relevant_features || {};
  const recSteps = alert.recommended_investigation_steps || [
    'Check host endpoint activity and authentication logs.',
    'Inspect network perimeter firewall rules.',
    'Isolate endpoint if unauthorized process execution is detected.'
  ];

  return (
    <div className="soc-modal-overlay" onClick={onClose}>
      <div className="soc-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="d-flex align-items-center justify-content-between p-4 border-bottom border-secondary border-opacity-25">
          <div className="d-flex align-items-center gap-3">
            <div 
              className="p-2.5 rounded-3 d-flex align-items-center justify-content-center"
              style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)' }}
            >
              <ShieldAlert size={24} className="text-danger" />
            </div>
            <div>
              <div className="d-flex align-items-center gap-2">
                <h5 className="mb-0 fw-bold text-white">Security Alert Investigation</h5>
                <SeverityBadge severity={alert.severity} />
                <StatusBadge status={currentStatus} />
              </div>
              <span className="text-secondary font-mono fs-7">ID: {alert._id}</span>
            </div>
          </div>
          <button 
            type="button" 
            className="btn btn-link text-secondary p-1"
            onClick={onClose}
          >
            <X size={22} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4">
          {errorMsg && (
            <div className="alert alert-danger py-2 px-3 fs-7 mb-3" role="alert">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="alert alert-success py-2 px-3 fs-7 mb-3" role="alert">
              {successMsg}
            </div>
          )}

          {/* Risk Score Meter */}
          <div className="soc-card mb-4 bg-opacity-50">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-secondary fw-semibold fs-7 text-uppercase">Composite Risk Score</span>
              <span className="fw-bold fs-5 text-white">{alert.risk_score} / 100</span>
            </div>
            <div className="progress" style={{ height: '8px', backgroundColor: '#1e293b' }}>
              <div 
                className={`progress-bar ${
                  alert.risk_score >= 80 ? 'bg-danger' :
                  alert.risk_score >= 60 ? 'bg-warning' :
                  alert.risk_score >= 35 ? 'bg-info' : 'bg-success'
                }`}
                role="progressbar" 
                style={{ width: `${alert.risk_score}%` }} 
                aria-valuenow={alert.risk_score} 
                aria-valuemin="0" 
                aria-valuemax="100"
              />
            </div>
          </div>

          {/* Telemetry Overview Grid */}
          <div className="row g-3 mb-4">
            <div className="col-md-4">
              <div className="p-3 rounded-3" style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b' }}>
                <div className="text-muted fs-8 text-uppercase fw-bold">Source IP</div>
                <div className="text-white font-mono fw-semibold mt-1">{alert.source_ip || 'N/A'}</div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="p-3 rounded-3" style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b' }}>
                <div className="text-muted fs-8 text-uppercase fw-bold">Destination IP</div>
                <div className="text-white font-mono fw-semibold mt-1">{alert.destination_ip || 'N/A'}</div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="p-3 rounded-3" style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b' }}>
                <div className="text-muted fs-8 text-uppercase fw-bold">Protocol / Flow</div>
                <div className="text-white font-mono fw-semibold mt-1">{alert.protocol || 'TCP'}</div>
              </div>
            </div>
          </div>

          {/* Detection Reason */}
          <div className="mb-4">
            <h6 className="text-white fw-bold mb-2 d-flex align-items-center gap-2">
              <Activity size={16} className="text-primary" />
              <span>Detection Reason & Analytical Findings</span>
            </h6>
            <div className="p-3 rounded-3 text-light fs-7" style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', lineHeight: 1.6 }}>
              {alert.detection_reason || 'Flagged by Machine Learning anomaly detection engine.'}
            </div>
            <small className="text-info text-opacity-75 d-block mt-2 fs-8">
              * Note: Detected anomalies reflect mathematical deviations from baseline behavior. Anomalies must be confirmed through analyst triage before confirming as attacks.
            </small>
          </div>

          {/* Relevant Feature Values */}
          {Object.keys(relevantFeatures).length > 0 && (
            <div className="mb-4">
              <h6 className="text-white fw-bold mb-2 d-flex align-items-center gap-2">
                <Terminal size={16} className="text-info" />
                <span>Supporting Feature Signals</span>
              </h6>
              <div className="row g-2">
                {Object.entries(relevantFeatures).map(([k, v]) => (
                  <div key={k} className="col-sm-6 col-md-4">
                    <div className="p-2.5 rounded-2 font-mono fs-8" style={{ backgroundColor: '#111827', border: '1px solid #1e293b' }}>
                      <span className="text-secondary">{k}:</span>{' '}
                      <span className="text-info fw-bold">{String(v)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommended SOC Investigation Steps */}
          <div className="mb-4">
            <h6 className="text-white fw-bold mb-2 d-flex align-items-center gap-2">
              <CheckCircle2 size={16} className="text-success" />
              <span>Recommended SOC Investigation Playbook</span>
            </h6>
            <ul className="list-unstyled mb-0 d-flex flex-column gap-2">
              {recSteps.map((step, idx) => (
                <li key={idx} className="d-flex align-items-start gap-2 fs-7 text-secondary">
                  <ArrowRight size={14} className="text-primary mt-1 flex-shrink-0" />
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Analyst Status & Notes Management */}
          <div className="p-3 rounded-3 mt-4" style={{ backgroundColor: 'rgba(30, 41, 59, 0.5)', border: '1px solid #334155' }}>
            <h6 className="text-white fw-bold mb-3">Triage Status & Investigation Log</h6>
            
            <div className="mb-3">
              <label className="text-secondary fs-8 text-uppercase fw-bold mb-1">Analyst Notes</label>
              <textarea 
                className="soc-input" 
                rows="2"
                placeholder="Add investigation findings, root cause notes, or ticketing reference..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="d-flex flex-wrap align-items-center gap-2">
              <span className="text-secondary fs-7 me-2">Set Status:</span>
              <button 
                type="button" 
                className={`btn btn-sm ${currentStatus === 'New' ? 'btn-info text-white' : 'btn-cyber-secondary'}`}
                onClick={() => handleUpdateStatus('New')}
                disabled={saving}
              >
                New
              </button>
              <button 
                type="button" 
                className={`btn btn-sm ${currentStatus === 'Investigating' ? 'btn-warning text-dark' : 'btn-cyber-secondary'}`}
                onClick={() => handleUpdateStatus('Investigating')}
                disabled={saving}
              >
                Investigating
              </button>
              <button 
                type="button" 
                className={`btn btn-sm ${currentStatus === 'Resolved' ? 'btn-success text-white' : 'btn-cyber-secondary'}`}
                onClick={() => handleUpdateStatus('Resolved')}
                disabled={saving}
              >
                Resolved
              </button>
              <button 
                type="button" 
                className={`btn btn-sm ${currentStatus === 'False Positive' ? 'btn-secondary' : 'btn-cyber-secondary'}`}
                onClick={() => handleUpdateStatus('False Positive')}
                disabled={saving}
              >
                False Positive
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-top border-secondary border-opacity-25 d-flex justify-content-end">
          <button type="button" className="btn btn-cyber-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlertDetailModal;
