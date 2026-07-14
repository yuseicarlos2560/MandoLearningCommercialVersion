/**
 * MandoLearning — Stats Dashboard Page Logic
 *
 * Displays aggregate learning stats and activity history from the Stats API,
 * plus HSK-level mastery progress from the TextProcessing API.
 */

import { api } from '../api-client.js';
import { getState } from '../state.js';
import { toast, spinner } from '../ui-components.js';
import { normalizeHsk } from '../utils.js';

// =============================================================================
// STATE
// =============================================================================

const state = {
    periodDays: 30,
    aggregate: null,
    activity: [],
    hskProgress: [],
};

// =============================================================================
// DOM REFERENCES
// =============================================================================

const els = {
    loading: document.getElementById('stats-loading'),
    empty: document.getElementById('stats-empty'),
    content: document.getElementById('stats-content'),
    periodTabs: document.getElementById('period-tabs'),
    wordsAdded: document.getElementById('stat-words-added'),
    wordsMastered: document.getElementById('stat-words-mastered'),
    streak: document.getElementById('stat-streak'),
    studyTime: document.getElementById('stat-study-time'),
    heatmap: document.getElementById('activity-heatmap'),
    heatmapMonths: document.getElementById('heatmap-months'),
    hskGrid: document.getElementById('hsk-progress-grid'),
};

// =============================================================================
// INITIALIZATION
// =============================================================================

export function init() {
    initPeriodTabs();
    loadDashboard();
}

function initPeriodTabs() {
    els.periodTabs.addEventListener('click', (e) => {
        const tab = e.target.closest('.period-tab');
        if (!tab) return;

        state.periodDays = parseInt(tab.dataset.days, 10);
        updatePeriodTabStyles();
        loadActivity();
    });
}

function updatePeriodTabStyles() {
    els.periodTabs.querySelectorAll('.period-tab').forEach((tab) => {
        const active = parseInt(tab.dataset.days, 10) === state.periodDays;
        if (active) {
            tab.className = 'period-tab px-md py-xs rounded-lg text-body-md transition-all bg-surface-bright text-primary font-bold shadow-sm';
        } else {
            tab.className = 'period-tab px-md py-xs rounded-lg text-body-md transition-all hover:text-primary font-medium';
        }
    });
}

// =============================================================================
// DATA LOADING
// =============================================================================

async function loadDashboard() {
    const userId = getState('userId');
    if (!userId) {
        showEmpty();
        return;
    }

    showLoading();

    await Promise.all([
        loadAggregate(userId),
        loadActivity(userId),
        loadHskProgress(userId),
    ]);

    if (state.aggregate) {
        showContent();
        renderAggregate();
        renderHeatmap();
        renderHskProgress();
    } else {
        showEmpty();
    }
}

async function loadAggregate(userId) {
    const result = await api.stats.getAggregate(userId);
    if (result.ok) {
        state.aggregate = result.data?.stats || null;
    } else {
        console.warn('[Stats] Failed to load aggregate stats:', result.error);
        // Don't surface as toast; the dashboard can show empty state.
    }
}

async function loadActivity(userId) {
    const { start, end } = getDateRange(state.periodDays);
    const result = await api.stats.getActivity(userId, {
        granularity: 'daily',
        start,
        end,
    });

    if (result.ok) {
        state.activity = result.data?.activity || [];
    } else {
        console.warn('[Stats] Failed to load activity:', result.error);
        state.activity = [];
    }

    // If aggregate is already loaded, re-render heatmap.
    if (state.aggregate) {
        renderHeatmap();
    }
}

async function loadHskProgress(userId) {
    const levels = ['HSK1', 'HSK2', 'HSK3', 'HSK4', 'HSK5', 'HSK6'];
    const progress = [];

    await Promise.all(
        levels.map(async (level) => {
            const result = await api.getDeckByHsk(userId, level, {
                pageSize: 50,
                studyMode: 'MANAGE',
            });

            const cards = result.data?.notes || [];
            const total = cards.length;
            const mastered = cards.filter((c) => c.masteryStatus === 'MASTERED').length;

            progress.push({
                level,
                total,
                mastered,
                percent: total > 0 ? Math.round((mastered / total) * 100) : 0,
            });
        })
    );

    // Sort by level index
    state.hskProgress = levels.map((level) =>
        progress.find((p) => p.level === level)
    );
}

function getDateRange(daysBack) {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - daysBack + 1);

    const fmt = (d) => d.toISOString().slice(0, 10);
    return { start: fmt(start), end: fmt(end) };
}

// =============================================================================
// RENDERING
// =============================================================================

function renderAggregate() {
    const stats = state.aggregate;
    if (!stats) return;

    els.wordsAdded.textContent = formatNumber(stats.wordsAdded || 0);
    els.wordsMastered.textContent = formatNumber(stats.wordsMastered || 0);
    els.streak.textContent = formatNumber(stats.currentStreakDays || 0);
    els.studyTime.textContent = formatMinutes(stats.studyTimeMinutes || 0);
}

function renderHeatmap() {
    els.heatmap.innerHTML = '';

    const { start, end } = getDateRange(state.periodDays);
    const startDate = new Date(start);
    const endDate = new Date(end);

    // Build a map: date -> activity record
    const activityByDate = new Map();
    for (const record of state.activity) {
        const dateKey = record.statKey.replace('DAILY#', '');
        activityByDate.set(dateKey, record);
    }

    // Render one cell per day in the range
    const dayMs = 24 * 60 * 60 * 1000;
    for (let t = startDate.getTime(); t <= endDate.getTime(); t += dayMs) {
        const d = new Date(t);
        const dateKey = d.toISOString().slice(0, 10);
        const record = activityByDate.get(dateKey);
        const intensity = getActivityIntensity(record);

        const cell = document.createElement('div');
        cell.className = `heatmap-cell w-full rounded-sm ${intensity}`;
        cell.title = `${dateKey}: ${record ? (record.wordsAdded || 0) + ' words added' : 'no activity'}`;
        els.heatmap.appendChild(cell);
    }

    // Month labels
    const months = new Set();
    for (let t = startDate.getTime(); t <= endDate.getTime(); t += dayMs) {
        months.add(new Date(t).toLocaleString('en-US', { month: 'short' }));
    }
    els.heatmapMonths.innerHTML = Array.from(months)
        .map((m) => `<span>${m}</span>`)
        .join('');
}

function getActivityIntensity(record) {
    if (!record) return 'bg-surface-container-highest';
    const words = (record.wordsAdded || 0) + (record.wordsMastered || 0);
    if (words >= 10) return 'bg-primary';
    if (words >= 5) return 'bg-primary/60';
    if (words >= 1) return 'bg-primary/30';
    return 'bg-surface-container-highest';
}

function renderHskProgress() {
    els.hskGrid.innerHTML = '';

    const hskWordCounts = {
        HSK1: 150,
        HSK2: 300,
        HSK3: 600,
        HSK4: 1200,
        HSK5: 2500,
        HSK6: 5000,
    };

    for (const item of state.hskProgress) {
        const officialTotal = hskWordCounts[item.level] || item.total;
        const percent = officialTotal > 0
            ? Math.min(100, Math.round((item.mastered / officialTotal) * 100))
            : 0;

        const el = document.createElement('div');
        el.className = 'space-y-sm';
        el.innerHTML = `
            <div class="flex justify-between items-end">
                <span class="font-headline-md text-headline-md ${percent > 0 ? 'text-primary' : 'text-on-surface-variant'}">${item.level.replace('HSK', 'HSK ')}</span>
                <span class="text-body-md font-bold text-on-surface">${percent}%</span>
            </div>
            <div class="w-full h-3 bg-surface-container-highest rounded-full overflow-hidden">
                <div class="h-full ${percent > 0 ? 'bg-primary' : 'bg-surface-container-highest'} transition-all duration-1000" style="width: ${percent}%"></div>
            </div>
            <p class="text-[12px] text-on-surface-variant">${item.mastered} / ${officialTotal} Words Mastered${item.total > 0 ? ` (${item.total} in deck)` : ''}</p>
        `;
        els.hskGrid.appendChild(el);
    }
}

// =============================================================================
// UI STATE
// =============================================================================

function showLoading() {
    els.loading.classList.remove('hidden');
    els.empty.classList.add('hidden');
    els.content.classList.add('hidden');
}

function showEmpty() {
    els.loading.classList.add('hidden');
    els.empty.classList.remove('hidden');
    els.content.classList.add('hidden');
}

function showContent() {
    els.loading.classList.add('hidden');
    els.empty.classList.add('hidden');
    els.content.classList.remove('hidden');
}

// =============================================================================
// UTILITIES
// =============================================================================

function formatNumber(n) {
    return n.toLocaleString('en-US');
}

function formatMinutes(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}

// =============================================================================
// RUN
// =============================================================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
