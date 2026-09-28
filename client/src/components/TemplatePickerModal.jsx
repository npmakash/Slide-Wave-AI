import React, { useState, useEffect } from 'react';
import { LayoutTemplate, User, Plus, Trash2, Check, ExternalLink, X, Search, Globe, Sparkles, AlertCircle, Pencil } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

const DEFAULT_PUBLIC_TEMPLATES = [
  {
    id: 'tpl_default_cert',
    title: 'Modern Certificate Template',
    tag: 'Certificate',
    description: 'Clean certificate layout with {{name}}, {{city}}, and {{score}} placeholders.',
    imageUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80',
    templateUrl: 'https://docs.google.com/presentation/d/1ecwiq4ZlzlQv8kapXBWEXViSXxhDIPnsgmT7F4-EpPo/edit?slide=id.g3f804837050_2_45#slide=id.g3f804837050_2_45',
    isPersonal: false,
  },
  {
    id: 'tpl_default_quiz',
    title: 'AI Quiz & Flashcards Template',
    tag: 'Quiz',
    description: 'Interactive quiz slide with {{number}}, {{question}}, {{optionA}}, {{optionB}}, {{optionC}}, {{optionD}}.',
    imageUrl: 'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?auto=format&fit=crop&w=600&q=80',
    templateUrl: 'https://docs.google.com/presentation/d/1ecwiq4ZlzlQv8kapXBWEXViSXxhDIPnsgmT7F4-EpPo/edit?slide=id.g3f804837050_2_45#slide=id.g3f804837050_2_45',
    isPersonal: false,
  },
];

export default function TemplatePickerModal({ currentSelectedUrl, onSelectTemplate, onClose }) {
  const [activeTab, setActiveTab] = useState('public'); // 'public' | 'personal'
  const [publicTemplates, setPublicTemplates] = useState(DEFAULT_PUBLIC_TEMPLATES);
  const [personalTemplates, setPersonalTemplates] = useState([]);
  const [loadingPublic, setLoadingPublic] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Add / Edit Personal Template Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newTag, setNewTag] = useState('Custom');
  const [newDesc, setNewDesc] = useState('');

  const { showToast } = useToast();

  // Load public and personal templates on mount
  useEffect(() => {
    fetchPublicTemplates();
    loadPersonalTemplates();
  }, []);

  const fetchPublicTemplates = async () => {
    try {
      setLoadingPublic(true);
      const res = await api.get('/api/templates');
      if (res.data.success && res.data.templates?.length > 0) {
        const mapped = res.data.templates.map(t => ({
          ...t,
          isPersonal: false,
        }));
        setPublicTemplates(mapped);
      }
    } catch (err) {
      // Fallback to defaults if backend fails
      setPublicTemplates(DEFAULT_PUBLIC_TEMPLATES);
    } finally {
      setLoadingPublic(false);
    }
  };

  const loadPersonalTemplates = () => {
    try {
      const stored = localStorage.getItem('slidewave_personal_templates');
      if (stored) {
        const parsed = JSON.parse(stored);
        setPersonalTemplates(parsed);
      }
    } catch (e) {
      console.error('Failed to load personal templates', e);
    }
  };

  const savePersonalTemplatesToStorage = (updated) => {
    try {
      localStorage.setItem('slidewave_personal_templates', JSON.stringify(updated));
      setPersonalTemplates(updated);
    } catch (e) {
      showToast('Failed to save to local storage', 'error');
    }
  };

  const handleStartEdit = (template) => {
    setEditingTemplateId(template.id);
    setNewTitle(template.title);
    setNewUrl(template.templateUrl);
    setNewTag(template.tag || 'Custom');
    setNewDesc(template.description || '');
    setShowAddForm(true);
  };

  const handleCancelForm = () => {
    setShowAddForm(false);
    setEditingTemplateId(null);
    setNewTitle('');
    setNewUrl('');
    setNewTag('Custom');
    setNewDesc('');
  };

  const handleSaveOrUpdatePersonalTemplate = (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newUrl.trim()) {
      showToast('Please enter both Title and Google Slides Template URL', 'warning');
      return;
    }

    if (!newUrl.includes('docs.google.com/presentation')) {
      showToast('Please enter a valid Google Presentation URL (docs.google.com/presentation/d/.../edit)', 'warning');
      return;
    }

    if (editingTemplateId) {
      // Update existing personal template
      const updated = personalTemplates.map((t) => {
        if (t.id === editingTemplateId) {
          return {
            ...t,
            title: newTitle.trim(),
            templateUrl: newUrl.trim(),
            tag: newTag.trim() || 'Custom',
            description: newDesc.trim(),
          };
        }
        return t;
      });

      savePersonalTemplatesToStorage(updated);
      showToast(`Updated personal template "${newTitle.trim()}"`, 'success');
    } else {
      // Create new personal template
      const newItem = {
        id: `custom_${Date.now()}`,
        title: newTitle.trim(),
        templateUrl: newUrl.trim(),
        tag: newTag.trim() || 'Custom',
        description: newDesc.trim() || 'Custom personal template link',
        imageUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=600&q=80',
        isPersonal: true,
        createdAt: new Date().toISOString(),
      };

      const updated = [newItem, ...personalTemplates];
      savePersonalTemplatesToStorage(updated);
      showToast(`Saved personal template "${newItem.title}"`, 'success');
    }

    handleCancelForm();
  };

  const handleDeletePersonalTemplate = (id, title) => {
    if (window.confirm(`Are you sure you want to remove "${title}" from your personal templates?`)) {
      const updated = personalTemplates.filter(t => t.id !== id);
      savePersonalTemplatesToStorage(updated);
      showToast(`Removed "${title}"`, 'info');
      if (editingTemplateId === id) {
        handleCancelForm();
      }
    }
  };

  const handleSelect = (template) => {
    onSelectTemplate(template);
    onClose();
  };

  const filteredPublic = publicTemplates.filter(t =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.tag?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPersonal = personalTemplates.filter(t =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.tag?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '840px', width: '92%', maxHeight: '88vh', display: 'flex', flexDirection: 'column', padding: '1.75rem' }}>
        
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LayoutTemplate size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                Choose Slide Template
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                Select from Public templates gallery or your Personal custom template links
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Switcher & Search Bar Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          {/* Public vs Personal Section Tabs */}
          <div style={{ display: 'flex', background: 'var(--bg-body)', padding: '0.3rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--bg-card-border)' }}>
            <button
              type="button"
              onClick={() => setActiveTab('public')}
              style={{
                padding: '0.5rem 1.1rem',
                fontSize: '0.88rem',
                fontWeight: 600,
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                cursor: 'pointer',
                background: activeTab === 'public' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'public' ? '#ffffff' : 'var(--text-secondary)',
                transition: 'var(--transition-fast)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
              }}
            >
              <Globe size={16} />
              <span>Public Templates ({publicTemplates.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('personal')}
              style={{
                padding: '0.5rem 1.1rem',
                fontSize: '0.88rem',
                fontWeight: 600,
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                cursor: 'pointer',
                background: activeTab === 'personal' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'personal' ? '#ffffff' : 'var(--text-secondary)',
                transition: 'var(--transition-fast)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
              }}
            >
              <User size={16} />
              <span>Personal Templates ({personalTemplates.length})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="input-with-icon" style={{ minWidth: '220px', flex: 1, maxWidth: '300px' }}>
            <Search size={16} className="input-icon" />
            <input
              type="text"
              className="form-control"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: '0.45rem 0.85rem 0.45rem 2.3rem', fontSize: '0.85rem' }}
            />
          </div>
        </div>

        {/* Modal Main Content Container */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.25rem' }}>
          
          {/* PUBLIC SECTION */}
          {activeTab === 'public' && (
            <div>
              {loadingPublic ? (
                <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                  <div className="spinner" style={{ width: '32px', height: '32px', margin: '0 auto' }} />
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>Loading public templates...</p>
                </div>
              ) : filteredPublic.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'var(--bg-body)', borderRadius: 'var(--radius-md)', border: '1px dotted var(--bg-card-border)' }}>
                  <AlertCircle size={32} color="var(--text-muted)" style={{ marginBottom: '0.5rem' }} />
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>No public templates found matching your search.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
                  {filteredPublic.map((tpl) => {
                    const isSelected = currentSelectedUrl === tpl.templateUrl;
                    return (
                      <div
                        key={tpl.id}
                        style={{
                          background: 'var(--bg-body)',
                          border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--bg-card-border)'}`,
                          borderRadius: 'var(--radius-md)',
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column',
                          transition: 'var(--transition-fast)',
                          boxShadow: isSelected ? '0 0 14px rgba(99, 102, 241, 0.25)' : 'none',
                        }}
                      >
                        {/* Thumbnail image header */}
                        <div style={{ height: '120px', position: 'relative', overflow: 'hidden', background: '#111' }}>
                          <img
                            src={tpl.imageUrl}
                            alt={tpl.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => {
                              e.target.src = 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80';
                            }}
                          />
                          <span style={{
                            position: 'absolute',
                            top: '8px',
                            left: '8px',
                            background: 'rgba(0, 0, 0, 0.75)',
                            color: '#fff',
                            backdropFilter: 'blur(4px)',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '12px',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                          }}>
                            {tpl.tag || 'Public'}
                          </span>

                          {isSelected && (
                            <span style={{
                              position: 'absolute',
                              top: '8px',
                              right: '8px',
                              background: 'var(--primary)',
                              color: '#fff',
                              padding: '0.25rem 0.6rem',
                              borderRadius: '12px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                            }}>
                              <Check size={12} /> Active
                            </span>
                          )}
                        </div>

                        {/* Content */}
                        <div style={{ padding: '0.9rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          <div>
                            <h4 style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 0.35rem 0' }}>
                              {tpl.title}
                            </h4>
                            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 0.85rem 0', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {tpl.description || 'Google Slides presentation template.'}
                            </p>
                          </div>

                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              type="button"
                              className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                              onClick={() => handleSelect(tpl)}
                              style={{ flex: 1, padding: '0.45rem', fontSize: '0.82rem' }}
                            >
                              {isSelected ? 'Selected' : 'Use Template'}
                            </button>
                            <a
                              href={tpl.templateUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-secondary"
                              style={{ padding: '0.45rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              title="Open in Google Slides"
                            >
                              <ExternalLink size={14} />
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* PERSONAL SECTION */}
          {activeTab === 'personal' && (
            <div>
              {/* Add Custom Template Link CTA Button */}
              {!showAddForm ? (
                <div style={{ marginBottom: '1.25rem' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setShowAddForm(true)}
                    style={{ padding: '0.55rem 1.1rem', fontSize: '0.88rem' }}
                  >
                    <Plus size={16} />
                    <span>Save New Personal Template Link</span>
                  </button>
                </div>
              ) : (
                /* Add / Edit Personal Template Form */
                <form onSubmit={handleSaveOrUpdatePersonalTemplate} style={{ background: 'var(--bg-body)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--primary-light)', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Sparkles size={16} color="var(--primary)" /> {editingTemplateId ? 'Edit Personal Template' : 'Save Custom Template Link'}
                    </h3>
                    <button type="button" onClick={handleCancelForm} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                      <X size={18} />
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem', marginBottom: '0.85rem' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                        Template Title *
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. My Company Pitch Deck"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                        Category Tag
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Pitch Deck, Invoice, Cert"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: '0.85rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                      Google Slides Template URL *
                    </label>
                    <input
                      type="url"
                      className="form-control"
                      placeholder="https://docs.google.com/presentation/d/1abc.../edit"
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                      Short Description (Optional)
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Placeholders used: {{name}}, {{date}}, etc."
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn-secondary" onClick={handleCancelForm} style={{ padding: '0.45rem 0.9rem', fontSize: '0.82rem' }}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" style={{ padding: '0.45rem 1rem', fontSize: '0.82rem' }}>
                      <Check size={15} /> {editingTemplateId ? 'Update Template' : 'Save Template'}
                    </button>
                  </div>
                </form>
              )}

              {filteredPersonal.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1.5rem', background: 'var(--bg-body)', borderRadius: 'var(--radius-md)', border: '1px stroke var(--bg-card-border)' }}>
                  <User size={36} color="var(--primary)" style={{ opacity: 0.8, marginBottom: '0.75rem' }} />
                  <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                    No Personal Custom Templates Saved Yet
                  </h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto 1.25rem auto' }}>
                    Save your custom Google Slides presentation links here so you can reuse them anytime with a single click.
                  </p>
                  {!showAddForm && (
                    <button type="button" className="btn btn-secondary" onClick={() => setShowAddForm(true)} style={{ padding: '0.45rem 1rem', fontSize: '0.82rem' }}>
                      <Plus size={15} /> Add Your First Template
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
                  {filteredPersonal.map((tpl) => {
                    const isSelected = currentSelectedUrl === tpl.templateUrl;
                    return (
                      <div
                        key={tpl.id}
                        style={{
                          background: 'var(--bg-body)',
                          border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--bg-card-border)'}`,
                          borderRadius: 'var(--radius-md)',
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column',
                          transition: 'var(--transition-fast)',
                          boxShadow: isSelected ? '0 0 14px rgba(99, 102, 241, 0.25)' : 'none',
                        }}
                      >
                        <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                              <span style={{
                                background: 'var(--accent-light)',
                                color: 'var(--accent)',
                                padding: '0.15rem 0.55rem',
                                borderRadius: '12px',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                              }}>
                                {tpl.tag || 'Personal'}
                              </span>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(tpl)}
                                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.2rem' }}
                                  title="Edit personal template"
                                >
                                  <Pencil size={14} color="var(--primary)" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeletePersonalTemplate(tpl.id, tpl.title)}
                                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.2rem' }}
                                  title="Delete personal template"
                                >
                                  <Trash2 size={14} color="var(--danger)" />
                                </button>
                              </div>
                            </div>

                            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 0.35rem 0' }}>
                              {tpl.title}
                            </h4>
                            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 0.85rem 0', lineHeight: 1.4, wordBreak: 'break-all' }}>
                              {tpl.description || tpl.templateUrl}
                            </p>
                          </div>

                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              type="button"
                              className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                              onClick={() => handleSelect(tpl)}
                              style={{ flex: 1, padding: '0.45rem', fontSize: '0.82rem' }}
                            >
                              {isSelected ? 'Selected' : 'Use Template'}
                            </button>
                            <a
                              href={tpl.templateUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-secondary"
                              style={{ padding: '0.45rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              title="Open in Google Slides"
                            >
                              <ExternalLink size={14} />
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
