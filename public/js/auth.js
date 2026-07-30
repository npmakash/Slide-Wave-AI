/**
 * public/js/auth.js
 * User authentication state management & navbar UI updates
 */

const Auth = {
  currentUser: null,

  async checkStatus() {
    try {
      const res = await Utils.apiRequest('/auth/status');
      if (res.authenticated) {
        this.currentUser = res.user;
        this.renderAuthenticated(res.user);
        return true;
      } else {
        this.renderUnauthenticated();
        return false;
      }
    } catch (err) {
      this.renderUnauthenticated();
      return false;
    }
  },

  renderAuthenticated(user) {
    document.getElementById('auth-view').style.display = 'none';
    document.getElementById('app-view').style.display = 'block';

    const userProfile = document.getElementById('user-profile');
    const userEmail = document.getElementById('user-email');
    const userAvatar = document.getElementById('user-avatar');
    const btnHistory = document.getElementById('btn-history-trigger');

    userEmail.textContent = user.email;
    if (user.picture) {
      userAvatar.src = user.picture;
      userAvatar.style.display = 'inline-block';
    } else {
      userAvatar.style.display = 'none';
    }

    userProfile.style.display = 'flex';
    if (btnHistory) btnHistory.style.display = 'inline-flex';
  },

  renderUnauthenticated() {
    document.getElementById('auth-view').style.display = 'block';
    document.getElementById('app-view').style.display = 'none';

    const userProfile = document.getElementById('user-profile');
    const btnHistory = document.getElementById('btn-history-trigger');

    if (userProfile) userProfile.style.display = 'none';
    if (btnHistory) btnHistory.style.display = 'none';
  },

  async logout() {
    try {
      await Utils.apiRequest('/auth/logout', { method: 'POST' });
      Utils.showToast('Logged out successfully', 'info');
      this.renderUnauthenticated();
    } catch (err) {
      Utils.showToast(err.message, 'error');
    }
  },
};
