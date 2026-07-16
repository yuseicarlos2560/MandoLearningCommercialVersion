/**
 * Shared shell behaviors for MandoLearning pages.
 *
 * Currently handles:
 * - Mobile sidebar drawer toggle
 * - Sidebar profile snippet rendering
 *
 * Sidebar markup still lives in each page; this module provides the shared
 * interaction logic so the drawer behavior is consistent everywhere.
 */

(function (window) {
  'use strict';

  const MandoUtils = window.MandoUtils;

  // ---------------------------------------------------------------------------
  // Mobile sidebar drawer
  // ---------------------------------------------------------------------------

  /**
   * Initialize a mobile drawer for the page sidebar.
   *
   * @param {Object} options
   * @param {string} options.sidebarId     DOM id of the <aside> element
   * @param {string} options.overlayId     DOM id of the overlay element
   * @param {string} options.toggleId      DOM id of the hamburger button
   * @param {boolean} options.closeOnLinkClick  close drawer when a sidebar link is tapped (default true)
   */
  function initMobileDrawer(options) {
    const sidebar = document.getElementById(options.sidebarId || 'sidebar');
    const overlay = document.getElementById(options.overlayId || 'sidebar-overlay');
    const toggle = document.getElementById(options.toggleId || 'mobile-menu-toggle');
    const closeOnLinkClick = options.closeOnLinkClick !== false;

    if (!sidebar || !overlay || !toggle) return;

    function open() {
      sidebar.classList.remove('-translate-x-full');
      overlay.classList.remove('hidden');
      document.body.classList.add('overflow-hidden');
    }

    function close() {
      sidebar.classList.add('-translate-x-full');
      overlay.classList.add('hidden');
      document.body.classList.remove('overflow-hidden');
    }

    function isOpen() {
      return !sidebar.classList.contains('-translate-x-full');
    }

    toggle.addEventListener('click', function () {
      if (isOpen()) {
        close();
      } else {
        open();
      }
    });

    overlay.addEventListener('click', close);

    if (closeOnLinkClick) {
      const links = sidebar.querySelectorAll('a');
      links.forEach(function (link) {
        link.addEventListener('click', close);
      });
    }

    // Expose close so page handlers can close the drawer after navigation.
    sidebar._mandoCloseDrawer = close;
  }

  function closeMobileDrawer(sidebarId) {
    const sidebar = document.getElementById(sidebarId || 'sidebar');
    if (sidebar && typeof sidebar._mandoCloseDrawer === 'function') {
      sidebar._mandoCloseDrawer();
    }
  }

  // ---------------------------------------------------------------------------
  // Sidebar profile snippet
  // ---------------------------------------------------------------------------

  function renderSidebarProfile() {
    const nameEl = document.getElementById('sidebar-user-name');
    const roleEl = document.getElementById('sidebar-user-role');
    if (!nameEl || !roleEl) return;

    const displayName = MandoUtils ? MandoUtils.getDisplayName() : 'Learner';
    nameEl.textContent = displayName;
    roleEl.textContent = 'HSK 4 Learner';
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  window.MandoShell = {
    initMobileDrawer,
    closeMobileDrawer,
    renderSidebarProfile,
  };
})(window);
