/**
 * Shared UI primitives for MandoLearning pages.
 *
 * Keeps toast notifications, confirm dialogs, and other reusable overlays in
 * one place so page handlers do not re-implement them.
 */

(function (window) {
  'use strict';

  const MandoUtils = window.MandoUtils;
  const escapeHtml = MandoUtils ? MandoUtils.escapeHtml : function (s) { return String(s); };

  // ---------------------------------------------------------------------------
  // Toast (non-blocking feedback)
  // ---------------------------------------------------------------------------

  /**
   * Show a temporary toast notification.
   *
   * @param {string} message
   * @param {'success'|'error'|'info'} type
   */
  function toast(message, type) {
    const existing = document.querySelector('.mando-toast');
    if (existing) existing.remove();

    const el = document.createElement('div');
    el.className =
      'mando-toast fixed bottom-lg right-lg z-[100] px-md py-sm rounded-xl shadow-lg text-body-md font-medium transition-opacity duration-300 ' +
      (type === 'error'
        ? 'bg-error text-on-error'
        : 'bg-primary text-on-primary');
    el.textContent = message;
    document.body.appendChild(el);

    setTimeout(function () {
      el.style.opacity = '0';
      setTimeout(function () {
        el.remove();
      }, 300);
    }, 3000);
  }

  // ---------------------------------------------------------------------------
  // Confirm modal
  // ---------------------------------------------------------------------------

  /**
   * Show a confirmation modal.
   *
   * @param {string} title
   * @param {string} message
   * @param {{okText?: string, cancelText?: string}} [options]
   * @returns {Promise<boolean>} resolves true on confirm, false on cancel/close
   */
  function confirm(title, message, options) {
    const okText = (options && options.okText) || 'Delete';
    const cancelText = (options && options.cancelText) || 'Cancel';
    return new Promise(function (resolve) {
      const overlay = document.createElement('div');
      overlay.className = 'fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center p-md';
      overlay.innerHTML = `
        <div class="bg-surface rounded-3xl shadow-2xl w-full max-w-sm p-lg border border-outline-variant">
          <div class="flex items-center gap-sm mb-md">
            <span class="material-symbols-outlined text-error text-2xl">warning</span>
            <h3 class="font-headline-md text-headline-md text-on-surface">${escapeHtml(title)}</h3>
          </div>
          <p class="font-body-md text-on-surface-variant mb-lg">${escapeHtml(message)}</p>
          <div class="flex justify-end gap-sm">
            <button class="confirm-cancel px-md py-xs rounded-lg border border-outline-variant text-on-surface font-body-md hover:bg-surface-container transition-all">${escapeHtml(cancelText)}</button>
            <button class="confirm-ok px-md py-xs rounded-lg bg-error text-on-error font-body-md hover:bg-error-dim transition-all shadow-md">${escapeHtml(okText)}</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      function close(value) {
        overlay.remove();
        resolve(value);
      }

      overlay.querySelector('.confirm-cancel').addEventListener('click', function () {
        close(false);
      });
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) close(false);
      });
      overlay.querySelector('.confirm-ok').addEventListener('click', function () {
        close(true);
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  window.MandoUi = {
    toast,
    confirm,
  };
})(window);
