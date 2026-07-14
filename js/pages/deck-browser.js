/**
 * MandoLearning — Deck Browser Page Logic
 *
 * Browse flashcards by HSK level or category. All edits, deletes, and mastery
 * changes are queued and flushed via the batch endpoint on "Save All".
 */

import { api } from '../api-client.js';
import {
    subscribe,
    getState,
    queueChange,
} from '../state.js';
import { toast, modal, confirm, spinner } from '../ui-components.js';
import { validateFlashcard, escapeHtml, normalizeHsk, normalizeCategory } from '../utils.js';
import { initAutoPinyin } from '../pinyin-helper.js';

// =============================================================================
// STATE
// =============================================================================

const state = {
    filter: 'hsk1',           // hsk1..hsk6 | categories
    category: 'VERBS',        // active when filter === 'categories'
    cards: [],                // loaded cards for current filter
    nextToken: null,          // pagination cursor
    searchQuery: '',          // client-side search
    isLoading: false,
};

// =============================================================================
// DOM REFERENCES
// =============================================================================

const els = {
    filterTabs: document.getElementById('filter-tabs'),
    categoryTabs: document.getElementById('category-tabs'),
    searchInput: document.getElementById('deck-search'),
    cardGrid: document.getElementById('card-grid'),
    loadingState: document.getElementById('deck-loading'),
    emptyState: document.getElementById('deck-empty-state'),
    loadMoreContainer: document.getElementById('load-more-container'),
    btnLoadMore: document.getElementById('btn-load-more'),
    btnSaveAll: document.getElementById('btn-save-all'),
    pendingBadge: document.getElementById('pending-badge'),
    pendingIndicator: document.getElementById('pending-changes-indicator'),
    tplCardItem: document.getElementById('tpl-card-item'),
    tplEditModal: document.getElementById('tpl-edit-card-modal'),
};

// =============================================================================
// INITIALIZATION
// =============================================================================

export function init() {
    initFilterTabs();
    initSearch();
    initSaveAll();
    initStateSubscriptions();
    loadDeck();

    // Register batch failure callback so main.js can notify us of partial failures
    window.__mandoOnBatchFailure__ = highlightFailedCards;
}

function initFilterTabs() {
    els.filterTabs.addEventListener('click', (e) => {
        const tab = e.target.closest('.filter-tab');
        if (!tab) return;

        state.filter = tab.dataset.filter;
        state.nextToken = null;
        state.cards = [];
        updateFilterTabStyles();

        if (state.filter === 'categories') {
            els.categoryTabs.classList.remove('hidden');
            els.categoryTabs.classList.add('flex');
        } else {
            els.categoryTabs.classList.add('hidden');
            els.categoryTabs.classList.remove('flex');
        }

        loadDeck();
    });

    els.categoryTabs.addEventListener('click', (e) => {
        const tab = e.target.closest('.category-tab');
        if (!tab) return;

        state.category = tab.dataset.category;
        state.nextToken = null;
        state.cards = [];
        updateCategoryTabStyles();
        loadDeck();
    });
}

function initSearch() {
    els.searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.trim().toLowerCase();
        renderCards();
    });
}

function initSaveAll() {
    els.btnSaveAll.addEventListener('click', () => window.__mandoHandleSaveAll__?.());
}

function initStateSubscriptions() {
    subscribe('pendingChanges', (changes) => {
        updatePendingIndicator(changes);
    });
}

// =============================================================================
// FILTER UI
// =============================================================================

function updateFilterTabStyles() {
    els.filterTabs.querySelectorAll('.filter-tab').forEach((tab) => {
        if (tab.dataset.filter === state.filter) {
            tab.className = 'filter-tab px-md py-xs rounded-full font-label-caps text-label-caps font-bold bg-primary text-on-primary transition-all';
        } else {
            tab.className = 'filter-tab px-md py-xs rounded-full font-label-caps text-label-caps font-medium text-on-surface-variant hover:bg-surface-container-high transition-all';
        }
    });
}

function updateCategoryTabStyles() {
    els.categoryTabs.querySelectorAll('.category-tab').forEach((tab) => {
        if (tab.dataset.category === state.category) {
            tab.className = 'category-tab px-md py-xs rounded-full font-label-caps text-label-caps font-bold bg-secondary text-on-secondary transition-all';
        } else {
            tab.className = 'category-tab px-md py-xs rounded-full font-label-caps text-label-caps font-medium text-on-surface-variant hover:bg-surface-container-high transition-all';
        }
    });
}

// =============================================================================
// DATA LOADING
// =============================================================================

async function loadDeck(append = false) {
    const userId = getState('userId');
    if (!userId) {
        toast.error('No user ID. Cannot load deck.');
        return;
    }

    state.isLoading = true;
    showLoading(true);

    let result;
    if (state.filter === 'categories') {
        result = await api.getDeckByCategory(userId, state.category, {
            pageSize: 20,
            nextToken: state.nextToken || undefined,
            studyMode: 'MANAGE',
        });
    } else {
        const hskLevel = normalizeHsk(state.filter);
        result = await api.getDeckByHsk(userId, hskLevel, {
            pageSize: 20,
            nextToken: state.nextToken || undefined,
            studyMode: 'MANAGE',
        });
    }

    state.isLoading = false;
    showLoading(false);

    if (!result.ok) {
        toast.error('Failed to load deck: ' + (result.error?.message || 'Unknown error'));
        if (!append) {
            state.cards = [];
            renderCards();
        }
        return;
    }

    const newCards = result.data?.notes || [];
    state.nextToken = result.data?.nextPageStateToken || null;

    if (append) {
        state.cards = [...state.cards, ...newCards];
    } else {
        state.cards = newCards;
    }

    renderCards();
}

function showLoading(show) {
    if (show) {
        els.loadingState.classList.remove('hidden');
        els.emptyState.classList.add('hidden');
        els.loadMoreContainer.classList.add('hidden');
    } else {
        els.loadingState.classList.add('hidden');
    }
}

// =============================================================================
// RENDERING
// =============================================================================

function renderCards() {
    const filtered = filterCards(state.cards, state.searchQuery);

    if (filtered.length === 0) {
        els.cardGrid.innerHTML = '';
        els.emptyState.classList.remove('hidden');
        els.loadMoreContainer.classList.add('hidden');
        return;
    }

    els.emptyState.classList.add('hidden');
    els.cardGrid.innerHTML = '';

    filtered.forEach((card) => {
        els.cardGrid.appendChild(renderCardItem(card));
    });

    if (state.nextToken) {
        els.loadMoreContainer.classList.remove('hidden');
    } else {
        els.loadMoreContainer.classList.add('hidden');
    }
}

function filterCards(cards, query) {
    if (!query) return cards;
    return cards.filter((c) => {
        const text = `${c.character} ${c.pinyin || ''} ${c.meaning || ''} ${c.category || ''}`.toLowerCase();
        return text.includes(query);
    });
}

function renderCardItem(card) {
    const clone = els.tplCardItem.content.cloneNode(true);
    const el = clone.querySelector('.card-item');
    el.dataset.flashcardId = card.flashCardId;
    el.dataset.category = card.category;

    clone.querySelector('.card-character').textContent = card.character || '—';
    clone.querySelector('.card-pinyin').textContent = card.pinyin || '';
    clone.querySelector('.card-meaning').textContent = card.meaning || '';
    clone.querySelector('.card-hsk').textContent = card.hsk || 'HSK1';
    clone.querySelector('.card-category').textContent = card.category || 'MISCELLANEOUS';

    const mastery = card.masteryStatus || 'UNSTARTED';
    const masteryColor = mastery === 'MASTERED' ? 'text-tertiary' : mastery === 'LEARNING' ? 'text-primary' : 'text-on-surface-variant';
    const masteryBarColor = mastery === 'MASTERED' ? 'bg-tertiary' : mastery === 'LEARNING' ? 'bg-primary' : 'bg-surface-container-highest';
    const masteryPct = mastery === 'MASTERED' ? 100 : mastery === 'LEARNING' ? 50 : 0;

    const masteryTextEl = clone.querySelector('.card-mastery-text');
    masteryTextEl.textContent = mastery;
    masteryTextEl.className = `font-bold card-mastery-text ${masteryColor}`;

    const masteryBarEl = clone.querySelector('.card-mastery-bar');
    masteryBarEl.style.width = `${masteryPct}%`;
    masteryBarEl.className = `h-full transition-all duration-1000 card-mastery-bar ${masteryBarColor}`;

    clone.querySelector('.btn-edit-card').addEventListener('click', () => openEditCardModal(card));
    clone.querySelector('.btn-delete-card').addEventListener('click', () => handleDeleteCard(card));

    return clone;
}

// =============================================================================
// CARD ACTIONS
// =============================================================================

function openEditCardModal(card) {
    const clone = els.tplEditModal.content.cloneNode(true);

    clone.querySelector('#edit-card-character').value = card.character || '';
    clone.querySelector('#edit-card-pinyin').value = card.pinyin || '';
    clone.querySelector('#edit-card-meaning').value = card.meaning || '';
    clone.querySelector('#edit-card-hsk').value = card.hsk || 'HSK1';
    clone.querySelector('#edit-card-mastery').value = card.masteryStatus || 'UNSTARTED';

    modal.open({
        title: 'Edit Card',
        content: clone,
        confirmText: 'Queue Update',
        onConfirm: () => {
            const character = document.getElementById('edit-card-character').value.trim();
            const pinyin = document.getElementById('edit-card-pinyin').value.trim();
            const meaning = document.getElementById('edit-card-meaning').value.trim();
            const hsk = document.getElementById('edit-card-hsk').value;
            const masteryStatus = document.getElementById('edit-card-mastery').value;

            const validation = validateFlashcard({ character, hsk, meaning, pinyin });
            if (!validation.valid) {
                toast.error(validation.errors.join(' '));
                return false;
            }

            const changes = {};
            if (character !== card.character) changes.character = character;
            if (pinyin !== (card.pinyin || '')) changes.pinyin = pinyin;
            if (meaning !== (card.meaning || '')) changes.meaning = meaning;
            if (hsk !== card.hsk) changes.hsk = hsk;
            if (masteryStatus !== card.masteryStatus) changes.masteryStatus = masteryStatus;

            if (Object.keys(changes).length === 0) {
                toast.info('No changes to save.');
                return true;
            }

            queueChange('UPDATE_FLASHCARD', {
                category: card.category,
                flashCardId: card.flashCardId,
                ...changes,
            });

            toast.success('Update queued. Press Ctrl+S to save.');
            return true;
        },
    });

    // Auto-fill pinyin if the user clears it and re-blurs the character field
    initAutoPinyin(
        document.getElementById('edit-card-character'),
        document.getElementById('edit-card-pinyin')
    );
}

async function handleDeleteCard(card) {
    const ok = await confirm(`Delete "${card.character}"? This cannot be undone.`);
    if (!ok) return;

    queueChange('DELETE_FLASHCARD', {
        category: card.category,
        flashCardId: card.flashCardId,
    });

    // Optimistically remove from UI
    const el = document.querySelector(`.card-item[data-flashcard-id="${card.flashCardId}"]`);
    if (el) {
        el.style.opacity = '0.5';
        el.style.pointerEvents = 'none';
    }

    toast.success('Delete queued. Press Ctrl+S to save.');
}

// =============================================================================
// PENDING CHANGES UI
// =============================================================================

function updatePendingIndicator(changes) {
    const count = changes.length;
    if (count > 0) {
        els.pendingBadge.classList.remove('hidden');
        els.pendingBadge.textContent = count;
        els.pendingIndicator.classList.add('text-primary');
        els.pendingIndicator.classList.remove('text-on-surface-variant');
        els.pendingIndicator.title = `${count} pending change${count > 1 ? 's' : ''}`;
    } else {
        els.pendingBadge.classList.add('hidden');
        els.pendingIndicator.classList.remove('text-primary');
        els.pendingIndicator.classList.add('text-on-surface-variant');
        els.pendingIndicator.title = 'No pending changes';
    }
}

// =============================================================================
// PARTIAL FAILURE UI
// =============================================================================

/** Highlight cards that failed to save. Called by main.js after batch attempt. */
export function highlightFailedCards(failedChanges) {
    document.querySelectorAll('.card-item').forEach((el) => {
        el.classList.remove('border-error', 'ring-2', 'ring-error');
    });

    failedChanges.forEach(({ change }) => {
        const flashCardId = change.data?.flashCardId;
        if (!flashCardId) return;
        const el = document.querySelector(`.card-item[data-flashcard-id="${flashCardId}"]`);
        if (el) {
            el.classList.add('border-error', 'ring-2', 'ring-error');
        }
    });
}

// =============================================================================
// LOAD MORE
// =============================================================================

els.btnLoadMore.addEventListener('click', () => {
    if (state.nextToken && !state.isLoading) {
        loadDeck(true);
    }
});

// =============================================================================
// RUN
// =============================================================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
