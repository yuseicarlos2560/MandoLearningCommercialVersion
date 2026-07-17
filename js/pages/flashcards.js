/**
 * Flashcards Hub page handler.
 *
 * Wires the hub to:
 * - MandoApi.flashcards (deck queries)
 * - MandoApi.batch      (create-first-card for a new deck)
 *
 * Dynamic regions are re-rendered from state; static fallback values in the
 * HTML provide perceived performance and demo-mode content.
 */

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Constants & fallback fixtures
  // ---------------------------------------------------------------------------

  const CATEGORY_DESCRIPTIONS = {
    MISCELLANEOUS: 'Daily oddities and cards without a specific deck.',
    TRAVEL: 'Essential phrases for getting around.',
    TRAVEL_ESSENTIALS: 'Survival phrases for Beijing & Shanghai.',
    BUSINESS: 'Negotiation, trade terms, and professional etiquette.',
    BUSINESS_MANDARIN: 'Negotiation, trade terms, and professional etiquette.',
  };

  const CATEGORY_ICONS = [
    { match: 'TRAVEL', icon: 'explore' },
    { match: 'BUSINESS', icon: 'business_center' },
    { match: 'FOOD', icon: 'restaurant' },
    { match: 'MISC', icon: 'auto_awesome_motion' },
    { match: 'HSK', icon: 'school' },
    { match: 'VERB', icon: 'bolt' },
  ];

  const ACCENTS = ['primary', 'tertiary', 'secondary'];

  // Demo-mode cards, shaped like FlashCardEntity.
  const FALLBACK_CARDS = [
    { flashCardId: 'DEMO_FC_001', character: '合作', pinyin: 'hézuò', meaning: 'Cooperate; collaboration', hsk: 'HSK4', category: 'BUSINESS_MANDARIN', masteryStatus: 'LEARNING', createdTime: '2026-07-10T10:00:00Z' },
    { flashCardId: 'DEMO_FC_002', character: '合同', pinyin: 'hétong', meaning: 'Contract', hsk: 'HSK4', category: 'BUSINESS_MANDARIN', masteryStatus: 'MASTERED', createdTime: '2026-07-09T10:00:00Z' },
    { flashCardId: 'DEMO_FC_003', character: '谈判', pinyin: 'tánpàn', meaning: 'Negotiate; negotiation', hsk: 'HSK4', category: 'BUSINESS_MANDARIN', masteryStatus: 'UNSTARTED', createdTime: '2026-07-08T10:00:00Z' },
    { flashCardId: 'DEMO_FC_004', character: '投资', pinyin: 'tóuzī', meaning: 'Investment', hsk: 'HSK4', category: 'BUSINESS_MANDARIN', masteryStatus: 'MASTERED', createdTime: '2026-07-07T10:00:00Z' },
    { flashCardId: 'DEMO_FC_005', character: '旅行', pinyin: 'lǚxíng', meaning: 'to travel; journey', hsk: 'HSK3', category: 'TRAVEL_ESSENTIALS', masteryStatus: 'LEARNING', createdTime: '2026-07-06T10:00:00Z' },
    { flashCardId: 'DEMO_FC_006', character: '行李', pinyin: 'xíngli', meaning: 'luggage', hsk: 'HSK3', category: 'TRAVEL_ESSENTIALS', masteryStatus: 'UNSTARTED', createdTime: '2026-07-05T10:00:00Z' },
    { flashCardId: 'DEMO_FC_007', character: '发票', pinyin: 'fāpiào', meaning: 'receipt; invoice', hsk: 'HSK4', category: 'MISCELLANEOUS', masteryStatus: 'MASTERED', createdTime: '2026-07-04T10:00:00Z' },
    { flashCardId: 'DEMO_FC_008', character: '尴尬', pinyin: 'gāngà', meaning: 'awkward; embarrassed', hsk: 'HSK5', category: 'MISCELLANEOUS', masteryStatus: 'LEARNING', createdTime: '2026-07-03T10:00:00Z' },
  ];

  const FALLBACK_FOCUS = [
    { character: '旅', pinyin: 'Lǚ', meaning: 'Travel', hsk: 'HSK3' },
    { character: '商', pinyin: 'Shāng', meaning: 'Business', hsk: 'HSK4' },
    { character: '话', pinyin: 'Huà', meaning: 'Speech', hsk: 'HSK3' },
    { character: '易', pinyin: 'Yì', meaning: 'Easy', hsk: 'HSK3' },
    { character: '难', pinyin: 'Nán', meaning: 'Difficult', hsk: 'HSK4' },
  ];

  // ---------------------------------------------------------------------------
  // Shared utilities (js/utils.js)
  // ---------------------------------------------------------------------------

  const {
    getUserId,
    persistUserId,
    escapeHtml,
    $,
    setText,
  } = window.MandoUtils;

  const MandoUi = window.MandoUi;

  // Pinyin auto-fill controller for the Create New Deck modal (wired in init).
  let createDeckPinyin = { reset: function () {} };

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const state = {
    userId: getUserId(),
    demoMode: false,
    isLoading: false,
    loadError: null,
    cards: [],
    decks: [],
    sort: 'recent',        // 'recent' | 'alpha'
    searchQuery: '',
  };

  if (state.userId) {
    persistUserId(state.userId);
  }
  state.demoMode = !state.userId;

  // ---------------------------------------------------------------------------
  // Category helpers
  // ---------------------------------------------------------------------------

  /** 'TRAVEL_ESSENTIALS' → 'Travel Essentials' */
  function displayCategory(category) {
    return String(category || 'MISCELLANEOUS')
      .split(/[_\s]+/)
      .filter(Boolean)
      .map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(); })
      .join(' ');
  }

  function iconForCategory(category) {
    const upper = String(category || '').toUpperCase();
    for (let i = 0; i < CATEGORY_ICONS.length; i++) {
      if (upper.indexOf(CATEGORY_ICONS[i].match) !== -1) return CATEGORY_ICONS[i].icon;
    }
    return 'style';
  }

  function descriptionForCategory(category) {
    return CATEGORY_DESCRIPTIONS[String(category || '').toUpperCase()] || 'Custom deck.';
  }

  /**
   * Group cards into deck summaries keyed by category.
   * @returns {Array<{category, displayName, description, icon, count, masteredCount, learningCount, percent, latestCreatedTime}>}
   */
  function buildDeckSummaries(cards) {
    const byCategory = {};
    (cards || []).forEach(function (card) {
      const category = card.category || 'MISCELLANEOUS';
      if (!byCategory[category]) {
        byCategory[category] = {
          category: category,
          displayName: displayCategory(category),
          description: descriptionForCategory(category),
          icon: iconForCategory(category),
          count: 0,
          masteredCount: 0,
          learningCount: 0,
          percent: 0,
          latestCreatedTime: null,
        };
      }
      const deck = byCategory[category];
      deck.count += 1;
      if (card.masteryStatus === 'MASTERED') deck.masteredCount += 1;
      if (card.masteryStatus === 'LEARNING') deck.learningCount += 1;
      if (card.createdTime && (!deck.latestCreatedTime || card.createdTime > deck.latestCreatedTime)) {
        deck.latestCreatedTime = card.createdTime;
      }
    });

    const decks = Object.keys(byCategory).map(function (key) {
      const deck = byCategory[key];
      deck.percent = deck.count > 0 ? Math.round((deck.masteredCount / deck.count) * 100) : 0;
      return deck;
    });

    return decks;
  }

  /** "Most active" deck: most engaged-with cards (learning + mastered), tie-break by size. */
  function pickHeroDeck(decks) {
    if (!decks.length) return null;
    return decks.slice().sort(function (a, b) {
      const activityA = a.learningCount + a.masteredCount;
      const activityB = b.learningCount + b.masteredCount;
      if (activityB !== activityA) return activityB - activityA;
      return b.count - a.count;
    })[0];
  }

  // ---------------------------------------------------------------------------
  // Rendering: hero
  // ---------------------------------------------------------------------------

  function renderHero() {
    const hero = pickHeroDeck(state.decks);
    const totalCards = state.cards.length;

    if (!hero) {
      // Empty state: no decks yet.
      setText('hero-deck-badge', 'Getting Started');
      setText('hero-deck-title', 'Your First Deck');
      setText('hero-deck-description', 'Create a deck to start building your personal vocabulary library.');
      setText('hero-deck-percent', '0% Mastered');
      setText('hero-deck-stats', '0 / 0 Cards');
      const bar = $('hero-deck-progress-bar');
      if (bar) bar.style.width = '0%';
      const resumeBtn = $('hero-resume-btn');
      if (resumeBtn) {
        resumeBtn.innerHTML = 'Create Deck <span class="material-symbols-outlined">add</span>';
        resumeBtn.onclick = openCreateDeckModal;
      }
      setText('hero-watermark', '学');
      return;
    }

    setText('hero-deck-badge', 'Most Active');
    setText('hero-deck-title', hero.displayName);
    setText('hero-deck-description', hero.description);
    setText('hero-deck-percent', `${hero.percent}% Mastered`);
    setText('hero-deck-stats', `${hero.masteredCount} / ${hero.count} Cards`);
    const bar = $('hero-deck-progress-bar');
    if (bar) bar.style.width = `${hero.percent}%`;

    const heroCards = state.cards.filter(function (c) { return (c.category || 'MISCELLANEOUS') === hero.category; });
    const latest = heroCards.slice().sort(function (a, b) {
      return String(b.createdTime || '').localeCompare(String(a.createdTime || ''));
    })[0];
    setText('hero-watermark', latest && latest.character ? latest.character.charAt(0) : '学');

    const resumeBtn = $('hero-resume-btn');
    if (resumeBtn) {
      resumeBtn.innerHTML = 'Resume Deck <span class="material-symbols-outlined">arrow_forward</span>';
      resumeBtn.onclick = function () {
        // Decks with nothing mastered yet go to a mixed review instead of a
        // spaced session that would have zero cards.
        const mode = hero.masteredCount > 0 ? 'spaced' : 'random';
        window.location.href = `study-mode.html?mode=${mode}&category=${encodeURIComponent(hero.category)}`;
      };
    }

    if (!state.demoMode && totalCards > 0) {
      const learning = state.cards.filter(function (c) { return c.masteryStatus === 'LEARNING'; }).length;
      setText('hub-subtitle', `Reinforce your vocabulary with our optimized spaced-repetition system. You have ${learning} card${learning === 1 ? '' : 's'} still learning.`);
    }
  }

  // ---------------------------------------------------------------------------
  // Rendering: deck grid
  // ---------------------------------------------------------------------------

  function deckCardHtml(deck, accent) {
    const isAll = deck.category === '__ALL__';
    const subtitle = isAll
      ? `${deck.count} Total Vocabulary`
      : `${deck.count} Card${deck.count === 1 ? '' : 's'}`;
    const percentLabel = isAll ? `${deck.percent}% Overall` : `${deck.percent}% Mastery`;

    return `
      <div class="w-12 h-12 rounded-xl bg-${accent}-container/30 flex items-center justify-center text-${accent} mb-md group-hover:scale-110 transition-transform">
        <span class="material-symbols-outlined text-[28px]" style="font-variation-settings: 'FILL' 1;">${escapeHtml(deck.icon)}</span>
      </div>
      <h4 class="font-bold text-on-surface text-lg">${escapeHtml(deck.displayName)}</h4>
      <p class="text-xs text-on-surface-variant mt-xs">${escapeHtml(subtitle)}</p>
      <div class="mt-lg pt-md border-t border-outline-variant/20 flex justify-between items-center">
        <span class="text-xs font-bold text-${accent}">${escapeHtml(percentLabel)}</span>
        <span class="material-symbols-outlined text-[18px] text-outline-variant group-hover:translate-x-1 transition-transform">arrow_forward</span>
      </div>
    `;
  }

  function getVisibleDecks() {
    const query = state.searchQuery.trim().toLowerCase();

    const allDeck = {
      category: '__ALL__',
      displayName: 'All Cards',
      description: 'All saved vocabulary.',
      icon: 'layers',
      count: state.cards.length,
      masteredCount: state.cards.filter(function (c) { return c.masteryStatus === 'MASTERED'; }).length,
      learningCount: state.cards.filter(function (c) { return c.masteryStatus === 'LEARNING'; }).length,
      percent: state.cards.length > 0
        ? Math.round((state.cards.filter(function (c) { return c.masteryStatus === 'MASTERED'; }).length / state.cards.length) * 100)
        : 0,
      latestCreatedTime: null,
    };

    let decks = state.decks.slice();
    if (state.sort === 'alpha') {
      decks.sort(function (a, b) { return a.displayName.localeCompare(b.displayName); });
    } else {
      decks.sort(function (a, b) {
        return String(b.latestCreatedTime || '').localeCompare(String(a.latestCreatedTime || ''));
      });
    }

    if (query) {
      decks = decks.filter(function (d) { return d.displayName.toLowerCase().indexOf(query) !== -1; });
      if ('all cards'.indexOf(query) === -1) {
        return decks;
      }
    }

    return [allDeck].concat(decks);
  }

  function renderDeckGrid() {
    const grid = $('deck-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const decks = getVisibleDecks();

    if (decks.length === 0 && state.searchQuery) {
      const empty = document.createElement('div');
      empty.className = 'sm:col-span-2 xl:col-span-4 text-center text-on-surface-variant py-lg';
      empty.textContent = `No decks match "${state.searchQuery}".`;
      grid.appendChild(empty);
    }

    decks.forEach(function (deck, index) {
      const accent = deck.category === '__ALL__' ? 'primary' : ACCENTS[index % ACCENTS.length];
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'text-left bg-surface border border-outline-variant rounded-xl p-md hover:shadow-lg hover:shadow-secondary/5 hover:-translate-y-1 transition-all cursor-pointer group';
      card.innerHTML = deckCardHtml(deck, accent);
      card.addEventListener('click', function () {
        if (deck.category === '__ALL__') {
          window.location.href = 'study-mode.html?mode=random&global=true';
        } else {
          const mode = deck.masteredCount > 0 ? 'spaced' : 'random';
          window.location.href = `study-mode.html?mode=${mode}&category=${encodeURIComponent(deck.category)}`;
        }
      });
      grid.appendChild(card);
    });

    // Create New Deck dashed card (always last).
    const createBtn = document.createElement('button');
    createBtn.type = 'button';
    createBtn.className = 'border-2 border-dashed border-outline-variant rounded-xl p-md flex flex-col items-center justify-center gap-base hover:bg-surface-container-low hover:border-primary transition-all group min-h-[180px]';
    createBtn.innerHTML = `
      <div class="w-12 h-12 rounded-full border-2 border-outline-variant flex items-center justify-center text-outline-variant group-hover:border-primary group-hover:text-primary transition-colors">
        <span class="material-symbols-outlined text-[32px]">add</span>
      </div>
      <span class="text-sm font-bold text-on-surface-variant group-hover:text-primary">Create New Deck</span>
    `;
    createBtn.addEventListener('click', openCreateDeckModal);
    grid.appendChild(createBtn);
  }

  // ---------------------------------------------------------------------------
  // Rendering: focus characters
  // ---------------------------------------------------------------------------

  function renderFocusCharacters() {
    const row = $('focus-characters-row');
    if (!row) return;
    row.innerHTML = '';

    let items;
    if (state.demoMode) {
      items = FALLBACK_FOCUS;
    } else {
      items = state.cards
        .slice()
        .sort(function (a, b) {
          return String(b.createdTime || '').localeCompare(String(a.createdTime || ''));
        })
        .slice(0, 5);
    }

    if (!items.length) {
      row.innerHTML = '<p class="text-sm text-on-surface-variant">Save some words during a video session to see focus characters here.</p>';
      return;
    }

    items.forEach(function (card) {
      const tile = document.createElement('button');
      tile.type = 'button';
      const hskLevel = String(card.hsk || '').replace(/\D/g, '') || '3';
      tile.className = 'min-w-[160px] aspect-square bg-surface-container-low rounded-2xl flex flex-col items-center justify-center border border-outline-variant/30 hover:border-primary transition-all cursor-pointer';
      tile.innerHTML = `
        <span class="font-character-display text-headline-lg text-primary">${escapeHtml(card.character || '')}</span>
        <p class="text-sm font-bold text-on-surface mt-sm">${escapeHtml(card.pinyin || '')}</p>
        <p class="text-xs text-on-surface-variant">${escapeHtml(card.meaning || displayCategory(card.category))}</p>
      `;
      tile.addEventListener('click', function () {
        window.location.href = `study-mode.html?mode=random&hsk=${encodeURIComponent(hskLevel)}`;
      });
      row.appendChild(tile);
    });
  }

  // ---------------------------------------------------------------------------
  // Rendering: sort buttons
  // ---------------------------------------------------------------------------

  function renderSortButtons() {
    const recentBtn = $('sort-recent-btn');
    const alphaBtn = $('sort-alpha-btn');
    if (!recentBtn || !alphaBtn) return;

    const active = 'px-md py-2 bg-surface-container-high text-on-surface text-sm font-bold rounded-full';
    const inactive = 'px-md py-2 text-on-surface-variant text-sm font-medium rounded-full hover:text-on-surface';

    recentBtn.className = state.sort === 'recent' ? active : inactive;
    alphaBtn.className = state.sort === 'alpha' ? active : inactive;
  }

  // ---------------------------------------------------------------------------
  // Create New Deck modal
  // ---------------------------------------------------------------------------

  function openCreateDeckModal() {
    const modal = $('create-deck-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    const error = $('create-deck-error');
    if (error) {
      error.classList.add('hidden');
      error.textContent = '';
    }
    // Fresh form: pinyin auto-fill starts in automatic mode.
    createDeckPinyin.reset({ auto: true });
    const nameInput = $('new-deck-name');
    if (nameInput) nameInput.focus();
  }

  function closeCreateDeckModal() {
    const modal = $('create-deck-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    const form = $('create-deck-form');
    if (form) form.reset();
  }

  function showCreateDeckError(message) {
    const error = $('create-deck-error');
    if (!error) return;
    error.textContent = message;
    error.classList.remove('hidden');
  }

  async function submitCreateDeck(event) {
    event.preventDefault();

    const name = ($('new-deck-name') ? $('new-deck-name').value : '').trim();
    const character = ($('new-card-character') ? $('new-card-character').value : '').trim();
    const pinyin = ($('new-card-pinyin') ? $('new-card-pinyin').value : '').trim();
    const meaning = ($('new-card-meaning') ? $('new-card-meaning').value : '').trim();
    const hsk = $('new-card-hsk') ? $('new-card-hsk').value : 'HSK3';
    const tags = ($('new-card-tags') ? $('new-card-tags').value : '').trim();

    if (!character) {
      showCreateDeckError('Chinese character(s) are required.');
      return;
    }
    if (character.length > 25) {
      showCreateDeckError('Character field is limited to 25 characters.');
      return;
    }

    const category = (name || 'Miscellaneous').toUpperCase().replace(/\s+/g, '_');
    const item = {
      character: character,
      pinyin: pinyin,
      meaning: meaning,
      hsk: hsk,
      category: category,
    };
    if (tags) item.tags = tags;

    const submitBtn = $('create-deck-submit');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating…';
    }

    try {
      if (state.demoMode) {
        // Demo mode: update local fixtures only.
        state.cards.push({
          flashCardId: `DEMO_FC_${String(state.cards.length + 1).padStart(3, '0')}`,
          character: character,
          pinyin: pinyin,
          meaning: meaning,
          hsk: hsk,
          category: category,
          masteryStatus: 'UNSTARTED',
          createdTime: new Date().toISOString(),
        });
        state.decks = buildDeckSummaries(state.cards);
        renderAll();
        closeCreateDeckModal();
        if (MandoUi) MandoUi.toast(`Demo deck "${displayCategory(category)}" created.`, 'success');
        return;
      }

      const payload = { createFlashCards: [item] };
      const res = await window.MandoApi.batch.flush(state.userId, payload);

      if (!res.ok) {
        const message = res.error && res.error.message ? res.error.message : 'Could not create the deck. Please try again.';
        showCreateDeckError(message);
        return;
      }

      const failed = res.data && typeof res.data.failed === 'number' ? res.data.failed : 0;
      if (failed > 0) {
        const firstFailure = (res.data.results || []).find(function (r) { return r.status === 'FAILED'; });
        showCreateDeckError(firstFailure && firstFailure.message ? firstFailure.message : 'The card could not be created.');
        return;
      }

      closeCreateDeckModal();
      if (MandoUi) MandoUi.toast(`Deck "${displayCategory(category)}" created.`, 'success');
      await loadCards();
      renderAll();
    } catch (err) {
      console.error('Create deck failed', err);
      showCreateDeckError('Something went wrong. Please try again.');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Deck';
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------

  async function loadCards() {
    if (state.demoMode) {
      state.cards = FALLBACK_CARDS.slice();
      state.decks = buildDeckSummaries(state.cards);
      return;
    }

    state.isLoading = true;
    state.loadError = null;

    try {
      const res = await window.MandoApi.flashcards.getDeckAll(state.userId, {
        studyMode: 'MANAGE',
        pageSize: 50,
      });

      if (res.ok && res.data && Array.isArray(res.data.notes)) {
        state.cards = res.data.notes;
      } else if (res.status === 404) {
        // No cards yet: treat as an empty deck, not an error.
        state.cards = [];
      } else {
        state.loadError = res.error || { message: 'Failed to load decks.' };
        state.cards = [];
        if (MandoUi) MandoUi.toast('Could not load your decks. Showing an empty state.', 'error');
      }
    } catch (err) {
      console.error('Deck load failed', err);
      state.loadError = { message: err.message || 'Network error' };
      state.cards = [];
    } finally {
      state.isLoading = false;
    }

    state.decks = buildDeckSummaries(state.cards);
  }

  // ---------------------------------------------------------------------------
  // Interactions
  // ---------------------------------------------------------------------------

  function initInteractions() {
    if (window.MandoPinyin) {
      createDeckPinyin = window.MandoPinyin.autoFill($('new-card-character'), $('new-card-pinyin'));
    }

    const studyNav = {
      'study-mode-spaced': 'study-mode.html?mode=spaced&global=true',
      'study-mode-random': 'study-mode.html?mode=random&global=true',
      'study-mode-speed': 'study-mode.html?mode=speed&global=true',
    };
    Object.keys(studyNav).forEach(function (id) {
      const btn = $(id);
      if (btn) {
        btn.addEventListener('click', function () {
          window.location.href = studyNav[id];
        });
      }
    });

    const editDecksBtn = $('edit-decks-btn');
    if (editDecksBtn) {
      editDecksBtn.addEventListener('click', function () {
        window.location.href = 'deck-editor.html';
      });
    }

    const recentBtn = $('sort-recent-btn');
    if (recentBtn) {
      recentBtn.addEventListener('click', function () {
        state.sort = 'recent';
        renderSortButtons();
        renderDeckGrid();
      });
    }

    const alphaBtn = $('sort-alpha-btn');
    if (alphaBtn) {
      alphaBtn.addEventListener('click', function () {
        state.sort = 'alpha';
        renderSortButtons();
        renderDeckGrid();
      });
    }

    const searchInput = $('deck-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        state.searchQuery = searchInput.value || '';
        renderDeckGrid();
      });
    }

    // Modal wiring.
    const modal = $('create-deck-modal');
    const form = $('create-deck-form');
    const cancelBtn = $('create-deck-cancel');
    if (form) form.addEventListener('submit', submitCreateDeck);
    if (cancelBtn) cancelBtn.addEventListener('click', closeCreateDeckModal);
    if (modal) {
      modal.addEventListener('click', function (e) {
        if (e.target === modal) closeCreateDeckModal();
      });
    }
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
        closeCreateDeckModal();
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Main init
  // ---------------------------------------------------------------------------

  function renderAll() {
    renderHero();
    renderDeckGrid();
    renderFocusCharacters();
    renderSortButtons();
  }

  async function init() {
    try {
      window.MandoShell.renderSidebarProfile();
      window.MandoShell.initMobileDrawer({ sidebarId: 'sidebar', overlayId: 'sidebar-overlay', toggleId: 'mobile-menu-toggle' });

      initInteractions();

      // Render fallback content immediately for perceived performance.
      if (state.demoMode) {
        state.cards = FALLBACK_CARDS.slice();
        state.decks = buildDeckSummaries(state.cards);
      }
      renderAll();

      // Then load backend data and re-render.
      if (!state.demoMode) {
        await loadCards();
        renderAll();
      }
    } catch (err) {
      console.error('Flashcards hub init failed:', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
