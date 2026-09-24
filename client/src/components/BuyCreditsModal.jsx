import React, { useState } from 'react';
import { X, CreditCard, Sparkles, CheckCircle, ShieldCheck } from 'lucide-react';
import { useCredits } from '../context/CreditContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function BuyCreditsModal({ onClose }) {
  const { balance, razorpayKeyId, fetchCredits } = useCredits();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loadingPkg, setLoadingPkg] = useState(null);

  const handlePurchase = async (pkgId) => {
    try {
      setLoadingPkg(pkgId);

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        showToast('Failed to load Razorpay Payment SDK. Please check your internet connection.', 'error');
        setLoadingPkg(null);
        return;
      }

      // Step 1: Create Order on backend
      const res = await api.post('/api/credits/create-order', { packageId: pkgId });
      if (!res.data.success) {
        throw new Error(res.data.error || 'Failed to create payment order');
      }

      const { orderId, amount, currency, package: pkg } = res.data;

      // Step 2: Open Razorpay Checkout overlay
      const options = {
        key: razorpayKeyId || 'rzp_test_TKXTHTnnmuJe0G',
        amount: amount,
        currency: currency,
        name: 'Slide Wave AI',
        description: `Purchase ${pkg.credits} Slide Generation Credits`,
        image: 'https://cdn-icons-png.flaticon.com/512/2991/2991201.png',
        order_id: orderId,
        prefill: {
          email: user?.email || '',
          name: user?.name || 'Valued User',
        },
        theme: {
          color: '#4f46e5',
        },
        handler: async function (response) {
          try {
            showToast('Verifying payment...', 'info');
            const verifyRes = await api.post('/api/credits/verify-payment', {
              packageId: pkgId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            if (verifyRes.data.success) {
              showToast(`🎉 Success! Added ${pkg.credits} credits to your account.`, 'success');
              await fetchCredits();
              onClose();
            } else {
              showToast(verifyRes.data.error || 'Payment verification failed', 'error');
            }
          } catch (err) {
            showToast(err.response?.data?.error || err.message || 'Payment verification failed', 'error');
          } finally {
            setLoadingPkg(null);
          }
        },
        modal: {
          ondismiss: function () {
            setLoadingPkg(null);
            showToast('Payment window closed', 'info');
          },
        },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.on('payment.failed', function (response) {
        showToast(`Payment failed: ${response.error.description}`, 'error');
        setLoadingPkg(null);
      });

      paymentObject.open();
    } catch (err) {
      showToast(err.response?.data?.error || err.message || 'Failed to initiate purchase', 'error');
      setLoadingPkg(null);
    }
  };

  const packageList = [
    { id: 'pkg_5', price: 5, credits: 10, perSlide: '₹0.50', badge: null },
    { id: 'pkg_20', price: 20, credits: 40, perSlide: '₹0.50', badge: null },
    { id: 'pkg_50', price: 50, credits: 110, perSlide: '₹0.45', badge: 'POPULAR • +10 BONUS' },
    { id: 'pkg_100', price: 100, credits: 230, perSlide: '₹0.43', badge: 'BEST VALUE • +30 BONUS' },
  ];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px', width: '90%' }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ background: 'var(--primary-light)', padding: '0.5rem', borderRadius: '10px', color: 'var(--primary)' }}>
              <CreditCard size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)', fontWeight: 600 }}>Buy Slide Generation Credits</h3>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                1 Credit = 1 Slide generated • Test Gateway (Razorpay)
              </p>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ paddingTop: '1rem' }}>
          {/* Current Balance Banner */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.08), rgba(139, 92, 246, 0.08))',
              border: '1px solid rgba(79, 70, 229, 0.25)',
              borderRadius: 'var(--radius-md)',
              padding: '0.9rem 1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.25rem',
            }}
          >
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Your Current Balance</span>
            <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Sparkles size={18} />
              {balance} Credits
            </span>
          </div>

          {/* Pricing Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            {packageList.map((pkg) => (
              <div
                key={pkg.id}
                className={`pricing-card ${pkg.badge ? 'popular' : ''}`}
              >
                {pkg.badge && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-12px',
                      right: '12px',
                      background: 'var(--primary-gradient)',
                      color: '#ffffff',
                      fontSize: '0.68rem',
                      fontWeight: 'bold',
                      padding: '0.2rem 0.65rem',
                      borderRadius: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    {pkg.badge}
                  </span>
                )}

                <div>
                  <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '0.2rem' }}>
                    ₹{pkg.price}
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: '600', color: 'var(--primary)', marginBottom: '0.35rem' }}>
                    {pkg.credits} Credits
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem', fontWeight: 500 }}>
                    {pkg.perSlide} / slide
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handlePurchase(pkg.id)}
                  disabled={loadingPkg !== null}
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                  }}
                >
                  {loadingPkg === pkg.id ? <div className="spinner" style={{ borderColor: 'rgba(255, 255, 255, 0.3)', borderTopColor: '#fff' }} /> : <CreditCard size={16} />}
                  <span>Buy Now</span>
                </button>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontSize: '0.82rem',
              color: 'var(--text-muted)',
              fontWeight: 500,
            }}
          >
            <ShieldCheck size={16} color="var(--success)" />
            <span>Secured via Razorpay Payment Gateway (Test Mode active)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
