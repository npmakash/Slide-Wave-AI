import React from 'react';
import { Table, Code, Sparkles, Grid, LayoutTemplate, Clock, User, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function BottomNav({ activeTab, setActiveTab, onOpenAccount }) {
  const { user } = useAuth();
  const isAdmin = Boolean(user && user.isAdmin);

  const regularItems = [
    { id: 'sheet', label: 'Sheet', icon: Table },
    { id: 'json', label: 'JSON', icon: Code },
    { id: 'gemini', label: 'Gemini', icon: Sparkles },
    { id: 'multi-item-beta', label: 'Multi (Beta)', icon: Grid, isBeta: true },
    { id: 'templates', label: 'Templates', icon: LayoutTemplate },
    { id: 'history', label: 'History', icon: Clock },
  ];

  const adminItems = [
    { id: 'admin-users', label: 'Users', icon: ShieldCheck },
    { id: 'admin-templates', label: 'Templates', icon: LayoutTemplate },
    { id: 'history', label: 'History', icon: Clock },
  ];

  const items = isAdmin ? adminItems : regularItems;

  const handleItemClick = (id) => {
    setActiveTab(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-container">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`bottom-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => handleItemClick(item.id)}
            >
              <div className="bottom-nav-icon-wrapper">
                <Icon size={20} />
                {item.isBeta && <span className="bottom-nav-beta-dot" title="Beta Feature" />}
              </div>
              <span className="bottom-nav-label">{item.label}</span>
            </button>
          );
        })}

        <button
          type="button"
          className="bottom-nav-item"
          onClick={onOpenAccount}
        >
          <div className="bottom-nav-icon-wrapper">
            <User size={20} />
          </div>
          <span className="bottom-nav-label">Account</span>
        </button>
      </div>
    </nav>
  );
}
