import React, { useState, useEffect, useCallback } from 'react';
import { Users, Sparkles, Presentation, Search, PlusCircle, ShieldCheck, X, RefreshCw, Layers } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

export default function AdminDashboard({ onRefreshCredits }) {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null); // User object for modal
  const [grantAmount, setGrantAmount] = useState(50);
  const [grantReason, setGrantReason] = useState('Admin Grant');
  const [submitting, setSubmitting] = useState(false);

  const { showToast } = useToast();

  const fetchAdminData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, usersRes] = await Promise.all([
        api.get('/api/admin/stats'),
        api.get('/api/admin/users'),
      ]);

      if (statsRes.data.success) setStats(statsRes.data.stats);
      if (usersRes.data.success) setUsers(usersRes.data.users || []);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to load Admin Dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

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

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.name && u.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div>
      <div className="card-header-title" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <ShieldCheck size={22} color="var(--primary)" />
          <span>Admin Control Dashboard</span>
        </div>
        <button
          className="btn btn-secondary"
          onClick={fetchAdminData}
          style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem' }}
          title="Refresh Data"
        >
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>
      </div>

      {/* System Analytics Cards */}
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

        <div style={{ background: '#ecfdf5', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid #a7f3d0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#047857', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
            <Presentation size={18} />
            <span>Total Slides Generated</span>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {stats ? stats.totalSlidesGenerated : 0}
          </div>
        </div>
      </div>

      {/* Users Search Bar & Table */}
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
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => {
                        setSelectedUser(u);
                        setGrantAmount(50);
                        setGrantReason('Admin Bonus Grant');
                      }}
                      style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem', minHeight: '34px' }}
                    >
                      <PlusCircle size={14} />
                      <span>Add Credits</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
