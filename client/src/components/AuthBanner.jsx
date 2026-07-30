import React from 'react';
import { LogIn } from 'lucide-react';

export default function AuthBanner() {
  return (
    <div className="glass-card auth-banner">
      <h1>Automate Your Google Slides Presentations</h1>
      <p>
        Bulk replace <code>{'{{placeholders}}'}</code> in any Google Slides template using data from Google Sheets or a JSON array instantly.
      </p>
      <a
        href="/auth/google"
        className="btn btn-primary"
        style={{ fontSize: '1.05rem', padding: '0.9rem 1.8rem', display: 'inline-flex' }}
      >
        <LogIn size={20} />
        <span>Sign in with Google to Continue</span>
      </a>
    </div>
  );
}
