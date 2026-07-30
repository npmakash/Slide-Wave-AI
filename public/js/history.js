/**
 * public/js/history.js
 * Generation history list rendering, search/filter, and bulk deletion modal
 */

const HistoryManager = {
  modal: null,

  init() {
    this.modal = document.getElementById('history-modal');
    document.getElementById('btn-history-trigger')?.addEventListener('click', () => this.open());
    document.getElementById('modal-close-history')?.addEventListener('click', () => this.close());
    document.getElementById('history-search')?.addEventListener('input', (e) => this.fetchAndRender(e.target.value));
    document.getElementById('btn-history-clear-all')?.addEventListener('click', () => this.handleClearAll());
  },

  open() {
    if (this.modal) {
      this.modal.classList.add('active');
      this.fetchAndRender();
    }
  },

  close() {
    if (this.modal) this.modal.classList.remove('active');
  },

  async fetchAndRender(search = '') {
    const container = document.getElementById('history-list-container');
    container.innerHTML = `<div class="spinner" style="margin: 2rem auto;"></div>`;

    try {
      const query = search ? `?search=${encodeURIComponent(search)}` : '';
      const res = await Utils.apiRequest(`/api/history${query}`);
      const history = res.history || [];

      if (history.length === 0) {
        container.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding: 2rem 0;">No generation history found.</p>`;
        return;
      }

      let html = '';
      for (const item of history) {
        const dateStr = new Date(item.createdAt).toLocaleString();
        html += `
          <div class="history-item">
            <div class="history-info">
              <h4>${item.outputName}</h4>
              <p>Source: <strong>${item.sourceType.toUpperCase()}</strong> | Slides: ${item.slideCount} | ${dateStr}</p>
            </div>
            <div style="display: flex; gap: 0.5rem;">
              <a href="${item.presentationUrl}" target="_blank" class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;">
                Open
              </a>
              <button class="btn btn-danger" onclick="HistoryManager.deleteItem('${item.id}')" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;">
                Delete
              </button>
            </div>
          </div>
        `;
      }

      container.innerHTML = html;
    } catch (err) {
      container.innerHTML = `<p style="color: var(--danger); text-align: center;">Failed to load history: ${err.message}</p>`;
    }
  },

  async deleteItem(id) {
    if (!confirm('Delete this history record?')) return;
    try {
      await Utils.apiRequest(`/api/history/${id}?deleteDriveFile=true`, { method: 'DELETE' });
      Utils.showToast('History item deleted', 'info');
      this.fetchAndRender();
    } catch (err) {
      Utils.showToast(err.message, 'error');
    }
  },

  async handleClearAll() {
    if (!confirm('Clear all generation history? This will remove history records.')) return;
    try {
      const res = await Utils.apiRequest('/api/history');
      const ids = (res.history || []).map((h) => h.id);
      if (ids.length > 0) {
        await Utils.apiRequest('/api/history/bulk-delete', {
          method: 'POST',
          body: JSON.stringify({ ids, deleteDriveFiles: false }),
        });
      }
      Utils.showToast('All history cleared', 'info');
      this.fetchAndRender();
    } catch (err) {
      Utils.showToast(err.message, 'error');
    }
  },
};
