/**
 * Flashcard Study Mode page handler.
 *
 * Wires the study session to:
 * - MandoApi.flashcards (deck queries with studyMode filters)
 * - MandoApi.batch      (mastery updates flushed at session end)
 * - MandoApi.stats      (STUDY_SESSION_COMPLETED event)
 *
 * URL contract:
 *   study-mode.html?mode=spaced|random|speed&global=true
 *   study-mode.html?mode=spaced|random|speed&hsk=3
 *   study-mode.html?mode=spaced|random|speed&category=TRAVEL
 *
 * Ratings are queued locally and flushed via POST /batch only when the
 * session ends, to avoid API chatter mid-study (see HIGH_LEVEL_PLAN §4.5).
 */

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------

  const VALID_MODES = ['spaced', 'random', 'speed'];
  const SPEED_SESSION_SECONDS = 120;
  const BATCH_CHUNK_SIZE = 25;

  const MODE_META = {
    spaced: { title: 'Spaced Repetition', studyMode: 'SPACED' },
    random: { title: 'Random Mix', studyMode: 'RANDOM' },
    speed: { title: 'Speed Blitz', studyMode: 'RANDOM' },
  };

  const EMPTY_MESSAGES = {
    spaced: 'No mastered cards to review yet. Keep learning new words first!',
    random: 'This deck is empty. Add some cards from the deck editor or a video session.',
    speed: 'This deck is empty. Add some cards before starting a blitz.',
  };

  const FALLBACK_DECK = [
    { flashCardId: 'DEMO_FC_001', character: '合作', pinyin: 'hézuò', meaning: 'Cooperate; collaboration', hsk: 'HSK4', category: 'BUSINESS_MANDARIN', masteryStatus: 'LEARNING' },
    { flashCardId: 'DEMO_FC_002', character: '面试', pinyin: 'miànshì', meaning: 'to interview; interview', hsk: 'HSK4', category: 'BUSINESS_MANDARIN', masteryStatus: 'LEARNING' },
    { flashCardId: 'DEMO_FC_003', character: '旅行', pinyin: 'lǚxíng', meaning: 'to travel; journey', hsk: 'HSK3', category: 'TRAVEL_ESSENTIALS', masteryStatus: 'MASTERED' },
    { flashCardId: 'DEMO_FC_004', character: '行李', pinyin: 'xíngli', meaning: 'luggage', hsk: 'HSK3', category: 'TRAVEL_ESSENTIALS', masteryStatus: 'UNSTARTED' },
    { flashCardId: 'DEMO_FC_005', character: '发票', pinyin: 'fāpiào', meaning: 'receipt; invoice', hsk: 'HSK4', category: 'MISCELLANEOUS', masteryStatus: 'UNSTARTED' },
    { flashCardId: 'DEMO_FC_006', character: '尴尬', pinyin: 'gāngà', meaning: 'awkward; embarrassed', hsk: 'HSK5', category: 'MISCELLANEOUS', masteryStatus: 'LEARNING' },
    { flashCardId: 'DEMO_FC_007', character: '合同', pinyin: 'hétong', meaning: 'contract', hsk: 'HSK4', category: 'BUSINESS_MANDARIN', masteryStatus: 'MASTERED' },
    { flashCardId: 'DEMO_FC_008', character: '谈判', pinyin: 'tánpàn', meaning: 'to negotiate; negotiation', hsk: 'HSK4', category: 'BUSINESS_MANDARIN', masteryStatus: 'UNSTARTED' },
    { flashCardId: 'DEMO_FC_009', character: '投资', pinyin: 'tóuzī', meaning: 'investment', hsk: 'HSK4', category: 'BUSINESS_MANDARIN', masteryStatus: 'MASTERED' },
    { flashCardId: 'DEMO_FC_010', character: '预订', pinyin: 'yùdìng', meaning: 'to book; reservation', hsk: 'HSK4', category: 'TRAVEL_ESSENTIALS', masteryStatus: 'LEARNING' },
  ];

  // ---------------------------------------------------------------------------
  // Shared utilities (js/utils.js)
  // ---------------------------------------------------------------------------

  const {
    getUserId,
    persistUserId,
    escapeHtml,
    formatTime,
    uuid,
    speak,
    $,
    setText,
  } = window.MandoUtils;

  const MandoUi = window.MandoUi;

  // ---------------------------------------------------------------------------
  // URL parsing
  // ---------------------------------------------------------------------------

  function parseUrl() {
    const params = new URLSearchParams(window.location.search);
    let mode = (params.get('mode') || 'random').toLowerCase();
    if (VALID_MODES.indexOf(mode) === -1) mode = 'random';

    let filter = { type: 'global', value: null };
    const hsk = params.get('hsk');
    const category = params.get('category');
    if (category) {
      filter = { type: 'category', value: category };
    } else if (hsk) {
      filter = { type: 'hsk', value: String(hsk).replace(/\D/g, '') || '3' };
    }

    return { mode: mode, filter: filter };
  }

  function displayCategory(category) {
    return String(category || '')
      .split(/[_\s]+/)
      .filter(Boolean)
      .map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(); })
      .join(' ');
  }

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const url = parseUrl();

  const state = {
    userId: getUserId(),
    demoMode: false,
    mode: url.mode,
    effectiveMode: null,   // set when the requested mode falls back (e.g. spaced → random)
    filter: url.filter,
    cards: [],
    currentIndex: 0,
    revealed: false,
    sessionStart: Date.now(),
    pendingChanges: [],
    isFlushing: false,
    isComplete: false,
    speedTimerId: null,
    speedRemaining: SPEED_SESSION_SECONDS,
    summary: { gotIt: 0, again: 0, skipped: 0 },
  };

  if (state.userId) {
    persistUserId(state.userId);
  }
  state.demoMode = !state.userId;

  // ---------------------------------------------------------------------------
  // Pending-change queue
  // ---------------------------------------------------------------------------

  /**
   * Queue a mastery rating. If the same card was already rated this session,
   * the latest rating wins.
   */
  function queueRating(card, masteryStatus) {
    const existing = state.pendingChanges.find(function (c) {
      return c.data.flashCardId === card.flashCardId;
    });
    if (existing) {
      existing.data.masteryStatus = masteryStatus;
      return;
    }
    state.pendingChanges.push({
      _id: uuid(),
      operation: 'UPDATE_FLASHCARD',
      data: {
        category: card.category || 'MISCELLANEOUS',
        flashCardId: card.flashCardId,
        masteryStatus: masteryStatus,
      },
    });
  }

  /**
   * Flush queued ratings via POST /batch, chunked at 25 items.
   * @returns {Promise<{ok: boolean, failedCount: number}>}
   */
  async function flushPendingChanges() {
    if (state.pendingChanges.length === 0) return { ok: true, failedCount: 0 };

    const items = state.pendingChanges.map(function (c) { return c.data; });
    let failedCount = 0;

    for (let i = 0; i < items.length; i += BATCH_CHUNK_SIZE) {
      const chunk = items.slice(i, i + BATCH_CHUNK_SIZE);
      try {
        const res = await window.MandoApi.batch.flush(state.userId, { updateFlashCards: chunk });
        if (!res.ok) {
          failedCount += chunk.length;
          console.error('Batch flush failed', res.error);
        } else if (res.data && typeof res.data.failed === 'number') {
          failedCount += res.data.failed;
        }
      } catch (err) {
        failedCount += chunk.length;
        console.error('Batch flush error', err);
      }
    }

    if (failedCount === 0) {
      state.pendingChanges = [];
    }
    return { ok: failedCount === 0, failedCount: failedCount };
  }

  // ---------------------------------------------------------------------------
  // Rendering: card & progress
  // ---------------------------------------------------------------------------

  function currentCard() {
    return state.cards[state.currentIndex] || null;
  }

  function renderProgress() {
    const total = state.cards.length;
    const counter = $('session-counter');
    if (counter) {
      counter.textContent = `Card ${Math.min(state.currentIndex + 1, total)} / ${total}`;
    }
    const bar = $('session-progress-bar');
    const track = $('session-progress-track');
    const percent = total > 0 ? Math.round((state.currentIndex / total) * 100) : 0;
    if (bar) bar.style.width = `${percent}%`;
    if (track) track.setAttribute('aria-valuenow', String(percent));
  }

  function setRevealed(revealed) {
    state.revealed = revealed;
    const zone = $('card-reveal-zone');
    const btn = $('btn-toggle-reveal');
    if (zone) {
      if (revealed) {
        zone.classList.remove('opacity-0', 'translate-y-2', 'pointer-events-none');
        zone.classList.add('opacity-100', 'translate-y-0');
      } else {
        zone.classList.add('opacity-0', 'translate-y-2', 'pointer-events-none');
        zone.classList.remove('opacity-100', 'translate-y-0');
      }
    }
    if (btn) btn.textContent = revealed ? 'Hide Answer' : 'Show Answer';
  }

  function fillCardContent(card) {
    setText('card-hanzi', card.character || '');
    setText('card-pinyin', card.pinyin || '');
    setText('card-meaning', card.meaning || '');
    const hskLevel = String(card.hsk || '').replace(/\D/g, '');
    setText('card-hsk-tag', hskLevel ? `HSK ${hskLevel}` : 'HSK');
  }

  /** Render the current card with a slide transition. */
  function renderCard(animate) {
    const card = currentCard();
    if (!card) return;
    const el = $('flashcard');

    if (!animate || !el) {
      fillCardContent(card);
      setRevealed(false);
      renderProgress();
      return;
    }

    el.classList.add('translate-x-12', 'opacity-0');
    setTimeout(function () {
      fillCardContent(card);
      setRevealed(false);
      renderProgress();
      el.classList.remove('translate-x-12', 'opacity-0');
      el.classList.add('-translate-x-12', 'opacity-0');
      setTimeout(function () {
        el.classList.remove('-translate-x-12', 'opacity-0');
      }, 150);
    }, 200);
  }

  function renderSessionHeader() {
    const meta = MODE_META[state.effectiveMode || state.mode];
    let title = meta.title;
    if (state.filter.type === 'category') {
      title += ` — ${displayCategory(state.filter.value)}`;
    } else if (state.filter.type === 'hsk') {
      title += ` — HSK ${state.filter.value}`;
    }
    setText('session-title', title);
    setText('summary-mode', title);

    if (state.mode === 'speed') {
      const timer = $('speed-timer');
      if (timer) {
        timer.classList.remove('hidden');
        timer.textContent = formatTime(state.speedRemaining);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Rendering: empty state & summary
  // ---------------------------------------------------------------------------

  function showEmptyState() {
    const study = $('study-view');
    const empty = $('empty-state');
    if (study) study.classList.add('hidden');
    if (empty) {
      empty.classList.remove('hidden');
      empty.classList.add('flex');
    }
    setText('empty-message', EMPTY_MESSAGES[state.mode] || EMPTY_MESSAGES.random);
  }

  function summaryTile(label, value, accent) {
    return `
      <div class="p-md bg-surface-container-low rounded-lg">
        <p class="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">${escapeHtml(label)}</p>
        <p class="font-headline-md text-headline-md text-${accent}">${escapeHtml(String(value))}</p>
      </div>
    `;
  }

  function renderSummary() {
    const elapsedMs = Date.now() - state.sessionStart;
    const reviewed = state.summary.gotIt + state.summary.again + state.summary.skipped;

    const stats = $('summary-stats');
    if (stats) {
      stats.innerHTML =
        summaryTile('Reviewed', reviewed, 'primary') +
        summaryTile('Got it', state.summary.gotIt, 'tertiary') +
        summaryTile('Again', state.summary.again, 'secondary') +
        summaryTile('Time', formatTime(elapsedMs / 1000), 'on-surface');
    }

    const study = $('study-view');
    const summary = $('session-summary');
    if (study) study.classList.add('hidden');
    if (summary) {
      summary.classList.remove('hidden');
      summary.classList.add('flex');
    }
  }

  // ---------------------------------------------------------------------------
  // Session lifecycle
  // ---------------------------------------------------------------------------

  function advance() {
    state.currentIndex += 1;
    if (state.currentIndex >= state.cards.length) {
      endSession('completed');
      return;
    }
    renderCard(true);
  }

  function rateCard(masteryStatus) {
    if (state.isComplete) return;
    const card = currentCard();
    if (!card) return;

    if (!state.demoMode) {
      queueRating(card, masteryStatus);
    }
    // Update the in-memory card so a re-visit within the session is consistent.
    card.masteryStatus = masteryStatus;

    if (masteryStatus === 'MASTERED') {
      state.summary.gotIt += 1;
    } else {
      state.summary.again += 1;
    }
    advance();
  }

  function skipCard() {
    if (state.isComplete) return;
    if (!currentCard()) return;
    state.summary.skipped += 1;
    advance();
  }

  function toggleReveal() {
    if (state.isComplete) return;
    if (!currentCard()) return;
    setRevealed(!state.revealed);
  }

  async function endSession(reason) {
    if (state.isComplete) return;
    state.isComplete = true;

    if (state.speedTimerId) {
      clearInterval(state.speedTimerId);
      state.speedTimerId = null;
    }

    if (!state.demoMode) {
      state.isFlushing = true;
      const result = await flushPendingChanges();
      state.isFlushing = false;

      if (!result.ok) {
        if (MandoUi) {
          MandoUi.toast(`${result.failedCount} rating${result.failedCount === 1 ? '' : 's'} could not be saved. Please re-rate those cards next session.`, 'error');
        }
      }

      // Record the session completion (non-blocking).
      const durationMinutes = Math.round((Date.now() - state.sessionStart) / 60000);
      window.MandoApi.stats.recordEvent(state.userId, {
        eventId: uuid(),
        eventType: 'STUDY_SESSION_COMPLETED',
        timestamp: new Date().toISOString(),
        payload: { durationMinutes: durationMinutes },
      }).then(function (res) {
        if (!res.ok) console.warn('STUDY_SESSION_COMPLETED event failed', res.error);
      });
    }

    renderSummary();
  }

  // ---------------------------------------------------------------------------
  // Speed Blitz timer
  // ---------------------------------------------------------------------------

  function startSpeedTimer() {
    if (state.mode !== 'speed') return;
    state.speedTimerId = setInterval(function () {
      state.speedRemaining -= 1;
      const timer = $('speed-timer');
      if (timer) timer.textContent = formatTime(Math.max(0, state.speedRemaining));
      if (state.speedRemaining <= 0) {
        endSession('timer');
      }
    }, 1000);
  }

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------

  async function fetchDeck(studyMode) {
    const options = { studyMode: studyMode, pageSize: 50 };
    try {
      if (state.filter.type === 'category') {
        return await window.MandoApi.flashcards.getDeckByCategory(state.userId, state.filter.value, options);
      } else if (state.filter.type === 'hsk') {
        return await window.MandoApi.flashcards.getDeckByHsk(state.userId, state.filter.value, options);
      }
      return await window.MandoApi.flashcards.getDeckAll(state.userId, options);
    } catch (err) {
      console.error('Deck load error', err);
      return { ok: false, status: 0, error: { message: err.message } };
    }
  }

  function cardsFrom(res, toastOnError) {
    if (res.ok && res.data && Array.isArray(res.data.notes)) return res.data.notes;
    if (res.status === 404) return [];
    if (toastOnError && MandoUi) MandoUi.toast('Could not load the deck. Please try again.', 'error');
    return [];
  }

  async function loadDeck() {
    if (state.demoMode) {
      state.cards = FALLBACK_DECK.slice();
      return;
    }

    let cards = cardsFrom(await fetchDeck(MODE_META[state.mode].studyMode), true);

    // A deck without MASTERED cards (e.g. freshly created) returns nothing
    // for SPACED. Rather than dead-ending on the empty state, fall back to a
    // mixed review of all cards and tell the user why.
    if (cards.length === 0 && state.mode === 'spaced') {
      const fallback = cardsFrom(await fetchDeck('RANDOM'), false);
      if (fallback.length > 0) {
        cards = fallback;
        state.effectiveMode = 'random';
        if (MandoUi) {
          MandoUi.toast('No mastered cards here yet — starting a Random Mix with all cards instead.', 'info');
        }
      }
    }

    state.cards = cards;

    // RANDOM arrives shuffled from the backend; shuffle locally as well so the
    // order is never predictable and demo mode behaves the same.
    if (state.mode === 'random' || state.mode === 'speed' || state.effectiveMode === 'random') {
      shuffle(state.cards);
    }
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  // ---------------------------------------------------------------------------
  // Interactions
  // ---------------------------------------------------------------------------

  function initInteractions() {
    const bind = function (id, fn) {
      const el = $(id);
      if (el) el.addEventListener('click', fn);
    };

    bind('btn-toggle-reveal', toggleReveal);
    bind('btn-again', function () { rateCard('LEARNING'); });
    bind('btn-got-it', function () { rateCard('MASTERED'); });
    bind('btn-skip', skipCard);
    bind('btn-end', function () { endSession('user'); });

    bind('btn-speak', function () {
      const card = currentCard();
      if (card && card.character) {
        speak(card.character, { id: card.flashCardId });
      }
    });

    bind('summary-continue', function () {
      window.location.reload();
    });
    bind('summary-hub', function () {
      window.location.href = 'flashcards.html';
    });

    document.addEventListener('keydown', function (e) {
      if (state.isComplete) return;
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.code === 'Space') {
        e.preventDefault();
        toggleReveal();
      } else if (e.key === '1') {
        rateCard('LEARNING');
      } else if (e.key === '2') {
        rateCard('MASTERED');
      } else if (e.key === 'Escape') {
        endSession('user');
      }
    });

    // Warn before leaving with unsaved ratings.
    window.addEventListener('beforeunload', function (e) {
      if (state.pendingChanges.length > 0 && !state.isComplete) {
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
      renderSessionHeader();
      renderCard(false);

      await loadDeck();

      // Re-render the header in case the study mode fell back (spaced → random).
      renderSessionHeader();

      if (state.cards.length === 0) {
        showEmptyState();
        return;
      }

      renderCard(false);
      startSpeedTimer();
    } catch (err) {
      console.error('Study mode init failed:', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
