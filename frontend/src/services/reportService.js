import api from './api';

export const reportService = {
  async generateReport(analysisId, reportType = 'pdf') {
    const res = await api.post('/reports/generate', {
      analysis_id: analysisId,
      report_type: reportType
    });
    return res.data;
  },

  async listReports() {
    const res = await api.get('/reports');
    return res.data;
  },

  async downloadReport(reportId, filename = 'report.pdf', isPdf = true) {
    const res = await api.get(`/reports/${reportId}/download`, {
      responseType: 'blob'
    });
    const blob = new Blob([res.data], { type: isPdf ? 'application/pdf' : 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }
};
