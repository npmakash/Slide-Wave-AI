import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useToast } from './ToastContext';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const checkAuthStatus = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/auth/status');
      if (res.data.authenticated) {
        setUser(res.data.user);
        setAuthenticated(true);
      } else {
        setUser(null);
        setAuthenticated(false);
      }
    } catch (err) {
      setUser(null);
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const logout = async () => {
    try {
      await api.post('/auth/logout');
      setUser(null);
      setAuthenticated(false);
      showToast('Logged out successfully', 'info');
    } catch (err) {
      showToast(err.response?.data?.error || 'Logout failed', 'error');
    }
  };

  return (
    <AuthContext.Provider value={{ user, authenticated, loading, logout, checkAuthStatus }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
