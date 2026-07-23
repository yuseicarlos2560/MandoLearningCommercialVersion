/**
 * Articles catalog page handler.
 *
 * Displays a filterable, sortable grid of article cards using the public
 * Scripts API. Falls back to a friendly empty state if the backend is offline.
 */

(function () {
  'use strict';

  const {
    safeLocalStorageGet,
    safeLocalStorageSet,
    getUserId,
    escapeHtml,
    $,
    setText,
  } = window.MandoUtils;

  const HSK_LEVELS = ['HSK1', 'HSK2', 'HSK3', 'HSK4', 'HSK5', 'HSK6'];

  const DEMO_ARTICLES = [
    {
      scriptId: 'SCRIPT_DEMO_001',
      articleGroupId: 'ARTICLE_DEMO_001',
      version: 'ORIGINAL',
      title: 'Discuss returning home after studying abroad',
      description: 'Focus on emotional vocabulary and cultural nuances of returning to one\'s roots.',
      scriptType: 'ARTICLE',
      sourceUrl: 'https://example.com/original-article',
      hskLevel: 'HSK4',
      hskStats: { hsk4: 45.0, hsk5: 30.0, hsk6: 15.0, beyond: 10.0 },
      idioms: [{ line: 0, text: '回国', type: 'chengyu', meaning: 'return to one\'s home country' }],
      hasAudio: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      scriptId: 'SCRIPT_DEMO_HSK5',
      articleGroupId: 'ARTICLE_DEMO_001',
      version: 'HSK5',
      title: 'Discuss returning home after studying abroad [HSK5]',
      description: 'HSK5 version of the article.',
      scriptType: 'ARTICLE',
      sourceUrl: 'https://example.com/original-article',
      hskLevel: 'HSK5',
      hskStats: { hsk4: 25.0, hsk5: 45.0, hsk6: 20.0, beyond: 10.0 },
      idioms: [],
      hasAudio: false,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      updatedAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      scriptId: 'SCRIPT_DEMO_HSK6',
      articleGroupId: 'ARTICLE_DEMO_001',
      version: 'HSK6',
      title: 'Discuss returning home after studying abroad [HSK6]',
      description: 'HSK6 version of the article.',
      scriptType: 'ARTICLE',
      sourceUrl: 'https://example.com/original-article',
      hskLevel: 'HSK6',
      hskStats: { hsk4: 15.0, hsk5: 25.0, hsk6: 50.0, beyond: 10.0 },
      idioms: [],
      hasAudio: true,
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      updatedAt: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      scriptId: 'SCRIPT_DEMO_NEWS',
      articleGroupId: 'ARTICLE_DEMO_002',
      version: 'ORIGINAL',
      title: 'AI changes the job market',
      description: 'A news article about artificial intelligence and employment.',
      scriptType: 'NEWS',
      sourceUrl: 'https://example.com/ai-jobs',
      hskLevel: 'HSK3',
      hskStats: { hsk1: 40.0, hsk2: 35.0, hsk3: 20.0, beyond: 5.0 },
      idioms: [{ line: 2, text: '优胜劣汰', type: 'chengyu', meaning: 'survival of the fittest' }],
      hasAudio: false,
      createdAt: new Date(Date.now() - 10800000).toISOString(),
      updatedAt: new Date(Date.now() - 10800000).toISOString(),
    },
  ];

  const state = {
    userId: getUserId(),
    articles: [],
    filtered: [],
    loading: true,
    error: false,
    filters: {
      level: 'ALL',
      type: 'ALL',
      search: '',
    },
    sort: 'newest',
  };

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------

  function isDemoMode() {
    return window.location.search.indexOf('demo=1') !== -1;
  }

  async function loadArticles() {
    state.loading = true;
    state.error = false;
    updateVisibility();

    if (isDemoMode()) {
      state.articles = DEMO_ARTICLES.slice();
      state.loading = false;
      applyFilters();
      updateVisibility();
      return;
    }

    const res = await window.MandoApi.scripts.listReady({ pageSize: 50 });
    if (!res.ok || !res.data || !Array.isArray(res.data.scripts)) {
      state.loading = false;
      state.error = true;
      updateVisibility();
      return;
    }

    state.articles = res.data.scripts;
    state.loading = false;
    applyFilters();
    updateVisibility();
  }

  // ---------------------------------------------------------------------------
  // Filtering & sorting
  // ---------------------------------------------------------------------------

  function normalizeLevel(level) {
    return String(level || '').toUpperCase().replace(/\s+/g, '');
  }

  function levelNumber(level) {
    const match = String(level || '').match(/(\d)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  function matchesSearch(script, query) {
    if (!query) return true;
    const q = query.toLowerCase();
    return (script.title || '').toLowerCase().indexOf(q) !== -1 ||
      (script.description || '').toLowerCase().indexOf(q) !== -1;
  }

  function applyFilters() {
    let result = state.articles.slice();

    if (state.filters.level !== 'ALL') {
      result = result.filter(function (s) { return normalizeLevel(s.hskLevel) === normalizeLevel(state.filters.level); });
    }

    if (state.filters.type !== 'ALL') {
      result = result.filter(function (s) { return s.scriptType === state.filters.type; });
    }

    if (state.filters.search) {
      result = result.filter(function (s) { return matchesSearch(s, state.filters.search); });
    }

    result.sort(function (a, b) {
      if (state.sort === 'newest') {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
      if (state.sort === 'easiest') {
        return levelNumber(a.hskLevel) - levelNumber(b.hskLevel);
      }
      if (state.sort === 'hardest') {
        return levelNumber(b.hskLevel) - levelNumber(a.hskLevel);
      }
      return 0;
    });

    state.filtered = result;
    renderGrid();
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  function updateVisibility() {
    const loading = $('articles-loading');
    const grid = $('articles-grid');
    const empty = $('articles-empty');
    const error = $('articles-error');

    if (state.loading) {
      loading.classList.remove('hidden');
      grid.classList.add('hidden');
      empty.classList.add('hidden');
      error.classList.add('hidden');
      return;
    }

    loading.classList.add('hidden');

    if (state.error) {
      grid.classList.add('hidden');
      empty.classList.add('hidden');
      error.classList.remove('hidden');
      return;
    }

    error.classList.add('hidden');

    if (state.filtered.length === 0) {
      grid.classList.add('hidden');
      empty.classList.remove('hidden');
      const msg = $('articles-empty-message');
      if (msg) {
        msg.textContent = state.articles.length === 0
          ? 'No articles have been published yet. Check back later!'
          : 'Try adjusting your filters to find what you\'re looking for.';
      }
      return;
    }

    empty.classList.add('hidden');
    grid.classList.remove('hidden');
  }

  function renderGrid() {
    const grid = $('articles-grid');
    if (!grid) return;

    grid.innerHTML = '';

    if (state.filtered.length === 0) {
      updateVisibility();
      return;
    }

    const createCard = window.MandoComponents && window.MandoComponents.createArticleCard;
    const userLevel = state.filters.level !== 'ALL' ? state.filters.level : (safeLocalStorageGet('mando.userHskLevel') || '');

    state.filtered.forEach(function (script) {
      if (createCard) {
        grid.appendChild(createCard(script, { rootPath: '../', userLevel: userLevel }));
      } else {
        // Fallback if component isn't loaded.
        const link = document.createElement('a');
        link.href = `script-reader.html?scriptId=${encodeURIComponent(script.scriptId || '')}`;
        link.className = 'bg-surface-container-lowest rounded-2xl p-md border border-outline-variant shadow-sm hover:shadow-md transition-all';
        link.innerHTML = `
          <h4 class="font-bold text-on-surface text-base">${escapeHtml(script.title)}</h4>
          <p class="text-sm text-on-surface-variant mt-xs line-clamp-2">${escapeHtml(script.description || '')}</p>
        `;
        grid.appendChild(link);
      }
    });

    updateVisibility();
  }

  function renderFilterButtons() {
    document.querySelectorAll('.hsk-filter-btn').forEach(function (btn) {
      const isActive = state.filters.level === btn.dataset.level;
      btn.className = isActive
        ? 'hsk-filter-btn px-md py-xs rounded-full text-sm font-medium bg-primary-container text-on-primary-container border border-outline-variant transition-all'
        : 'hsk-filter-btn px-md py-xs rounded-full text-sm font-medium bg-surface-container-highest text-on-surface-variant border border-outline-variant transition-all';
    });

    document.querySelectorAll('.type-filter-btn').forEach(function (btn) {
      const isActive = state.filters.type === btn.dataset.type;
      btn.className = isActive
        ? 'type-filter-btn px-md py-xs rounded-full text-xs font-medium bg-primary-container text-on-primary-container border border-outline-variant transition-all'
        : 'type-filter-btn px-md py-xs rounded-full text-xs font-medium bg-surface-container-highest text-on-surface-variant border border-outline-variant transition-all';
    });

    const clearBtn = $('clear-filters-btn');
    if (clearBtn) {
      const hasFilters = state.filters.level !== 'ALL' || state.filters.type !== 'ALL' || state.filters.search;
      if (hasFilters) {
        clearBtn.classList.remove('hidden');
      } else {
        clearBtn.classList.add('hidden');
      }
    }
  }

  function renderLegend() {
    const container = $('articles-hsk-legend');
    if (!container || !window.MandoComponents || !window.MandoComponents.renderHskLegend) return;
    window.MandoComponents.renderHskLegend(container, { mode: 'all' });
  }

  function renderSubtitle() {
    const subtitle = $('articles-subtitle');
    if (!subtitle) return;
    const stored = safeLocalStorageGet('mando.userHskLevel');
    if (stored && HSK_LEVELS.indexOf(stored) !== -1) {
      subtitle.textContent = `Recommended articles for your ${stored.replace('HSK', 'HSK ')} level.`;
    } else {
      subtitle.textContent = 'Browse graded reading at your level.';
    }
  }

  function clearFilters() {
    state.filters.level = 'ALL';
    state.filters.type = 'ALL';
    state.filters.search = '';
    const searchInput = $('article-search');
    if (searchInput) searchInput.value = '';
    renderFilterButtons();
    applyFilters();
  }

  // ---------------------------------------------------------------------------
  // Event listeners
  // ---------------------------------------------------------------------------

  function initEventListeners() {
    document.querySelectorAll('.hsk-filter-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.filters.level = btn.dataset.level;
        renderFilterButtons();
        applyFilters();
      });
    });

    document.querySelectorAll('.type-filter-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.filters.type = btn.dataset.type;
        renderFilterButtons();
        applyFilters();
      });
    });

    const searchInput = $('article-search');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        state.filters.search = searchInput.value.trim();
        applyFilters();
      });
    }

    const sortSelect = $('article-sort');
    if (sortSelect) {
      sortSelect.addEventListener('change', function () {
        state.sort = sortSelect.value;
        applyFilters();
      });
    }

    const clearBtn = $('clear-filters-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', clearFilters);
    }

    const retryBtn = $('articles-retry');
    if (retryBtn) {
      retryBtn.addEventListener('click', loadArticles);
    }

    const backBtn = $('topnav-back');
    if (backBtn) {
      backBtn.addEventListener('click', function () {
        window.location.href = '../index.html';
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Default to user's level if available
  // ---------------------------------------------------------------------------

  function applyUserLevelPreference() {
    const stored = safeLocalStorageGet('mando.userHskLevel');
    if (stored && HSK_LEVELS.indexOf(stored) !== -1) {
      state.filters.level = stored;
    }
  }

  // ---------------------------------------------------------------------------
  // Bootstrap
  // ---------------------------------------------------------------------------

  async function init() {
    if (window.MandoShell) {
      window.MandoShell.initMobileDrawer({});
      window.MandoShell.renderSidebarProfile();
    }

    applyUserLevelPreference();
    renderFilterButtons();
    renderLegend();
    renderSubtitle();
    initEventListeners();
    await loadArticles();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
