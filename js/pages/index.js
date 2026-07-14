/**
 * MandoLearning — Dashboard Page Logic
 *
 * Lightweight interactivity for the logged-in home dashboard:
 *   - search bar focus expansion
 *   - subtle card hover shadows
 *   - live stats widget (streak + weekly activity from Stats API)
 */

import { api } from '../api-client.js';
import { getState } from '../state.js';

// =============================================================================
// INITIALIZATION
// =============================================================================

function init() {
    initSearchFocus();
    initCardHover();
    loadDashboardStats();
}

// =============================================================================
// SEARCH / HOVER
// =============================================================================

function initSearchFocus() {
    const searchWrapper = document.getElementById('search-wrapper');
    const input = searchWrapper?.querySelector('input[type="text"]');
    if (!input || !searchWrapper) return;

    input.addEventListener('focus', () => {
        searchWrapper.classList.add('lg:w-[500px]');
    });
    input.addEventListener('blur', () => {
        searchWrapper.classList.remove('lg:w-[500px]');
    });
}

function initCardHover() {
    document.querySelectorAll('.rounded-xl').forEach((card) => {
        if (card.classList.contains('bg-primary')) return;

        card.addEventListener('mouseenter', () => {
            card.classList.add('shadow-md');
        });
        card.addEventListener('mouseleave', () => {
            card.classList.remove('shadow-md');
        });
    });
}

// =============================================================================
// LIVE STATS WIDGET
// =============================================================================

async function loadDashboardStats() {
    const userId = getState('userId');
    if (!userId) return;

    const result = await api.stats.getAggregate(userId);
    if (!result.ok) return;

    const stats = result.data?.stats;
    if (!stats) return;

    renderStreak(stats);
    renderWeeklyActivity(userId);
}

function renderStreak(stats) {
    const streakEl = document.getElementById('dash-streak');
    const longestEl = document.getElementById('dash-longest-streak');

    if (streakEl) {
        streakEl.textContent = `${stats.currentStreakDays || 0} Day Streak`;
    }
    if (longestEl) {
        longestEl.textContent = `Personal record: ${stats.longestStreakDays || 0} days`;
    }
}

async function renderWeeklyActivity(userId) {
    const container = document.getElementById('dash-weekly-activity');
    if (!container) return;

    const { start, end } = getLast7DaysRange();
    const result = await api.stats.getActivity(userId, {
        granularity: 'daily',
        start,
        end,
    });

    const activity = result.data?.activity || [];
    const byDate = new Map();
    for (const record of activity) {
        const dateKey = record.statKey.replace('DAILY#', '');
        byDate.set(dateKey, record);
    }

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayMs = 24 * 60 * 60 * 1000;
    const today = new Date();

    container.innerHTML = '';

    for (let i = 6; i >= 0; i--) {
        const d = new Date(today.getTime() - i * dayMs);
        const dateKey = d.toISOString().slice(0, 10);
        const record = byDate.get(dateKey);
        const words = (record?.wordsAdded || 0) + (record?.wordsMastered || 0);
        const maxWords = 30;
        const heightPct = Math.min(100, Math.round((words / maxWords) * 100));
        const isToday = i === 0;

        const bar = document.createElement('div');
        bar.className = 'flex-1 flex flex-col items-center gap-xs group';
        bar.innerHTML = `
            <div class="w-full flex-1 flex items-end">
                <div class="w-full ${heightPct > 0 ? (isToday ? 'bg-primary' : 'bg-primary/60') : 'bg-outline-variant/20'} ${heightPct > 0 ? 'hover:bg-primary' : ''} rounded-t-sm transition-all cursor-pointer relative"
                     style="height: ${Math.max(8, heightPct)}%"
                     title="${days[d.getDay()]}: ${words} words">
                </div>
            </div>
            <span class="text-[10px] text-on-surface-variant uppercase font-bold ${isToday ? 'text-primary' : ''}">${days[d.getDay()].charAt(0)}</span>
        `;
        container.appendChild(bar);
    }
}

function getLast7DaysRange() {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 6);

    const fmt = (d) => d.toISOString().slice(0, 10);
    return { start: fmt(start), end: fmt(end) };
}

// =============================================================================
// RUN
// =============================================================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
