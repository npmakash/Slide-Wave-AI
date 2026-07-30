/**
 * public/js/jsonTab.js
 * Tab 2 (JSON) drag & drop, validation, and submission handlers
 */

const JsonTab = {
  init() {
    const form = document.getElementById('json-form');
    const dragDropZone = document.getElementById('drag-drop-zone');
    const fileInput = document.getElementById('json-file-input');
    const btnPdf = document.getElementById('btn-json-pdf');
    const btnImages = document.getElementById('btn-json-images');

    form?.addEventListener('submit', (e) => this.handleSubmit(e));

    dragDropZone?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', (e) => this.handleFileSelect(e));

    // Drag & Drop listeners
    ['dragenter', 'dragover'].forEach((eventName) => {
      dragDropZone?.addEventListener(eventName, (e) => {
        e.preventDefault();
        dragDropZone.classList.add('drag-over');
      });
    });

    ['dragleave', 'drop'].forEach((eventName) => {
      dragDropZone?.addEventListener(eventName, (e) => {
        e.preventDefault();
        dragDropZone.classList.remove('drag-over');
      });
    });

    dragDropZone?.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files.length > 0) this.readJsonFile(files[0]);
    });

    btnPdf?.addEventListener('click', (e) => {
      const presentationId = e.currentTarget.dataset.presentationId;
      if (presentationId) window.location.href = `/api/download/pdf/${presentationId}`;
    });

    btnImages?.addEventListener('click', (e) => {
      const presentationId = e.currentTarget.dataset.presentationId;
      if (presentationId) window.location.href = `/api/download/images/${presentationId}`;
    });
  },

  handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) this.readJsonFile(file);
  },

  readJsonFile(file) {
    if (!file.name.endsWith('.json')) {
      Utils.showToast('Please select a valid .json file', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        document.getElementById('json-input').value = JSON.stringify(parsed, null, 2);
        Utils.showToast(`Loaded JSON file with ${Array.isArray(parsed) ? parsed.length : 1} items`, 'success');
      } catch (err) {
        Utils.showToast('Invalid JSON file format', 'error');
      }
    };
    reader.readAsText(file);
  },

  async handleSubmit(e) {
    e.preventDefault();

    const templateUrl = document.getElementById('json-template-url').value.trim();
    const jsonString = document.getElementById('json-input').value.trim();
    const outputName = document.getElementById('json-output-name').value.trim();

    let data;
    try {
      data = JSON.parse(jsonString);
      if (!Array.isArray(data)) {
        throw new Error('JSON input must be an array of objects.');
      }
    } catch (err) {
      Utils.showToast(`Invalid JSON: ${err.message}`, 'error');
      return;
    }

    const btnSubmit = document.getElementById('btn-json-generate');
    Utils.setButtonLoading(btnSubmit, true);

    try {
      const res = await Utils.apiRequest('/api/generate-json', {
        method: 'POST',
        body: JSON.stringify({
          templateUrl,
          outputName,
          data,
        }),
      });

      Utils.showToast('JSON generation started!', 'success');
      ProgressTracker.startPolling(res.jobId);
    } catch (err) {
      Utils.showToast(err.message, 'error');
    } finally {
      Utils.setButtonLoading(btnSubmit, false);
    }
  },
};
