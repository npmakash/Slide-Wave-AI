import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import api from '../services/api';

export default function PreviewModal({ templateUrl, onClose }) {
  const [loading, setLoading] = useState(true);
  const [templateName, setTemplateName] = useState('');
  const [placeholders, setPlaceholders] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchPlaceholders = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await api.post('/api/detect-placeholders', { templateUrl });
        if (isMounted) {
          setTemplateName(res.data.templateName);
          setPlaceholders(res.data.placeholders || []);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.response?.data?.error || err.message);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (templateUrl) fetchPlaceholders();
    return () => { isMounted = false; };
  }, [templateUrl]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>🔍 Slide & Data Mapping Preview</h3>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div className="spinner" style={{ width: '24px', height: '24px', margin: '0 auto 1rem' }} />
            <p style={{ color: 'var(--text-muted)' }}>Detecting template placeholders...</p>
          </div>
        ) : error ? (
          <div style={{ color: 'var(--danger)', textAlign: 'center', padding: '2rem 0' }}>
            <AlertCircle size={32} style={{ margin: '0 auto 0.5rem' }} />
            <p style={{ fontWeight: 600 }}>Failed to load preview:</p>
            <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>{error}</p>
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: '1.25rem' }}>
              <h4>
                📄 Template: <span style={{ color: 'var(--primary)' }}>{templateName}</span>
              </h4>
              <p className="help-text">Detected {placeholders.length} unique placeholders in template.</p>
            </div>

            {placeholders.length === 0 ? (
              <p style={{ color: 'var(--warning)', textAlign: 'center', padding: '1rem 0' }}>
                ⚠️ No {'{{placeholders}}'} found in this presentation template.
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="preview-table">
                  <thead>
                    <tr>
                      <th>Placeholder</th>
                      <th>Raw Tag</th>
                      <th>Detected Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {placeholders.map((p, idx) => (
                      <tr key={idx}>
                        <td><code>{p.key}</code></td>
                        <td><code>{p.raw}</code></td>
                        <td>
                          {p.type === 'qrcode' ? (
                            <span className="badge badge-warning">QR Code</span>
                          ) : p.type === 'date' ? (
                            <span className="badge badge-success">Date</span>
                          ) : p.type === 'number' ? (
                            <span className="badge badge-success">Number</span>
                          ) : (
                            <span className="badge badge-success">Text</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
