/**
 * public/js/sheetTab.js
 * Tab 1 (Google Sheets) submission & preview handlers
 */

const SheetTab = {
  init() {
    const form = document.getElementById('sheet-form');
    const btnPreview = document.getElementById('btn-sheet-preview');
    const btnPdf = document.getElementById('btn-sheet-pdf');
    const btnImages = document.getElementById('btn-sheet-images');

    form?.addEventListener('submit', (e) => this.handleSubmit(e));
    btnPreview?.addEventListener('click', () => this.handlePreview());

    btnPdf?.addEventListener('click', (e) => {
      const presentationId = e.currentTarget.dataset.presentationId;
      if (presentationId) window.location.href = `/api/download/pdf/${presentationId}`;
    });

    btnImages?.addEventListener('click', (e) => {
      const presentationId = e.currentTarget.dataset.presentationId;
      if (presentationId) window.location.href = `/api/download/images/${presentationId}`;
    });
  },

  async handlePreview() {
    const templateUrl = document.getElementById('sheet-template-url').value.trim();
    const sheetUrl = document.getElementById('sheet-url').value.trim();

    if (!templateUrl) {
      Utils.showToast('Please enter a Template Slide URL first', 'warning');
      return;
    }

    PreviewModal.loadAndRender(templateUrl, sheetUrl);
  },

  async handleSubmit(e) {
    e.preventDefault();

    const templateUrl = document.getElementById('sheet-template-url').value.trim();
    const sheetUrl = document.getElementById('sheet-url').value.trim();
    const outputName = document.getElementById('sheet-output-name').value.trim();
    const skipEmptyRows = document.getElementById('sheet-skip-empty').checked;
    const dateFormat = document.getElementById('sheet-date-format').value;

    const btnSubmit = document.getElementById('btn-sheet-generate');
    Utils.setButtonLoading(btnSubmit, true);

    try {
      const res = await Utils.apiRequest('/api/generate-sheet', {
        method: 'POST',
        body: JSON.stringify({
          templateUrl,
          sheetUrl,
          outputName,
          skipEmptyRows,
          dateFormat,
        }),
      });

      Utils.showToast('Generation started in background!', 'success');
      ProgressTracker.startPolling(res.jobId);
    } catch (err) {
      Utils.showToast(err.message, 'error');
    } finally {
      Utils.setButtonLoading(btnSubmit, false);
    }
  },
};
