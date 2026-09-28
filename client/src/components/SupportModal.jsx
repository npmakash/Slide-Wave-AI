import React, { useState } from 'react';
import { Mail, Send, X, CheckCircle, MessageSquare, User, AtSign } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function SupportModal({ onClose }) {
  const { user, authenticated } = useAuth();
  const { showToast } = useToast();

  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!message.trim()) {
      showToast('Please enter your support message.', 'warning');
      return;
    }

    if (!authenticated && !guestEmail.trim()) {
      showToast('Please enter your email address so we can respond to you.', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        message: message.trim(),
      };

      if (!authenticated) {
        payload.email = guestEmail.trim();
        payload.name = guestName.trim() || 'Guest User';
      }

      const res = await api.post('/api/support', payload);
      if (res.data.success) {
        setSentSuccess(true);
        showToast('Developer support message sent successfully!', 'success');
      }
    } catch (err) {
      showToast(err.response?.data?.error || err.message || 'Failed to send message', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Mail size={20} />
            </div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
              Developer Support
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem' }}
          >
            <X size={20} />
          </button>
        </div>

        {sentSuccess ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
            <CheckCircle size={48} color="var(--success)" style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
              Message Sent Successfully!
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              Thank you for contacting developer support. Our team will review your inquiry and respond shortly.
            </p>
            <button type="button" className="btn btn-primary" onClick={onClose} style={{ padding: '0.6rem 1.4rem' }}>
              Close Modal
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              Have questions, issues, or custom feature requests? Send a message directly to our development team.
            </p>

            {!authenticated && (
              <>
                <div className="form-group">
                  <label htmlFor="guest-name">
                    <User size={15} />
                    <span>Your Name</span>
                  </label>
                  <div className="input-with-icon">
                    <User size={16} className="input-icon" />
                    <input
                      type="text"
                      id="guest-name"
                      className="form-control"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="e.g. Alex Johnson"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="guest-email">
                    <AtSign size={15} />
                    <span>Your Contact Email *</span>
                  </label>
                  <div className="input-with-icon">
                    <AtSign size={16} className="input-icon" />
                    <input
                      type="email"
                      id="guest-email"
                      className="form-control"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      placeholder="alex@example.com"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            {authenticated && user && (
              <div style={{ background: 'var(--bg-body)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--bg-card-border)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {user.picture ? (
                  <img src={user.picture} alt="Avatar" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                ) : (
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={16} />
                  </div>
                )}
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>{user.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.email}</div>
                </div>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="support-modal-message">
                <MessageSquare size={15} />
                <span>Support Message *</span>
              </label>
              <textarea
                id="support-modal-message"
                className="form-control"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your issue or question in detail..."
                rows={4}
                required
                style={{ fontFamily: 'inherit', fontSize: '0.9rem' }}
              />
            </div>

            <div className="btn-group" style={{ justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? <div className="spinner" style={{ width: '16px', height: '16px', borderTopColor: '#fff' }} /> : <Send size={16} />}
                <span>Send Message</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
