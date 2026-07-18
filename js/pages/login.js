/**
 * Login page handler.
 *
 * Flow:
 * - Already-authenticated visitors skip straight to the dashboard.
 * - Submit: POST /api/auth/login with the trimmed/lowercased AccountID.
 *   On 200 the session is stored via MandoAuth.setAuth and the user is sent
 *   to ../index.html; on 401 an inline error is shown; network/server errors
 *   surface via MandoUi.toast.
 */

(function () {
  'use strict';

  const MandoUtils = window.MandoUtils;
  const MandoAuth = window.MandoAuth;
  const MandoApi = window.MandoApi;
  const MandoUi = window.MandoUi;

  function init() {
    // Already logged in? Go straight to the dashboard.
    if (MandoAuth && MandoAuth.isAuthenticated()) {
      window.location.replace('../index.html');
      return;
    }

    const form = MandoUtils.$('login-form');
    const input = MandoUtils.$('account-id-input');
    const toggle = MandoUtils.$('account-id-toggle');
    const errorEl = MandoUtils.$('login-error');
    const submitBtn = MandoUtils.$('login-submit');
    if (!form || !input) return;

    function showError(message) {
      if (!errorEl) return;
      errorEl.textContent = message;
      errorEl.classList.remove('hidden');
    }

    function clearError() {
      if (!errorEl) return;
      errorEl.textContent = '';
      errorEl.classList.add('hidden');
    }

    // Show/hide the AccountID (it is a credential, so it is masked by default).
    if (toggle) {
      toggle.addEventListener('click', function () {
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        toggle.setAttribute('aria-label', show ? 'Hide AccountID' : 'Show AccountID');
        const icon = toggle.querySelector('.material-symbols-outlined');
        if (icon) icon.textContent = show ? 'visibility_off' : 'visibility';
      });
    }

    input.addEventListener('input', clearError);

    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      clearError();

      const accountId = (input.value || '').trim().toLowerCase();
      if (!accountId) {
        showError('Enter your AccountID.');
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Logging in…';
      }

      const result = await MandoApi.post('/api/auth/login', { accountId: accountId });

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Log In';
      }

      if (result.ok && result.data && result.data.accessToken) {
        MandoAuth.setAuth({
          accessToken: result.data.accessToken,
          userId: result.data.userId,
          nickname: result.data.nickname,
        });
        window.location.href = '../index.html';
        return;
      }

      if (result.status === 401) {
        showError('Invalid AccountID');
        return;
      }

      if (MandoUi && typeof MandoUi.toast === 'function') {
        MandoUi.toast('Could not reach the login service. Try again.', 'error');
      } else {
        showError('Could not reach the login service. Try again.');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
