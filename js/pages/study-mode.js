/**
 * MandoLearning — Study Mode Page Logic
 *
 * Focused flashcard study session. Loads a deck with a chosen study mode,
 * presents cards one at a time, and queues mastery updates for batch save.
 */

import { api } from '../api-client.js';
import { getState, queueChange, flushPendingChanges, hasPendingChanges } from '../state.js';
import { toast, spinner } from '../ui-components.js';
import { normalizeHsk, normalizeCategory } from '../utils.js';

// =============================================================================
// STATE
// =============================================================================

const state = {
    mode: 'SPACED',           // NEW | DIFFICULTY | SPACED | RANDOM | CONFIDENCE
    deckType: 'menu',         // 'menu' | 'global' | 'hsk' | 'category'
    deckValue: '',            // HSK level or category name (empty for menu/global)
    cards: [],                // all loaded cards
    currentIndex: 0,          // position in cards
    answered: 0,              // cards rated
    correct: 0,               // cards marked "Got it"
    answerVisible: false,     // is answer side showing?
    sessionStartTime: null,   // Date.now() when session starts
};

// =============================================================================
// DOM REFERENCES
// =============================================================================

const els = {
    loadingState: document.getElementById('study-loading'),
    emptyState: document.getElementById('study-empty'),
    studyMenu: document.getElementById('study-menu'),
    hskDeckGrid: document.getElementById('hsk-deck-grid'),
    categoryDeckGrid: document.getElementById('category-deck-grid'),
    btnGlobalStudy: document.getElementById('btn-global-study'),
    studyInterface: document.getElementById('study-interface'),
    modeTitle: document.getElementById('mode-title'),
    progressText: document.getElementById('progress-text'),
    progressBar: document.getElementById('progress-bar'),
    flashcard: document.getElementById('flashcard'),
    cardHsk: document.getElementById('card-hsk'),
    cardCharacter: document.getElementById('card-character'),
    cardPinyin: document.getElementById('card-pinyin'),
    cardMeaning: document.getElementById('card-meaning'),
    answerContainer: document.getElementById('answer-container'),
    btnToggleAnswer: document.getElementById('btn-toggle-answer'),
    btnSkip: document.getElementById('btn-skip'),
    btnAgain: document.getElementById('btn-again'),
    btnGotIt: document.getElementById('btn-got-it'),
    btnEndSession: document.getElementById('btn-end-session'),
    responseActions: document.getElementById('response-actions'),
    sessionSummary: document.getElementById('session-summary'),
    summaryText: document.getElementById('summary-text'),
};

// =============================================================================
// INITIALIZATION
// =============================================================================

export function init() {
    parseUrlParams();
    renderStudyModeSidebar();
    updateModeLinks();
    initDeckMenu();
    initControls();
    initKeyboardShortcuts();
    state.sessionStartTime = Date.now();

    if (state.deckType === 'menu') {
        showMenu();
    } else {
        loadDeck();
    }
}

function parseUrlParams() {
    const params = new URLSearchParams(window.location.search);

    const mode = (params.get('mode') || 'SPACED').toUpperCase();
    const validModes = ['NEW', 'DIFFICULTY', 'SPACED', 'RANDOM', 'CONFIDENCE'];
    state.mode = validModes.includes(mode) ? mode : 'SPACED';

    const hsk = params.get('hsk');
    const category = params.get('category');
    const global = params.get('global');

    if (global !== null) {
        state.deckType = 'global';
        state.deckValue = 'ALL';
    } else if (category) {
        state.deckType = 'category';
        state.deckValue = normalizeCategory(category);
    } else if (hsk) {
        state.deckType = 'hsk';
        state.deckValue = normalizeHsk(hsk);
    } else {
        state.deckType = 'menu';
        state.deckValue = '';
    }
}

// =============================================================================
// DECK MENU
// =============================================================================

const HSK_DECKS = ['HSK1', 'HSK2', 'HSK3', 'HSK4', 'HSK5', 'HSK6'];
const CATEGORY_DECKS = ['VERBS', 'NOUNS', 'ADJECTIVES', 'TRAVEL', 'BUSINESS', 'DAILY', 'MISCELLANEOUS'];

function initDeckMenu() {
    if (!els.studyMenu || !els.hskDeckGrid || !els.categoryDeckGrid || !els.btnGlobalStudy) return;

    renderDeckMenu();
    els.btnGlobalStudy.addEventListener('click', selectGlobalStudy);
}

function renderDeckMenu() {
    els.hskDeckGrid.innerHTML = '';
    els.categoryDeckGrid.innerHTML = '';

    HSK_DECKS.forEach((hsk) => {
        const btn = document.createElement('button');
        btn.className = 'flex items-center justify-between p-base bg-surface-container-lowest border border-outline-variant rounded-xl hover:border-primary transition-all group text-left';
        btn.innerHTML = `
            <div class="flex items-center gap-sm">
                <div class="w-10 h-10 rounded-lg bg-primary-container/20 flex items-center justify-center text-primary">
                    <span class="material-symbols-outlined">layers</span>
                </div>
                <div>
                    <p class="text-sm font-bold text-on-surface">${hsk}</p>
                    <p class="text-xs text-on-surface-variant">Study this level</p>
                </div>
            </div>
            <span class="material-symbols-outlined text-outline-variant group-hover:text-primary transition-colors">chevron_right</span>
        `;
        btn.addEventListener('click', () => selectDeck('hsk', hsk));
        els.hskDeckGrid.appendChild(btn);
    });

    CATEGORY_DECKS.forEach((cat) => {
        const label = cat.charAt(0) + cat.slice(1).toLowerCase();
        const btn = document.createElement('button');
        btn.className = 'flex items-center justify-between p-base bg-surface-container-lowest border border-outline-variant rounded-xl hover:border-primary transition-all group text-left';
        btn.innerHTML = `
            <div class="flex items-center gap-sm">
                <div class="w-10 h-10 rounded-lg bg-secondary-container/30 flex items-center justify-center text-secondary">
                    <span class="material-symbols-outlined">folder</span>
                </div>
                <div>
                    <p class="text-sm font-bold text-on-surface">${label}</p>
                    <p class="text-xs text-on-surface-variant">Study this category</p>
                </div>
            </div>
            <span class="material-symbols-outlined text-outline-variant group-hover:text-primary transition-colors">chevron_right</span>
        `;
        btn.addEventListener('click', () => selectDeck('category', cat));
        els.categoryDeckGrid.appendChild(btn);
    });
}

function showMenu() {
    hideAllSections();
    els.studyMenu.classList.remove('hidden');
    els.studyMenu.classList.add('flex');
}

function selectDeck(type, value) {
    state.deckType = type;
    state.deckValue = value;
    state.mode = 'RANDOM';
    state.currentIndex = 0;
    state.answered = 0;
    state.correct = 0;
    state.answerVisible = false;
    state.sessionStartTime = Date.now();

    const params = new URLSearchParams();
    params.set('mode', state.mode.toLowerCase());
    if (type === 'hsk') params.set('hsk', value);
    if (type === 'category') params.set('category', value);
    history.replaceState(null, '', `study-mode.html?${params.toString()}`);

    renderStudyModeSidebar();
    updateModeLinks();
    loadDeck();
}

function selectGlobalStudy() {
    state.deckType = 'global';
    state.deckValue = 'ALL';
    state.mode = 'RANDOM';
    state.currentIndex = 0;
    state.answered = 0;
    state.correct = 0;
    state.answerVisible = false;
    state.sessionStartTime = Date.now();

    history.replaceState(null, '', 'study-mode.html?mode=random&global=true');

    renderStudyModeSidebar();
    updateModeLinks();
    loadDeck();
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// =============================================================================
// STUDY MODE SIDEBAR
// =============================================================================

/**
 * Render study-mode links into the shared shell's sidebar extra section.
 * Preserves the current deck context (HSK level, category, or global) when switching modes.
 */
function renderStudyModeSidebar() {
    const extra = document.getElementById('shell-sidebar-extra');
    if (!extra) return;

    const modes = {
        RANDOM: { label: 'Random Mix', icon: 'shuffle' },
        NEW: { label: 'New Cards', icon: 'fiber_new' },
        DIFFICULTY: { label: 'Learning', icon: 'school' },
        SPACED: { label: 'Spaced Repetition', icon: 'rebase_edit' },
        CONFIDENCE: { label: 'Confidence', icon: 'psychology' },
    };

    const params = new URLSearchParams();
    if (state.deckType === 'global') {
        params.set('global', 'true');
    } else if (state.deckType === 'hsk') {
        params.set('hsk', state.deckValue);
    } else if (state.deckType === 'category') {
        params.set('category', state.deckValue);
    }
    const baseQuery = params.toString();
    const queryPrefix = baseQuery ? `?${baseQuery}&` : '?';

    const heading = document.createElement('h3');
    heading.className = 'font-label-caps text-label-caps text-on-surface-variant tracking-wider mb-sm uppercase px-base';
    heading.textContent = 'Study Mode';

    const list = document.createElement('div');
    list.className = 'space-y-1';

    Object.entries(modes).forEach(([mode, { label, icon }]) => {
        const href = `study-mode.html${queryPrefix}mode=${mode.toLowerCase()}`;
        const active = mode === state.mode;
        const a = document.createElement('a');
        a.className = `study-mode-link flex items-center gap-sm px-base py-sm rounded-lg transition-all ${active ? 'text-primary font-bold border-r-4 border-primary bg-surface-container-high' : 'text-on-surface-variant hover:bg-secondary-container'}`;
        a.href = href;
        a.dataset.mode = mode;
        a.innerHTML = `
            <span class="material-symbols-outlined">${icon}</span>
            <span class="font-body-md text-body-md">${label}</span>
        `;
        list.appendChild(a);
    });

    extra.appendChild(heading);
    extra.appendChild(list);
}

function updateModeLinks() {
    const titles = {
        NEW: 'New Cards',
        DIFFICULTY: 'Learning',
        SPACED: 'Spaced Repetition',
        RANDOM: 'Random Mix',
        CONFIDENCE: 'Confidence',
    };

    let deckLabel = '';
    if (state.deckType === 'global') {
        deckLabel = 'Global';
    } else if (state.deckType === 'hsk') {
        deckLabel = state.deckValue;
    } else if (state.deckType === 'category') {
        deckLabel = state.deckValue.charAt(0) + state.deckValue.slice(1).toLowerCase();
    }

    const modeLabel = titles[state.mode] || 'Study Mode';
    els.modeTitle.textContent = deckLabel ? `${deckLabel} • ${modeLabel}` : modeLabel;

    document.querySelectorAll('.study-mode-link').forEach((link) => {
        const isActive = link.dataset.mode === state.mode;
        if (isActive) {
            link.classList.add('text-primary', 'font-bold', 'border-r-4', 'border-primary', 'bg-surface-container-high');
            link.classList.remove('text-on-surface-variant');
        } else {
            link.classList.remove('text-primary', 'font-bold', 'border-r-4', 'border-primary', 'bg-surface-container-high');
            link.classList.add('text-on-surface-variant');
        }
    });
}

function initControls() {
    els.btnToggleAnswer.addEventListener('click', toggleAnswer);
    els.btnSkip.addEventListener('click', skipCard);
    els.btnAgain.addEventListener('click', () => rateCard('LEARNING'));
    els.btnGotIt.addEventListener('click', () => rateCard('MASTERED'));
    els.btnEndSession.addEventListener('click', endSession);
}

function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if (!els.studyInterface.classList.contains('hidden') && els.emptyState.classList.contains('hidden')) {
            if (e.code === 'Space') {
                e.preventDefault();
                toggleAnswer();
            } else if (e.key === '1') {
                rateCard('LEARNING');
            } else if (e.key === '2') {
                rateCard('MASTERED');
            } else if (e.key === 'Escape') {
                endSession();
            }
        }
    });
}

// =============================================================================
// DATA LOADING
// =============================================================================

async function loadDeck() {
    const userId = getState('userId');
    if (!userId) {
        toast.error('No user ID. Cannot load deck.');
        showEmpty();
        return;
    }

    if (state.deckType === 'menu') {
        showMenu();
        return;
    }

    showLoading();

    let cards = [];

    if (state.deckType === 'global') {
        cards = await loadGlobalDeck(userId);
    } else if (state.deckType === 'category') {
        const result = await api.getDeckByCategory(userId, state.deckValue, {
            pageSize: 50,
            studyMode: state.mode,
        });
        if (!result.ok) {
            spinner.hide();
            toast.error('Failed to load deck: ' + (result.error?.message || 'Unknown error'));
            showEmpty();
            return;
        }
        cards = result.data?.notes || [];
    } else {
        const result = await api.getDeckByHsk(userId, state.deckValue, {
            pageSize: 50,
            studyMode: state.mode,
        });
        if (!result.ok) {
            spinner.hide();
            toast.error('Failed to load deck: ' + (result.error?.message || 'Unknown error'));
            showEmpty();
            return;
        }
        cards = result.data?.notes || [];
    }

    state.cards = cards;
    state.currentIndex = 0;
    state.answered = 0;
    state.correct = 0;
    state.answerVisible = false;

    if (state.cards.length === 0) {
        showEmpty();
    } else {
        showInterface();
        renderCard();
    }
}

/**
 * Load a global study session by merging cards from all HSK levels.
 * Uses RANDOM mode per level so the merged result is already diversified.
 */
async function loadGlobalDeck(userId) {
    const results = await Promise.all(
        HSK_DECKS.map((hsk) =>
            api.getDeckByHsk(userId, hsk, {
                pageSize: 20,
                studyMode: 'RANDOM',
            })
        )
    );

    let allCards = [];
    results.forEach((result) => {
        if (result.ok) {
            allCards = allCards.concat(result.data?.notes || []);
        }
    });

    return shuffleArray(allCards);
}

function hideAllSections() {
    els.loadingState.classList.add('hidden');
    els.loadingState.classList.remove('flex');
    els.emptyState.classList.add('hidden');
    els.studyMenu.classList.add('hidden');
    els.studyMenu.classList.remove('flex');
    els.studyInterface.classList.add('hidden');
}

function showLoading() {
    hideAllSections();
    els.loadingState.classList.remove('hidden');
    els.loadingState.classList.add('flex');
}

function showEmpty() {
    hideAllSections();
    els.emptyState.classList.remove('hidden');
}

function showInterface() {
    hideAllSections();
    els.studyInterface.classList.remove('hidden');
}

// =============================================================================
// CARD RENDERING
// =============================================================================

function renderCard() {
    const card = state.cards[state.currentIndex];
    if (!card) {
        showSummary();
        return;
    }

    state.answerVisible = false;
    updateAnswerVisibility();

    els.cardHsk.textContent = card.hsk || state.deckValue;
    els.cardCharacter.textContent = card.character || '—';
    els.cardPinyin.textContent = card.pinyin || '';
    els.cardMeaning.textContent = card.meaning || '';

    updateProgress();
}

function updateProgress() {
    const total = state.cards.length;
    const current = Math.min(state.currentIndex + 1, total);
    const pct = total > 0 ? Math.round((state.currentIndex / total) * 100) : 0;

    els.progressText.textContent = `Card ${current} / ${total}`;
    els.progressBar.style.width = `${pct}%`;
}

function toggleAnswer() {
    state.answerVisible = !state.answerVisible;
    updateAnswerVisibility();
}

function updateAnswerVisibility() {
    if (state.answerVisible) {
        els.answerContainer.classList.remove('opacity-0', 'translate-y-2', 'pointer-events-none');
        els.answerContainer.classList.add('opacity-100', 'translate-y-0');
        els.btnToggleAnswer.textContent = 'Hide Answer';
    } else {
        els.answerContainer.classList.add('opacity-0', 'translate-y-2', 'pointer-events-none');
        els.answerContainer.classList.remove('opacity-100', 'translate-y-0');
        els.btnToggleAnswer.textContent = 'Show Answer';
    }
}

// =============================================================================
// RATING / NAVIGATION
// =============================================================================

function rateCard(masteryStatus) {
    const card = state.cards[state.currentIndex];
    if (!card) return;

    // Only queue if mastery actually changed
    if (masteryStatus !== card.masteryStatus) {
        queueChange('UPDATE_FLASHCARD', {
            category: card.category,
            flashCardId: card.flashCardId,
            masteryStatus,
        });
    }

    state.answered++;
    if (masteryStatus === 'MASTERED') {
        state.correct++;
    }

    animateCardExit(() => {
        state.currentIndex++;
        if (state.currentIndex >= state.cards.length) {
            showSummary();
        } else {
            renderCard();
        }
    });
}

function skipCard() {
    animateCardExit(() => {
        state.currentIndex++;
        if (state.currentIndex >= state.cards.length) {
            showSummary();
        } else {
            renderCard();
        }
    });
}

function animateCardExit(onComplete) {
    els.flashcard.classList.add('translate-x-12', 'opacity-0');
    setTimeout(() => {
        onComplete();
        els.flashcard.classList.remove('translate-x-12', 'opacity-0');
    }, 250);
}

// =============================================================================
// SESSION END
// =============================================================================

function showSummary() {
    els.responseActions.classList.add('hidden');
    els.btnToggleAnswer.classList.add('hidden');
    els.sessionSummary.classList.remove('hidden');
    els.progressBar.style.width = '100%';
    els.progressText.textContent = `Card ${state.cards.length} / ${state.cards.length}`;

    const accuracy = state.answered > 0 ? Math.round((state.correct / state.answered) * 100) : 0;
    els.summaryText.textContent = `You reviewed ${state.answered} cards with ${accuracy}% accuracy. ${hasPendingChanges() ? 'Don\'t forget to save!' : 'All caught up.'}`;

    // Auto-save if there are pending changes
    if (hasPendingChanges()) {
        saveSession();
    }
}

async function endSession() {
    if (hasPendingChanges()) {
        await saveSession();
    }
    window.location.href = 'deck-browser.html';
}

async function saveSession() {
    const userId = getState('userId');
    if (!userId) {
        toast.error('No user ID. Cannot save progress.');
        return;
    }

    spinner.show('Saving progress...');
    const result = await flushPendingChanges(userId);
    spinner.hide();

    if (result.ok) {
        toast.success('Progress saved!');
        await recordStudySessionCompleted(userId);
    } else if (result.failedChanges && result.failedChanges.length > 0) {
        toast.warning(`${result.failedChanges.length} updates failed. They remain queued.`);
    } else {
        toast.error(result.error?.message || 'Save failed.');
    }
}

/**
 * Report a completed study session to the Stats API.
 * This is a client-side event because the text-processing API does not
 * know when the user finishes a study session in the UI.
 */
async function recordStudySessionCompleted(userId) {
    if (!state.sessionStartTime) return;

    const durationMinutes = Math.max(1, Math.round((Date.now() - state.sessionStartTime) / 60000));

    try {
        await api.stats.recordEvent(userId, {
            eventId: `ssc_${userId}_${state.sessionStartTime}`,
            eventType: 'STUDY_SESSION_COMPLETED',
            timestamp: new Date().toISOString(),
            payload: { durationMinutes },
        });
    } catch (err) {
        // Non-blocking: stats ingestion failure should not break the study flow.
        console.warn('[Mando] Failed to record study session:', err);
    }
}

// =============================================================================
// RUN
// =============================================================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
