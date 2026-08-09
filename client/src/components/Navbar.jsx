import React from 'react';
import { Menu, Sparkles, PlusCircle, LogOut, User, Table, Code, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCredits } from '../context/CreditContext';

export default function Navbar({ activeTab, onToggleMobileSidebar, onOpenBuyCredits, onOpenAccount }) {
  const { user, authenticated, logout } = useAuth();
  const { balance } = useCredits();

  const getSectionInfo = () => {
    switch (activeTab) {
      case 'sheet':
        return { title: 'Google Sheet Generator', icon: Table };
      case 'json':
        return { title: 'JSON Array Generator', icon: Code };
      case 'gemini':
        return { title: 'Gemini AI Generator', icon: Sparkles };
      case 'history':
        return { title: 'Generation History', icon: Clock };
      default:
        return { title: 'Presentation Generator', icon: Table };
    }
  };

  const currentSection = getSectionInfo();
  const SectionIcon = currentSection.icon;

  return (
    <header className="navbar">
      <div className="navbar-left">
        <button
          type="button"
          className="mobile-toggle-btn"
          onClick={onToggleMobileSidebar}
          aria-label="Open Sidebar"
        >
          <Menu size={20} />
        </button>

        <div className="navbar-section-title">
          <SectionIcon size={20} color="var(--primary)" />
          <span>{currentSection.title}</span>
        </div>
      </div>

      <div className="user-nav">
        {authenticated && user && (
          <>
            {/* Header Navbar Credits Pill & Top-up CTA */}
            <div
              className="credits-pill-header"
              onClick={onOpenBuyCredits}
              title="Click to Buy Credits & View Plans"
            >
              <span className="credits-pill-text">
                <Sparkles size={15} />
                <span>{balance !== undefined && balance !== null ? balance : 0} Credits</span>
              </span>

              <button type="button" className="credits-pill-btn">
                <PlusCircle size={13} />
                <span>Top Up</span>
              </button>
            </div>

            {/* User Profile Avatar */}
            <div
              className="navbar-user-trigger"
              onClick={onOpenAccount}
              title="View Profile & Credit Transactions"
            >
              {user.picture ? (
                <img src={user.picture} alt="Avatar" className="navbar-avatar" />
              ) : (
                <div className="navbar-avatar-placeholder">
                  <User size={18} />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </header>
  );
}
