import React from 'react';
import { Presentation, Table, Code, Sparkles, Grid, Zap, Shield, Heart, ArrowLeft, Mail } from 'lucide-react';

export default function AboutPage({ onGoHome, onOpenSupport }) {
  const features = [
    {
      icon: Table,
      title: 'Google Sheet & CSV Generator',
      description: 'Automatically populate presentation templates directly from Google Sheets or CSV files with custom date formatting and row filtering.',
    },
    {
      icon: Code,
      title: 'JSON Dataset Processing',
      description: 'Upload or paste custom JSON arrays to instantly map data fields into slide placeholders.',
    },
    {
      icon: Sparkles,
      title: 'Gemini AI Slide Builder',
      description: 'Leverage Gemini AI models to turn topic prompts into structured, professionally formatted slide presentations.',
    },
    {
      icon: Grid,
      title: 'Multi-Item Batch Mode',
      description: 'Handle complex layouts requiring up to 12 items or placeholders per slide for catalog and index presentations.',
    },
  ];

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '1.5rem 0' }}>
      {/* Header section with back button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onGoHome}
          style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}
        >
          <ArrowLeft size={16} />
          <span>Back to App</span>
        </button>

        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Slide Wave AI v1.0
        </span>
      </div>

      <div className="glass-card" style={{ padding: '2.5rem' }}>
        {/* Hero title */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'var(--primary-gradient)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem auto',
            boxShadow: 'var(--shadow-glow)'
          }}>
            <Presentation size={34} />
          </div>

          <h1 style={{ fontSize: '2.2rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 0.6rem 0' }}>
            About Slide Wave AI
          </h1>
          <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', maxWidth: '620px', margin: '0 auto', lineHeight: 1.6 }}>
            The ultimate automated presentation engine to generate Google Slides at scale from spreadsheets, JSON datasets, and AI prompts.
          </p>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--bg-card-border)', margin: '2rem 0' }} />

        {/* Mission Statement */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Zap size={20} color="var(--primary)" />
            Our Mission
          </h2>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.75 }}>
            Creating presentation decks manually for hundreds of certificates, employee cards, report metrics, or catalog slides is repetitive and time-consuming. <strong>Slide Wave AI</strong> bridges your data sources directly to Google Slides presentation templates, automatically generating high-definition decks, downloadable PDF documents, and image archives in seconds.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield size={20} color="var(--primary)" />
            Core Capabilities
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.25rem' }}>
            {features.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <div
                  key={idx}
                  style={{
                    background: 'var(--bg-body)',
                    border: '1px solid var(--bg-card-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.25rem',
                    transition: 'var(--transition-fast)',
                  }}
                >
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.85rem' }}>
                    <Icon size={20} />
                  </div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 0.4rem 0' }}>
                    {feat.title}
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                    {feat.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Developer Support CTA */}
        <div style={{ background: 'var(--primary-gradient)', borderRadius: 'var(--radius-lg)', padding: '2rem', color: '#ffffff', textAlign: 'center', boxShadow: 'var(--shadow-glow)' }}>
          <h3 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>
            Need Custom Integration or Assistance?
          </h3>
          <p style={{ fontSize: '0.92rem', opacity: 0.9, maxWidth: '540px', margin: '0 auto 1.5rem auto', lineHeight: 1.6 }}>
            Our developer support team is available to assist you with API keys, custom slide templates, or bulk workflows.
          </p>

          <button
            type="button"
            className="btn"
            onClick={onOpenSupport}
            style={{
              background: '#ffffff',
              color: 'var(--primary)',
              fontWeight: 700,
              padding: '0.65rem 1.4rem',
              fontSize: '0.9rem',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(0,0,0,0.2)'
            }}
          >
            <Mail size={16} />
            <span>Open Developer Support</span>
          </button>
        </div>
      </div>
    </div>
  );
}
