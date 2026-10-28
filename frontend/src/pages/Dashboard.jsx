import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldAlert, 
  Activity, 
  Database, 
  AlertTriangle, 
  TrendingUp, 
  Globe, 
  ArrowUpRight, 
  Cpu, 
  Radio, 
  ExternalLink
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid 
} from 'recharts';

import { dashboardService } from '../services/settingsService';
import StatCard from '../components/StatCard';
import SeverityBadge from '../components/SeverityBadge';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import AlertDetailModal from '../components/AlertDetailModal';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState([]);
  const [distribution, setDistribution] = useState([]);
  const [topIps, setTopIps] = useState([]);
  const [topIndicators, setTopIndicators] = useState([]);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [sumRes, trendRes, distRes] = await Promise.all([
        dashboardService.getSummary(),
        dashboardService.getTrends(),
        dashboardService.getSeverityDistribution()
      ]);

      if (sumRes.success) {
        setSummary(sumRes.summary);
        setTopIps(sumRes.top_ips || []);
        setTopIndicators(sumRes.top_indicators || []);
        setRecentAlerts(sumRes.recent_alerts || []);
      }
      if (trendRes.success) {
        setTrends(trendRes.trends || []);
      }
      if (distRes.success) {
        setDistribution(distRes.distribution || []);
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleAlertStatusUpdated = (alertId, newStatus, notes) => {
    setRecentAlerts((prev) =>
      prev.map((a) => (a._id === alertId ? { ...a, investigation_status: newStatus, analyst_notes: notes } : a))
    );
    if (selectedAlert && selectedAlert._id === alertId) {
      setSelectedAlert((prev) => ({ ...prev, investigation_status: newStatus, analyst_notes: notes }));
    }
  };

  if (loading) {
    return <LoadingSpinner message="Aggregating Real-Time Threat Telemetry..." />;
  }

  const hasData = summary && summary.total_records_analyzed > 0;

  return (
    <div className="container-fluid p-0">
      {/* Top Welcome & Operations Bar */}
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4">
        <div>
          <div className="d-flex align-items-center gap-2">
            <h4 className="fw-bold text-white mb-0">SOC Operations Center — {user?.username || 'Analyst'}</h4>
            <span className="badge rounded-pill bg-primary bg-opacity-20 text-primary border border-primary border-opacity-25 px-2 py-0.5 fs-7 font-mono">
              ACTIVE DEFENSE
            </span>
          </div>
          <p className="text-secondary fs-7 mb-0 mt-1">
            Real-time machine learning risk scores, anomaly detection, and incident prioritization.
          </p>
        </div>

        <div className="d-flex align-items-center gap-2">
          <Link to="/analyze" className="btn btn-cyber-primary">
            <Activity size={16} />
            <span>Upload & Run Analysis</span>
          </Link>
          <Link to="/alerts" className="btn btn-cyber-secondary">
            <ShieldAlert size={16} />
            <span>View Alerts Triage</span>
          </Link>
        </div>
      </div>

      {!hasData ? (
        <EmptyState
          icon={Activity}
          title="No Threat Telemetry Detected Yet"
          message="Upload a network traffic or security audit CSV file to initiate machine learning anomaly detection and populate your threat intelligence dashboard."
          actionText="Run First ML Analysis"
          actionLink="/analyze"
        />
      ) : (
        <>
          {/* KPI Metrics Row */}
          <div className="row g-3 mb-4">
            <div className="col-12 col-sm-6 col-xl-3">
              <StatCard
                title="Total Records Analyzed"
                value={summary.total_records_analyzed}
                icon={Database}
                color="#3b82f6"
                subtitle={`${summary.total_datasets} Datasets Processed`}
              />
            </div>
            <div className="col-12 col-sm-6 col-xl-3">
              <StatCard
                title="Anomalies Flagged"
                value={summary.total_anomalies_detected}
                icon={AlertTriangle}
                color="#f97316"
                subtitle={`${((summary.total_anomalies_detected / Math.max(1, summary.total_records_analyzed)) * 100).toFixed(1)}% anomaly rate`}
              />
            </div>
            <div className="col-12 col-sm-6 col-xl-3">
              <StatCard
                title="Critical Incidents"
                value={summary.critical_risk}
                icon={ShieldAlert}
                color="#ef4444"
                subtitle={`${summary.high_risk} High Severity Risks`}
              />
            </div>
            <div className="col-12 col-sm-6 col-xl-3">
              <StatCard
                title="Open Incidents"
                value={summary.new_alerts + summary.investigating_alerts}
                icon={Radio}
                color="#06b6d4"
                subtitle={`${summary.resolved_alerts} Incidents Resolved`}
              />
            </div>
          </div>

          {/* Charts Row */}
          <div className="row g-3 mb-4">
            {/* Risk Severity Breakdown (Donut Chart) */}
            <div className="col-12 col-lg-5">
              <div className="soc-card h-100">
                <div className="soc-card-header">
                  <h6 className="soc-card-title">
                    <ShieldAlert size={18} className="text-danger" />
                    Threat Severity Distribution
                  </h6>
                  <span className="text-secondary font-mono fs-7">
                    {summary.total_anomalies_detected} Total Threats
                  </span>
                </div>
                <div style={{ height: '260px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={distribution.filter((d) => d.value > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={95}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {distribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{ 
                          backgroundColor: '#111827', 
                          borderColor: '#1e293b', 
                          borderRadius: '8px', 
                          color: '#fff',
                          fontFamily: 'JetBrains Mono' 
                        }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend Chips */}
                <div className="d-flex flex-wrap justify-content-center gap-3 pt-2 border-top border-secondary border-opacity-15">
                  {distribution.map((d) => (
                    <div key={d.name} className="d-flex align-items-center gap-1.5 font-mono fs-7">
                      <span className="d-inline-block rounded-circle" style={{ width: '10px', height: '10px', backgroundColor: d.color }}></span>
                      <span className="text-secondary">{d.name}:</span>
                      <span className="fw-bold text-white">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Anomaly Trend Chart */}
            <div className="col-12 col-lg-7">
              <div className="soc-card h-100">
                <div className="soc-card-header">
                  <h6 className="soc-card-title">
                    <TrendingUp size={18} className="text-primary" />
                    Detection Volume & Anomaly History
                  </h6>
                  <span className="text-secondary font-mono fs-7">By Dataset Batches</span>
                </div>
                <div style={{ height: '280px' }}>
                  {trends.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="anomGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.6}/>
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0}/>
                          </linearGradient>
                          <linearGradient id="recGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={11} fontFamily="JetBrains Mono" />
                        <YAxis stroke="#64748b" fontSize={11} fontFamily="JetBrains Mono" />
                        <RechartsTooltip 
                          contentStyle={{ 
                            backgroundColor: '#111827', 
                            borderColor: '#1e293b', 
                            borderRadius: '8px', 
                            color: '#fff',
                            fontFamily: 'JetBrains Mono' 
                          }} 
                        />
                        <Area type="monotone" dataKey="records" stroke="#3b82f6" fillOpacity={1} fill="url(#recGrad)" name="Total Records" />
                        <Area type="monotone" dataKey="anomalies" stroke="#ef4444" fillOpacity={1} fill="url(#anomGrad)" name="Flagged Anomalies" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="d-flex align-items-center justify-content-center h-100 text-secondary fs-7">
                      Not enough historical batches for timeline trend.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Threat Intelligence Row (Top IPs & Top Indicators) */}
          <div className="row g-3 mb-4">
            {/* Top Suspicious Source IPs */}
            <div className="col-12 col-md-6">
              <div className="soc-card h-100">
                <div className="soc-card-header">
                  <h6 className="soc-card-title">
                    <Globe size={18} className="text-danger" />
                    Top Suspicious Source IPs
                  </h6>
                  <span className="text-secondary font-mono fs-7">Repeated Threats</span>
                </div>
                {topIps.length === 0 ? (
                  <div className="text-secondary fs-7 py-3 text-center">No recurring IP patterns detected.</div>
                ) : (
                  <div className="d-flex flex-column gap-2.5">
                    {topIps.map((item) => (
                      <div 
                        key={item.ip} 
                        className="d-flex align-items-center justify-content-between p-2.5 rounded-3"
                        style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--soc-border)' }}
                      >
                        <div className="d-flex align-items-center gap-2">
                          <span className="font-mono fw-bold text-white fs-7">{item.ip}</span>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <span className="badge rounded-pill bg-danger bg-opacity-15 text-danger font-mono fs-8">
                            {item.count} alerts
                          </span>
                          <SeverityBadge severity={item.severity} showIcon={false} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Top Anomaly Indicators */}
            <div className="col-12 col-md-6">
              <div className="soc-card h-100">
                <div className="soc-card-header">
                  <h6 className="soc-card-title">
                    <Cpu size={18} className="text-cyan" />
                    Key Anomaly Attribution Features
                  </h6>
                  <span className="text-secondary font-mono fs-7">Feature Correlation</span>
                </div>
                {topIndicators.length === 0 ? (
                  <div className="text-secondary fs-7 py-3 text-center">No feature indicators recorded.</div>
                ) : (
                  <div className="d-flex flex-column gap-2.5">
                    {topIndicators.map((item) => (
                      <div 
                        key={item.indicator}
                        className="d-flex align-items-center justify-content-between p-2.5 rounded-3"
                        style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--soc-border)' }}
                      >
                        <span className="font-mono text-secondary fs-7">{item.indicator}</span>
                        <div className="d-flex align-items-center gap-2">
                          <span className="badge rounded-pill bg-info bg-opacity-15 text-info font-mono fs-8">
                            {item.count} incident flags
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recent Security Incidents Table */}
          <div className="soc-card mb-4">
            <div className="soc-card-header">
              <div className="d-flex align-items-center gap-2">
                <ShieldAlert size={18} className="text-warning" />
                <h6 className="soc-card-title mb-0">High-Priority Security Incidents</h6>
              </div>
              <Link to="/alerts" className="text-primary fs-7 d-flex align-items-center gap-1">
                <span>View All In Triage</span>
                <ArrowUpRight size={14} />
              </Link>
            </div>

            {recentAlerts.length === 0 ? (
              <div className="text-secondary fs-7 py-4 text-center">No alerts generated yet.</div>
            ) : (
              <div className="soc-table-container">
                <table className="soc-table">
                  <thead>
                    <tr>
                      <th>Severity</th>
                      <th>Source IP</th>
                      <th>Destination IP</th>
                      <th>Protocol / Port</th>
                      <th>Risk Score</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentAlerts.map((alert) => (
                      <tr key={alert._id}>
                        <td>
                          <SeverityBadge severity={alert.severity} />
                        </td>
                        <td>
                          <span className="font-mono text-white fw-semibold">{alert.source_ip || 'N/A'}</span>
                        </td>
                        <td>
                          <span className="font-mono text-secondary">{alert.destination_ip || 'N/A'}</span>
                        </td>
                        <td>
                          <span className="badge rounded-pill bg-dark text-info font-mono border border-secondary border-opacity-25 px-2 py-0.5">
                            {alert.protocol || 'TCP'} : {alert.destination_port || '443'}
                          </span>
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <div className="progress flex-grow-1" style={{ height: '6px', backgroundColor: '#1e293b', width: '70px' }}>
                              <div 
                                className={`progress-bar ${alert.risk_score >= 80 ? 'bg-danger' : alert.risk_score >= 60 ? 'bg-warning' : 'bg-info'}`}
                                style={{ width: `${alert.risk_score}%` }}
                              />
                            </div>
                            <span className="font-mono fs-7 fw-bold text-white">{alert.risk_score}</span>
                          </div>
                        </td>
                        <td>
                          <StatusBadge status={alert.investigation_status || 'New'} />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-sm btn-cyber-secondary py-1 px-2.5 fs-7"
                            onClick={() => setSelectedAlert(alert)}
                          >
                            <span>Investigate</span>
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
        </>
      )}

      {/* Alert Investigation Modal */}
      {selectedAlert && (
        <AlertDetailModal
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
          onStatusUpdated={handleAlertStatusUpdated}
        />
      )}
    </div>
  );
};

export default Dashboard;
