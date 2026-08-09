import React, { useState, useEffect, useCallback } from 'react';
import { X, Search, Trash2, ExternalLink, Clock, Layers } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

export default function HistoryModal({ onClose, isEmbedded = false }) {
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

  const content = (
    <div>
      <div className="card-header-title" style={{ justifyContent: 'space-between', borderBottom: isEmbedded ? undefined : undefined }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Clock size={22} color="var(--primary)" />
          <span>Generation History & Past Presentations</span>
        </div>
        {!isEmbedded && onClose && (
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        )}
      </div>

      <div style={{ marginBottom: '1.25rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={17} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-control"
            style={{ paddingLeft: '2.5rem' }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search presentations by name..."
          />
        </div>

        <button className="btn btn-danger" onClick={handleClearAll} style={{ whiteSpace: 'nowrap' }}>
          <Trash2 size={16} />
          <span>Clear All</span>
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 0' }}>
          <div className="spinner" style={{ width: '28px', height: '28px', margin: '0 auto 1rem' }} />
          <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>Loading presentation history...</div>
        </div>
      ) : history.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem 1rem', background: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px dashed var(--bg-card-border)' }}>
          <Layers size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.75rem', opacity: 0.6 }} />
          <p style={{ fontSize: '0.92rem', fontWeight: 500 }}>No generation history found.</p>
        </div>
      ) : (
        <div>
          {history.map((item) => (
            <div className="history-item" key={item.id}>
              <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: '0.98rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>{item.outputName}</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                  Source: <strong style={{ color: 'var(--primary)' }}>{item.sourceType.toUpperCase()}</strong> | Slides: {item.slideCount} | {new Date(item.createdAt).toLocaleString()}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {item.presentationUrl && (
                  <a
                    href={item.presentationUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary"
                    style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem', height: 'auto', minHeight: '34px' }}
                  >
                    <ExternalLink size={14} />
                    <span>Open Slides</span>
                  </a>
                )}

                <button
                  className="btn btn-danger"
                  onClick={() => handleDeleteItem(item.id)}
                  style={{ padding: '0.4rem 0.75rem', fontSize: '0.82rem', height: 'auto', minHeight: '34px' }}
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (isEmbedded) {
    return content;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {content}
      </div>
    </div>
  );
}
