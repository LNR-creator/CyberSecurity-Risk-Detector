import api from './api';

export const authService = {
  async register(username, email, password, role = 'SOC Analyst') {
    const res = await api.post('/auth/register', { username, email, password, role });
    return res.data;
  },

  async login(username, password) {
    const res = await api.post('/auth/login', { username, password });
    return res.data;
  },

  async getMe() {
    const res = await api.get('/auth/me');
    return res.data;
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // Continue client cleanup even if network fails
    } finally {
      localStorage.removeItem('cyber_token');
      localStorage.removeItem('cyber_user');
    }
  }
};
