/**
 * MandoLearning — Main Entry Point
 *
 * Shared functionality across all pages:
 *   - Auth initialization (userId from localStorage or URL)
 *   - Daily stats tracking (USER_ACTIVE events)
 *   - Sidebar collapsible category toggles (page-specific)
 *   - Global keyboard shortcuts (Ctrl+S for Save)
 *
 * Usage: Include as the last script in every HTML page:
 *   <script type="module" src="js/main.js"></script>
 */

import { setUserId, setSessionId, flushPendingChanges, hasPendingChanges, getState } from './state.js';
import { api } from './api-client.js';
import { toast, spinner } from './ui-components.js';

// =============================================================================
// INITIALIZATION
// =============================================================================

function init() {
    initAuth();
    initSidebarToggles();
    initKeyboardShortcuts();
}

// =============================================================================
// AUTH / SESSION SETUP
// =============================================================================

function initAuth() {
    // Try to get userId from URL query param first, then localStorage
    const params = new URLSearchParams(window.location.search);
    const urlUserId = params.get('userId');
    const storedUserId = localStorage.getItem('mando_user_id');
    const userId = urlUserId || storedUserId;

    if (userId) {
        setUserId(userId);
    } else {
        console.warn('[Mando] No userId found. Set ?userId=USR_xxx in URL or call setUserId().');
    }

    // Session ID from URL
    const sessionId = params.get('session');
    if (sessionId) {
        setSessionId(sessionId);
    }

    // Initialize stats tracking for known users
    if (userId) {
        trackUserActive(userId).catch((err) => {
            console.warn('[Mando] Stats initialization failed:', err);
        });
    }
}

// =============================================================================
// STATS TRACKING
// =============================================================================

const LAST_USER_ACTIVE_KEY = 'mando_last_user_active';

/**
 * Ensure the user has an aggregate stats record.
 * The backend currently returns 500/404 for users with no activity, so we
 * prime it by sending a USER_ACTIVE event when aggregate stats cannot be read.
 */
async function ensureStatsInitialized(userId) {
    const result = await api.stats.getAggregate(userId);
    if (result.ok) return true;

    // Cold start: post a single USER_ACTIVE event to create the record.
    const initResult = await api.stats.recordEvent(userId, {
        eventId: `ua_init_${userId}_${Date.now()}`,
        eventType: 'USER_ACTIVE',
        timestamp: new Date().toISOString(),
    });

    return initResult.ok;
}

/**
 * Send a USER_ACTIVE event once per calendar day.
 * Also initializes the stats record for new users.
 */
async function trackUserActive(userId) {
    await ensureStatsInitialized(userId);

    const today = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem(LAST_USER_ACTIVE_KEY) === today) return;

    const result = await api.stats.recordEvent(userId, {
        eventId: `ua_${userId}_${today}`,
        eventType: 'USER_ACTIVE',
        timestamp: new Date().toISOString(),
    });

    if (result.ok) {
        localStorage.setItem(LAST_USER_ACTIVE_KEY, today);
    }
}

// =============================================================================
// SIDEBER COLLAPSIBLE CATEGORIES
// =============================================================================

function initSidebarToggles() {
    document.querySelectorAll('.category-toggle').forEach((toggle) => {
        toggle.addEventListener('click', () => {
            const list = toggle.nextElementSibling;
            const chevron = toggle.querySelector('.chevron');
            if (!list) return;

            const isHidden = list.classList.contains('hidden');
            if (isHidden) {
                list.classList.remove('hidden');
                chevron?.classList.add('rotate-90');
            } else {
                list.classList.add('hidden');
                chevron?.classList.remove('rotate-90');
            }
        });
    });
}

// =============================================================================
// KEYBOARD SHORTCUTS
// =============================================================================

function initKeyboardShortcuts() {
    document.addEventListener('keydown', async (e) => {
        // Ctrl+S / Cmd+S — Save All
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            await handleSaveAll();
        }
    });
}

/**
 * Handle the global Save All shortcut.
 * Pages can override this by defining `window.__mandoOnSaveAll__`.
 */
async function handleSaveAll() {
    const userId = localStorage.getItem('mando_user_id');
    if (!userId) {
        toast.error('No user ID. Cannot save.');
        return;
    }

    if (!hasPendingChanges()) {
        toast.info('Nothing to save.');
        return;
    }

    // Allow pages to provide custom session ID
    const sessionId = window.__mandoSessionId__ || undefined;

    spinner.show('Saving...');
    const result = await flushPendingChanges(userId, sessionId);
    spinner.hide();

    if (result.ok) {
        const succeeded = result.result?.succeeded || 0;
        const total = result.result?.totalRequested || 0;
        toast.success(`Saved ${succeeded}/${total} changes.`);
    } else if (result.failedChanges && result.failedChanges.length > 0) {
        const failed = result.failedChanges.length;
        const total = result.result?.totalRequested || 0;
        toast.warning(`${failed}/${total} changes failed. Check the notes panel.`);
        // Notify page-specific handlers about failed changes
        if (window.__mandoOnBatchFailure__) {
            window.__mandoOnBatchFailure__(result.failedChanges);
        }
    } else {
        toast.error(result.error?.message || 'Save failed. Please retry.');
    }
}

// Make handleSaveAll available globally for page-specific Save buttons
window.__mandoHandleSaveAll__ = handleSaveAll;

// =============================================================================
// RUN
// =============================================================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
