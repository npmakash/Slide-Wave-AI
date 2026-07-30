/**
 * public/js/progress.js
 * Live job status polling, progress bar update, and cancellation
 */

const ProgressTracker = {
  activeJobId: null,
  pollInterval: null,
  latestResult: null,

  startPolling(jobId) {
    this.activeJobId = jobId;
    this.latestResult = null;

    const card = document.getElementById('progress-card');
    const fill = document.getElementById('progress-bar-fill');
    const statusText = document.getElementById('progress-status');
    const downloadBar = document.getElementById('progress-download-bar');

    card.style.display = 'block';
    card.scrollIntoView({ behavior: 'smooth' });

    fill.style.width = '5%';
    statusText.textContent = 'Initializing...';
    downloadBar.style.display = 'none';

    if (this.pollInterval) clearInterval(this.pollInterval);

    this.pollInterval = setInterval(() => this.checkStatus(), 1500);
  },

  async checkStatus() {
    if (!this.activeJobId) return;

    try {
      const res = await Utils.apiRequest(`/api/status/${this.activeJobId}`);
      const { status, progress, result, error } = res;

      const fill = document.getElementById('progress-bar-fill');
      const statusText = document.getElementById('progress-status');
      const titleText = document.getElementById('progress-title');
      const downloadBar = document.getElementById('progress-download-bar');
      const openSlidesLink = document.getElementById('link-open-slides');

      if (progress) {
        statusText.textContent = progress.message;
        if (progress.total > 0) {
          const pct = Math.min(Math.round((progress.current / progress.total) * 100), 98);
          fill.style.width = `${pct}%`;
        }
      }

      if (status === 'done') {
        clearInterval(this.pollInterval);
        fill.style.width = '100%';
        titleText.textContent = '✨ Generation Complete!';
        Utils.showToast('Presentation generated successfully!', 'success');

        this.latestResult = result;
        if (result) {
          if (openSlidesLink && result.presentationUrl) {
            openSlidesLink.href = result.presentationUrl;
          }
          downloadBar.style.display = 'flex';
          this.enableFormDownloadButtons(result.presentationId);
        }
      } else if (status === 'error') {
        clearInterval(this.pollInterval);
        fill.style.backgroundColor = '#ef4444';
        titleText.textContent = '❌ Generation Failed';
        Utils.showToast(error || 'Generation failed', 'error');
      } else if (status === 'cancelled') {
        clearInterval(this.pollInterval);
        fill.style.backgroundColor = '#f59e0b';
        titleText.textContent = '⚠️ Generation Cancelled';
        Utils.showToast('Job was cancelled', 'warning');
      }
    } catch (err) {
      console.error('Progress polling error:', err);
    }
  },

  async cancelCurrentJob() {
    if (!this.activeJobId) return;
    try {
      await Utils.apiRequest(`/api/cancel/${this.activeJobId}`, { method: 'POST' });
      Utils.showToast('Cancellation requested...', 'info');
    } catch (err) {
      Utils.showToast(err.message, 'error');
    }
  },

  enableFormDownloadButtons(presentationId) {
    // Enable PDF and Images buttons on both forms
    ['sheet-pdf', 'sheet-images', 'json-pdf', 'json-images'].forEach((id) => {
      const btn = document.getElementById(`btn-${id}`);
      if (btn) {
        btn.disabled = false;
        btn.dataset.presentationId = presentationId;
      }
    });
  },

  downloadLogs() {
    if (!this.activeJobId) return;
    window.location.href = `/api/logs/${this.activeJobId}`;
  },
};
