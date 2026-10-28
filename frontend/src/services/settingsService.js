import api from './api';

export const settingsService = {
  async getSettings() {
    const res = await api.get('/settings');
    return res.data;
  },

  async updateProfile(updates) {
    const res = await api.patch('/settings', updates);
    return res.data;
  },

  async changePassword(currentPassword, newPassword) {
    const res = await api.post('/settings/password', {
      current_password: currentPassword,
      new_password: newPassword
    });
    return res.data;
  }
};

export const dashboardService = {
  async getSummary() {
    const res = await api.get('/dashboard/summary');
    return res.data;
  },

  async getTrends() {
    const res = await api.get('/dashboard/trends');
    return res.data;
  },

  async getSeverityDistribution() {
    const res = await api.get('/dashboard/severity-distribution');
    return res.data;
  }
};
