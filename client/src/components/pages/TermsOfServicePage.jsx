import React from 'react';
import { FileCheck, AlertCircle, Sparkles, RefreshCw, Mail, ArrowLeft, Layers } from 'lucide-react';

export default function TermsOfServicePage({ onGoHome, onOpenSupport }) {
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
          Last Updated: September 2026
        </span>
      </div>

      <div className="glass-card" style={{ padding: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'var(--primary-light)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <FileCheck size={26} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
              Terms of Service
            </h1>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0 }}>
              Guidelines, rules, and conditions for using Slide Wave AI
            </p>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--bg-card-border)', margin: '1.5rem 0 2rem 0' }} />

        {/* Section 1: Acceptable Use */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Layers size={18} color="var(--primary)" />
            1. Acceptance of Terms & Services
          </h2>
          <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            By accessing or using Slide Wave AI, you agree to be bound by these Terms of Service. Slide Wave AI provides automated Google Slides presentation generation tools via Google Sheets, CSV uploads, JSON datasets, and AI algorithms.
          </p>
        </section>

        {/* Section 2: Account & Credits Policy */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Sparkles size={18} color="var(--primary)" />
            2. Generation Credits & Usage Policies
          </h2>
          <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '0.85rem' }}>
            Slide Wave AI operates on a credit-based resource system to ensure high server performance and fair usage:
          </p>
          <ul style={{ paddingLeft: '1.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            <li>Generating presentations consumes credits based on dataset size, number of generated slides, and export formats.</li>
            <li>Credits purchased or granted to user accounts are non-transferable and subject to workspace usage policies.</li>
            <li>In the event of a failed job or server error, used credits are automatically refunded or adjusted upon system error verification.</li>
          </ul>
        </section>

        {/* Section 3: Template Integration & Content Ownership */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <RefreshCw size={18} color="var(--primary)" />
            3. Presentation Content & Google Slides Templates
          </h2>
          <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            You retain 100% ownership of your input spreadsheet data and generated presentations. When using custom Google Slides templates, you warrant that you have appropriate edit and view access rights to the target presentation documents. Slide Wave AI is not responsible for copyright violations arising from user-supplied templates or images.
          </p>
        </section>

        {/* Section 4: Prohibited Actions */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <AlertCircle size={18} color="var(--danger)" />
            4. Prohibited Conduct & System Security
          </h2>
          <div style={{ background: 'rgba(239, 68, 68, 0.08)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-main)', lineHeight: 1.6, margin: 0 }}>
              Users are strictly prohibited from attempting automated API scraping, abusing rate limits, injecting malicious payloads into template placeholders, or attempting unauthorized access to admin functionalities. Accounts engaging in malicious activity will be suspended immediately.
            </p>
          </div>
        </section>

        {/* Section 5: Support & Contact */}
        <section style={{ marginTop: '2.5rem', background: 'var(--bg-body)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--bg-card-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 0.25rem 0' }}>
              Questions about these Terms?
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
              Reach out to our developer support team directly for clarification.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={onOpenSupport}
            style={{ padding: '0.55rem 1.1rem', fontSize: '0.85rem' }}
          >
            <Mail size={16} />
            <span>Developer Support</span>
          </button>
        </section>
      </div>
    </div>
  );
}
