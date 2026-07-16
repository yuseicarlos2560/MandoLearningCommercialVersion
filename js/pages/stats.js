/**
 * Statistics page handler.
 *
 * Wires the stats dashboard to:
 * - MandoApi.stats   (aggregate, activity, events)
 * - MandoApi.flashcards (HSK decks for mastery counts)
 *
 * Keeps markup intact; only dynamic text/attributes are updated via ids.
 */

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------

  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const HSK_TOTALS = {
    1: 150,
    2: 300,
    3: 600,
    4: 1200,
    5: 2500,
    6: 5000,
  };

  const CATEGORY_ICONS = {
    Business: 'work',
    Travel: 'flight_takeoff',
    'Food & Culture': 'restaurant',
    'Social Life': 'family_restroom',
    Miscellaneous: 'category',
    Hobbies: 'sports_esports',
    Shopping: 'shopping_bag',
    Work: 'work',
    Education: 'school',
  };

  const FALLBACK_AGGREGATE = {
    totalStudyMinutes: 2535,
    wordsAdded: 458,
    wordsMastered: 1240,
    wordsLearning: 312,
    currentStreakDays: 14,
    longestStreakDays: 21,
    categoryBreakdown: [
      { category: 'Business', minutes: 750 },
      { category: 'Travel', minutes: 492 },
      { category: 'Food & Culture', minutes: 468 },
      { category: 'Social Life', minutes: 324 },
      { category: 'Hobbies', minutes: 210 },
    ],
  };

  const FALLBACK_HSK = {
    1: { mastered: 150, total: 150 },
    2: { mastered: 264, total: 300 },
    3: { mastered: 252, total: 600 },
    4: { mastered: 144, total: 1200 },
    5: { mastered: 0, total: 2500 },
    6: { mastered: 0, total: 5000 },
  };

  // ---------------------------------------------------------------------------
  // Shared utilities (js/utils.js)
  // ---------------------------------------------------------------------------

  const {
    safeLocalStorageGet,
    safeLocalStorageSet,
    getUserId,
    uuid,
    $,
    setText,
    setAttr,
    formatDate,
    today,
    daysAgo,
    escapeHtml,
  } = window.MandoUtils;

  const MandoUi = window.MandoUi;

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const state = {
    userId: getUserId(),
    periodDays: 30,
    aggregate: null,
    activity: [],
    hskDecks: {},
    demoMode: false,
    loading: {
      aggregate: false,
      activity: false,
      hsk: false,
    },
    errors: {
      aggregate: false,
      activity: false,
      hsk: false,
    },
  };

  if (state.userId) {
    safeLocalStorageSet('mando.userId', state.userId);
  }
  state.demoMode = !state.userId;

  // ---------------------------------------------------------------------------
  // Date helpers
  // ---------------------------------------------------------------------------

  function dateKey(d) {
    return formatDate(d);
  }

  function periodRange(days) {
    const end = today();
    const start = daysAgo(days - 1);
    return { start, end };
  }

  function parseActivityDate(statKey) {
    if (!statKey || typeof statKey !== 'string') return null;
    const match = statKey.match(/(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : null;
  }

  function activityValue(record) {
    // Prefer minutes, fall back to wordsAdded, then 0.
    if (record && typeof record.studyMinutes === 'number') return record.studyMinutes;
    if (record && typeof record.minutes === 'number') return record.minutes;
    if (record && typeof record.wordsAdded === 'number') return record.wordsAdded;
    return 0;
  }

  function formatDurationMinutes(minutes) {
    if (!minutes || minutes <= 0) return '0h 0m';
    const h = Math.floor(minutes / 60);
    const m = Math.floor(minutes % 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  // ---------------------------------------------------------------------------
  // Skeletons
  // ---------------------------------------------------------------------------

  function renderChartSkeleton() {
    let html = '';
    for (let i = 0; i < 9; i++) {
      html += `<div class="flex-1 bg-outline-variant/30 rounded-t-sm h-[${40 + Math.floor(Math.random() * 50)}%] animate-pulse"></div>`;
    }
    return html;
  }

  function renderHeatmapSkeleton() {
    let html = '';
    for (let i = 0; i < 105; i++) {
      html += `<div class="heatmap-cell w-full bg-outline-variant/30 animate-pulse"></div>`;
    }
    return html;
  }

  function renderCategoriesSkeleton() {
    let html = '';
    for (let i = 0; i < 4; i++) {
      html += `
        <div class="flex items-center justify-between p-base bg-surface-container-low rounded-xl border border-outline-variant/10 animate-pulse">
          <div class="flex items-center gap-base">
            <div class="w-6 h-6 rounded bg-outline-variant/30"></div>
            <div class="w-20 h-4 bg-outline-variant/30 rounded"></div>
          </div>
          <div class="w-10 h-4 bg-outline-variant/30 rounded"></div>
        </div>
      `;
    }
    return html;
  }

  function renderHskSkeleton() {
    let html = '';
    for (let i = 1; i <= 6; i++) {
      html += `
        <div class="space-y-base animate-pulse">
          <div class="flex justify-between items-end">
            <div class="w-16 h-8 bg-outline-variant/30 rounded"></div>
            <div class="w-10 h-5 bg-outline-variant/30 rounded"></div>
          </div>
          <div class="w-full h-3 bg-surface-container-highest rounded-full overflow-hidden">
            <div class="w-0 h-full bg-primary"></div>
          </div>
          <div class="w-24 h-3 bg-outline-variant/30 rounded"></div>
        </div>
      `;
    }
    return html;
  }

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------

  async function loadAggregate() {
    if (state.demoMode) {
      state.aggregate = FALLBACK_AGGREGATE;
      return true;
    }

    state.loading.aggregate = true;
    state.errors.aggregate = false;

    const res = await window.MandoApi.stats.getAggregate(state.userId);
    state.loading.aggregate = false;

    if (res.ok && res.data) {
      state.aggregate = res.data.stats || res.data;
      console.info('Aggregate stats loaded:', state.aggregate);
      return true;
    }

    state.errors.aggregate = true;
    if (res.status !== 404) {
      console.warn('Failed to load aggregate stats', res.status, res.error);
    } else {
      console.info('Aggregate stats not found (404); will try to derive from activity.');
    }
    return false;
  }

  async function loadActivity() {
    if (state.demoMode) {
      state.activity = generateDemoActivity(state.periodDays);
      return true;
    }

    state.loading.activity = true;
    state.errors.activity = false;

    const { start, end } = periodRange(state.periodDays);
    const res = await window.MandoApi.stats.getActivity(state.userId, {
      granularity: 'daily',
      start,
      end,
    });

    state.loading.activity = false;

    if (res.ok && res.data && Array.isArray(res.data.activity)) {
      state.activity = res.data.activity;
      console.info(`Activity stats loaded: ${state.activity.length} records.`);
      return true;
    }

    state.errors.activity = true;
    if (res.status !== 404) {
      console.warn('Failed to load activity stats', res.status, res.error);
    } else {
      console.info('Activity stats not found (404).');
    }
    return false;
  }

  async function loadHskDecks() {
    if (state.demoMode) {
      state.hskDecks = { ...FALLBACK_HSK };
      return true;
    }

    state.loading.hsk = true;
    state.errors.hsk = false;

    const levels = [1, 2, 3, 4, 5, 6];

    // Probe HSK 1 first. If it 404s, assume the flashcards endpoints are not
    // deployed and skip the remaining calls to avoid flooding the console.
    const probe = await window.MandoApi.flashcards.getDeckByHsk(state.userId, 1, {
      studyMode: 'MANAGE',
      pageSize: 50,
    });

    if (!probe.ok && probe.status === 404) {
      state.loading.hsk = false;
      state.errors.hsk = true;
      state.hskDecks = { ...FALLBACK_HSK };
      console.info('Flashcards HSK endpoints are not available yet; using demo HSK progress data.');
      return false;
    }

    // Endpoint exists; fetch the rest in parallel.
    const results = await Promise.allSettled(
      levels.map(function (level) {
        return window.MandoApi.flashcards.getDeckByHsk(state.userId, level, {
          studyMode: 'MANAGE',
          pageSize: 50,
        });
      })
    );

    state.loading.hsk = false;
    let anyOk = false;

    results.forEach(function (result, index) {
      const level = levels[index];
      if (result.status === 'fulfilled' && result.value.ok && result.value.data) {
        const cards = result.value.data.notes || result.value.data.flashCards || result.value.data.cards || [];
        const mastered = cards.filter(function (c) {
          return c.masteryStatus === 'MASTERED' || c.mastered === true;
        }).length;
        state.hskDecks[level] = { mastered: mastered, total: HSK_TOTALS[level] };
        anyOk = true;
      } else {
        state.hskDecks[level] = { mastered: 0, total: HSK_TOTALS[level] };
        console.warn(`Failed to load HSK ${level} deck`, result.reason || result.value && result.value.error);
      }
    });

    if (!anyOk) {
      state.errors.hsk = true;
      // Use fallback so the UI is never empty.
      state.hskDecks = { ...FALLBACK_HSK };
      return false;
    }

    return true;
  }

  function computeAggregateFromActivity(activity) {
    let wordsAdded = 0;
    let wordsMastered = 0;
    let studyTimeMinutes = 0;

    activity.forEach(function (record) {
      if (record.wordsAdded) wordsAdded += record.wordsAdded;
      if (record.wordsMastered) wordsMastered += record.wordsMastered;
      if (record.studyTimeMinutes) studyTimeMinutes += record.studyTimeMinutes;
      if (record.studyMinutes) studyTimeMinutes += record.studyMinutes;
    });

    return {
      wordsAdded,
      wordsMastered,
      studyTimeMinutes,
      // Approximate still-learning as added minus mastered.
      wordsLearning: Math.max(0, wordsAdded - wordsMastered),
    };
  }

  function generateDemoActivity(days) {
    const activity = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const minutes = Math.floor(Math.random() * 120);
      activity.push({
        statKey: `DAILY#${formatDate(d)}`,
        wordsAdded: Math.floor(Math.random() * 15),
        studyMinutes: minutes,
      });
    }
    return activity;
  }

  async function sendUserActive() {
    if (!state.userId) return;
    try {
      await window.MandoApi.stats.recordEvent(state.userId, {
        eventId: uuid(),
        eventType: 'USER_ACTIVE',
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('USER_ACTIVE event failed', err);
    }
  }

  // ---------------------------------------------------------------------------
  // Rendering: total study time
  // ---------------------------------------------------------------------------

  function renderTotalStudyTime() {
    const el = $('total-study-time');
    const trendEl = $('study-time-trend');
    const chartEl = $('study-time-chart');

    if (state.loading.aggregate || state.loading.activity) {
      if (el) el.textContent = '--';
      if (trendEl) trendEl.innerHTML = `<span class="material-symbols-outlined text-[18px]">trending_up</span> --`;
      if (chartEl) chartEl.innerHTML = renderChartSkeleton();
      return;
    }

    if (state.errors.aggregate && state.errors.activity) {
      if (chartEl) renderErrorState(chartEl, 'Could not load study time.', loadDataAndRender);
      return;
    }

    const aggregate = state.aggregate || {};
    const totalMinutes = aggregate.studyTimeMinutes || aggregate.totalStudyMinutes || aggregate.totalStudyTimeSeconds / 60 || 0;

    if (el) el.textContent = formatDurationMinutes(totalMinutes);

    // Trend: compare current period sum vs previous equal-length period.
    const { start, end } = periodRange(state.periodDays);
    const currentSum = sumActivityInRange(state.activity, start, end);
    const prevStart = daysAgo((state.periodDays * 2) - 1);
    const prevEnd = daysAgo(state.periodDays);
    const prevSum = sumActivityInRange(state.activity, prevStart, prevEnd);

    if (trendEl) {
      if (prevSum > 0) {
        const pct = Math.round(((currentSum - prevSum) / prevSum) * 100);
        const isUp = pct >= 0;
        trendEl.innerHTML = `
          <span class="material-symbols-outlined text-[18px]">${isUp ? 'trending_up' : 'trending_down'}</span>
          ${Math.abs(pct)}% from previous ${state.periodDays} days
        `;
        trendEl.className = `text-[14px] font-bold flex items-center gap-xs ${isUp ? 'text-primary' : 'text-error'}`;
      } else {
        trendEl.innerHTML = `<span class="material-symbols-outlined text-[18px]">trending_up</span> Keep going!`;
        trendEl.className = 'text-[14px] text-primary font-bold flex items-center gap-xs';
      }
    }

    // Weekly/daily bar chart from activity.
    if (chartEl) {
      chartEl.innerHTML = '';
      const buckets = buildDailyBuckets(state.activity, state.periodDays);
      const max = Math.max(1, ...buckets.map(function (b) { return b.value; }));

      buckets.forEach(function (b, index) {
        const height = Math.max(4, Math.round((b.value / max) * 100));
        const bar = document.createElement('div');
        bar.className = 'flex-1 rounded-t-sm transition-all duration-500 hover:opacity-80';
        bar.style.height = `${height}%`;
        bar.style.backgroundColor = index === buckets.length - 1 ? '#af2330' : `rgba(175, 35, 48, ${0.2 + (height / 100) * 0.6})`;
        bar.title = `${b.label}: ${b.value} activity`;
        chartEl.appendChild(bar);
      });
    }
  }

  function sumActivityInRange(activity, start, end) {
    let sum = 0;
    activity.forEach(function (record) {
      const date = parseActivityDate(record.statKey);
      if (date && date >= start && date <= end) {
        sum += activityValue(record);
      }
    });
    return sum;
  }

  function buildDailyBuckets(activity, days) {
    const buckets = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = formatDate(d);
      const record = activity.find(function (r) {
        return parseActivityDate(r.statKey) === key;
      });
      buckets.push({
        label: DAYS[d.getDay()],
        value: record ? activityValue(record) : 0,
      });
    }
    return buckets;
  }

  // ---------------------------------------------------------------------------
  // Rendering: vocabulary mastery
  // ---------------------------------------------------------------------------

  function renderVocabularyMastery() {
    const aggregate = state.aggregate || {};
    const mastered = aggregate.wordsMastered || aggregate.wordsMemorized || 0;
    const added = aggregate.wordsAdded || 0;
    // The backend aggregate does not expose a 'still learning' counter, so we
    // approximate it as words added minus words mastered. This includes
    // UNSTARTED and LEARNING cards, which is acceptable for the MVP summary.
    const learning = aggregate.wordsLearning || aggregate.stillLearning || Math.max(0, added - mastered);
    const total = Math.max(1, mastered + learning);
    const percent = Math.min(100, Math.round((mastered / total) * 100));

    setText('vocab-memorized', mastered.toLocaleString());
    setText('vocab-added', added.toLocaleString());
    setText('vocab-learning', learning.toLocaleString());
    setText('vocab-mastery-percent', `${percent}%`);

    const circle = $('vocab-mastery-circle');
    if (circle) {
      circle.setAttribute('stroke-dasharray', `${percent}, 100`);
    }

    const bar = $('vocab-memorized-bar');
    if (bar) {
      bar.style.width = `${percent}%`;
    }
  }

  // ---------------------------------------------------------------------------
  // Rendering: activity heatmap
  // ---------------------------------------------------------------------------

  function renderHeatmap() {
    const container = $('activity-heatmap');
    const monthsEl = $('heatmap-months');
    if (!container || !monthsEl) return;

    if (state.loading.activity) {
      container.innerHTML = renderHeatmapSkeleton();
      monthsEl.innerHTML = '';
      return;
    }

    if (state.errors.activity && state.activity.length === 0) {
      renderErrorState(container, 'Could not load activity.', loadActivityAndRender);
      monthsEl.innerHTML = '';
      return;
    }

    const { start, end } = periodRange(state.periodDays);
    const startDate = new Date(start);
    const endDate = new Date(end);

    // Build a map of date -> value.
    const valueMap = {};
    state.activity.forEach(function (record) {
      const date = parseActivityDate(record.statKey);
      if (date) {
        valueMap[date] = (valueMap[date] || 0) + activityValue(record);
      }
    });

    // Normalize values to 0-4 intensity levels.
    const values = Object.values(valueMap);
    const max = Math.max(1, ...values);

    container.innerHTML = '';
    monthsEl.innerHTML = '';

    // Generate cells for every day in the range.
    const current = new Date(startDate);
    while (current <= endDate) {
      const key = formatDate(current);
      const value = valueMap[key] || 0;
      const level = max === 0 ? 0 : Math.min(4, Math.floor((value / max) * 4));
      const intensity = [
        'bg-surface-container-highest',
        'bg-primary/20',
        'bg-primary/40',
        'bg-primary/70',
        'bg-primary',
      ][level];

      const cell = document.createElement('div');
      cell.className = `heatmap-cell w-full ${intensity}`;
      cell.title = `${key}: ${Math.round(value)} activity`;
      container.appendChild(cell);

      current.setDate(current.getDate() + 1);
    }

    // Month labels.
    const monthLabels = [];
    const labelCurrent = new Date(startDate);
    while (labelCurrent <= endDate) {
      const label = labelCurrent.toLocaleString('default', { month: 'short' });
      monthLabels.push(label);
      labelCurrent.setMonth(labelCurrent.getMonth() + 1);
      labelCurrent.setDate(1);
    }
    // Deduplicate while preserving order.
    const seen = new Set();
    monthsEl.innerHTML = monthLabels
      .filter(function (m) {
        if (seen.has(m)) return false;
        seen.add(m);
        return true;
      })
      .map(function (m) { return `<span>${escapeHtml(m)}</span>`; })
      .join('');
  }

  // ---------------------------------------------------------------------------
  // Rendering: top categories
  // ---------------------------------------------------------------------------

  function renderTopCategories() {
    const container = $('top-categories-list');
    if (!container) return;

    if (state.loading.aggregate) {
      container.innerHTML = renderCategoriesSkeleton();
      return;
    }

    const aggregate = state.aggregate || {};
    let categories = aggregate.categoryBreakdown || [];

    // Fallback to demo categories if none provided.
    if (!Array.isArray(categories) || categories.length === 0) {
      categories = FALLBACK_AGGREGATE.categoryBreakdown;
    }

    // Sort by minutes descending and take top 5.
    categories = categories
      .slice()
      .sort(function (a, b) { return (b.minutes || 0) - (a.minutes || 0); })
      .slice(0, 5);

    if (categories.length === 0) {
      container.innerHTML = '<p class="text-sm text-on-surface-variant">No category data yet.</p>';
      return;
    }

    container.innerHTML = categories.map(function (item) {
      const category = item.category || 'Miscellaneous';
      const minutes = item.minutes || 0;
      const icon = CATEGORY_ICONS[category] || 'category';
      return `
        <div class="flex items-center justify-between p-base bg-surface-container-low rounded-xl border border-outline-variant/10">
          <div class="flex items-center gap-base">
            <span class="material-symbols-outlined text-primary">${escapeHtml(icon)}</span>
            <span class="font-body-md font-semibold text-on-surface">${escapeHtml(category)}</span>
          </div>
          <span class="font-body-md text-on-surface-variant">${formatDurationMinutes(minutes)}</span>
        </div>
      `;
    }).join('');
  }

  // ---------------------------------------------------------------------------
  // Rendering: HSK progress
  // ---------------------------------------------------------------------------

  function renderHskProgress() {
    const container = $('hsk-progress-list');
    if (!container) return;

    if (state.loading.hsk) {
      container.innerHTML = renderHskSkeleton();
      return;
    }

    container.innerHTML = '';
    for (let level = 1; level <= 6; level++) {
      const data = state.hskDecks[level] || { mastered: 0, total: HSK_TOTALS[level] };
      const percent = Math.min(100, Math.round((data.mastered / data.total) * 100));
      const isEmpty = percent === 0;

      const wrapper = document.createElement('div');
      wrapper.className = 'space-y-base';
      wrapper.innerHTML = `
        <div class="flex justify-between items-end">
          <span class="font-headline-md text-headline-md ${isEmpty ? 'text-on-surface-variant' : 'text-primary'}">HSK ${level}</span>
          <span class="text-body-md font-bold text-on-surface">${percent}%</span>
        </div>
        <div class="w-full h-3 bg-surface-container-highest rounded-full overflow-hidden">
          <div class="h-full ${isEmpty ? 'bg-primary-fixed' : 'bg-primary'} transition-all duration-500" style="width: ${percent}%"></div>
        </div>
        <p class="text-[12px] text-on-surface-variant">${data.mastered.toLocaleString()} / ${data.total.toLocaleString()} Words Mastered</p>
      `;
      container.appendChild(wrapper);
    }
  }

  // ---------------------------------------------------------------------------
  // Error state helper
  // ---------------------------------------------------------------------------

  function renderErrorState(container, message, retryFn) {
    if (!container) return;
    container.innerHTML = `
      <div class="text-center py-xl text-on-surface-variant">
        <span class="material-symbols-outlined text-4xl mb-sm">error</span>
        <p class="font-body-md mb-sm">${escapeHtml(message)}</p>
        <button class="mando-error-retry px-md py-xs rounded-lg bg-primary text-on-primary font-body-md hover:bg-primary-dim transition-all shadow-md">Retry</button>
      </div>
    `;
    const btn = container.querySelector('.mando-error-retry');
    if (btn && retryFn) {
      btn.addEventListener('click', retryFn);
    }
  }

  // ---------------------------------------------------------------------------
  // Period tabs
  // ---------------------------------------------------------------------------

  function initPeriodTabs() {
    const container = $('period-tabs');
    if (!container) return;

    const buttons = container.querySelectorAll('.period-tab');
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        const days = parseInt(btn.dataset.days, 10);
        if (!isNaN(days) && days > 0) {
          state.periodDays = days;
          updatePeriodTabStyles();
          loadActivityAndRender();
        }
      });
    });

    updatePeriodTabStyles();
  }

  function updatePeriodTabStyles() {
    const container = $('period-tabs');
    if (!container) return;

    container.querySelectorAll('.period-tab').forEach(function (btn) {
      const days = parseInt(btn.dataset.days, 10);
      if (days === state.periodDays) {
        btn.className = 'period-tab px-md py-xs rounded-lg text-body-md transition-all bg-surface-bright text-primary font-bold shadow-sm';
      } else {
        btn.className = 'period-tab px-md py-xs rounded-lg text-body-md transition-all hover:text-primary font-medium';
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Orchestration
  // ---------------------------------------------------------------------------

  async function loadActivityAndRender() {
    await loadActivity();
    renderTotalStudyTime();
    renderHeatmap();
  }

  async function loadDataAndRender() {
    // Reset errors.
    state.errors = { aggregate: false, activity: false, hsk: false };

    // Show skeletons.
    renderTotalStudyTime();
    renderVocabularyMastery();
    renderHeatmap();
    renderTopCategories();
    renderHskProgress();

    // Load aggregate + activity + HSK decks in parallel.
    await Promise.allSettled([loadAggregate(), loadActivity(), loadHskDecks()]);

    // Fallback: if aggregate is missing but activity has data, derive summary
    // numbers from the daily activity records. This handles backends that have
    // daily records but no pre-computed AGGREGATE row.
    if (!state.aggregate && state.activity.length > 0) {
      state.aggregate = computeAggregateFromActivity(state.activity);
      console.info('Derived aggregate from activity:', state.aggregate);
    }

    // If both aggregate and activity failed, use demo fallback so the UI is
    // never completely blank.
    if (!state.aggregate && !state.demoMode) {
      state.aggregate = { ...FALLBACK_AGGREGATE };
      state.activity = generateDemoActivity(state.periodDays);
      console.info('Using demo stats fallback.');
    }

    // Render all sections.
    renderTotalStudyTime();
    renderVocabularyMastery();
    renderHeatmap();
    renderTopCategories();
    renderHskProgress();

    // Record user active (non-blocking).
    sendUserActive();
  }

  // ---------------------------------------------------------------------------
  // Main init
  // ---------------------------------------------------------------------------

  function init() {
    // Shared shell behaviors.
    if (window.MandoShell) {
      window.MandoShell.renderSidebarProfile();
      window.MandoShell.initMobileDrawer({ sidebarId: 'sidebar', overlayId: 'sidebar-overlay', toggleId: 'mobile-menu-toggle' });
    }

    initPeriodTabs();
    loadDataAndRender();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
