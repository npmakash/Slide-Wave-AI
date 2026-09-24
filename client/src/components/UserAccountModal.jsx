import React, { useState, useEffect } from 'react';
import { X, User, Sparkles, CreditCard, ArrowDownRight, ArrowUpRight, Gift, History, LogOut, MessageSquare, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCredits } from '../context/CreditContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

export default function UserAccountModal({ onClose, onOpenBuyCredits }) {
  const { user, logout } = useAuth();
  const { balance } = useCredits();
  const { showToast } = useToast();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Developer Support Modal state
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportMessage, setSupportMessage] = useState('');
  const [sendingSupport, setSendingSupport] = useState(false);

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

  const handleSignOut = () => {
    onClose();
    logout();
  };

  const handleSendSupportMessage = async (e) => {
    e.preventDefault();
    if (!supportMessage.trim()) {
      showToast('Please type a message before sending', 'warning');
      return;
    }

    try {
      setSendingSupport(true);
      const res = await api.post('/api/support', { message: supportMessage });
      if (res.data.success) {
        showToast('🎉 Message sent to Developer Support!', 'success');
        setSupportMessage('');
        setShowSupportModal(false);
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to send support message', 'error');
    } finally {
      setSendingSupport(false);
    }
  };

  return (
    <>
      <div className="modal-backdrop" onClick={onClose}>
        <div
          className="modal-card"
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: '650px', width: '92%' }}
        >
          <div className="modal-header" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
              {user?.picture ? (
                <img
                  src={user.picture}
                  alt="Avatar"
                  style={{ width: '42px', height: '42px', borderRadius: '50%', border: '2px solid var(--primary)', flexShrink: 0 }}
                />
              ) : (
                <div style={{ background: 'var(--primary-light)', padding: '0.6rem', borderRadius: '50%', color: 'var(--primary)', flexShrink: 0 }}>
                  <User size={24} />
                </div>
              )}

              <div style={{ minWidth: 0, overflow: 'hidden' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-main)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.name || 'User Account'}
                </h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.email || 'Logged in via Google OAuth'}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowSupportModal(true)}
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.82rem', height: 'auto', minHeight: '34px' }}
                title="Send a message to Developer Support"
              >
                <MessageSquare size={15} color="var(--primary)" />
                <span>Developer Support</span>
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleSignOut}
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.82rem', height: 'auto', minHeight: '34px' }}
                title="Sign Out of your Account"
              >
                <LogOut size={15} />
                <span>Sign Out</span>
              </button>
              <button className="icon-btn" onClick={onClose} aria-label="Close modal">
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="modal-body" style={{ paddingTop: '1.25rem' }}>
            {/* Remaining Credits Card Container — uses mobile responsive fitting class */}
            <div className="account-credit-card">
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
              <div style={{ padding: '2rem', textAlign: 'center', background: 'var(--bg-body)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--bg-card-border)' }}>
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
                                    ? 'rgba(16, 185, 129, 0.15)'
                                    : tx.type === 'bonus'
                                    ? 'rgba(139, 92, 246, 0.15)'
                                    : 'rgba(239, 68, 68, 0.15)',
                                color:
                                  tx.type === 'purchase'
                                    ? 'var(--success)'
                                    : tx.type === 'bonus'
                                    ? 'var(--accent)'
                                    : 'var(--danger)',
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

            {/* Modal Footer Actions */}
            <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--bg-card-border)', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowSupportModal(true)}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                <MessageSquare size={16} color="var(--primary)" />
                <span>Developer Support</span>
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleSignOut}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Developer Support Message Form Modal */}
      {showSupportModal && (
        <div className="modal-backdrop" style={{ zIndex: 10000 }} onClick={() => setShowSupportModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', width: '92%' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ background: 'var(--primary-light)', padding: '0.5rem', borderRadius: '10px', color: 'var(--primary)' }}>
                  <MessageSquare size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-main)', fontWeight: 600 }}>Developer Support</h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Send message directly to Admin
                  </p>
                </div>
              </div>
              <button className="icon-btn" onClick={() => setShowSupportModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSendSupportMessage} style={{ paddingTop: '1rem' }}>
              <div style={{ background: 'var(--primary-light)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', border: '1px solid rgba(99, 102, 241, 0.25)', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                <strong>Send by email:</strong> {user?.email || 'Unknown User'}
              </div>

              <div className="form-group">
                <label htmlFor="support-message-input">Your Message *</label>
                <textarea
                  id="support-message-input"
                  className="form-control"
                  rows={5}
                  value={supportMessage}
                  onChange={(e) => setSupportMessage(e.target.value)}
                  placeholder="Type your question, issue or feedback here..."
                  required
                  style={{ minHeight: '130px', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowSupportModal(false)}
                >
                  Cancel
                </button>

                <button type="submit" className="btn btn-primary" disabled={sendingSupport}>
                  {sendingSupport ? <div className="spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> : <Send size={16} />}
                  <span>Send Message</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
