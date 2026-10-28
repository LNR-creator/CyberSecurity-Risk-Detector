import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  RefreshCw, 
  ExternalLink, 
  ShieldCheck,
  X
} from 'lucide-react';
import { alertService } from '../services/alertService';
import SeverityBadge from '../components/SeverityBadge';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import AlertDetailModal from '../components/AlertDetailModal';
import EmptyState from '../components/EmptyState';

const Alerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const params = {};
      if (severityFilter !== 'All') params.severity = severityFilter;
      if (statusFilter !== 'All') params.status = statusFilter;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const res = await alertService.listAlerts(params);
      if (res.success) {
        setAlerts(res.alerts || []);
        setTotalCount(res.total || res.alerts?.length || 0);
      }
    } catch (err) {
      console.error("Failed to fetch alerts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [severityFilter, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchAlerts();
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSeverityFilter('All');
    setStatusFilter('All');
  };

  const handleStatusUpdated = (alertId, newStatus, notes) => {
    setAlerts((prev) =>
      prev.map((a) => (a._id === alertId ? { ...a, investigation_status: newStatus, analyst_notes: notes } : a))
    );
    if (selectedAlert && selectedAlert._id === alertId) {
      setSelectedAlert((prev) => ({ ...prev, investigation_status: newStatus, analyst_notes: notes }));
    }
  };

  const criticalCount = alerts.filter(a => a.severity === 'Critical').length;
  const newCount = alerts.filter(a => a.investigation_status === 'New').length;

  return (
    <div className="container-fluid p-0">
      {/* Top Header */}
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4">
        <div>
          <div className="d-flex align-items-center gap-2">
            <h4 className="fw-bold text-white mb-0">Security Incident Triage</h4>
            <span className="badge rounded-pill bg-danger bg-opacity-20 text-danger border border-danger border-opacity-25 px-2 py-0.5 fs-7 font-mono">
              TRIAGE QUEUE
            </span>
          </div>
          <p className="text-secondary fs-7 mb-0 mt-1">
            Investigate flagged network traffic anomalies, review attribution features, and update incident statuses.
          </p>
        </div>

        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            onClick={fetchAlerts}
            disabled={loading}
            className="btn btn-cyber-secondary fs-7 py-2"
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Refresh Queue</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="soc-card mb-4 p-3">
        <form onSubmit={handleSearchSubmit} className="row g-2 align-items-center">
          {/* Search Input */}
          <div className="col-12 col-md-5">
            <div className="position-relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by IP, protocol, detection reason..."
                className="soc-input ps-5 fs-7"
              />
              <Search size={16} className="text-secondary position-absolute" style={{ left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => { setSearchTerm(''); }}
                  className="btn btn-sm btn-link text-secondary position-absolute p-0"
                  style={{ right: '12px', top: '50%', transform: 'translateY(-50%)' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Severity Dropdown */}
          <div className="col-6 col-md-3">
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="soc-input fs-7"
            >
              <option value="All">All Severities</option>
              <option value="Critical">Critical Severity</option>
              <option value="High">High Severity</option>
              <option value="Medium">Medium Severity</option>
              <option value="Low">Low Severity</option>
            </select>
          </div>

          {/* Status Dropdown */}
          <div className="col-6 col-md-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="soc-input fs-7"
            >
              <option value="All">All Statuses</option>
              <option value="New">Status: New</option>
              <option value="Investigating">Status: Investigating</option>
              <option value="Resolved">Status: Resolved</option>
              <option value="False Positive">Status: False Positive</option>
            </select>
          </div>

          {/* Filter Reset Button */}
          <div className="col-12 col-md-1 d-flex justify-content-end">
            <button
              type="button"
              onClick={handleClearFilters}
              title="Reset Filters"
              className="btn btn-cyber-secondary w-100 fs-7 py-2 justify-content-center"
            >
              <Filter size={14} />
            </button>
          </div>
        </form>

        {/* Filter Summary Tags */}
        <div className="d-flex flex-wrap align-items-center gap-2 mt-3 pt-2 border-top border-secondary border-opacity-15 fs-7 font-mono">
          <span className="text-secondary">Showing:</span>
          <span className="badge rounded-pill bg-primary bg-opacity-20 text-primary px-2.5 py-1">
            {alerts.length} of {totalCount} Incidents
          </span>
          {criticalCount > 0 && (
            <span className="badge rounded-pill bg-danger bg-opacity-20 text-danger px-2.5 py-1">
              {criticalCount} Critical
            </span>
          )}
          {newCount > 0 && (
            <span className="badge rounded-pill bg-info bg-opacity-20 text-info px-2.5 py-1">
              {newCount} Unassigned / New
            </span>
          )}
        </div>
      </div>

      {/* Alerts Table */}
      <div className="soc-card">
        {loading ? (
          <LoadingSpinner message="Filtering Incident Stream..." />
        ) : alerts.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No Incidents Match Filters"
            message="No security alerts match the selected criteria. Try adjusting or clearing search filters to inspect telemetry."
            actionText="Clear Filter Settings"
            actionLink="#"
          />
        ) : (
          <div className="soc-table-container">
            <table className="soc-table">
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Source IP</th>
                  <th>Destination</th>
                  <th>Proto / Port</th>
                  <th>Risk Score</th>
                  <th>Detection Reason</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((alert) => (
                  <tr key={alert._id}>
                    <td>
                      <SeverityBadge severity={alert.severity} />
                    </td>
                    <td>
                      <span className="font-mono text-white fw-bold">{alert.source_ip || 'N/A'}</span>
                    </td>
                    <td>
                      <span className="font-mono text-secondary fs-7">{alert.destination_ip || 'N/A'}</span>
                    </td>
                    <td>
                      <span className="badge rounded-pill bg-dark text-info font-mono border border-secondary border-opacity-25 px-2 py-0.5 fs-8">
                        {alert.protocol || 'TCP'} : {alert.destination_port || '443'}
                      </span>
                    </td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <div className="progress flex-grow-1" style={{ height: '6px', backgroundColor: '#1e293b', width: '50px' }}>
                          <div 
                            className={`progress-bar ${alert.risk_score >= 80 ? 'bg-danger' : alert.risk_score >= 60 ? 'bg-warning' : 'bg-info'}`}
                            style={{ width: `${alert.risk_score}%` }}
                          />
                        </div>
                        <span className="font-mono fs-7 fw-bold text-white">{alert.risk_score}</span>
                      </div>
                    </td>
                    <td>
                      <span className="text-secondary fs-7 text-truncate d-inline-block" style={{ maxWidth: '200px' }}>
                        {alert.detection_reason || 'Outlier in network feature distribution'}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={alert.investigation_status || 'New'} />
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => setSelectedAlert(alert)}
                        className="btn btn-sm btn-cyber-secondary py-1 px-2.5 fs-7"
                      >
                        <span>Triage</span>
                        <ExternalLink size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Deep Incident Inspection Modal */}
      {selectedAlert && (
        <AlertDetailModal
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
          onStatusUpdated={handleStatusUpdated}
        />
      )}
    </div>
  );
};

export default Alerts;
