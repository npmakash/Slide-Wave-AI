/**
 * public/js/preview.js
 * Modal rendering live placeholder detection and sheet column mapping preview
 */

const PreviewModal = {
  modal: null,

  init() {
    this.modal = document.getElementById('preview-modal');
    document.getElementById('modal-close-preview')?.addEventListener('click', () => this.close());
  },

  open() {
    if (this.modal) this.modal.classList.add('active');
  },

  close() {
    if (this.modal) this.modal.classList.remove('active');
  },

  async loadAndRender(templateUrl, sheetUrl) {
    this.open();
    const body = document.getElementById('preview-modal-body');
    body.innerHTML = `<div class="spinner" style="margin: 2rem auto;"></div><p style="text-align:center; color: var(--text-muted);">Detecting template placeholders...</p>`;

    try {
      const res = await Utils.apiRequest('/api/detect-placeholders', {
        method: 'POST',
        body: JSON.stringify({ templateUrl }),
      });

      const { templateName, placeholders } = res;

      let html = `
        <div style="margin-bottom: 1.5rem;">
          <h4>📄 Template: <span style="color: var(--primary);">${templateName}</span></h4>
          <p class="help-text">Detected ${placeholders.length} unique placeholders in template.</p>
        </div>
      `;

      if (placeholders.length === 0) {
        html += `<p style="color: var(--warning);">⚠️ No {{placeholders}} found in this presentation template.</p>`;
      } else {
        html += `
          <table class="preview-table">
            <thead>
              <tr>
                <th>Placeholder</th>
                <th>Raw Tag</th>
                <th>Detected Type</th>
              </tr>
            </thead>
            <tbody>
        `;

        for (const p of placeholders) {
          const typeBadge =
            p.type === 'qrcode'
              ? '<span class="badge badge-warning">QR Code</span>'
              : p.type === 'date'
              ? '<span class="badge badge-success">Date</span>'
              : p.type === 'number'
              ? '<span class="badge badge-success">Number</span>'
              : '<span class="badge badge-success">Text</span>';

          html += `
            <tr>
              <td><code>${p.key}</code></td>
              <td><code>${p.raw}</code></td>
              <td>${typeBadge}</td>
            </tr>
          `;
        }

        html += `</tbody></table>`;
      }

      body.innerHTML = html;
    } catch (err) {
      body.innerHTML = `
        <div style="color: var(--danger); text-align: center; padding: 2rem 0;">
          <p>❌ Failed to load preview:</p>
          <p style="margin-top: 0.5rem; font-weight: 600;">${err.message}</p>
        </div>
      `;
    }
  },
};
