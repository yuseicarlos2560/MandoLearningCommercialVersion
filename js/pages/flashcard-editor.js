/**
 * MandoLearning — Flashcard Editor Page Logic
 *
 * Create standalone flashcards and queue them for batch save.
 */

import { getState, queueChange, subscribe, removePendingChange } from '../state.js';
import { toast } from '../ui-components.js';
import { validateFlashcard, normalizeCategory } from '../utils.js';
import { initAutoPinyin } from '../pinyin-helper.js';

// =============================================================================
// DOM REFERENCES
// =============================================================================

const els = {
    character: document.getElementById('edit-character'),
    pinyin: document.getElementById('edit-pinyin'),
    meaning: document.getElementById('edit-meaning'),
    hsk: document.getElementById('edit-hsk'),
    category: document.getElementById('edit-category'),
    tags: document.getElementById('edit-tags'),
    btnAddCard: document.getElementById('btn-add-card'),
    btnClearForm: document.getElementById('btn-clear-form'),
    btnSaveAll: document.getElementById('btn-save-all'),
    pendingBadge: document.getElementById('pending-badge'),
    queueCount: document.getElementById('queue-count'),
    queuedList: document.getElementById('queued-cards-list'),
    queueEmpty: document.getElementById('queue-empty'),
};

// =============================================================================
// INITIALIZATION
// =============================================================================

export function init() {
    initForm();
    initSaveAll();
    initStateSubscriptions();
    renderQueuedCards();
}

function initForm() {
    els.btnAddCard.addEventListener('click', handleAddCard);
    els.btnClearForm.addEventListener('click', clearForm);

    // Auto-fill pinyin when the user leaves the character field
    initAutoPinyin(els.character, els.pinyin);

    // Allow Enter in character field to add card
    els.character.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddCard();
        }
    });
}

function initSaveAll() {
    els.btnSaveAll.addEventListener('click', () => window.__mandoHandleSaveAll__?.());
}

function initStateSubscriptions() {
    subscribe('pendingChanges', (changes) => {
        updatePendingBadge(changes);
        renderQueuedCards();
    });
}

// =============================================================================
// FORM HANDLING
// =============================================================================

function handleAddCard() {
    const data = readForm();

    const validation = validateFlashcard(data);
    if (!validation.valid) {
        toast.error(validation.errors.join(' '));
        return;
    }

    queueChange('CREATE_FLASHCARD', {
        character: data.character,
        pinyin: data.pinyin,
        meaning: data.meaning,
        hsk: data.hsk,
        category: data.category,
        tags: data.tags,
        sessionId: 'NO_SESSION',
    });

    toast.success('Card queued. Press Ctrl+S to save.');
    clearForm();
    els.character.focus();
}

function readForm() {
    return {
        character: els.character.value.trim(),
        pinyin: els.pinyin.value.trim(),
        meaning: els.meaning.value.trim(),
        hsk: els.hsk.value,
        category: normalizeCategory(els.category.value),
        tags: els.tags.value.trim(),
    };
}

function clearForm() {
    els.character.value = '';
    els.pinyin.value = '';
    els.meaning.value = '';
    els.hsk.value = 'HSK1';
    els.category.value = 'VERBS';
    els.tags.value = '';
}

// =============================================================================
// QUEUED CARDS LIST
// =============================================================================

function renderQueuedCards() {
    const changes = getState('pendingChanges').filter(
        (c) => c.operation === 'CREATE_FLASHCARD'
    );

    els.queueCount.textContent = `${changes.length} card${changes.length === 1 ? '' : 's'} queued`;

    if (changes.length === 0) {
        els.queuedList.innerHTML = '';
        els.queuedList.appendChild(els.queueEmpty);
        els.queueEmpty.classList.remove('hidden');
        return;
    }

    els.queueEmpty.classList.add('hidden');
    els.queuedList.innerHTML = '';

    changes.forEach((change) => {
        const card = change.data;
        const el = document.createElement('div');
        el.className = 'flex items-center justify-between p-sm bg-surface-container-low rounded-lg border border-outline-variant';
        el.innerHTML = `
            <div class="flex items-center gap-md overflow-hidden">
                <span class="font-character-display text-xl text-on-surface">${escapeHtml(card.character)}</span>
                <div class="min-w-0">
                    <p class="text-sm text-on-surface-variant truncate">${escapeHtml(card.pinyin || '—')} • ${escapeHtml(card.meaning || '—')}</p>
                    <p class="text-xs text-on-surface-variant">${card.hsk} • ${card.category}${card.tags ? ` • ${escapeHtml(card.tags)}` : ''}</p>
                </div>
            </div>
            <button class="p-2 text-on-surface-variant hover:text-error rounded-lg hover:bg-error-container/20 transition-colors" data-change-id="${change._id}" title="Remove">
                <span class="material-symbols-outlined">close</span>
            </button>
        `;

        el.querySelector('button[data-change-id]').addEventListener('click', () => {
            removePendingChange(change._id);
        });

        els.queuedList.appendChild(el);
    });
}

function updatePendingBadge(changes) {
    const count = changes.length;
    if (count > 0) {
        els.pendingBadge.classList.remove('hidden');
        els.pendingBadge.textContent = count;
    } else {
        els.pendingBadge.classList.add('hidden');
    }
}

// =============================================================================
// UTILITY
// =============================================================================

function escapeHtml(str) {
    if (typeof str !== 'string') return String(str);
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// =============================================================================
// RUN
// =============================================================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
