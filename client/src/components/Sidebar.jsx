import React from 'react';
import { Presentation, Table, Code, Sparkles, Grid, Clock, User, X, LogOut, Sun, Moon, ShieldCheck, Users, LayoutTemplate, Layers } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Sidebar({ activeTab, setActiveTab, isOpen, onClose, onOpenAccount }) {
  const { user, authenticated, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const isAdmin = Boolean(user && user.isAdmin);

  const regularNavItems = [
    {
      id: 'sheet',
      label: 'Sheets & CSV',
      sublabel: 'Import Google Sheet or CSV file',
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
      id: 'multi-item-beta',
      label: 'Multi-Item Batch',
      sublabel: 'Grid / Multi-Placeholder (12 per slide)',
      icon: Grid,
      badge: 'BETA',
    },
    {
      id: 'templates',
      label: 'Slide Templates',
      sublabel: 'Browse pre-made templates',
      icon: LayoutTemplate,
      badge: 'NEW',
    },
    {
      id: 'history',
      label: 'Generation History',
      sublabel: 'View past presentations',
      icon: Clock,
    },
  ];

  const adminNavItems = [
    {
      id: 'admin-users',
      label: 'User Directory & Credits',
      sublabel: 'Manage users & add credits',
      icon: Users,
      badge: 'ADMIN',
    },
    {
      id: 'admin-templates',
      label: 'Manage Templates',
      sublabel: 'Create & edit slide templates',
      icon: Layers,
    },
    {
      id: 'history',
      label: 'All Presentations History',
      sublabel: 'View generated files',
      icon: Clock,
    },
  ];

  const navItems = isAdmin ? adminNavItems : regularNavItems;

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
              {isAdmin ? <ShieldCheck size={22} /> : <Presentation size={22} />}
            </div>
            <div className="sidebar-brand-text">
              <h2>Slide Wave AI</h2>
              <span>{isAdmin ? 'Admin Console' : 'Bulk Presentation Generator'}</span>
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
          <div className="sidebar-nav-title">
            {isAdmin ? 'ADMIN CONTROL PANELS' : 'COMPOSER MODES'}
          </div>
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

          <div className="sidebar-nav-title" style={{ marginTop: '1.5rem' }}>PREFERENCES</div>
          <button
            type="button"
            className="sidebar-nav-item"
            onClick={toggleTheme}
          >
            <div className="nav-item-icon">
              {isDark ? <Sun size={19} color="#f59e0b" /> : <Moon size={19} color="#4f46e5" />}
            </div>
            <div className="nav-item-content">
              <span className="nav-item-label">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
              <span className="nav-item-sublabel">Switch app color theme</span>
            </div>
          </button>
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
                <span className="user-name">
                  {user.name || 'User Account'} {isAdmin ? '👑' : ''}
                </span>
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
