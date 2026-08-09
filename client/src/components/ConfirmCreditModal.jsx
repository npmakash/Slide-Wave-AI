import React from 'react';
import { X, Sparkles, AlertTriangle, CheckCircle2, Rocket, CreditCard } from 'lucide-react';
import { useCredits } from '../context/CreditContext';

export default function ConfirmCreditModal({ estimate, onConfirm, onCancel, onBuyCredits }) {
  const { rowCount, requiredCredits, availableCredits, hasEnough, deficit } = estimate;
  const remaining = availableCredits - requiredCredits;

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '480px', width: '90%' }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ background: 'var(--primary-light)', padding: '0.5rem', borderRadius: '10px', color: 'var(--primary)' }}>
              <Sparkles size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)', fontWeight: 600 }}>Confirm Slide Generation</h3>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                Review credit calculation before generating slides
              </p>
            </div>
          </div>
          <button className="icon-btn" onClick={onCancel}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ paddingTop: '1rem' }}>
          {/* Summary Breakdown Box */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid var(--bg-card-border)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              marginBottom: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem', fontSize: '0.9rem', fontWeight: 500 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Total Data Rows / Slides:</span>
              <strong style={{ color: 'var(--text-main)' }}>{rowCount} Slides</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem', fontSize: '0.9rem', fontWeight: 500 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Required Credits (1 slide = 1 credit):</span>
              <strong style={{ color: 'var(--accent)' }}>{requiredCredits} Credits</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem', fontSize: '0.9rem', fontWeight: 500 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Your Available Balance:</span>
              <strong style={{ color: 'var(--primary)' }}>{availableCredits} Credits</strong>
            </div>

            <hr style={{ borderColor: 'var(--bg-card-border)', margin: '0.8rem 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.95rem' }}>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                {hasEnough ? 'Balance After Generation:' : 'Credit Deficit:'}
              </span>
              <strong
                style={{
                  color: hasEnough ? 'var(--success)' : 'var(--danger)',
                  fontSize: '1.05rem',
                }}
              >
                {hasEnough ? `${remaining} Credits` : `-${deficit} Credits Needed`}
              </strong>
            </div>
          </div>

          {!hasEnough ? (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 'var(--radius-md)',
                padding: '0.85rem 1rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                marginBottom: '1.25rem',
              }}
            >
              <AlertTriangle size={20} color="var(--danger)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '0.85rem', color: '#991b1b', fontWeight: 500 }}>
                <strong>Insufficient Credits!</strong> You need <strong>{deficit} more credits</strong> to generate these {rowCount} slides. Please top up your balance to continue.
              </div>
            </div>
          ) : (
            <div
              style={{
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: 'var(--radius-md)',
                padding: '0.85rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '1.25rem',
              }}
            >
              <CheckCircle2 size={20} color="var(--success)" style={{ flexShrink: 0 }} />
              <div style={{ fontSize: '0.85rem', color: '#065f46', fontWeight: 500 }}>
                You have sufficient credits! Clicking confirm will deduct {requiredCredits} credits and begin generation.
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              Cancel
            </button>

            {hasEnough ? (
              <button type="button" className="btn btn-primary" onClick={onConfirm}>
                <Rocket size={16} />
                <span>Confirm & Generate ({requiredCredits} Credits)</span>
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  onCancel();
                  onBuyCredits();
                }}
              >
                <CreditCard size={16} />
                <span>Buy Credits Now</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
