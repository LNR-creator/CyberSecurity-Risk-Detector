import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('cyber_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('cyber_token');
      if (storedToken) {
        try {
          const res = await authService.getMe();
          if (res.success && res.user) {
            setUser(res.user);
            setToken(storedToken);
          } else {
            setUser(null);
            setToken(null);
            localStorage.removeItem('cyber_token');
          }
        } catch (err) {
          console.error("Auth initialization error:", err);
          setUser(null);
          setToken(null);
          localStorage.removeItem('cyber_token');
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (username, password) => {
    const data = await authService.login(username, password);
    if (data.success && data.access_token) {
      localStorage.setItem('cyber_token', data.access_token);
      localStorage.setItem('cyber_user', JSON.stringify(data.user));
      setToken(data.access_token);
      setUser(data.user);
      return data;
    }
    throw new Error(data.message || 'Login failed');
  };

  const register = async (username, email, password, role) => {
    const data = await authService.register(username, email, password, role);
    if (data.success && data.access_token) {
      localStorage.setItem('cyber_token', data.access_token);
      localStorage.setItem('cyber_user', JSON.stringify(data.user));
      setToken(data.access_token);
      setUser(data.user);
      return data;
    }
    throw new Error(data.message || 'Registration failed');
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        loading,
        login,
        register,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
