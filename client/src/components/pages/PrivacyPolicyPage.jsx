import React from 'react';
import { ShieldCheck, Lock, Eye, FileText, Database, Server, Mail, ArrowLeft } from 'lucide-react';

export default function PrivacyPolicyPage({ onGoHome, onOpenSupport }) {
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
            <ShieldCheck size={26} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
              Privacy Policy
            </h1>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0 }}>
              How Slide Wave AI collects, uses, and safeguards your data
            </p>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--bg-card-border)', margin: '1.5rem 0 2rem 0' }} />

        {/* Section 1: Overview */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Lock size={18} color="var(--primary)" />
            1. Information We Collect
          </h2>
          <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1rem' }}>
            Slide Wave AI is designed with a strict privacy-first principle. We only access the data essential to generate your Google Slides presentations based on your input parameters.
          </p>
          <ul style={{ paddingLeft: '1.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            <li><strong>Google Account Profile:</strong> When you sign in via Google OAuth, we receive your email address, display name, and avatar picture to authenticate your session and manage credit allocations.</li>
            <li><strong>Input Data Sources:</strong> Google Sheet URLs, CSV files, and JSON payloads provided during slide generation jobs are processed temporarily in memory to execute placeholder replacements.</li>
            <li><strong>Custom Template Links:</strong> Any public or personal Google Slides template URLs you select or save to your personal collection are stored to enable quick template selection.</li>
          </ul>
        </section>

        {/* Section 2: Use of Google API Data */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Eye size={18} color="var(--primary)" />
            2. Google Workspace API Data Usage
          </h2>
          <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '0.85rem' }}>
            Slide Wave AI complies with Google API Services User Data Policy, including Limited Use requirements:
          </p>
          <div style={{ background: 'var(--bg-body)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--bg-card-border)' }}>
            <ul style={{ paddingLeft: '1.2rem', fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0 }}>
              <li>We do <strong>not</strong> sell, transfer, or share your Google Sheets or Google Slides data with third parties or AI training platforms.</li>
              <li>Your spreadsheet data is used strictly during job execution to create output presentations in your Google Drive or export as PDF/ZIP files.</li>
              <li>Temporary presentation files stored on our server during ZIP export are automatically cleaned up after processing.</li>
            </ul>
          </div>
        </section>

        {/* Section 3: Data Security & Storage */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Server size={18} color="var(--primary)" />
            3. Data Security & Storage
          </h2>
          <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            We implement industry-standard security safeguards, including HTTPS SSL encryption for all server transactions, isolated session cookies, rate-limiting protections, and secure database connections. Generation logs store metadata (job title, slide count, timestamp) for history tracking, but never log sensitive internal file contents.
          </p>
        </section>

        {/* Section 4: Cookies & Local Storage */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Database size={18} color="var(--primary)" />
            4. Local Storage & Cookies
          </h2>
          <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Slide Wave AI utilizes browser <code>localStorage</code> to store non-sensitive user preferences such as your chosen color theme, selected default slide template, and custom personal template lists so your workflow remains seamless across visits.
          </p>
        </section>

        {/* Section 5: Contact & Developer Support */}
        <section style={{ marginTop: '2.5rem', background: 'var(--primary-light)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(99, 102, 241, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 0.25rem 0' }}>
              Have questions about your privacy?
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
              Our developer support team is available to help clarify any data practices.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={onOpenSupport}
            style={{ padding: '0.55rem 1.1rem', fontSize: '0.85rem' }}
          >
            <Mail size={16} />
            <span>Contact Support</span>
          </button>
        </section>
      </div>
    </div>
  );
}
