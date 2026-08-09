import React from 'react';
import { Presentation, Table, Code, Sparkles, Clock, User, X, Layers, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ activeTab, setActiveTab, isOpen, onClose, onOpenAccount }) {
  const { user, authenticated, logout } = useAuth();

  const navItems = [
    {
      id: 'sheet',
      label: 'Google Sheets',
      sublabel: 'Import tabular data',
      icon: Table,
    },
    {
      id: 'json',
      label: 'JSON Array',
      sublabel: 'Upload or paste JSON',
      icon: Code,
    },
    {
      id: 'gemini',
      label: 'Gemini AI',
      sublabel: 'Generate slides with AI',
      icon: Sparkles,
      badge: 'AI Powered',
    },
    {
      id: 'history',
      label: 'Generation History',
      sublabel: 'View past presentations',
      icon: Clock,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Sidebar Brand Header */}
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="sidebar-brand-icon">
              <Presentation size={22} />
            </div>
            <div className="sidebar-brand-text">
              <h2>Slide Wave AI</h2>
              <span>Bulk Presentation Generator</span>
            </div>
          </div>

          <button
            className="sidebar-close-btn"
            onClick={onClose}
            aria-label="Close Sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Menu Section */}
        <nav className="sidebar-nav">
          <div className="sidebar-nav-title">COMPOSER MODES</div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab(item.id);
                  if (onClose) onClose();
                }}
              >
                <div className="nav-item-icon">
                  <Icon size={19} />
                </div>
                <div className="nav-item-content">
                  <span className="nav-item-label">{item.label}</span>
                  <span className="nav-item-sublabel">{item.sublabel}</span>
                </div>
                {item.badge && <span className="nav-item-badge">{item.badge}</span>}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer User Account info */}
        {authenticated && user && (
          <div className="sidebar-footer">
            <div className="sidebar-user-card" onClick={onOpenAccount}>
              {user.picture ? (
                <img src={user.picture} alt="Avatar" className="sidebar-user-avatar" />
              ) : (
                <div className="sidebar-user-avatar-placeholder">
                  <User size={18} />
                </div>
              )}
              <div className="sidebar-user-info">
                <span className="user-name">{user.name || 'User Account'}</span>
                <span className="user-email">{user.email || 'Google Account'}</span>
              </div>
              <button
                type="button"
                className="sidebar-logout-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  logout();
                }}
                title="Logout"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
