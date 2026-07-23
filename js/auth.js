/**
 * Session/auth module for MandoLearning frontend.
 *
 * Owns the three auth-related localStorage keys and the login redirect logic:
 * - `mando.accessToken` — Bearer token issued by POST /api/auth/login (24h)
 * - `mando.userId`     — existing identity key; kept so all page handlers work unchanged
 * - `mando.displayName`— existing display key, fed from the login nickname
 *
 * `clearAuth()` deliberately touches ONLY these three keys — other `mando.*`
 * keys (e.g. `mando.docqueue`, `mando.progress.*`) may hold unsent offline data.
 *
 * Always load after `js/utils.js` (uses MandoUtils storage helpers).
 */

(function (window) {
  'use strict';

  const MandoUtils = window.MandoUtils;

  const TOKEN_KEY = 'mando.accessToken';
  const USER_ID_KEY = 'mando.userId';
  const DISPLAY_NAME_KEY = 'mando.displayName';

  function get(key) {
    return MandoUtils ? MandoUtils.safeLocalStorageGet(key) : null;
  }

  function set(key, value) {
    if (MandoUtils) MandoUtils.safeLocalStorageSet(key, value);
  }

  function remove(key) {
    if (MandoUtils) MandoUtils.safeLocalStorageRemove(key);
  }

  // ---------------------------------------------------------------------------
  // Session state
  // ---------------------------------------------------------------------------

  /** Store the session returned by POST /api/auth/login. */
  function setAuth(auth) {
    if (!auth) return;
    if (auth.accessToken) set(TOKEN_KEY, auth.accessToken);
    if (auth.userId) set(USER_ID_KEY, auth.userId);
    if (auth.nickname) set(DISPLAY_NAME_KEY, auth.nickname);
  }

  function getToken() {
    return get(TOKEN_KEY);
  }

  function getStoredUserId() {
    return get(USER_ID_KEY);
  }

  /** Clear ONLY the three auth keys. Never touches other `mando.*` keys. */
  function clearAuth() {
    remove(TOKEN_KEY);
    remove(USER_ID_KEY);
    remove(DISPLAY_NAME_KEY);
  }

  /** Token presence only; expiry is enforced server-side via 401. */
  function isAuthenticated() {
    return !!getToken();
  }

  // ---------------------------------------------------------------------------
  // Redirect helpers
  // ---------------------------------------------------------------------------

  /** True when the current URL already points at the login page. */
  function isLoginPage() {
    return /\/pages\/login\.html$/.test(window.location.pathname) ||
      /\/login\.html$/.test(window.location.pathname);
  }

  /**
   * Login page URL relative to the current page depth.
   * Pages under /pages/ use `login.html`; root pages use `pages/login.html`.
   */
  function loginPageUrl() {
    return window.location.pathname.indexOf('/pages/') !== -1
      ? 'login.html'
      : 'pages/login.html';
  }

  /**
   * Auth guard for protected pages. Redirects to the login page when no token
   * is stored. No-op on the login page itself.
   *
   * @param {'root'|'pages'} pageRoot which directory the current page lives in
   */
  function isLocalPreview() {
    const host = window.location.hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '' || window.location.protocol === 'file:';
  }

  function guard(pageRoot) {
    if (isLoginPage()) return;
    if (isAuthenticated()) return;
    // Allow ?demo=1 to bypass the login screen during local development/preview.
    if (isLocalPreview() && /[?&]demo=1(?:&|$)/.test(window.location.search)) return;
    const target = pageRoot === 'pages' ? 'login.html' : 'pages/login.html';
    window.location.replace(target);
  }

  /** Confirm, clear the session, and go back to the login page. */
  function logout() {
    const doLogout = function () {
      clearAuth();
      window.location.href = loginPageUrl();
    };

    if (window.MandoUi && typeof window.MandoUi.confirm === 'function') {
      window.MandoUi.confirm(
        'Log out?',
        'You will need your AccountID to log back in.',
        { okText: 'Log out', cancelText: 'Stay' }
      ).then(function (confirmed) {
        if (confirmed) doLogout();
      });
    } else if (window.confirm('Log out? You will need your AccountID to log back in.')) {
      doLogout();
    }
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  window.MandoAuth = {
    setAuth,
    getToken,
    getStoredUserId,
    clearAuth,
    isAuthenticated,
    guard,
    logout,
    loginPageUrl,
  };
})(window);
