import React, { useState, useEffect } from 'react';
import { X, User, Sparkles, CreditCard, ArrowDownRight, ArrowUpRight, Gift, History } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCredits } from '../context/CreditContext';
import api from '../services/api';

export default function UserAccountModal({ onClose, onOpenBuyCredits }) {
  const { user } = useAuth();
  const { balance } = useCredits();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTransactions() {
      try {
        setLoading(true);
        const res = await api.get('/api/credits');
        if (res.data.success) {
          setTransactions(res.data.transactions || []);
        }
      } catch (err) {
        console.error('Failed to load transaction history:', err);
      } finally {
        setLoading(false);
      }
    }
    loadTransactions();
  }, []);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '650px', width: '92%' }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {user?.picture ? (
              <img
                src={user.picture}
                alt="Avatar"
                style={{ width: '42px', height: '42px', borderRadius: '50%', border: '2px solid var(--primary)' }}
              />
            ) : (
              <div style={{ background: 'var(--primary-light)', padding: '0.6rem', borderRadius: '50%', color: 'var(--primary)' }}>
                <User size={24} />
              </div>
            )}

            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-main)', fontWeight: 600 }}>
                {user?.name || 'User Account'}
              </h3>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                {user?.email || 'Logged in via Google OAuth'}
              </p>
            </div>
          </div>

          <button className="icon-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ paddingTop: '1.25rem' }}>
          {/* Remaining Credits Card */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.08), rgba(139, 92, 246, 0.08))',
              border: '1px solid rgba(79, 70, 229, 0.25)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.5rem',
            }}
          >
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.2rem', fontWeight: 500 }}>
                Remaining Available Credits
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={24} color="var(--accent)" />
                <span>{balance} Credits</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem', fontWeight: 500 }}>
                1 Credit = 1 Slide generated
              </div>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                onClose();
                onOpenBuyCredits();
              }}
            >
              <CreditCard size={16} />
              <span>Top Up Credits</span>
            </button>
          </div>

          {/* Transactions Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
            <History size={18} color="var(--primary)" />
            <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-main)', fontWeight: 600 }}>
              Transaction & Credit History
            </h4>
          </div>

          {/* Transaction List */}
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <div className="spinner" style={{ margin: '0 auto 0.5rem' }} />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Loading account transactions...</span>
            </div>
          ) : transactions.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', background: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px dashed var(--bg-card-border)' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 500 }}>No transaction history found.</span>
            </div>
          ) : (
            <div style={{ maxHeight: '280px', overflowY: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid var(--bg-card-border)' }}>
              <table className="preview-table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Description</th>
                    <th style={{ textAlign: 'right' }}>Credits</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx, idx) => {
                    const isPositive = tx.credits > 0;
                    return (
                      <tr key={tx.id || idx}>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontWeight: 500 }}>
                          {new Date(tx.date).toLocaleDateString()} {new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              padding: '0.15rem 0.5rem',
                              borderRadius: '12px',
                              background:
                                tx.type === 'purchase'
                                  ? '#d1fae5'
                                  : tx.type === 'bonus'
                                  ? '#f3e8ff'
                                  : '#fee2e2',
                              color:
                                tx.type === 'purchase'
                                  ? '#047857'
                                  : tx.type === 'bonus'
                                  ? '#7e22ce'
                                  : '#b91c1c',
                            }}
                          >
                            {tx.type === 'purchase' ? (
                              <ArrowUpRight size={12} />
                            ) : tx.type === 'bonus' ? (
                              <Gift size={12} />
                            ) : (
                              <ArrowDownRight size={12} />
                            )}
                            {tx.type.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                          {tx.description}
                          {tx.razorpayPaymentId && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              Ref: {tx.razorpayPaymentId}
                            </div>
                          )}
                        </td>
                        <td
                          style={{
                            textAlign: 'right',
                            fontWeight: 'bold',
                            fontSize: '0.9rem',
                            color: isPositive ? 'var(--success)' : 'var(--danger)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {isPositive ? `+${tx.credits}` : tx.credits}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
