import React, { useState, useEffect } from 'react';
import { 
  UploadCloud, 
  Activity, 
  Cpu, 
  Sliders, 
  CheckCircle2, 
  AlertTriangle, 
  FileSpreadsheet, 
  Download, 
  Play, 
  Eye, 
  RefreshCw, 
  ShieldAlert, 
  ExternalLink
} from 'lucide-react';
import { analysisService } from '../services/analysisService';
import SeverityBadge from '../components/SeverityBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import AlertDetailModal from '../components/AlertDetailModal';

const Analysis = () => {
  const [analyses, setAnalyses] = useState([]);
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [pipelineStep, setPipelineStep] = useState(0);

  // Configuration options
  const [contamination, setContamination] = useState(0.10);
  const [modelType, setModelType] = useState('isolation_forest');
  const [targetColumn, setTargetColumn] = useState('');
  const [selectedAlert, setSelectedAlert] = useState(null);

  const fetchAnalysisDetails = async (analysisId) => {
    setLoading(true);
    setUploadError(null);
    try {
      const res = await analysisService.getAnalysis(analysisId);
      if (res.success) {
        setCurrentAnalysis(res.analysis);
        // Check if has target column options
        if (res.analysis.columns && res.analysis.columns.includes('target_label')) {
          setTargetColumn('target_label');
        } else if (res.analysis.columns && res.analysis.columns.length > 0) {
          setTargetColumn(res.analysis.columns[res.analysis.columns.length - 1]);
        }

        if (res.analysis.status === 'completed') {
          const resultsRes = await analysisService.getResults(analysisId);
          if (resultsRes.success) {
            setAnalysisResults(resultsRes);
          }
        } else {
          setAnalysisResults(null);
        }
      }
    } catch (err) {
      setUploadError(err.response?.data?.message || 'Failed to fetch analysis details.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch past analyses
  const loadAnalyses = async () => {
    try {
      const res = await analysisService.listAnalyses();
      if (res.success && res.analyses) {
        setAnalyses(res.analyses);
        // If current analysis is not selected and there are analyses, select the latest
        if (!currentAnalysis && res.analyses.length > 0) {
          fetchAnalysisDetails(res.analyses[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load analyses:", err);
    }
  };

  useEffect(() => {
    loadAnalyses();
  }, []);

  const handleFileUpload = async (file) => {
    if (!file) return;
    setLoading(true);
    setUploadError(null);

    try {
      const res = await analysisService.uploadDataset(file);
      if (res.success) {
        await loadAnalyses();
        await fetchAnalysisDetails(res.analysis_id);
      }
    } catch (err) {
      setUploadError(err.response?.data?.message || 'File upload failed. Please verify CSV formatting.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSampleDataset = async (useLabeled = false) => {
    setLoading(true);
    setUploadError(null);
    const filename = useLabeled ? 'sample_labeled_dataset.csv' : 'sample_dataset.csv';

    try {
      const response = await fetch(`/${filename}`);
      if (!response.ok) throw new Error('Sample dataset file not accessible.');
      const blob = await response.blob();
      const file = new File([blob], filename, { type: 'text/csv' });
      await handleFileUpload(file);
    } catch (err) {
      setUploadError('Failed to load sample dataset: ' + err.message);
      setLoading(false);
    }
  };

  const handleRunAnalysis = async () => {
    if (!currentAnalysis) return;
    setAnalyzing(true);
    setUploadError(null);
    setPipelineStep(1);

    const stepInterval = setInterval(() => {
      setPipelineStep((prev) => (prev < 4 ? prev + 1 : prev));
    }, 700);

    try {
      const params = {
        contamination: parseFloat(contamination),
        model_type: modelType,
        target_column: modelType === 'random_forest' ? targetColumn : undefined
      };

      const res = await analysisService.runAnalysis(currentAnalysis.id, params);
      if (res.success) {
        await loadAnalyses();
        await fetchAnalysisDetails(currentAnalysis.id);
      }
    } catch (err) {
      setUploadError(err.response?.data?.message || 'Analysis execution failed.');
    } finally {
      clearInterval(stepInterval);
      setAnalyzing(false);
      setPipelineStep(0);
    }
  };

  const handleExportCSV = async () => {
    if (!currentAnalysis) return;
    try {
      await analysisService.exportEnrichedCSV(
        currentAnalysis.id,
        `enriched_sec_analysis_${currentAnalysis.id.slice(0, 8)}.csv`
      );
    } catch (err) {
      alert('Failed to export enriched CSV: ' + err.message);
    }
  };

  return (
    <div className="container-fluid p-0">
      {/* Top Header */}
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4">
        <div>
          <div className="d-flex align-items-center gap-2">
            <h4 className="fw-bold text-white mb-0">ML Risk Detection Engine</h4>
            <span className="badge rounded-pill bg-info bg-opacity-20 text-info border border-info border-opacity-25 px-2 py-0.5 fs-7 font-mono">
              ANOMALY INFERENCE
            </span>
          </div>
          <p className="text-secondary fs-7 mb-0 mt-1">
            Ingest network connection logs, configure unsupervised & supervised models, and score cybersecurity risks.
          </p>
        </div>

        {/* Quick Sample Load Buttons */}
        <div className="d-flex flex-wrap align-items-center gap-2">
          <button
            type="button"
            onClick={() => handleLoadSampleDataset(false)}
            disabled={loading || analyzing}
            className="btn btn-cyber-secondary fs-7 py-2"
          >
            <FileSpreadsheet size={15} className="text-primary" />
            <span>Load Sample Network CSV</span>
          </button>
          <button
            type="button"
            onClick={() => handleLoadSampleDataset(true)}
            disabled={loading || analyzing}
            className="btn btn-cyber-secondary fs-7 py-2"
          >
            <Cpu size={15} className="text-cyan" />
            <span>Load Labeled Attack CSV</span>
          </button>
        </div>
      </div>

      {uploadError && (
        <div className="p-3 mb-4 rounded-3 d-flex align-items-center gap-2 bg-danger bg-opacity-15 border border-danger border-opacity-30">
          <AlertTriangle size={18} className="text-danger flex-shrink-0" />
          <div className="text-danger fs-7 mb-0">{uploadError}</div>
        </div>
      )}

      <div className="row g-4">
        {/* Left Column: Upload & Configuration */}
        <div className="col-12 col-xl-5">
          {/* File Upload Dropzone */}
          <div className="soc-card mb-4">
            <div className="soc-card-header">
              <h6 className="soc-card-title">
                <UploadCloud size={18} className="text-primary" />
                Ingest Network Traffic Dataset
              </h6>
              <span className="text-secondary font-mono fs-8">Max 25MB (.csv)</span>
            </div>

            <label 
              className="d-flex flex-column align-items-center justify-content-center p-4 border border-2 border-dashed rounded-3 cursor-pointer text-center"
              style={{ 
                borderColor: 'var(--soc-border)', 
                backgroundColor: 'rgba(255, 255, 255, 0.01)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileUpload(e.dataTransfer.files[0]);
                }
              }}
            >
              <input
                type="file"
                accept=".csv"
                className="d-none"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />
              <div 
                className="p-3 rounded-circle mb-2"
                style={{ backgroundColor: 'rgba(37, 99, 235, 0.1)', color: '#3b82f6' }}
              >
                <UploadCloud size={28} />
              </div>
              <span className="text-white fw-semibold fs-7 mb-1">
                Click to browse or drop CSV dataset here
              </span>
              <span className="text-secondary font-mono" style={{ fontSize: '0.72rem' }}>
                Expects fields: source_ip, destination_ip, protocol, packet_count, bytes, duration
              </span>
            </label>
          </div>

          {/* Model Hyperparameters & Configuration */}
          {currentAnalysis && (
            <div className="soc-card mb-4">
              <div className="soc-card-header">
                <h6 className="soc-card-title">
                  <Sliders size={18} className="text-cyan" />
                  Model Pipeline Parameters
                </h6>
                <span className="badge rounded-pill bg-primary bg-opacity-20 text-primary font-mono fs-8">
                  {currentAnalysis.filename}
                </span>
              </div>

              <div className="mb-3">
                <label className="stat-label d-block mb-1.5">Machine Learning Algorithm</label>
                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className={`btn btn-sm w-50 py-2 fs-7 fw-semibold ${modelType === 'isolation_forest' ? 'btn-cyber-primary' : 'btn-cyber-secondary'}`}
                    onClick={() => setModelType('isolation_forest')}
                  >
                    Isolation Forest (Unsupervised)
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm w-50 py-2 fs-7 fw-semibold ${modelType === 'random_forest' ? 'btn-cyber-primary' : 'btn-cyber-secondary'}`}
                    onClick={() => setModelType('random_forest')}
                  >
                    Random Forest (Supervised)
                  </button>
                </div>
              </div>

              {modelType === 'isolation_forest' && (
                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-1.5">
                    <label className="stat-label mb-0">Contamination Ratio</label>
                    <span className="font-mono text-cyan fw-bold fs-7">
                      {(contamination * 100).toFixed(0)}% ({contamination})
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.01"
                    max="0.25"
                    step="0.01"
                    value={contamination}
                    onChange={(e) => setContamination(parseFloat(e.target.value))}
                    className="form-range w-100"
                  />
                  <div className="d-flex justify-content-between text-secondary font-mono" style={{ fontSize: '0.7rem' }}>
                    <span>1% (Strict Anomaly)</span>
                    <span>10% (Balanced)</span>
                    <span>25% (Broad)</span>
                  </div>
                </div>
              )}

              {modelType === 'random_forest' && (
                <div className="mb-3">
                  <label className="stat-label d-block mb-1.5">Target Label Column (Ground Truth)</label>
                  <select
                    value={targetColumn}
                    onChange={(e) => setTargetColumn(e.target.value)}
                    className="soc-input font-mono fs-7"
                  >
                    {currentAnalysis.columns?.map((col) => (
                      <option key={col} value={col}>
                        {col} {col === 'target_label' ? '(Recommended)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="button"
                onClick={handleRunAnalysis}
                disabled={analyzing || loading}
                className="btn btn-cyber-primary w-100 justify-content-center py-2.5 mt-2"
              >
                {analyzing ? (
                  <span>Executing Pipeline...</span>
                ) : (
                  <>
                    <Play size={16} fill="currentColor" />
                    <span>Run ML Risk Detection</span>
                  </>
                )}
              </button>

              {/* Real-time Pipeline Progress */}
              {analyzing && (
                <div className="mt-3 p-3 rounded-3 bg-black bg-opacity-30 border border-secondary border-opacity-20 font-mono fs-8">
                  <div className="d-flex align-items-center gap-2 mb-1.5 text-primary">
                    <RefreshCw size={14} className="spin" />
                    <span className="fw-bold">Pipeline Stage {pipelineStep}/4:</span>
                  </div>
                  <div className={pipelineStep >= 1 ? 'text-success' : 'text-secondary'}>
                    {pipelineStep >= 1 ? '✓' : '•'} 1. Sanitizing & Scaling Numerical Features
                  </div>
                  <div className={pipelineStep >= 2 ? 'text-success' : 'text-secondary'}>
                    {pipelineStep >= 2 ? '✓' : '•'} 2. Computing Isolation Distance & Trees
                  </div>
                  <div className={pipelineStep >= 3 ? 'text-success' : 'text-secondary'}>
                    {pipelineStep >= 3 ? '✓' : '•'} 3. Quantifying Attack Risk Scores (0-100)
                  </div>
                  <div className={pipelineStep >= 4 ? 'text-success' : 'text-secondary'}>
                    {pipelineStep >= 4 ? '✓' : '•'} 4. Emitting SOC Alerts to Telemetry Store
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Historical Analyses List */}
          <div className="soc-card">
            <div className="soc-card-header">
              <h6 className="soc-card-title">
                <FileSpreadsheet size={18} className="text-secondary" />
                Analyzed Datasets History
              </h6>
              <span className="text-secondary font-mono fs-8">{analyses.length} Total</span>
            </div>

            {analyses.length === 0 ? (
              <div className="text-secondary fs-7 py-3 text-center">No past datasets found.</div>
            ) : (
              <div className="d-flex flex-column gap-2" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                {analyses.map((a) => (
                  <div
                    key={a.id}
                    onClick={() => fetchAnalysisDetails(a.id)}
                    className="p-2.5 rounded-3 d-flex align-items-center justify-content-between cursor-pointer"
                    style={{
                      backgroundColor: currentAnalysis?.id === a.id ? 'rgba(37, 99, 235, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                      border: currentAnalysis?.id === a.id ? '1px solid #3b82f6' : '1px solid var(--soc-border)',
                      cursor: 'pointer'
                    }}
                  >
                    <div className="overflow-hidden">
                      <div className="text-white fw-semibold fs-7 text-truncate">{a.filename}</div>
                      <div className="text-secondary font-mono" style={{ fontSize: '0.68rem' }}>
                        {a.row_count} rows &bull; {a.anomaly_count || 0} threats &bull; {a.status}
                      </div>
                    </div>
                    <div className="d-flex align-items-center gap-1.5 flex-shrink-0">
                      <span className={`badge rounded-pill font-mono fs-8 ${a.status === 'completed' ? 'bg-success bg-opacity-20 text-success' : 'bg-warning bg-opacity-20 text-warning'}`}>
                        {a.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Schema Preview & Results */}
        <div className="col-12 col-xl-7">
          {loading ? (
            <LoadingSpinner message="Loading Dataset Metadata..." />
          ) : !currentAnalysis ? (
            <div className="soc-card text-center py-5">
              <Activity size={40} className="text-secondary mb-3 opacity-50" />
              <h6 className="text-white fw-bold">Select or Upload a Dataset</h6>
              <p className="text-secondary fs-7" style={{ maxWidth: '400px', margin: '0 auto' }}>
                Upload your network capture CSV or click "Load Sample Network CSV" above to begin.
              </p>
            </div>
          ) : currentAnalysis.status === 'ready' ? (
            /* Ready for analysis schema preview */
            <div className="soc-card">
              <div className="soc-card-header">
                <h6 className="soc-card-title">
                  <Eye size={18} className="text-primary" />
                  Dataset Schema Preview ({currentAnalysis.row_count} Rows)
                </h6>
                <span className="badge rounded-pill bg-warning bg-opacity-15 text-warning font-mono fs-8">
                  PENDING INFERENCE
                </span>
              </div>
              <p className="text-secondary fs-7 mb-3">
                File loaded into memory. Review detected telemetry features below, then select hyperparameters and run the ML pipeline.
              </p>

              <div className="mb-4">
                <div className="stat-label mb-2">Detected Column Features</div>
                <div className="d-flex flex-wrap gap-1.5">
                  {currentAnalysis.columns?.map((c) => (
                    <span 
                      key={c}
                      className="badge rounded-pill bg-dark text-info font-mono border border-secondary border-opacity-25 px-2.5 py-1 fs-7"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              <div className="text-center py-4 border rounded-3 border-secondary border-opacity-25 bg-black bg-opacity-20">
                <Sliders size={32} className="text-cyan mb-2" />
                <h6 className="text-white fw-bold mb-1">Ready for Machine Learning Inference</h6>
                <p className="text-secondary fs-7 mb-3">
                  Click "Run ML Risk Detection" in the left panel to execute feature scaling and anomaly scoring.
                </p>
                <button
                  type="button"
                  onClick={handleRunAnalysis}
                  disabled={analyzing}
                  className="btn btn-cyber-primary"
                >
                  <Play size={16} fill="currentColor" />
                  <span>Execute Model Now</span>
                </button>
              </div>
            </div>
          ) : (
            /* Completed Analysis Results */
            <div>
              {/* Top Results Card */}
              <div className="soc-card mb-4">
                <div className="soc-card-header">
                  <div className="d-flex align-items-center gap-2">
                    <CheckCircle2 size={20} className="text-success" />
                    <h6 className="soc-card-title mb-0">Inference Results & Threat Breakdown</h6>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <button
                      type="button"
                      onClick={handleExportCSV}
                      className="btn btn-sm btn-cyber-secondary fs-7 py-1"
                      title="Download Enriched CSV with Risk Scores"
                    >
                      <Download size={14} />
                      <span>Export Enriched CSV</span>
                    </button>
                  </div>
                </div>

                {/* Metric Badges */}
                <div className="row g-2 mb-3">
                  <div className="col-6 col-sm-3">
                    <div className="p-2.5 rounded-3 bg-black bg-opacity-20 border border-secondary border-opacity-20">
                      <div className="stat-label fs-8">Total Rows</div>
                      <div className="font-mono fw-bold text-white fs-6">{currentAnalysis.row_count}</div>
                    </div>
                  </div>
                  <div className="col-6 col-sm-3">
                    <div className="p-2.5 rounded-3 bg-black bg-opacity-20 border border-secondary border-opacity-20">
                      <div className="stat-label fs-8">Anomalies Detected</div>
                      <div className="font-mono fw-bold text-danger fs-6">{currentAnalysis.anomaly_count}</div>
                    </div>
                  </div>
                  <div className="col-6 col-sm-3">
                    <div className="p-2.5 rounded-3 bg-black bg-opacity-20 border border-secondary border-opacity-20">
                      <div className="stat-label fs-8">Anomaly Rate</div>
                      <div className="font-mono fw-bold text-warning fs-6">
                        {((currentAnalysis.anomaly_count / Math.max(1, currentAnalysis.row_count)) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  <div className="col-6 col-sm-3">
                    <div className="p-2.5 rounded-3 bg-black bg-opacity-20 border border-secondary border-opacity-20">
                      <div className="stat-label fs-8">Model Executed</div>
                      <div className="font-mono fw-bold text-info fs-6 text-capitalize">
                        {currentAnalysis.model_type?.replace('_', ' ')}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Risk Distribution Pills */}
                <div className="d-flex flex-wrap gap-2 pt-2 border-top border-secondary border-opacity-20">
                  <span className="font-mono fs-7 text-secondary me-2 align-self-center">Risk Categories:</span>
                  <SeverityBadge severity="Critical" />
                  <span className="font-mono text-white fw-bold me-2 align-self-center">{currentAnalysis.risk_summary?.Critical || 0}</span>
                  <SeverityBadge severity="High" />
                  <span className="font-mono text-white fw-bold me-2 align-self-center">{currentAnalysis.risk_summary?.High || 0}</span>
                  <SeverityBadge severity="Medium" />
                  <span className="font-mono text-white fw-bold me-2 align-self-center">{currentAnalysis.risk_summary?.Medium || 0}</span>
                  <SeverityBadge severity="Low" />
                  <span className="font-mono text-white fw-bold align-self-center">{currentAnalysis.risk_summary?.Low || 0}</span>
                </div>
              </div>

              {/* Flagged Incidents Table */}
              <div className="soc-card">
                <div className="soc-card-header">
                  <h6 className="soc-card-title">
                    <ShieldAlert size={18} className="text-danger" />
                    Flagged Security Incidents ({analysisResults?.alerts?.length || 0})
                  </h6>
                  <span className="text-secondary font-mono fs-8">Sorted by Risk Score</span>
                </div>

                {!analysisResults?.alerts || analysisResults.alerts.length === 0 ? (
                  <div className="text-secondary fs-7 py-4 text-center">
                    No anomalies flagged in this dataset run.
                  </div>
                ) : (
                  <div className="soc-table-container">
                    <table className="soc-table">
                      <thead>
                        <tr>
                          <th>Severity</th>
                          <th>Source IP</th>
                          <th>Destination IP</th>
                          <th>Risk Score</th>
                          <th>Reason</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysisResults.alerts.map((alert) => (
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
                              <div className="d-flex align-items-center gap-2">
                                <div className="progress flex-grow-1" style={{ height: '6px', backgroundColor: '#1e293b', width: '60px' }}>
                                  <div 
                                    className={`progress-bar ${alert.risk_score >= 80 ? 'bg-danger' : alert.risk_score >= 60 ? 'bg-warning' : 'bg-info'}`}
                                    style={{ width: `${alert.risk_score}%` }}
                                  />
                                </div>
                                <span className="font-mono fs-7 fw-bold text-white">{alert.risk_score}</span>
                              </div>
                            </td>
                            <td>
                              <span className="text-secondary fs-7 text-truncate d-inline-block" style={{ maxWidth: '170px' }}>
                                {alert.detection_reason || 'Statistical network outlier'}
                              </span>
                            </td>
                            <td>
                              <button
                                type="button"
                                className="btn btn-sm btn-cyber-secondary py-1 px-2 fs-7"
                                onClick={() => setSelectedAlert(alert)}
                              >
                                <span>Inspect</span>
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
            </div>
          )}
        </div>
      </div>

      {/* Alert Detail Inspection Modal */}
      {selectedAlert && (
        <AlertDetailModal
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
          onStatusUpdated={() => {
            if (currentAnalysis) fetchAnalysisDetails(currentAnalysis.id);
          }}
        />
      )}
    </div>
  );
};

export default Analysis;
