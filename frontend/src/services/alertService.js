import api from './api';

export const alertService = {
  async listAlerts(params = {}) {
    const res = await api.get('/alerts', { params });
    return res.data;
  },

  async getAlert(alertId) {
    const res = await api.get(`/alerts/${alertId}`);
    return res.data;
  },

  async updateStatus(alertId, status, notes = '') {
    const res = await api.patch(`/alerts/${alertId}/status`, { status, notes });
    return res.data;
  }
};
