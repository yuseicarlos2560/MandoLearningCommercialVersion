/**
 * Deck Editor page handler.
 *
 * Wires the editor to:
 * - MandoApi.flashcards (deck queries with cursor pagination)
 * - MandoApi.batch      (Save All: mixed create/update/delete, max 25 per request)
 *
 * All mutations are queued locally first and rendered optimistically. The
 * backend is only touched when the user clicks Save All (batch-first writes,
 * see HIGH_LEVEL_PLAN §2). Category moves require delete + recreate because
 * the backend rejects category updates (TP_VAL_015).
 */

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Constants & demo fixtures
  // ---------------------------------------------------------------------------

  const ALL_DECKS = '__ALL__';
  const BATCH_CHUNK_SIZE = 25;
  const PAGE_SIZE = 25;

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

  const STATUS_BADGES = {
    UNSTARTED: { label: 'New Card', classes: 'bg-surface-container-highest text-on-surface-variant' },
    LEARNING: { label: 'Learning', classes: 'bg-secondary-container text-on-secondary-container' },
    MASTERED: { label: 'Mastered', classes: 'bg-on-tertiary text-tertiary' },
  };

  // ---------------------------------------------------------------------------
  // Shared utilities (js/utils.js)
  // ---------------------------------------------------------------------------

  const {
    getUserId,
    persistUserId,
    escapeHtml,
    uuid,
    $,
    setText,
  } = window.MandoUtils;

  const MandoUi = window.MandoUi;

  // Pinyin auto-fill controller for the Add/Edit Card modal (wired in init).
  let cardFormPinyin = { reset: function () {} };

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  function initialCategory() {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('category');
    if (!raw) return 'MISCELLANEOUS';
    if (raw === ALL_DECKS) return ALL_DECKS;
    return raw.toUpperCase().replace(/\s+/g, '_');
  }

  const state = {
    userId: getUserId(),
    demoMode: false,
    decks: [],
    demoCards: [],           // demo-mode "database" so mutations persist across deck switches
    activeCategory: initialCategory(),
    cards: [],
    nextToken: null,
    hasMore: false,
    pendingChanges: [],
    isSaving: false,
    editingCardId: null,   // flashCardId (or temp id) of card being edited; null = add mode
    searchQuery: '',
  };

  if (state.userId) {
    persistUserId(state.userId);
  }
  state.demoMode = !state.userId;
  if (state.demoMode) {
    state.demoCards = FALLBACK_CARDS.slice();
  }

  // ---------------------------------------------------------------------------
  // Category helpers
  // ---------------------------------------------------------------------------

  function displayCategory(category) {
    return String(category || 'MISCELLANEOUS')
      .split(/[_\s]+/)
      .filter(Boolean)
      .map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(); })
      .join(' ');
  }

  function buildDeckSummaries(cards) {
    const byCategory = {};
    (cards || []).forEach(function (card) {
      const category = card.category || 'MISCELLANEOUS';
      if (!byCategory[category]) {
        byCategory[category] = { category: category, count: 0, masteredCount: 0, percent: 0 };
      }
      const deck = byCategory[category];
      deck.count += 1;
      if (card.masteryStatus === 'MASTERED') deck.masteredCount += 1;
    });
    return Object.keys(byCategory).map(function (key) {
      const deck = byCategory[key];
      deck.displayName = displayCategory(deck.category);
      deck.percent = deck.count > 0 ? Math.round((deck.masteredCount / deck.count) * 100) : 0;
      return deck;
    }).sort(function (a, b) { return b.count - a.count; });
  }

  // ---------------------------------------------------------------------------
  // Pending-change queue
  // ---------------------------------------------------------------------------

  function queueChange(operation, data) {
    const change = { _id: uuid(), operation: operation, data: data };
    state.pendingChanges.push(change);
    return change;
  }

  function findChangeFor(cardId, operation) {
    return state.pendingChanges.find(function (c) {
      return c.operation === operation && c.data.flashCardId === cardId;
    });
  }

  function removeChange(changeId) {
    state.pendingChanges = state.pendingChanges.filter(function (c) { return c._id !== changeId; });
  }

  /**
   * Queue a card creation and render it optimistically with a temporary ID.
   * The temp ID is stamped into the change data so later edits/deletes of the
   * optimistic card can find and merge into this create. buildBatchItem picks
   * fields explicitly, so the temp ID never leaks into the wire payload.
   */
  function queueCreate(data) {
    const change = queueChange('CREATE_FLASHCARD', data);
    const optimisticCard = {
      flashCardId: 'PENDING_' + change._id,
      character: data.character,
      pinyin: data.pinyin,
      meaning: data.meaning,
      hsk: data.hsk,
      category: data.category,
      masteryStatus: 'UNSTARTED',
      createdTime: new Date().toISOString(),
      _pending: 'create',
    };
    change.data.flashCardId = optimisticCard.flashCardId;
    state.cards.unshift(optimisticCard);
    return optimisticCard;
  }

  /**
   * Queue an update. Updates to a not-yet-saved create are merged into the
   * create instead of producing a second change.
   */
  function queueUpdate(card, fields) {
    if (card._pending === 'create') {
      const createChange = findChangeFor(card.flashCardId, 'CREATE_FLASHCARD');
      if (createChange) Object.assign(createChange.data, fields);
      Object.assign(card, fields);
      return;
    }
    const existing = findChangeFor(card.flashCardId, 'UPDATE_FLASHCARD');
    if (existing) {
      Object.assign(existing.data, fields);
    } else {
      queueChange('UPDATE_FLASHCARD', Object.assign({
        category: card.category,
        flashCardId: card.flashCardId,
      }, fields));
    }
    Object.assign(card, fields);
    card._pending = 'update';
  }

  /**
   * Queue a delete. Deleting a not-yet-saved create simply drops the create.
   */
  function queueDelete(card) {
    if (card._pending === 'create') {
      const createChange = findChangeFor(card.flashCardId, 'CREATE_FLASHCARD');
      if (createChange) removeChange(createChange._id);
      state.cards = state.cards.filter(function (c) { return c.flashCardId !== card.flashCardId; });
      return;
    }
    const pendingUpdate = findChangeFor(card.flashCardId, 'UPDATE_FLASHCARD');
    if (pendingUpdate) removeChange(pendingUpdate._id);
    queueChange('DELETE_FLASHCARD', { category: card.category, flashCardId: card.flashCardId });
    card._pending = 'delete';
  }

  function hasPendingChanges() {
    return state.pendingChanges.length > 0;
  }

  // ---------------------------------------------------------------------------
  // Save All (batch flush)
  // ---------------------------------------------------------------------------

  const OP_TO_ARRAY = {
    CREATE_FLASHCARD: 'createFlashCards',
    UPDATE_FLASHCARD: 'updateFlashCards',
    DELETE_FLASHCARD: 'deleteFlashCards',
  };

  function buildBatchItem(change) {
    const d = change.data;
    if (change.operation === 'CREATE_FLASHCARD') {
      const item = {
        character: d.character,
        pinyin: d.pinyin,
        meaning: d.meaning,
        hsk: d.hsk,
        category: d.category,
      };
      if (d.tags) item.tags = d.tags;
      return item;
    }
    if (change.operation === 'UPDATE_FLASHCARD') {
      const item = { category: d.category, flashCardId: d.flashCardId };
      ['character', 'pinyin', 'meaning', 'hsk', 'masteryStatus'].forEach(function (k) {
        if (d[k] !== undefined) item[k] = d[k];
      });
      return item;
    }
    return { category: d.category, flashCardId: d.flashCardId };
  }

  /** Pack pending changes into mixed BatchOperationRequests of ≤ 25 items. */
  function packChunks(changes) {
    const chunks = [];
    let current = null;
    changes.forEach(function (change) {
      if (!current || current.size >= BATCH_CHUNK_SIZE) {
        current = {
          createFlashCards: [],
          updateFlashCards: [],
          deleteFlashCards: [],
          entries: [],
          size: 0,
        };
        chunks.push(current);
      }
      const arrayName = OP_TO_ARRAY[change.operation];
      current[arrayName].push(buildBatchItem(change));
      current.entries.push({ changeId: change._id, arrayName: arrayName, index: current[arrayName].length - 1 });
      current.size += 1;
    });
    return chunks;
  }

  async function saveAll() {
    if (!hasPendingChanges() || state.isSaving) return;

    if (state.demoMode) {
      // Apply queued changes to the demo "database" so they persist.
      state.pendingChanges.forEach(function (change) {
        if (change.operation === 'CREATE_FLASHCARD') {
          state.demoCards.unshift(Object.assign({}, change.data, {
            flashCardId: 'DEMO_FC_' + uuid().slice(0, 8).toUpperCase(),
            masteryStatus: 'UNSTARTED',
            createdTime: new Date().toISOString(),
          }));
        } else if (change.operation === 'UPDATE_FLASHCARD') {
          const card = state.demoCards.find(function (c) { return c.flashCardId === change.data.flashCardId; });
          if (card) Object.assign(card, pickCardFields(change.data));
        } else if (change.operation === 'DELETE_FLASHCARD') {
          state.demoCards = state.demoCards.filter(function (c) { return c.flashCardId !== change.data.flashCardId; });
        }
      });
      state.pendingChanges = [];
      state.decks = buildDeckSummaries(state.demoCards);
      await loadActiveDeck(true);
      renderAll();
      if (MandoUi) MandoUi.toast('Demo mode: changes are not persisted.', 'success');
      return;
    }

    state.isSaving = true;
    renderSaveButton();

    const chunks = packChunks(state.pendingChanges.slice());
    const resolved = new Set();
    const ARRAY_TO_OP = {
      createFlashCards: 'CREATE_FLASHCARD',
      updateFlashCards: 'UPDATE_FLASHCARD',
      deleteFlashCards: 'DELETE_FLASHCARD',
    };

    for (const chunk of chunks) {
      const payload = {};
      if (chunk.createFlashCards.length) payload.createFlashCards = chunk.createFlashCards;
      if (chunk.updateFlashCards.length) payload.updateFlashCards = chunk.updateFlashCards;
      if (chunk.deleteFlashCards.length) payload.deleteFlashCards = chunk.deleteFlashCards;

      try {
        const res = await window.MandoApi.batch.flush(state.userId, payload);
        if (!res.ok) {
          console.error('Batch chunk failed', res.error);
          continue;
        }
        const results = res.data && Array.isArray(res.data.results) ? res.data.results : [];
        chunk.entries.forEach(function (entry) {
          const result = results.find(function (r) {
            return r.operation === ARRAY_TO_OP[entry.arrayName] && r.index === entry.index;
          });
          if (result && result.status === 'SUCCESS') {
            resolved.add(entry.changeId);
          }
        });
      } catch (err) {
        console.error('Batch chunk error', err);
      }
    }

    state.pendingChanges = state.pendingChanges.filter(function (c) { return !resolved.has(c._id); });
    const failedCount = state.pendingChanges.length;
    state.isSaving = false;

    if (failedCount === 0) {
      if (MandoUi) MandoUi.toast('All changes saved.', 'success');
    } else {
      if (MandoUi) MandoUi.toast(`${failedCount} change${failedCount === 1 ? '' : 's'} could not be saved and remain queued.`, 'error');
    }

    // Resync from the backend: fresh IDs for created cards, dropped deletes.
    await loadDecks();
    await loadActiveDeck(true);
    reapplyPendingChanges();
    renderAll();
  }

  /**
   * After a reload, re-apply the optimistic view for changes still in the
   * queue (e.g. items that failed to save): re-add pending creates, re-flag
   * pending updates/deletes.
   */
  function reapplyPendingChanges() {
    state.cards.forEach(function (c) { c._pending = null; });
    state.pendingChanges.forEach(function (change) {
      if (change.operation === 'CREATE_FLASHCARD') {
        const d = change.data;
        state.cards.unshift({
          flashCardId: 'PENDING_' + change._id,
          character: d.character,
          pinyin: d.pinyin,
          meaning: d.meaning,
          hsk: d.hsk,
          category: d.category,
          masteryStatus: 'UNSTARTED',
          createdTime: new Date().toISOString(),
          _pending: 'create',
        });
      } else {
        const card = state.cards.find(function (c) { return c.flashCardId === change.data.flashCardId; });
        if (!card) return;
        if (change.operation === 'UPDATE_FLASHCARD') {
          Object.assign(card, pickCardFields(change.data));
          card._pending = 'update';
        } else if (change.operation === 'DELETE_FLASHCARD') {
          card._pending = 'delete';
        }
      }
    });
  }

  function pickCardFields(data) {
    const out = {};
    ['character', 'pinyin', 'meaning', 'hsk', 'masteryStatus'].forEach(function (k) {
      if (data[k] !== undefined) out[k] = data[k];
    });
    return out;
  }

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------

  async function loadDecks() {
    if (state.demoMode) {
      state.decks = buildDeckSummaries(state.demoCards);
      return;
    }
    try {
      const res = await window.MandoApi.flashcards.getDeckAll(state.userId, {
        studyMode: 'MANAGE',
        pageSize: 50,
      });
      if (res.ok && res.data && Array.isArray(res.data.notes)) {
        state.decks = buildDeckSummaries(res.data.notes);
      } else if (res.status === 404) {
        state.decks = [];
      } else {
        console.warn('Deck summary load failed', res.error);
        if (MandoUi) MandoUi.toast('Could not load deck summaries.', 'error');
      }
    } catch (err) {
      console.error('Deck summary load error', err);
    }
  }

  async function loadActiveDeck(reset) {
    if (reset) {
      state.cards = [];
      state.nextToken = null;
      state.hasMore = false;
    }

    if (state.demoMode) {
      const filtered = state.activeCategory === ALL_DECKS
        ? state.demoCards.slice()
        : state.demoCards.filter(function (c) { return (c.category || 'MISCELLANEOUS') === state.activeCategory; });
      state.cards = filtered;
      state.hasMore = false;
      return;
    }

    const options = { studyMode: 'MANAGE', pageSize: PAGE_SIZE };
    if (state.nextToken) options.nextToken = state.nextToken;

    let res;
    try {
      if (state.activeCategory === ALL_DECKS) {
        res = await window.MandoApi.flashcards.getDeckAll(state.userId, options);
      } else {
        res = await window.MandoApi.flashcards.getDeckByCategory(state.userId, state.activeCategory, options);
      }
    } catch (err) {
      console.error('Active deck load error', err);
      res = { ok: false, status: 0, error: { message: err.message } };
    }

    if (res.ok && res.data && Array.isArray(res.data.notes)) {
      state.cards = state.cards.concat(res.data.notes);
      state.nextToken = res.data.nextPageStateToken || null;
      state.hasMore = !!state.nextToken;
    } else if (res.status === 404) {
      state.hasMore = false;
      state.nextToken = null;
    } else {
      if (MandoUi) MandoUi.toast('Could not load this deck. Please try again.', 'error');
      state.hasMore = false;
    }
  }

  // ---------------------------------------------------------------------------
  // Rendering: deck grid
  // ---------------------------------------------------------------------------

  function renderDeckGrid() {
    const grid = $('deck-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const summaries = mergeDeckSummaries();
    const allCount = summaries.reduce(function (sum, d) { return sum + d.count; }, 0);
    const allMastered = summaries.reduce(function (sum, d) { return sum + d.masteredCount; }, 0);
    const allPercent = allCount > 0 ? Math.round((allMastered / allCount) * 100) : 0;

    const decksToRender = [{
      category: ALL_DECKS,
      displayName: 'All Decks',
      count: allCount,
      masteredCount: allMastered,
      percent: allPercent,
      icon: 'layers',
      badge: 'System',
    }].concat(summaries.map(function (d) {
      return Object.assign({ icon: 'style', badge: null }, d);
    }));

    decksToRender.forEach(function (deck) {
      const isActive = deck.category === state.activeCategory;
      const card = document.createElement('button');
      card.type = 'button';
      card.className =
        'text-left group relative bg-surface-container-lowest rounded-xl p-md transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ' +
        (isActive ? 'border-2 border-primary shadow-lg' : 'border border-outline-variant hover:border-primary');
      card.innerHTML = `
        <div class="flex justify-between items-start mb-4">
          <div class="bg-primary-container/20 p-2 rounded-lg">
            <span class="material-symbols-outlined text-primary text-3xl">${escapeHtml(deck.icon)}</span>
          </div>
          ${isActive
            ? '<span class="bg-primary text-on-primary text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider">Active Edit</span>'
            : (deck.badge ? `<span class="bg-surface-container-highest text-on-surface-variant text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider">${escapeHtml(deck.badge)}</span>` : '')}
        </div>
        <h4 class="font-headline-md text-lg text-on-surface mb-1">${escapeHtml(deck.displayName)}</h4>
        <p class="text-label-caps text-on-surface-variant mb-6">${deck.count} card${deck.count === 1 ? '' : 's'}</p>
        <div class="space-y-4">
          <div class="flex justify-between items-end text-label-caps">
            <span class="text-on-surface-variant">${deck.count} Cards</span>
            <span class="text-primary font-bold">${deck.percent}% Mastered</span>
          </div>
          <div class="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
            <div class="h-full bg-primary transition-all duration-1000" style="width: ${deck.percent}%;"></div>
          </div>
        </div>
      `;
      card.addEventListener('click', function () {
        selectDeck(deck.category);
      });
      grid.appendChild(card);
    });

    if (summaries.length === 0 && !state.demoMode) {
      const hint = document.createElement('p');
      hint.className = 'text-sm text-on-surface-variant sm:col-span-2 lg:col-span-3';
      hint.textContent = 'No decks yet. Create your first deck from the Flashcards hub.';
      grid.appendChild(hint);
    }
  }

  async function selectDeck(category) {
    if (category === state.activeCategory) return;
    state.activeCategory = category;
    state.searchQuery = '';
    const searchInput = $('card-search-input');
    if (searchInput) searchInput.value = '';
    renderEditorHeader();
    renderDeckGrid();
    renderTable();
    await loadActiveDeck(true);
    reapplyPendingChanges();
    renderTable();
    renderFooter();
  }

  // ---------------------------------------------------------------------------
  // Rendering: editor header, table, footer, save button
  // ---------------------------------------------------------------------------

  function renderEditorHeader() {
    const name = state.activeCategory === ALL_DECKS ? 'All Decks' : displayCategory(state.activeCategory);
    setText('active-deck-name', name);

    const badge = $('active-deck-badge');
    const deck = state.decks.find(function (d) { return d.category === state.activeCategory; });
    if (badge) {
      if (deck) {
        badge.textContent = `${deck.count} card${deck.count === 1 ? '' : 's'}`;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }
  }

  function visibleCards() {
    const query = state.searchQuery.trim().toLowerCase();
    if (!query) return state.cards;
    return state.cards.filter(function (c) {
      return [c.character, c.pinyin, c.meaning].some(function (field) {
        return String(field || '').toLowerCase().indexOf(query) !== -1;
      });
    });
  }

  function statusBadgeHtml(card) {
    const badge = STATUS_BADGES[card.masteryStatus] || STATUS_BADGES.UNSTARTED;
    const unsaved = card._pending
      ? '<span class="ml-xs text-[9px] font-bold text-error uppercase tracking-wider">Unsaved</span>'
      : '';
    return `<span class="${badge.classes} text-[10px] px-2 py-0.5 rounded-md font-bold uppercase">${badge.label}</span>${unsaved}`;
  }

  function renderTable() {
    const tbody = $('card-table-body');
    if (!tbody) return;

    const cards = visibleCards();
    if (cards.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="px-md py-lg text-center text-on-surface-variant">
            ${state.searchQuery
              ? `No cards match "${escapeHtml(state.searchQuery)}".`
              : 'No cards in this deck yet. Click <strong>Add Card</strong> to create one.'}
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = cards.map(function (card) {
      const isDeleted = card._pending === 'delete';
      const rowClasses = isDeleted
        ? 'opacity-40 transition-colors'
        : 'hover:bg-primary-container/5 transition-colors group';
      const actions = isDeleted
        ? '<span class="text-label-caps text-on-surface-variant italic">Pending delete</span>'
        : `
          <div class="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button class="p-2 text-outline hover:text-primary transition-colors" data-action="edit" data-id="${escapeHtml(card.flashCardId)}" title="Edit card">
              <span class="material-symbols-outlined text-lg">edit</span>
            </button>
            <button class="p-2 text-outline hover:text-error transition-colors" data-action="delete" data-id="${escapeHtml(card.flashCardId)}" title="Delete card">
              <span class="material-symbols-outlined text-lg">delete</span>
            </button>
          </div>
        `;
      return `
        <tr class="${rowClasses}">
          <td class="px-md py-5"><span class="font-character-display text-2xl text-on-surface">${escapeHtml(card.character || '')}</span></td>
          <td class="px-md py-5"><span class="text-body-md text-secondary font-medium">${escapeHtml(card.pinyin || '')}</span></td>
          <td class="px-md py-5"><span class="text-body-md text-on-surface">${escapeHtml(card.meaning || '')}</span></td>
          <td class="px-md py-5">${statusBadgeHtml(card)}</td>
          <td class="px-md py-5 text-right">${actions}</td>
        </tr>
      `;
    }).join('');
  }

  function renderFooter() {
    const showing = $('showing-count');
    if (showing) {
      const total = state.cards.length;
      showing.textContent = `Showing ${total} card${total === 1 ? '' : 's'}${state.hasMore ? ' (more available)' : ''}`;
    }
    const loadMoreBtn = $('load-more-btn');
    if (loadMoreBtn) {
      loadMoreBtn.disabled = !state.hasMore;
    }
  }

  function renderSaveButton() {
    const btn = $('save-all-btn');
    const badge = $('pending-badge');
    const count = state.pendingChanges.length;
    if (btn) {
      btn.disabled = count === 0 || state.isSaving;
      btn.innerHTML = `
        <span class="material-symbols-outlined text-lg">save</span>
        ${state.isSaving ? 'Saving…' : 'Save All'}
        <span id="pending-badge" class="${count === 0 ? 'hidden' : 'flex'} absolute -top-2 -right-2 min-w-[20px] h-5 px-1 bg-error text-on-error text-[10px] font-bold rounded-full items-center justify-center">${count}</span>
      `;
    } else if (badge) {
      badge.textContent = String(count);
      badge.classList.toggle('hidden', count === 0);
      badge.classList.toggle('flex', count > 0);
    }
  }

  function renderAll() {
    renderDeckGrid();
    renderEditorHeader();
    renderTable();
    renderFooter();
    renderSaveButton();
  }

  // ---------------------------------------------------------------------------
  // Add / Edit card modal
  // ---------------------------------------------------------------------------

  function populateCategorySelect(selected) {
    const select = $('card-field-category');
    if (!select) return;

    const categories = state.decks.map(function (d) { return d.category; });
    if (categories.indexOf('MISCELLANEOUS') === -1) categories.unshift('MISCELLANEOUS');
    if (selected && categories.indexOf(selected) === -1) categories.push(selected);

    select.innerHTML = categories.map(function (cat) {
      return `<option value="${escapeHtml(cat)}" ${cat === selected ? 'selected' : ''}>${escapeHtml(displayCategory(cat))}</option>`;
    }).join('');
  }

  function openCardModal(card) {
    state.editingCardId = card ? card.flashCardId : null;

    setText('card-modal-title', card ? 'Edit Card' : 'Add Card');
    const submitBtn = $('card-form-submit');
    if (submitBtn) submitBtn.textContent = card ? 'Save Changes' : 'Add Card';

    const category = card
      ? (card.category || 'MISCELLANEOUS')
      : (state.activeCategory === ALL_DECKS ? 'MISCELLANEOUS' : state.activeCategory);
    populateCategorySelect(category);

    const setVal = function (id, value) { const el = $(id); if (el) el.value = value || ''; };
    setVal('card-field-character', card ? card.character : '');
    setVal('card-field-pinyin', card ? card.pinyin : '');
    setVal('card-field-meaning', card ? card.meaning : '');
    setVal('card-field-tags', card ? card.tags : '');
    const hskSelect = $('card-field-hsk');
    if (hskSelect) hskSelect.value = card && card.hsk ? card.hsk : 'HSK4';

    // Batch updates cannot change tags (schema has no tags field), so the
    // tags input is only meaningful for new cards.
    const tagsField = $('card-field-tags');
    if (tagsField && tagsField.parentElement) {
      tagsField.parentElement.classList.toggle('hidden', !!card);
    }
    const hint = $('category-change-hint');
    if (hint) hint.classList.toggle('hidden', !card || card._pending === 'create');

    const error = $('card-form-error');
    if (error) {
      error.classList.add('hidden');
      error.textContent = '';
    }

    // Re-baseline pinyin auto-fill after the fields are populated: automatic
    // for new cards; in edit mode the existing pinyin belongs to the current
    // character and is preserved until the character actually changes.
    cardFormPinyin.reset({ auto: !card });

    const modal = $('card-modal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
    const characterInput = $('card-field-character');
    if (characterInput) characterInput.focus();
  }

  function closeCardModal() {
    const modal = $('card-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
    state.editingCardId = null;
  }

  function showCardFormError(message) {
    const error = $('card-form-error');
    if (!error) return;
    error.textContent = message;
    error.classList.remove('hidden');
  }

  async function submitCardForm(event) {
    event.preventDefault();

    const character = ($('card-field-character') ? $('card-field-character').value : '').trim();
    const pinyin = ($('card-field-pinyin') ? $('card-field-pinyin').value : '').trim();
    const meaning = ($('card-field-meaning') ? $('card-field-meaning').value : '').trim();
    const hsk = $('card-field-hsk') ? $('card-field-hsk').value : 'HSK4';
    const category = $('card-field-category') ? $('card-field-category').value : 'MISCELLANEOUS';
    const tags = ($('card-field-tags') ? $('card-field-tags').value : '').trim();

    if (!character) {
      showCardFormError('Chinese character(s) are required.');
      return;
    }

    if (!state.editingCardId) {
      // Add mode.
      const data = { character: character, pinyin: pinyin, meaning: meaning, hsk: hsk, category: category };
      if (tags) data.tags = tags;
      queueCreate(data);
      closeCardModal();
      renderAll();
      return;
    }

    // Edit mode.
    const card = state.cards.find(function (c) { return c.flashCardId === state.editingCardId; });
    if (!card) {
      closeCardModal();
      return;
    }

    const categoryChanged = category !== (card.category || 'MISCELLANEOUS');
    if (categoryChanged && card._pending !== 'create') {
      closeCardModal();
      const proceed = MandoUi
        ? await MandoUi.confirm(
            'Move card to another deck?',
            'Changing the deck requires deleting and recreating this card. Progress (mastery) will reset to New. Proceed?',
            { okText: 'Move Card' }
          )
        : true;
      if (!proceed) return;

      queueDelete(card);
      const newData = { character: character, pinyin: pinyin, meaning: meaning, hsk: hsk, category: category };
      queueCreate(newData);
      state.cards = state.cards.filter(function (c) { return c.flashCardId !== card.flashCardId; });
    } else {
      const fields = {};
      if (character !== (card.character || '')) fields.character = character;
      if (pinyin !== (card.pinyin || '')) fields.pinyin = pinyin;
      if (meaning !== (card.meaning || '')) fields.meaning = meaning;
      if (hsk !== (card.hsk || '')) fields.hsk = hsk;
      if (categoryChanged) fields.category = category; // pending-create cards: category is just data

      if (Object.keys(fields).length === 0) {
        closeCardModal();
        return;
      }
      queueUpdate(card, fields);
    }

    closeCardModal();
    renderAll();
  }

  /**
   * Authoritative deck summaries plus deltas from the pending queue, so grid
   * counts stay consistent before Save All without double-counting.
   */
  function mergeDeckSummaries() {
    const map = {};
    state.decks.forEach(function (d) {
      map[d.category] = Object.assign({}, d);
    });
    state.pendingChanges.forEach(function (change) {
      const category = change.data.category;
      if (!map[category]) {
        map[category] = { category: category, displayName: displayCategory(category), count: 0, masteredCount: 0, percent: 0 };
      }
      if (change.operation === 'CREATE_FLASHCARD') {
        map[category].count += 1;
      } else if (change.operation === 'DELETE_FLASHCARD') {
        map[category].count = Math.max(0, map[category].count - 1);
        if (change.data.masteryStatus === 'MASTERED') {
          map[category].masteredCount = Math.max(0, map[category].masteredCount - 1);
        }
      }
    });
    return Object.keys(map).map(function (key) {
      const deck = map[key];
      deck.percent = deck.count > 0 ? Math.round((deck.masteredCount / deck.count) * 100) : 0;
      return deck;
    }).sort(function (a, b) { return b.count - a.count; });
  }

  // ---------------------------------------------------------------------------
  // Card actions (event delegation)
  // ---------------------------------------------------------------------------

  function findCardById(id) {
    return state.cards.find(function (c) { return c.flashCardId === id; }) || null;
  }

  async function handleDelete(card) {
    const proceed = MandoUi
      ? await MandoUi.confirm('Delete this card?', `"${card.character}" will be removed from the deck when you save.`, { okText: 'Delete' })
      : true;
    if (!proceed) return;
    queueDelete(card);
    renderAll();
  }

  // ---------------------------------------------------------------------------
  // Interactions
  // ---------------------------------------------------------------------------

  function initInteractions() {
    if (window.MandoPinyin) {
      cardFormPinyin = window.MandoPinyin.autoFill(
        $('card-field-character'),
        $('card-field-pinyin'),
        { prefillIsManual: true }
      );
    }

    const tbody = $('card-table-body');
    if (tbody) {
      tbody.addEventListener('click', function (e) {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const card = findCardById(btn.dataset.id);
        if (!card) return;
        if (btn.dataset.action === 'edit') {
          openCardModal(card);
        } else if (btn.dataset.action === 'delete') {
          handleDelete(card);
        }
      });
    }

    const bind = function (id, fn) {
      const el = $(id);
      if (el) el.addEventListener('click', fn);
    };

    bind('add-card-btn', function () { openCardModal(null); });
    bind('save-all-btn', saveAll);
    bind('load-more-btn', async function () {
      await loadActiveDeck(false);
      reapplyPendingChanges();
      renderTable();
      renderFooter();
    });
    bind('study-now-btn', function () {
      // Pick a mode the deck actually has cards for: spaced review needs at
      // least one mastered card, otherwise a mixed review is the useful path.
      const summaries = mergeDeckSummaries();
      if (state.activeCategory === ALL_DECKS) {
        const anyMastered = summaries.some(function (d) { return d.masteredCount > 0; });
        window.location.href = `study-mode.html?mode=${anyMastered ? 'spaced' : 'random'}&global=true`;
        return;
      }
      const deck = summaries.find(function (d) { return d.category === state.activeCategory; });
      const mode = deck && deck.masteredCount > 0 ? 'spaced' : 'random';
      window.location.href = `study-mode.html?mode=${mode}&category=${encodeURIComponent(state.activeCategory)}`;
    });

    const searchInput = $('card-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        state.searchQuery = searchInput.value || '';
        renderTable();
      });
    }

    // Modal wiring.
    const modal = $('card-modal');
    const form = $('card-form');
    const cancelBtn = $('card-form-cancel');
    if (form) form.addEventListener('submit', submitCardForm);
    if (cancelBtn) cancelBtn.addEventListener('click', closeCardModal);
    if (modal) {
      modal.addEventListener('click', function (e) {
        if (e.target === modal) closeCardModal();
      });
    }
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
        closeCardModal();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveAll();
      }
    });

    window.addEventListener('beforeunload', function (e) {
      if (hasPendingChanges() && !state.demoMode) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Main init
  // ---------------------------------------------------------------------------

  async function init() {
    try {
      window.MandoShell.renderSidebarProfile();
      window.MandoShell.initMobileDrawer({ sidebarId: 'sidebar', overlayId: 'sidebar-overlay', toggleId: 'mobile-menu-toggle' });

      initInteractions();

      await loadDecks();
      await loadActiveDeck(true);
      renderAll();
    } catch (err) {
      console.error('Deck editor init failed:', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
