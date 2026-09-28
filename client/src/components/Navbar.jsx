import React from 'react';
import { Menu, Sparkles, PlusCircle, User, Table, Code, Grid, Clock, Sun, Moon, ShieldCheck, Users, LayoutTemplate, Layers, FileCheck, Info, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCredits } from '../context/CreditContext';
import { useTheme } from '../context/ThemeContext';

export default function Navbar({ activeTab, onToggleMobileSidebar, onOpenBuyCredits, onOpenAccount, onOpenSupport }) {
  const { user, authenticated } = useAuth();
  const { balance } = useCredits();
  const { isDark, toggleTheme } = useTheme();

  const isAdmin = Boolean(user && user.isAdmin);

  const getSectionInfo = () => {
    switch (activeTab) {
      case 'admin-users':
        return { title: 'Admin Directory & Credit Manager', icon: Users };
      case 'admin-templates':
        return { title: 'Admin Template Manager', icon: Layers };
      case 'sheet':
        return { title: 'Google Sheet & CSV Generator', icon: Table };
      case 'json':
        return { title: 'JSON Array Generator', icon: Code };
      case 'gemini':
        return { title: 'Gemini AI Generator', icon: Sparkles };
      case 'multi-item-beta':
        return { title: 'Multi-Item Batch Generator (Beta)', icon: Grid };
      case 'templates':
        return { title: 'Slide Templates Gallery', icon: LayoutTemplate };
      case 'history':
        return { title: isAdmin ? 'All Presentation Logs' : 'Generation History', icon: Clock };
      case 'privacy':
        return { title: 'Privacy Policy', icon: ShieldCheck };
      case 'terms':
        return { title: 'Terms of Service', icon: FileCheck };
      case 'about':
        return { title: 'About Slide Wave AI', icon: Info };
      default:
        return { title: isAdmin ? 'Admin Console' : 'Slide Wave AI', icon: ShieldCheck };
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
          {isAdmin && (
            <span style={{ fontSize: '0.72rem', background: 'var(--primary-light)', color: 'var(--primary)', padding: '0.15rem 0.55rem', borderRadius: '12px', fontWeight: 700 }}>
              ADMIN MODE
            </span>
          )}
        </div>
      </div>

      <div className="user-nav">
        {/* Developer Support Trigger for Guest & Authenticated Users */}
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onOpenSupport}
          title="Developer Support"
          style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
        >
          <Mail size={15} color="var(--primary)" />
          <span className="hide-mobile">Support</span>
        </button>

        {/* Dark / Light Mode Switch Button */}
        <button
          type="button"
          className="theme-toggle-btn"
          onClick={toggleTheme}
          title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
          aria-label="Toggle Theme"
        >
          {isDark ? <Sun size={19} color="#f59e0b" /> : <Moon size={19} color="#4f46e5" />}
        </button>

        {authenticated && user && (
          <>
            {/* Header Navbar Credits Pill & Top-up CTA */}
            {!isAdmin && (
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
            )}

            {/* User Profile Avatar */}
            <div
              className="navbar-user-trigger"
              onClick={onOpenAccount}
              title="View Profile & Account Information"
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
