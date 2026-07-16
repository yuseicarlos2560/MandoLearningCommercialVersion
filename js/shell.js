/**
 * Shared shell behaviors and markup for MandoLearning pages.
 *
 * Handles:
 * - Sidebar markup injection (single source of truth)
 * - Mobile sidebar drawer toggle
 * - Sidebar profile snippet rendering
 */

(function (window) {
  'use strict';

  const MandoUtils = window.MandoUtils;

  // ---------------------------------------------------------------------------
  // Sidebar markup
  // ---------------------------------------------------------------------------

  const NAV_ITEMS = {
    root: [
      { id: 'videos', label: 'Videos', icon: 'play_circle', href: 'index.html' },
      { id: 'scripts', label: 'Scripts', icon: 'description', href: 'pages/script-reader.html' },
      { id: 'documents', label: 'Documents', icon: 'folder_open', href: 'pages/document-study.html' },
      { id: 'flashcards', label: 'Flashcards', icon: 'quiz', href: 'pages/flashcards.html' },
      { id: 'stats', label: 'Stats', icon: 'query_stats', href: 'pages/stats.html' },
    ],
    pages: [
      { id: 'videos', label: 'Videos', icon: 'play_circle', href: '../index.html' },
      { id: 'scripts', label: 'Scripts', icon: 'description', href: 'script-reader.html' },
      { id: 'documents', label: 'Documents', icon: 'folder_open', href: 'document-study.html' },
      { id: 'flashcards', label: 'Flashcards', icon: 'quiz', href: 'flashcards.html' },
      { id: 'stats', label: 'Stats', icon: 'query_stats', href: 'stats.html' },
    ],
  };

  /**
   * Render the shared sidebar into a container.
   *
   * @param {Object} options
   * @param {string} options.containerId         DOM id of the sidebar container (default 'sidebar')
   * @param {'root'|'pages'} options.pageRoot    Which directory the current page lives in (default 'root')
   * @param {string} options.activeNavItem       Nav item id to mark active ('videos', 'scripts', etc.)
   * @param {boolean} options.includeVideoLibrary Show the Video Library collapsible section (default false)
   */
  function renderSidebar(options) {
    options = options || {};
    const container = document.getElementById(options.containerId || 'sidebar');
    if (!container) return;

    const pageRoot = options.pageRoot === 'pages' ? 'pages' : 'root';
    const activeNavItem = options.activeNavItem || 'videos';
    const includeVideoLibrary = !!options.includeVideoLibrary;

    const navLinks = NAV_ITEMS[pageRoot].map(function (item) {
      const isActive = item.id === activeNavItem;
      const href = item.href;
      return `
        <a class="sidebar-nav-link flex items-center gap-sm px-base py-sm rounded-lg ${isActive ? 'sidebar-nav-link-active' : 'text-on-surface-variant dark:text-outline-variant'}" href="${href}">
          <span class="material-symbols-outlined" data-icon="${item.icon}">${item.icon}</span>
          <span class="font-body-md text-body-md">${item.label}</span>
        </a>
      `;
    }).join('');

    const videoLibrarySection = includeVideoLibrary ? `
      <div class="mt-md px-base">
        <h3 class="font-label-caps text-label-caps text-on-surface-variant tracking-wider mb-sm uppercase">Video Library</h3>
        <div id="video-library-container" class="space-y-1">
          <!-- Populated dynamically by the page handler -->
        </div>
      </div>
    ` : '';

    container.innerHTML = `
      <div class="mb-lg px-base">
        <h1 class="font-headline-md text-headline-md font-bold text-primary dark:text-primary-fixed">MandoLearning</h1>
        <p class="font-label-caps text-label-caps text-on-surface-variant tracking-wider mt-1 uppercase">Modern Mandarin Mastery</p>
      </div>
      <nav class="flex-1 space-y-1">
        ${navLinks}
      </nav>
      ${videoLibrarySection}
      <div id="sidebar-profile-snippet" class="mt-md mx-base p-md rounded-2xl bg-surface-container-low border border-outline-variant/30 flex items-center gap-sm">
        <div class="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shrink-0">
          <span class="material-symbols-outlined">person</span>
        </div>
        <div class="min-w-0">
          <p id="sidebar-user-name" class="font-body-md text-body-md text-on-surface font-semibold truncate">Learner</p>
          <p id="sidebar-user-role" class="font-label-caps text-label-caps text-on-surface-variant truncate">HSK 4 Learner</p>
        </div>
      </div>
      <div class="mt-auto px-base py-md border-t border-outline-variant/30">
        <button class="w-full btn-gradient text-on-primary font-headline-md text-headline-md py-base rounded-xl shadow-md active:scale-95">
          Start Practice
        </button>
      </div>
    `;
  }

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
      sidebar.classList.add('z-[60]');
      overlay.classList.remove('hidden');
      document.body.classList.add('overflow-hidden');
    }

    function close() {
      sidebar.classList.add('-translate-x-full');
      sidebar.classList.remove('z-[60]');
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
    renderSidebar,
    initMobileDrawer,
    closeMobileDrawer,
    renderSidebarProfile,
  };
})(window);
