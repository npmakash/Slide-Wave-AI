import React, { useState, useEffect, useCallback } from 'react';
import { Layers, Plus, Trash2, Edit3, Link, Image as ImageIcon, Tag, Type, ExternalLink, RefreshCw, X, Check } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

export default function AdminTemplateManager() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState('');
  const [tag, setTag] = useState('Certificate');
  const [imageUrl, setImageUrl] = useState('');
  const [templateUrl, setTemplateUrl] = useState('');
  const [description, setDescription] = useState('');

  const { showToast } = useToast();

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/templates');
      if (res.data.success) {
        setTemplates(res.data.templates || []);
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to fetch slide templates', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setTag('Certificate');
    setImageUrl('');
    setTemplateUrl('');
    setDescription('');
  };

  const handleStartEdit = (tpl) => {
    setEditingId(tpl.id);
    setTitle(tpl.title);
    setTag(tpl.tag || 'General');
    setImageUrl(tpl.imageUrl);
    setTemplateUrl(tpl.templateUrl);
    setDescription(tpl.description || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title || !imageUrl || !templateUrl) {
      showToast('Please fill in Title, Preview Image URL, and Google Slides URL', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      if (editingId) {
        const res = await api.put(`/api/templates/${editingId}`, {
          title,
          tag,
          imageUrl,
          templateUrl,
          description,
        });
        if (res.data.success) {
          showToast('Slide template updated successfully!', 'success');
          resetForm();
          fetchTemplates();
        }
      } else {
        const res = await api.post('/api/templates', {
          title,
          tag,
          imageUrl,
          templateUrl,
          description,
        });
        if (res.data.success) {
          showToast('New slide template created successfully!', 'success');
          resetForm();
          fetchTemplates();
        }
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to save template', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this slide template?')) return;
    try {
      await api.delete(`/api/templates/${id}`);
      showToast('Slide template deleted', 'info');
      fetchTemplates();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to delete template', 'error');
    }
  };

  return (
    <div>
      <div className="card-header-title" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Layers size={22} color="var(--primary)" />
          <span>Manage Slide Presentation Templates</span>
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

      {/* Add / Edit Form Card */}
      <div
        style={{
          background: 'var(--bg-body)',
          border: '1px solid var(--bg-card-border)',
          borderRadius: 'var(--radius-md)',
          padding: '1.35rem',
          marginBottom: '1.85rem',
        }}
      >
        <h4 style={{ margin: '0 0 1rem', fontSize: '1rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {editingId ? <Edit3 size={18} color="var(--primary)" /> : <Plus size={18} color="var(--primary)" />}
          <span>{editingId ? 'Edit Slide Template' : 'Create New Slide Template'}</span>
        </h4>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div className="form-group">
              <label htmlFor="tpl-title">
                <Type size={15} />
                <span>Template Title *</span>
              </label>
              <input
                type="text"
                id="tpl-title"
                className="form-control"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Modern Executive Pitch"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="tpl-tag">
                <Tag size={15} />
                <span>Category Tag</span>
              </label>
              <select
                id="tpl-tag"
                className="form-control"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
              >
                <option value="Certificate">Certificate</option>
                <option value="Quiz">Quiz & MCQs</option>
                <option value="Business">Business & Pitch</option>
                <option value="Report">Report & Analytics</option>
                <option value="General">General</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="tpl-image-url">
              <ImageIcon size={15} />
              <span>Preview Image URL *</span>
            </label>
            <input
              type="url"
              id="tpl-image-url"
              className="form-control"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://images.unsplash.com/photo-... or image link"
              required
            />
            <div className="help-text">Direct image URL (PNG/JPG/WebP) used for card preview thumbnail.</div>
          </div>

          <div className="form-group">
            <label htmlFor="tpl-slides-url">
              <Link size={15} />
              <span>Google Slides Template Presentation URL *</span>
            </label>
            <input
              type="url"
              id="tpl-slides-url"
              className="form-control"
              value={templateUrl}
              onChange={(e) => setTemplateUrl(e.target.value)}
              placeholder="https://docs.google.com/presentation/d/1abc.../edit"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="tpl-desc">Description</label>
            <textarea
              id="tpl-desc"
              className="form-control"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of placeholders like {{name}}, {{score}}, etc."
              style={{ minHeight: '70px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
            {editingId && (
              <button type="button" className="btn btn-secondary" onClick={resetForm}>
                <X size={15} />
                <span>Cancel Edit</span>
              </button>
            )}

            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? <div className="spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> : <Check size={16} />}
              <span>{editingId ? 'Update Template' : 'Create Template'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Templates Grid (Admin View) */}
      <h4 style={{ margin: '0 0 1rem', fontSize: '1rem', color: 'var(--text-main)' }}>
        Active Slide Templates ({templates.length})
      </h4>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 0' }}>
          <div className="spinner" style={{ width: '28px', height: '28px', margin: '0 auto 1rem' }} />
          <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>Loading templates...</div>
        </div>
      ) : templates.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem 1rem', background: 'var(--bg-body)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--bg-card-border)' }}>
          <Layers size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.75rem', opacity: 0.6 }} />
          <p style={{ fontSize: '0.92rem', fontWeight: 500 }}>No slide templates created yet.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--bg-card-border)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
              }}
            >
              <div style={{ position: 'relative', width: '100%', height: '150px', background: '#e2e8f0', overflow: 'hidden' }}>
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

              <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h5 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 0.35rem' }}>
                    {tpl.title}
                  </h5>
                  {tpl.description && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 0.75rem', lineHeight: 1.35 }}>
                      {tpl.description}
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--bg-card-border)' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleStartEdit(tpl)}
                    style={{ flex: 1, padding: '0.35rem 0.6rem', fontSize: '0.78rem', minHeight: '32px' }}
                  >
                    <Edit3 size={13} />
                    <span>Edit</span>
                  </button>

                  <a
                    href={tpl.templateUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary"
                    style={{ padding: '0.35rem 0.6rem', fontSize: '0.78rem', minHeight: '32px' }}
                    title="Open Google Slides"
                  >
                    <ExternalLink size={13} />
                  </a>

                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => handleDelete(tpl.id)}
                    style={{ padding: '0.35rem 0.6rem', fontSize: '0.78rem', minHeight: '32px' }}
                    title="Delete Template"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
