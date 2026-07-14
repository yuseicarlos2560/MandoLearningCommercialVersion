/**
 * MandoLearning — Main Entry Point
 *
 * Shared functionality across all pages:
 *   - Sidebar collapsible category toggles
 *   - Global keyboard shortcuts (Ctrl+S for Save)
 *   - Mobile navigation toggle (future)
 *   - Auth initialization (userId from localStorage or URL)
 *
 * Usage: Include as the last script in every HTML page:
 *   <script type="module" src="js/main.js"></script>
 */

import { setUserId, setSessionId, flushPendingChanges, hasPendingChanges } from './state.js';
import { toast, spinner } from './ui-components.js';

// =============================================================================
// INITIALIZATION
// =============================================================================

function init() {
    initAuth();
    initSidebarToggles();
    initKeyboardShortcuts();
    initNavLinks();
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
// NAVIGATION LINKS
// =============================================================================

function initNavLinks() {
    // Highlight current page in sidebar based on URL
    const path = window.location.pathname;
    const pageName = path.split('/').pop().replace('.html', '') || 'index';

    const linkMap = {
        'index': 'Videos',
        'video-session': 'Videos',
        'deck-browser': 'Flashcards',
        'study-mode': 'Flashcards',
        'flashcard-editor': 'Flashcards',
        'stats': 'Stats',
    };

    const activeLabel = linkMap[pageName];
    if (!activeLabel) return;

    document.querySelectorAll('aside nav a').forEach((link) => {
        const label = link.querySelector('span:last-child')?.textContent?.trim();
        if (label === activeLabel) {
            link.classList.add('text-primary', 'font-bold', 'border-r-4', 'border-primary');
            link.classList.remove('text-on-surface-variant');
        } else {
            link.classList.remove('text-primary', 'font-bold', 'border-r-4', 'border-primary');
            link.classList.add('text-on-surface-variant');
        }
    });
}

// =============================================================================
// RUN
// =============================================================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
