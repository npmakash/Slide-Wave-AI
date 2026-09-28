import React from 'react';
import { LogIn, Presentation, Sparkles, Table, Zap } from 'lucide-react';

export default function AuthBanner({ onNavigatePage, onOpenSupport }) {
  return (
    <div className="glass-card auth-banner">
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'var(--primary-light)', color: 'var(--primary)', padding: '0.35rem 0.85rem', borderRadius: '20px', fontSize: '0.82rem', fontWeight: 600, marginBottom: '1.25rem' }}>
        <Sparkles size={14} />
        <span>Automated Google Slides Bulk Generator</span>
      </div>

      <h1>Automate Your Presentations in Seconds</h1>
      <p>
        Bulk replace <code>{'{{placeholders}}'}</code> in any Google Slides template using data from Google Sheets, JSON arrays, or Gemini AI prompts instantly.
      </p>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
          <Table size={16} color="var(--primary)" />
          <span>Google Sheets Sync</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
          <Sparkles size={16} color="var(--accent)" />
          <span>Gemini AI Prompts</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
          <Zap size={16} color="var(--success)" />
          <span>PDF & Image Downloads</span>
        </div>
      </div>

      <div style={{ marginBottom: '2.5rem' }}>
        <a
          href="/auth/google"
          className="btn btn-primary"
          style={{ fontSize: '1.05rem', padding: '0.9rem 2rem', display: 'inline-flex' }}
        >
          <LogIn size={20} />
          <span>Sign in with Google to Continue</span>
        </a>
      </div>

      {/* Guest Navigation Links */}
      <div style={{ borderTop: '1px solid var(--bg-card-border)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => onNavigatePage && onNavigatePage('/privacy')}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '0.88rem', cursor: 'pointer', fontWeight: 500 }}
        >
          Privacy Policy
        </button>
        <button
          type="button"
          onClick={() => onNavigatePage && onNavigatePage('/terms')}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '0.88rem', cursor: 'pointer', fontWeight: 500 }}
        >
          Terms of Service
        </button>
        <button
          type="button"
          onClick={() => onNavigatePage && onNavigatePage('/about')}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '0.88rem', cursor: 'pointer', fontWeight: 500 }}
        >
          About Us
        </button>
        <button
          type="button"
          onClick={onOpenSupport}
          style={{ background: 'transparent', border: 'none', color: 'var(--primary)', fontSize: '0.88rem', cursor: 'pointer', fontWeight: 600 }}
        >
          Developer Support
        </button>
      </div>
    </div>
  );
}
