import React, { useState, useEffect, useCallback } from 'react';
import { LayoutTemplate, Sparkles, ExternalLink, ArrowRight, RefreshCw, Check } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

export default function TemplateGallery({ onSelectTemplate }) {
  const [templates, setTemplates] = useState([]);
  const [activeFilter, setActiveFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  const { showToast } = useToast();

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/templates');
      if (res.data.success) {
        setTemplates(res.data.templates || []);
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to load slide templates', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const categories = ['All', ...new Set(templates.map((t) => t.tag || 'General'))];

  const filteredTemplates = activeFilter === 'All'
    ? templates
    : templates.filter((t) => (t.tag || 'General') === activeFilter);

  const handleUseTemplate = (tpl) => {
    onSelectTemplate(tpl.templateUrl);
    showToast(`✨ Selected "${tpl.title}" template! URL pre-filled.`, 'success');
  };

  return (
    <div>
      <div className="card-header-title" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <LayoutTemplate size={22} color="var(--primary)" />
          <span>Curated Google Slides Presentation Templates</span>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={fetchTemplates}
          style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem' }}
        >
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>
      </div>

      <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginBottom: '1.25rem', lineHeight: 1.4 }}>
        Select any pre-designed template below. Clicking <strong>"Use Template"</strong> will automatically pre-fill the Template URL into your presentation generator tool.
      </p>

      {/* Category Filter Pills */}
      {categories.length > 1 && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              className="btn"
              onClick={() => setActiveFilter(cat)}
              style={{
                padding: '0.35rem 0.85rem',
                fontSize: '0.82rem',
                borderRadius: '20px',
                minHeight: '34px',
                background: activeFilter === cat ? 'var(--primary)' : 'var(--bg-body)',
                color: activeFilter === cat ? '#ffffff' : 'var(--text-main)',
                border: '1px solid var(--bg-card-border)',
                fontWeight: activeFilter === cat ? 600 : 500,
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 0' }}>
          <div className="spinner" style={{ width: '28px', height: '28px', margin: '0 auto 1rem' }} />
          <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>Loading template gallery...</div>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem 1rem', background: 'var(--bg-body)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--bg-card-border)' }}>
          <LayoutTemplate size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.75rem', opacity: 0.6 }} />
          <p style={{ fontSize: '0.92rem', fontWeight: 500 }}>No templates found in this category.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {filteredTemplates.map((tpl) => (
            <div
              key={tpl.id}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--bg-card-border)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
            >
              <div style={{ position: 'relative', width: '100%', height: '160px', background: '#e2e8f0', overflow: 'hidden' }}>
                <img
                  src={tpl.imageUrl}
                  alt={tpl.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80';
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    top: '10px',
                    left: '10px',
                    background: 'var(--primary)',
                    color: '#ffffff',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.6rem',
                    borderRadius: '12px',
                    textTransform: 'uppercase',
                  }}
                >
                  {tpl.tag || 'General'}
                </span>
              </div>

              <div style={{ padding: '1.1rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h5 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 0.4rem' }}>
                    {tpl.title}
                  </h5>
                  {tpl.description && (
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 0.85rem', lineHeight: 1.35 }}>
                      {tpl.description}
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.85rem' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleUseTemplate(tpl)}
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    <Sparkles size={15} />
                    <span>Use Template</span>
                  </button>

                  <a
                    href={tpl.templateUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary"
                    style={{ padding: '0.4rem 0.65rem' }}
                    title="Open Preview in Google Slides"
                  >
                    <ExternalLink size={15} />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
