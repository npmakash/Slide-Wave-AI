import React from 'react';
import { Presentation, ShieldCheck, FileCheck, Info, Mail, Heart } from 'lucide-react';

export default function Footer({ onNavigatePage, onOpenSupport }) {
  return (
    <footer style={{
      borderTop: '1px solid var(--bg-card-border)',
      background: 'var(--bg-card)',
      padding: '1.75rem 1.5rem',
      marginTop: 'auto',
      transition: 'background-color 0.3s ease, border-color 0.3s ease',
    }}>
      <div style={{
        maxWidth: '980px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1.25rem',
      }}>
        {/* Brand & Copyright */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{
            width: '30px',
            height: '30px',
            borderRadius: '8px',
            background: 'var(--primary-gradient)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Presentation size={17} />
          </div>
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.2 }}>
              Slide Wave AI
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              © {new Date().getFullYear()} Slide Wave AI. All rights reserved.
            </div>
          </div>
        </div>

        {/* Public Navigation Links */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1.25rem',
          flexWrap: 'wrap',
        }}>
          <button
            type="button"
            onClick={() => onNavigatePage('/privacy')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: '0.84rem',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              transition: 'var(--transition-fast)',
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = 'var(--primary)')}
            onMouseOut={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
          >
            <ShieldCheck size={15} />
            <span>Privacy Policy</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigatePage('/terms')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: '0.84rem',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              transition: 'var(--transition-fast)',
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = 'var(--primary)')}
            onMouseOut={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
          >
            <FileCheck size={15} />
            <span>Terms of Service</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigatePage('/about')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: '0.84rem',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              transition: 'var(--transition-fast)',
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = 'var(--primary)')}
            onMouseOut={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
          >
            <Info size={15} />
            <span>About Us</span>
          </button>

          <button
            type="button"
            onClick={onOpenSupport}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--primary)',
              fontSize: '0.84rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              transition: 'var(--transition-fast)',
            }}
            onMouseOver={(e) => (e.currentTarget.style.opacity = '0.8')}
            onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
          >
            <Mail size={15} />
            <span>Developer Support</span>
          </button>
        </div>
      </div>
    </footer>
  );
}
