import React from 'react';
import { Presentation, Clock, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ onOpenHistory }) {
  const { user, authenticated, logout } = useAuth();

  return (
    <header className="navbar">
      <div className="brand">
        <span className="brand-icon">
          <Presentation size={24} />
        </span>
        <span>Google Slides Bulk Generator</span>
      </div>

      <div className="user-nav">
        {authenticated && user && (
          <>
            <button
              className="btn btn-secondary"
              onClick={onOpenHistory}
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
            >
              <Clock size={16} />
              <span>History</span>
            </button>

            <div className="user-profile">
              {user.picture && <img src={user.picture} alt="Avatar" />}
              <span className="user-email-text" style={{ display: 'none' }}>
                {user.email}
              </span>
              <button
                className="btn btn-secondary"
                onClick={logout}
                title="Logout"
                style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
              >
                <LogOut size={16} />
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
