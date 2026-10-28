import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  FileCheck, 
  Layers, 
  Sparkles 
} from 'lucide-react';
import { reportService } from '../services/reportService';
import { analysisService } from '../services/analysisService';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState('');
  const [reportType, setReportType] = useState('pdf');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [repRes, anaRes] = await Promise.all([
        reportService.listReports(),
        analysisService.listAnalyses()
      ]);

      if (repRes.success) setReports(repRes.reports || []);
      if (anaRes.success) {
        const completed = (anaRes.analyses || []).filter(a => a.status === 'completed');
        setAnalyses(completed);
        if (completed.length > 0 && !selectedAnalysisId) {
          setSelectedAnalysisId(completed[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch reports:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleGenerateReport = async (e) => {
    e.preventDefault();
    if (!selectedAnalysisId) {
      setError('Please select a completed analysis to generate an executive report.');
      return;
    }

    setGenerating(true);
    setMessage(null);
    setError(null);

    try {
      const res = await reportService.generateReport(selectedAnalysisId, reportType);
      if (res.success) {
        setMessage(`Security Audit Report generated successfully: ${res.report?.filename || 'PDF Report'}`);
        await fetchData();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate security audit report.');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (report) => {
    try {
      await reportService.downloadReport(
        report._id,
        report.filename,
        report.report_type === 'pdf'
      );
    } catch (err) {
      alert('Failed to download report: ' + err.message);
    }
  };

  return (
    <div className="container-fluid p-0">
      {/* Top Header */}
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4">
        <div>
          <div className="d-flex align-items-center gap-2">
            <h4 className="fw-bold text-white mb-0">Security Audit Reports</h4>
            <span className="badge rounded-pill bg-primary bg-opacity-20 text-primary border border-primary border-opacity-25 px-2 py-0.5 fs-7 font-mono">
              EXECUTIVE COMPLIANCE
            </span>
          </div>
          <p className="text-secondary fs-7 mb-0 mt-1">
            Generate and export SOC executive audit summaries, threat evidence, and enriched CSV datasets.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchData}
          disabled={loading}
          className="btn btn-cyber-secondary fs-7 py-2"
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          <span>Refresh Reports</span>
        </button>
      </div>

      {message && (
        <div className="p-3 mb-4 rounded-3 d-flex align-items-center gap-2 bg-success bg-opacity-15 border border-success border-opacity-30">
          <CheckCircle2 size={18} className="text-success flex-shrink-0" />
          <div className="text-success fs-7 mb-0">{message}</div>
        </div>
      )}

      {error && (
        <div className="p-3 mb-4 rounded-3 d-flex align-items-center gap-2 bg-danger bg-opacity-15 border border-danger border-opacity-30">
          <AlertTriangle size={18} className="text-danger flex-shrink-0" />
          <div className="text-danger fs-7 mb-0">{error}</div>
        </div>
      )}

      <div className="row g-4">
        {/* Left Column: Generate Report Form */}
        <div className="col-12 col-lg-5">
          <div className="soc-card">
            <div className="soc-card-header">
              <h6 className="soc-card-title">
                <Sparkles size={18} className="text-primary" />
                Generate New Audit Report
              </h6>
              <span className="text-secondary font-mono fs-8">Automated Export</span>
            </div>

            {analyses.length === 0 ? (
              <div className="text-center py-4">
                <Layers size={32} className="text-secondary mb-2 opacity-50" />
                <h6 className="text-white fw-semibold mb-1">No Completed Analyses Available</h6>
                <p className="text-secondary fs-7 mb-0">
                  Please run machine learning detection on a dataset first before generating audit reports.
                </p>
              </div>
            ) : (
              <form onSubmit={handleGenerateReport}>
                <div className="mb-3">
                  <label className="stat-label d-block mb-1.5">Select Target Analysis</label>
                  <select
                    value={selectedAnalysisId}
                    onChange={(e) => setSelectedAnalysisId(e.target.value)}
                    className="soc-input font-mono fs-7"
                    required
                  >
                    {analyses.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.filename} ({a.anomaly_count || 0} threats, {a.row_count} rows)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <label className="stat-label d-block mb-1.5">Report Format</label>
                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      className={`btn btn-sm w-50 py-2 fs-7 fw-semibold ${reportType === 'pdf' ? 'btn-cyber-primary' : 'btn-cyber-secondary'}`}
                      onClick={() => setReportType('pdf')}
                    >
                      Executive PDF Report
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm w-50 py-2 fs-7 fw-semibold ${reportType === 'csv' ? 'btn-cyber-primary' : 'btn-cyber-secondary'}`}
                      onClick={() => setReportType('csv')}
                    >
                      Enriched CSV Telemetry
                    </button>
                  </div>
                  <div className="text-secondary font-mono mt-2" style={{ fontSize: '0.72rem' }}>
                    {reportType === 'pdf' 
                      ? 'Detailed PDF document with executive threat summary, risk scores, and recommended actions.'
                      : 'Raw CSV dataset enriched with ML anomaly flags, risk scores, and IP metadata.'}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={generating || !selectedAnalysisId}
                  className="btn btn-cyber-primary w-100 justify-content-center py-2.5 fs-7"
                >
                  {generating ? (
                    <span>Compiling Report Document...</span>
                  ) : (
                    <>
                      <FileCheck size={16} />
                      <span>Generate Security Report</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Right Column: Generated Reports Archive */}
        <div className="col-12 col-lg-7">
          <div className="soc-card">
            <div className="soc-card-header">
              <h6 className="soc-card-title">
                <FileText size={18} className="text-cyan" />
                Report Archive & Downloads
              </h6>
              <span className="text-secondary font-mono fs-8">{reports.length} Generated</span>
            </div>

            {loading ? (
              <LoadingSpinner message="Loading Reports Index..." />
            ) : reports.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No Reports Generated Yet"
                message="Choose a completed analysis on the left to produce your first executive PDF security audit summary."
                actionText=""
                actionLink=""
              />
            ) : (
              <div className="soc-table-container">
                <table className="soc-table">
                  <thead>
                    <tr>
                      <th>Document</th>
                      <th>Format</th>
                      <th>Dataset Origin</th>
                      <th>Timestamp</th>
                      <th>Download</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((report) => (
                      <tr key={report._id}>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <FileText size={16} className={report.report_type === 'pdf' ? 'text-danger' : 'text-success'} />
                            <span className="font-mono text-white fw-semibold fs-7 text-truncate" style={{ maxWidth: '180px' }}>
                              {report.filename}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className={`badge rounded-pill font-mono fs-8 ${report.report_type === 'pdf' ? 'bg-danger bg-opacity-20 text-danger' : 'bg-success bg-opacity-20 text-success'}`}>
                            {report.report_type?.toUpperCase() || 'PDF'}
                          </span>
                        </td>
                        <td>
                          <span className="font-mono text-secondary fs-7">{report.dataset_filename}</span>
                        </td>
                        <td>
                          <span className="font-mono text-secondary fs-8">
                            {report.created_at ? report.created_at.slice(0, 16).replace('T', ' ') : 'N/A'}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => handleDownload(report)}
                            className="btn btn-sm btn-cyber-secondary py-1 px-2.5 fs-7"
                            title="Download Report File"
                          >
                            <Download size={13} />
                            <span>Export</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
