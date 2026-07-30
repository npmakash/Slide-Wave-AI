/**
 * public/js/app.js
 * Main SPA initialization, tab router, and event bindings
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Check auth status
  const isAuthenticated = await Auth.checkStatus();

  if (isAuthenticated) {
    // Initialize modals & tabs
    PreviewModal.init();
    HistoryManager.init();
    SheetTab.init();
    JsonTab.init();

    // Tab switching event listener
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetTabId = btn.dataset.tab;

        // Toggle button active states
        tabButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        // Toggle tab content active states
        document.querySelectorAll('.tab-content').forEach((content) => {
          content.classList.remove('active');
        });
        document.getElementById(targetTabId)?.classList.add('active');
      });
    });

    // Logout button binding
    document.getElementById('btn-logout')?.addEventListener('click', () => Auth.logout());

    // Cancel job button binding
    document.getElementById('btn-cancel-job')?.addEventListener('click', () => {
      ProgressTracker.cancelCurrentJob();
    });

    // Download log button binding
    document.getElementById('btn-download-logs')?.addEventListener('click', () => {
      ProgressTracker.downloadLogs();
    });

    // Download buttons inside job progress panel
    document.getElementById('btn-job-download-pdf')?.addEventListener('click', () => {
      if (ProgressTracker.latestResult?.presentationId) {
        window.location.href = `/api/download/pdf/${ProgressTracker.latestResult.presentationId}`;
      }
    });

    document.getElementById('btn-job-download-images')?.addEventListener('click', () => {
      if (ProgressTracker.latestResult?.presentationId) {
        window.location.href = `/api/download/images/${ProgressTracker.latestResult.presentationId}`;
      }
    });
  }

  // Handle URL error parameters (e.g. ?error=oauth_denied)
  const urlParams = new URLSearchParams(window.location.search);
  const errorParam = urlParams.get('error');
  const loginParam = urlParams.get('login');

  if (errorParam) {
    Utils.showToast(`Authentication issue: ${errorParam}`, 'error');
    window.history.replaceState({}, document.title, window.location.pathname);
  } else if (loginParam === 'success') {
    Utils.showToast('Successfully logged in with Google!', 'success');
    window.history.replaceState({}, document.title, window.location.pathname);
  }
});
