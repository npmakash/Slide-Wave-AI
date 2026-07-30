/**
 * public/js/utils.js
 * Toast notifications, UI helpers, and API request wrappers
 */

const Utils = {
  /**
   * Show Toast Notification
   * @param {string} message
   * @param {'success'|'error'|'warning'|'info'} type
   * @param {number} duration
   */
  showToast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
    };

    toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(50px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  /**
   * Async API wrapper around fetch
   * @param {string} url
   * @param {object} options
   */
  async apiRequest(url, options = {}) {
    const defaultHeaders = {
      'Content-Type': 'application/json',
    };

    const config = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...(options.headers || {}),
      },
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return data;
    } catch (err) {
      throw err;
    }
  },

  /**
   * Toggle button loading spinner state
   * @param {HTMLElement} btn
   * @param {boolean} isLoading
   * @param {string} [originalText]
   */
  setButtonLoading(btn, isLoading, originalText = '') {
    if (!btn) return;
    if (isLoading) {
      btn.dataset.originalHtml = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<div class="spinner"></div> <span>Processing...</span>`;
    } else {
      btn.disabled = false;
      btn.innerHTML = btn.dataset.originalHtml || originalText;
    }
  },
};
