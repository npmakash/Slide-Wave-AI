import React, { useState, useEffect, useCallback } from 'react';
import { Users, Sparkles, Presentation, Search, PlusCircle, ShieldCheck, X, RefreshCw, MessageSquare, Trash2, Mail, Trash, Clock, History, ArrowUpRight, ArrowDownRight, Gift } from 'lucide-react';
import api from '../services/api';
import socket from '../services/socket';
import { useToast } from '../context/ToastContext';

export default function AdminDashboard({ onRefreshCredits }) {
  const [activeSubTab, setActiveSubTab] = useState('users'); // 'users' | 'inbox'
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [supportMessages, setSupportMessages] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Grant Credits Modal state
  const [selectedUser, setSelectedUser] = useState(null);
  const [grantAmount, setGrantAmount] = useState(50);
  const [grantReason, setGrantReason] = useState('Admin Grant');
  const [submitting, setSubmitting] = useState(false);

  // User Credit History Modal state
  const [historyUser, setHistoryUser] = useState(null);
  const [historyTransactions, setHistoryTransactions] = useState([]);
  const [historyBalance, setHistoryBalance] = useState(0);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Clear All Messages Confirm Modal state
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);
  const [clearingMessages, setClearingMessages] = useState(false);

  const { showToast } = useToast();

  const fetchAdminData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, usersRes, supportRes] = await Promise.all([
        api.get('/api/admin/stats'),
        api.get('/api/admin/users'),
        api.get('/api/support/admin'),
      ]);

      if (statsRes.data.success) setStats(statsRes.data.stats);
      if (usersRes.data.success) setUsers(usersRes.data.users || []);
      if (supportRes.data.success) setSupportMessages(supportRes.data.messages || []);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to load Admin Dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  // Real-time Socket.IO event listeners for Developer Support Inbox updates without refreshing
  useEffect(() => {
    socket.emit('join_admin');

    const handleNewMsg = (newMsg) => {
      setSupportMessages((prev) => [newMsg, ...prev.filter((m) => m.id !== newMsg.id)]);
      showToast(`🔔 Real-Time: New Developer Support message from ${newMsg.userEmail}`, 'info');
    };

    const handleDeleteMsg = ({ id }) => {
      setSupportMessages((prev) => prev.filter((m) => m.id !== id));
    };

    const handleClearedMsgs = () => {
      setSupportMessages([]);
    };

    socket.on('support_message_new', handleNewMsg);
    socket.on('support_message_delete', handleDeleteMsg);
    socket.on('support_messages_cleared', handleClearedMsgs);

    return () => {
      socket.off('support_message_new', handleNewMsg);
      socket.off('support_message_delete', handleDeleteMsg);
      socket.off('support_messages_cleared', handleClearedMsgs);
    };
  }, [showToast]);

  // View specific user transaction & credit history
  const handleFetchUserHistory = async (targetUser) => {
    try {
      setHistoryUser(targetUser);
      setLoadingHistory(true);
      const res = await api.get(`/api/admin/users/${encodeURIComponent(targetUser.email)}/transactions`);
      if (res.data.success) {
        setHistoryTransactions(res.data.transactions || []);
        setHistoryBalance(res.data.balance || 0);
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to fetch user credit history', 'error');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleGrantCredits = async (e) => {
    e.preventDefault();

    if (!selectedUser || !grantAmount || grantAmount <= 0) {
      showToast('Please enter a valid credit amount', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post('/api/admin/credits/add', {
        email: selectedUser.email,
        amount: Number(grantAmount),
        reason: grantReason,
      });

      if (res.data.success) {
        showToast(`🎉 Granted ${grantAmount} credits to ${selectedUser.email}`, 'success');
        setSelectedUser(null);
        fetchAdminData();
        if (onRefreshCredits) onRefreshCredits();
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to grant credits', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Clean / Delete ALL developer support messages from database
  const handleClearAllSupportMessages = async () => {
    try {
      setClearingMessages(true);
      const res = await api.delete('/api/support/admin');
      if (res.data.success) {
        showToast('🗑️ All developer support messages have been cleared from database', 'success');
        setSupportMessages([]);
        setShowClearConfirmModal(false);
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to clear messages from database', 'error');
    } finally {
      setClearingMessages(false);
    }
  };

  // Delete a single support message by ID
  const handleDeleteSingleMessage = async (id) => {
    try {
      const res = await api.delete(`/api/support/admin/${id}`);
      if (res.data.success) {
        showToast('Message deleted', 'success');
        setSupportMessages((prev) => prev.filter((m) => m.id !== id));
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to delete message', 'error');
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.name && u.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div>
      {/* Header Bar */}
      <div className="card-header-title" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <ShieldCheck size={22} color="var(--primary)" />
          <span>Admin Control Dashboard</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            className="btn btn-secondary"
            onClick={fetchAdminData}
            style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem' }}
            title="Refresh Dashboard Data"
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Sub Navigation Tabs (User Directory vs Inbox) */}
      <div className="source-toggle-group" style={{ marginBottom: '1.5rem' }}>
        <button
          type="button"
          className={`source-toggle-btn ${activeSubTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('users')}
        >
          <Users size={16} />
          <span>User Directory & Credits</span>
        </button>

        <button
          type="button"
          className={`source-toggle-btn ${activeSubTab === 'inbox' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('inbox')}
          style={{ position: 'relative' }}
        >
          <MessageSquare size={16} />
          <span>Inbox (Developer Support)</span>
          {supportMessages.length > 0 && (
            <span
              style={{
                background: 'var(--primary)',
                color: '#ffffff',
                fontSize: '0.7rem',
                fontWeight: 700,
                borderRadius: '12px',
                padding: '0.1rem 0.45rem',
                marginLeft: '0.35rem',
              }}
            >
              {supportMessages.length}
            </span>
          )}
        </button>
      </div>

      {/* System Analytics Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
        <div style={{ background: 'var(--primary-light)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(99, 102, 241, 0.25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
            <Users size={18} />
            <span>Total Registered Users</span>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {stats ? stats.totalUsers : 0}
          </div>
        </div>

        <div style={{ background: 'var(--accent-light)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--accent-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
            <Sparkles size={18} />
            <span>Active Distributed Credits</span>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {stats ? stats.totalActiveCredits : 0}
          </div>
        </div>

        <div style={{ background: 'rgba(16, 185, 129, 0.12)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
            <Presentation size={18} />
            <span>Total Slides Generated</span>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {stats ? stats.totalSlidesGenerated : 0}
          </div>
        </div>

        <div style={{ background: 'rgba(139, 92, 246, 0.12)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
            <MessageSquare size={18} />
            <span>Support Inbox (Live)</span>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {supportMessages.length}
          </div>
        </div>
      </div>

      {/* TAB 1: USER DIRECTORY & CREDITS */}
      {activeSubTab === 'users' && (
        <>
          <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
              <Search size={17} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-control"
                style={{ paddingLeft: '2.5rem' }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search users by name or email..."
              />
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem 0' }}>
              <div className="spinner" style={{ width: '28px', height: '28px', margin: '0 auto 1rem' }} />
              <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>Loading user directory...</div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem 1rem', background: 'var(--bg-body)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--bg-card-border)' }}>
              <Users size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.75rem', opacity: 0.6 }} />
              <p style={{ fontSize: '0.92rem', fontWeight: 500 }}>No users found matching "{search}"</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid var(--bg-card-border)' }}>
              <table className="preview-table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th>User Profile</th>
                    <th>Current Balance</th>
                    <th>Total Slides</th>
                    <th>Joined Date</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          {u.picture ? (
                            <img src={u.picture} alt="Avatar" style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid var(--primary-light)' }} />
                          ) : (
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
                              {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                          )}
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>{u.name}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700, color: 'var(--accent)', fontSize: '0.92rem' }}>
                          <Sparkles size={14} />
                          {u.credits} Credits
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                          {u.totalSlidesGenerated} slides
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => handleFetchUserHistory(u)}
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', minHeight: '34px' }}
                            title="View user credit transaction history"
                          >
                            <History size={14} />
                            <span>Credit History</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => {
                              setSelectedUser(u);
                              setGrantAmount(50);
                              setGrantReason('Admin Bonus Grant');
                            }}
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', minHeight: '34px' }}
                          >
                            <PlusCircle size={14} />
                            <span>Add Credits</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* TAB 2: INBOX (DEVELOPER SUPPORT MESSAGES) */}
      {activeSubTab === 'inbox' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>Developer Support Inbox</span>
                <span style={{ fontSize: '0.7rem', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', padding: '0.15rem 0.5rem', borderRadius: '12px', fontWeight: 700 }}>
                  LIVE REAL-TIME
                </span>
              </h3>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Uni-directional user support messages updated live without refreshing
              </p>
            </div>

            {supportMessages.length > 0 && (
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => setShowClearConfirmModal(true)}
                style={{ padding: '0.45rem 0.95rem', fontSize: '0.85rem' }}
                title="Delete all messages / reset inbox in database"
              >
                <Trash2 size={16} />
                <span>Delete All / Reset Inbox</span>
              </button>
            )}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem 0' }}>
              <div className="spinner" style={{ width: '28px', height: '28px', margin: '0 auto 1rem' }} />
              <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>Loading support inbox...</div>
            </div>
          ) : supportMessages.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3.5rem 1rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--bg-card-border)' }}>
              <MessageSquare size={40} color="var(--text-muted)" style={{ margin: '0 auto 0.85rem', opacity: 0.5 }} />
              <h4 style={{ margin: '0 0 0.35rem', color: 'var(--text-main)', fontSize: '1.05rem' }}>Inbox is clean</h4>
              <p style={{ fontSize: '0.88rem', margin: 0 }}>No developer support messages in database.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {supportMessages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--bg-card-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.25rem',
                    position: 'relative',
                    transition: 'var(--transition-fast)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.85rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {msg.userPicture ? (
                        <img src={msg.userPicture} alt="Avatar" style={{ width: '38px', height: '38px', borderRadius: '50%', border: '2px solid var(--primary-light)' }} />
                      ) : (
                        <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
                          {msg.userName ? msg.userName.charAt(0).toUpperCase() : 'U'}
                        </div>
                      )}
                      <div>
                        {/* Display send by email format as requested: send by email: <email> */}
                        <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Mail size={15} />
                          <span>send by email: {msg.userEmail}</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                          Sender: {msg.userName}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Clock size={14} />
                        <span>
                          {new Date(msg.createdAt).toLocaleDateString()} {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => handleDeleteSingleMessage(msg.id)}
                        style={{ color: 'var(--danger)', padding: '0.35rem' }}
                        title="Delete this message"
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  </div>

                  <div
                    style={{
                      background: 'var(--bg-body)',
                      padding: '1rem 1.15rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--bg-card-border)',
                      fontSize: '0.92rem',
                      color: 'var(--text-main)',
                      lineHeight: '1.5',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {msg.message}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* User Credit & Transaction History Modal (Admin Viewing User History) */}
      {historyUser && (
        <div className="modal-backdrop" onClick={() => setHistoryUser(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px', width: '92%' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ background: 'var(--primary-light)', padding: '0.5rem', borderRadius: '10px', color: 'var(--primary)' }}>
                  <History size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-main)', fontWeight: 600 }}>
                    Credit History for {historyUser.name}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Target email: {historyUser.email}
                  </p>
                </div>
              </div>
              <button className="icon-btn" onClick={() => setHistoryUser(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ paddingTop: '1rem' }}>
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.08), rgba(139, 92, 246, 0.08))',
                  border: '1px solid rgba(79, 70, 229, 0.25)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1.25rem',
                }}
              >
                <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Current User Balance</span>
                <span style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Sparkles size={20} />
                  {historyBalance} Credits
                </span>
              </div>

              {loadingHistory ? (
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                  <div className="spinner" style={{ margin: '0 auto 0.5rem' }} />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Loading transaction logs...</span>
                </div>
              ) : historyTransactions.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', background: 'var(--bg-body)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--bg-card-border)' }}>
                  <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)', fontWeight: 500 }}>No transaction history recorded for this user.</span>
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
                      {historyTransactions.map((tx, idx) => {
                        const isPositive = tx.credits > 0;
                        return (
                          <tr key={tx.id || idx}>
                            <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                              {new Date(tx.date).toLocaleDateString()} {new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  fontSize: '0.72rem',
                                  fontWeight: '700',
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
                                  <ArrowUpRight size={11} />
                                ) : tx.type === 'bonus' ? (
                                  <Gift size={11} />
                                ) : (
                                  <ArrowDownRight size={11} />
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
                                fontSize: '0.88rem',
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setHistoryUser(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Support Messages Confirmation Modal */}
      {showClearConfirmModal && (
        <div className="modal-backdrop" onClick={() => setShowClearConfirmModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ background: 'rgba(239, 68, 68, 0.15)', padding: '0.5rem', borderRadius: '10px', color: 'var(--danger)' }}>
                  <Trash2 size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-main)', fontWeight: 600 }}>Reset Inbox</h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Clean all messages from database
                  </p>
                </div>
              </div>
              <button className="icon-btn" onClick={() => setShowClearConfirmModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '1rem 0' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', margin: 0, lineHeight: 1.5 }}>
                Are you sure you want to delete all <strong>{supportMessages.length}</strong> support messages from the database? This operation will reset the inbox completely and cannot be undone.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowClearConfirmModal(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleClearAllSupportMessages}
                disabled={clearingMessages}
              >
                {clearingMessages ? <div className="spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> : <Trash2 size={16} />}
                <span>Delete All Messages</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grant Credits Modal */}
      {selectedUser && (
        <div className="modal-backdrop" onClick={() => setSelectedUser(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ background: 'var(--accent-light)', padding: '0.5rem', borderRadius: '10px', color: 'var(--accent)' }}>
                  <Sparkles size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-main)', fontWeight: 600 }}>Grant Credits directly</h3>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Target: {selectedUser.email}
                  </p>
                </div>
              </div>
              <button className="icon-btn" onClick={() => setSelectedUser(null)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleGrantCredits} style={{ paddingTop: '1rem' }}>
              <div className="form-group">
                <label>Quick Preset Amounts</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
                  {[10, 50, 100, 250, 500].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      className="btn"
                      onClick={() => setGrantAmount(amt)}
                      style={{
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.82rem',
                        background: grantAmount === amt ? 'var(--accent)' : 'var(--bg-body)',
                        color: grantAmount === amt ? '#ffffff' : 'var(--text-main)',
                        border: '1px solid var(--bg-card-border)',
                        minHeight: '34px',
                      }}
                    >
                      +{amt} Credits
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="grant-amount-input">Custom Credit Amount *</label>
                <input
                  type="number"
                  id="grant-amount-input"
                  className="form-control"
                  value={grantAmount}
                  onChange={(e) => setGrantAmount(e.target.value)}
                  min="1"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="grant-reason-input">Reason / Note</label>
                <input
                  type="text"
                  id="grant-reason-input"
                  className="form-control"
                  value={grantReason}
                  onChange={(e) => setGrantReason(e.target.value)}
                  placeholder="e.g. Admin Promotional Bonus"
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedUser(null)}>
                  Cancel
                </button>

                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <div className="spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> : <Sparkles size={16} />}
                  <span>Grant {grantAmount} Credits</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
