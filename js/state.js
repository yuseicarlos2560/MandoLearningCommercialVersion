/**
 * MandoLearning — Lightweight State Store
 *
 * A minimal reactive state manager using the Observer pattern.
 * No external dependencies. Designed for the batch-only workflow.
 *
 * Key features:
 *   - pub/sub: UI components subscribe to state slices and re-render on change
 *   - pendingChanges queue: all user mutations accumulate here until Save
 *   - queue/flush helpers: build BatchOperationRequest from accumulated changes
 *
 * Usage:
 *   import { state, subscribe, setState, queueChange, flushPendingChanges, hasPendingChanges } from './state.js';
 *   subscribe('notes', (notes) => renderNotes(notes));
 *   setState('notes', fetchedNotes);
 *   queueChange('CREATE_NOTE', { character: '...', pinyin: '...', hsk: '...' });
 *   const result = await flushPendingChanges('USR_001', 'VID_001');
 */

import { api } from './api-client.js';

// =============================================================================
// STORE DEFINITION
// =============================================================================

const store = {
    // -------------------------------------------------------------------------
    // Identity & Session
    // -------------------------------------------------------------------------
    userId: localStorage.getItem('mando_user_id') || null,
    currentSessionId: null, // active video session (e.g., 'VID_AAA000')

    // -------------------------------------------------------------------------
    // Data (loaded from API via GET endpoints)
    // -------------------------------------------------------------------------
    notes: [],              // session notes (flat array from API)
    noteDetails: {},        // map: noteId -> NoteDetailEntity
    flashcards: [],         // current deck page
    deckPagination: {       // cursor pagination state
        nextToken: null,
        hasMore: false,
    },

    // -------------------------------------------------------------------------
    // UI State
    // -------------------------------------------------------------------------
    isSaving: false,        // batch request in flight
    saveError: null,        // last batch error (for retry UI)
    selectedNoteId: null,   // currently expanded/selected note

    // -------------------------------------------------------------------------
    // Pending Changes Queue (the heart of the batch-only architecture)
    // -------------------------------------------------------------------------
    // Each item: { operation, entityType, data, _id }
    // _id is a client-side temporary ID for mapping back to UI on failure
    pendingChanges: [],
};

// =============================================================================
// OBSERVER SYSTEM (pub/sub)
// =============================================================================

/** @type {Map<string, Set<Function>>} */
const listeners = new Map();

/**
 * Subscribe to a state key. Callback receives the new value.
 * @param {string} key — state key to watch (e.g., 'notes', 'pendingChanges')
 * @param {Function} callback — fn(newValue)
 * @returns {Function} unsubscribe function
 */
export function subscribe(key, callback) {
    if (!listeners.has(key)) {
        listeners.set(key, new Set());
    }
    listeners.get(key).add(callback);

    // Immediately call with current value (useful for initial render)
    callback(store[key]);

    return () => {
        listeners.get(key)?.delete(callback);
    };
}

/**
 * Set a state value and notify subscribers.
 * @param {string} key
 * @param {any} value
 */
export function setState(key, value) {
    store[key] = value;
    const subs = listeners.get(key);
    if (subs) {
        subs.forEach((cb) => {
            try {
                cb(value);
            } catch (err) {
                console.error(`State subscriber error for "${key}":`, err);
            }
        });
    }
}

/**
 * Get current state value (for read-only access).
 * @param {string} key
 * @returns {any}
 */
export function getState(key) {
    return store[key];
}

// =============================================================================
// PENDING CHANGES QUEUE
// =============================================================================

let _changeId = 0;
function _nextChangeId() {
    return `change_${++_changeId}_${Date.now()}`;
}

/**
 * Queue a mutation for the next batch save.
 *
 * @param {string} operation — 'CREATE_NOTE' | 'UPDATE_NOTE' | 'DELETE_NOTE' |
 *                            'CREATE_FLASHCARD' | 'UPDATE_FLASHCARD' | 'DELETE_FLASHCARD' |
 *                            'CREATE_DETAIL' | 'UPDATE_DETAIL' | 'DELETE_DETAIL'
 * @param {Object} data — operation-specific payload
 * @returns {string} client-side change ID (for tracking / retry)
 */
export function queueChange(operation, data) {
    const change = {
        _id: _nextChangeId(),
        operation,
        data: { ...data },
    };
    store.pendingChanges.push(change);
    setState('pendingChanges', [...store.pendingChanges]); // notify subscribers
    return change._id;
}

/**
 * Remove a pending change by its client-side ID.
 * @param {string} changeId
 */
export function removePendingChange(changeId) {
    const idx = store.pendingChanges.findIndex((c) => c._id === changeId);
    if (idx !== -1) {
        store.pendingChanges.splice(idx, 1);
        setState('pendingChanges', [...store.pendingChanges]);
    }
}

/**
 * Check if there are unsaved changes.
 * @returns {boolean}
 */
export function hasPendingChanges() {
    return store.pendingChanges.length > 0;
}

/**
 * Clear all pending changes (e.g., after successful save).
 */
export function clearPendingChanges() {
    store.pendingChanges = [];
    setState('pendingChanges', []);
}

// =============================================================================
// BATCH FLUSH — convert queue to BatchOperationRequest and send
// =============================================================================

/**
 * Build a BatchOperationRequest from the pending changes queue.
 *
 * Also returns a mapping from batch result coordinates (`{operation}_{index}`)
 * back to the client-side change `_id`. This lets `flushPendingChanges`
 * correlate per-item results with the original queue even though the queue is
 * a flat, mixed-operation list and the API returns results grouped by operation.
 *
 * @param {string} [defaultSessionId] — used for note operations without explicit sessionId
 * @returns {{ payload: BatchOperationRequest, resultIndexToChangeId: Map<string, string> }}
 */
export function buildBatchPayload(defaultSessionId) {
    const payload = {
        sessionId: defaultSessionId || store.currentSessionId || undefined,
    };

    const arrays = {
        CREATE_NOTE: 'createNotes',
        UPDATE_NOTE: 'updateNotes',
        DELETE_NOTE: 'deleteNotes',
        CREATE_FLASHCARD: 'createFlashCards',
        UPDATE_FLASHCARD: 'updateFlashCards',
        DELETE_FLASHCARD: 'deleteFlashCards',
        CREATE_DETAIL: 'createDetails',
        UPDATE_DETAIL: 'updateDetails',
        DELETE_DETAIL: 'deleteDetails',
    };

    // Track mapping from batch result (operation + array index) -> changeId
    const resultIndexToChangeId = new Map();
    const groups = {};

    for (const change of store.pendingChanges) {
        const arrayKey = arrays[change.operation];
        if (!arrayKey) {
            console.warn(`Unknown operation: ${change.operation}`);
            continue;
        }
        if (!groups[arrayKey]) groups[arrayKey] = [];

        const index = groups[arrayKey].length;
        resultIndexToChangeId.set(`${change.operation}_${index}`, change._id);
        groups[arrayKey].push(change.data);
    }

    // Attach non-empty arrays to payload
    for (const [arrayKey, items] of Object.entries(groups)) {
        if (items.length > 0) {
            payload[arrayKey] = items;
        }
    }

    return { payload, resultIndexToChangeId };
}

/**
 * Build a batch payload + result-index mapping from an arbitrary subset of
 * pending changes. Used internally by flushPendingChanges for chunking.
 */
function _buildBatchPayloadForChunk(chunk, defaultSessionId) {
    const payload = {
        sessionId: defaultSessionId || store.currentSessionId || undefined,
    };

    const arrays = {
        CREATE_NOTE: 'createNotes',
        UPDATE_NOTE: 'updateNotes',
        DELETE_NOTE: 'deleteNotes',
        CREATE_FLASHCARD: 'createFlashCards',
        UPDATE_FLASHCARD: 'updateFlashCards',
        DELETE_FLASHCARD: 'deleteFlashCards',
        CREATE_DETAIL: 'createDetails',
        UPDATE_DETAIL: 'updateDetails',
        DELETE_DETAIL: 'deleteDetails',
    };

    const resultIndexToChangeId = new Map();
    const groups = {};

    for (const change of chunk) {
        const arrayKey = arrays[change.operation];
        if (!arrayKey) {
            console.warn(`Unknown operation: ${change.operation}`);
            continue;
        }
        if (!groups[arrayKey]) groups[arrayKey] = [];

        const index = groups[arrayKey].length;
        resultIndexToChangeId.set(`${change.operation}_${index}`, change._id);
        groups[arrayKey].push(change.data);
    }

    for (const [arrayKey, items] of Object.entries(groups)) {
        if (items.length > 0) {
            payload[arrayKey] = items;
        }
    }

    return { payload, resultIndexToChangeId };
}

/**
 * Flush all pending changes to the API via the batch endpoint.
 *
 * The API enforces a maximum of 25 items per batch request, so this function
 * automatically splits larger queues into multiple 25-item chunks and processes
 * them sequentially. Succeeded changes are removed from the queue; failed or
 * unprocessed changes remain for retry.
 *
 * @param {string} userId
 * @param {string} [defaultSessionId] — overrides store.currentSessionId
 * @returns {Promise<{ ok: boolean, result?: any, failedChanges?: Array, error?: any }>}
 */
export async function flushPendingChanges(userId, defaultSessionId) {
    if (!hasPendingChanges()) {
        return { ok: true, result: null };
    }

    if (!userId) {
        return { ok: false, error: { message: 'No user ID provided. Cannot save.' } };
    }

    const BATCH_SIZE_LIMIT = 25;
    const chunks = [];
    for (let i = 0; i < store.pendingChanges.length; i += BATCH_SIZE_LIMIT) {
        chunks.push(store.pendingChanges.slice(i, i + BATCH_SIZE_LIMIT));
    }

    setState('isSaving', true);
    setState('saveError', null);

    const succeededChangeIds = new Set();
    const failedChanges = [];
    let lastResult = null;
    let requestError = null;

    for (const chunk of chunks) {
        const { payload, resultIndexToChangeId } = _buildBatchPayloadForChunk(chunk, defaultSessionId);
        const response = await api.batch(userId, payload);

        if (!response.ok) {
            // Complete request failure (network, 500 after retries, etc.)
            // Stop processing further chunks; remaining changes stay in queue.
            requestError = response.error;
            break;
        }

        const result = response.data;
        lastResult = result;
        const results = result.results || [];

        if (results.length === 0 && chunk.length > 0) {
            requestError = { message: result.statusMessage || 'Batch response missing per-item results.' };
            break;
        }

        for (const r of results) {
            const changeId = resultIndexToChangeId.get(`${r.operation}_${r.index}`);
            if (!changeId) continue;

            if (r.status === 'SUCCESS') {
                succeededChangeIds.add(changeId);
            } else if (r.status === 'FAILED') {
                const change = store.pendingChanges.find((c) => c._id === changeId);
                if (change) failedChanges.push({ change, result: r });
            }
        }
    }

    setState('isSaving', false);

    // Remove only the changes we know succeeded. Failed, unmapped, or unprocessed
    // changes stay in the queue so the user can retry or fix them.
    store.pendingChanges = store.pendingChanges.filter((c) => !succeededChangeIds.has(c._id));
    setState('pendingChanges', [...store.pendingChanges]);

    if (requestError) {
        setState('saveError', requestError);
        return { ok: false, error: requestError, failedChanges };
    }

    if (failedChanges.length > 0) {
        return { ok: false, result: lastResult, failedChanges, error: { message: lastResult?.statusMessage } };
    }

    return { ok: true, result: lastResult };
}

// =============================================================================
// SESSION HELPERS
// =============================================================================

/**
 * Set the current user ID (persisted to localStorage).
 * @param {string} userId
 */
export function setUserId(userId) {
    store.userId = userId;
    if (userId) {
        localStorage.setItem('mando_user_id', userId);
    } else {
        localStorage.removeItem('mando_user_id');
    }
    setState('userId', userId);
}

/**
 * Set the current video session ID.
 * @param {string} sessionId
 */
export function setSessionId(sessionId) {
    store.currentSessionId = sessionId;
    setState('currentSessionId', sessionId);
}

// =============================================================================
// EXPORTS
// =============================================================================

// Convenience re-export of the entire store for debugging (read-only in production)
export const state = new Proxy(store, {
    set() {
        throw new Error('Use setState() to mutate state.');
    },
});
