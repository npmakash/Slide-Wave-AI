import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const CreditContext = createContext(null);

export function CreditProvider({ children }) {
  const [balance, setBalance] = useState(0);
  const [packages, setPackages] = useState({});
  const [razorpayKeyId, setRazorpayKeyId] = useState('');
  const [loading, setLoading] = useState(true);
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);

  const { authenticated } = useAuth();

  const fetchCredits = useCallback(async () => {
    if (!authenticated) {
      setBalance(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await api.get('/api/credits');
      if (res.data.success) {
        setBalance(res.data.balance);
        setPackages(res.data.packages || {});
        setRazorpayKeyId(res.data.razorpayKeyId || '');
      }
    } catch (err) {
      console.error('Failed to fetch credits status:', err);
    } finally {
      setLoading(false);
    }
  }, [authenticated]);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits, authenticated]);

  const openBuyModal = () => setIsBuyModalOpen(true);
  const closeBuyModal = () => setIsBuyModalOpen(false);

  return (
    <CreditContext.Provider
      value={{
        balance,
        packages,
        razorpayKeyId,
        loading,
        fetchCredits,
        isBuyModalOpen,
        openBuyModal,
        closeBuyModal,
      }}
    >
      {children}
    </CreditContext.Provider>
  );
}

export function useCredits() {
  const context = useContext(CreditContext);
  if (!context) {
    throw new Error('useCredits must be used within a CreditProvider');
  }
  return context;
}
