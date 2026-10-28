import api from './api';

export const analysisService = {
  async uploadDataset(file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/analysis/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  async listAnalyses() {
    const res = await api.get('/analysis');
    return res.data;
  },

  async getAnalysis(analysisId) {
    const res = await api.get(`/analysis/${analysisId}`);
    return res.data;
  },

  async runAnalysis(analysisId, params = {}) {
    const res = await api.post(`/analysis/${analysisId}/run`, params);
    return res.data;
  },

  async getResults(analysisId) {
    const res = await api.get(`/analysis/${analysisId}/results`);
    return res.data;
  },

  async exportEnrichedCSV(analysisId, filename = 'analyzed_dataset.csv') {
    const res = await api.get(`/analysis/${analysisId}/export`, {
      responseType: 'blob'
    });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }
};
