import React, { useState, useEffect, useCallback } from 'react';
import { X, Search, Trash2, ExternalLink } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

export default function HistoryModal({ onClose }) {
  const [history, setHistory] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const { showToast } = useToast();

  const fetchHistory = useCallback(async (query = '') => {
    try {
      setLoading(true);
      const url = query ? `/api/history?search=${encodeURIComponent(query)}` : '/api/history';
      const res = await api.get(url);
      setHistory(res.data.history || []);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to load history', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchHistory(search);
  }, [search, fetchHistory]);

  const handleDeleteItem = async (id) => {
    if (!window.confirm('Delete this history record?')) return;
    try {
      await api.delete(`/api/history/${id}?deleteDriveFile=true`);
      showToast('History item deleted', 'info');
      fetchHistory(search);
    } catch (err) {
      showToast(err.response?.data?.error || err.message, 'error');
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Clear all generation history?')) return;
    try {
      const ids = history.map((h) => h.id);
      if (ids.length > 0) {
        await api.post('/api/history/bulk-delete', { ids, deleteDriveFiles: false });
      }
      showToast('All history cleared', 'info');
      fetchHistory();
    } catch (err) {
      showToast(err.response?.data?.error || err.message, 'error');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>🕒 Generation History</h3>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-control"
              style={{ paddingLeft: '2.2rem' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name..."
            />
          </div>

          <button className="btn btn-danger" onClick={handleClearAll} style={{ whiteSpace: 'nowrap', padding: '0.5rem 0.9rem' }}>
            <Trash2 size={16} />
            <span>Clear All</span>
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div className="spinner" style={{ width: '24px', height: '24px', margin: '0 auto 1rem' }} />
          </div>
        ) : history.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0' }}>
            No generation history found.
          </p>
        ) : (
          <div>
            {history.map((item) => (
              <div className="history-item" key={item.id}>
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: '0.95rem', marginBottom: '0.2rem' }}>{item.outputName}</h4>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Source: <strong style={{ color: 'var(--primary)' }}>{item.sourceType.toUpperCase()}</strong> | Slides: {item.slideCount} | {new Date(item.createdAt).toLocaleString()}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  {item.presentationUrl && (
                    <a
                      href={item.presentationUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                    >
                      <ExternalLink size={14} />
                      <span>Open</span>
                    </a>
                  )}

                  <button
                    className="btn btn-danger"
                    onClick={() => handleDeleteItem(item.id)}
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
