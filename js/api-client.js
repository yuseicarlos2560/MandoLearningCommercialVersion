/**
 * MandoLearning — API Client
 *
 * Centralized HTTP layer for the TextProcessing API.
 * All reads use single endpoints. All writes go through the batch endpoint.
 *
 * Architecture:
 *   - Public API: read methods + batch() for writes
 *   - Private helpers: _fetch, _retry, _buildUrl
 *   - Error handling: exponential backoff for 500s, immediate surfacing for 400/404
 *
 * Usage:
 *   import { api } from './api-client.js';
 *   const { ok, data, error } = await api.getSessionNotes(userId, sessionId);
 *   const batchResult = await api.batch(userId, batchPayload);
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

const API_BASE =
    window.__MANDO_API_BASE__ ||
    localStorage.getItem('mando_api_base') ||
    'http://localhost:8080/api/textprocessing';

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // ms — exponential backoff

// =============================================================================
// HTTP HELPERS
// =============================================================================

/**
 * Build a full URL from path segments.
 * @param {string[]} segments — URL path segments (e.g., ['USR_001', 'VID_001'])
 * @param {Record<string, string>} [query] — optional query params
 * @returns {string}
 */
function _buildUrl(segments, query = {}) {
    const path = [API_BASE, ...segments].join('/');
    const params = new URLSearchParams(query);
    const qs = params.toString();
    return qs ? `${path}?${qs}` : path;
}

/**
 * Core fetch wrapper with retry logic for 500 errors.
 * @param {string} url
 * @param {RequestInit} options
 * @param {number} [attempt]
 * @returns {Promise<{ ok: boolean, status: number, data?: any, error?: ApiError }>}
 */
async function _fetch(url, options, attempt = 0) {
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                ...(options.headers || {}),
            },
        });

        // Success: parse JSON body (or null for 204)
        if (response.ok) {
            const data = response.status === 204 ? null : await response.json().catch(() => null);
            return { ok: true, status: response.status, data };
        }

        // Client errors (400, 404): don't retry, parse error body
        if (response.status >= 400 && response.status < 500) {
            const errorBody = await response.json().catch(() => ({}));
            return {
                ok: false,
                status: response.status,
                error: {
                    code: errorBody.errorCode || `HTTP_${response.status}`,
                    message: errorBody.message || response.statusText,
                    path: errorBody.path || url,
                    timestamp: errorBody.timestamp || new Date().toISOString(),
                },
            };
        }

        // Server errors (500): retry with exponential backoff
        if (response.status >= 500 && attempt < MAX_RETRIES) {
            const delay = RETRY_DELAYS[attempt] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
            await _sleep(delay);
            return _fetch(url, options, attempt + 1);
        }

        // Exhausted retries or other error
        const errorBody = await response.json().catch(() => ({}));
        return {
            ok: false,
            status: response.status,
            error: {
                code: errorBody.errorCode || `HTTP_${response.status}`,
                message: errorBody.message || `Server error after ${MAX_RETRIES} retries`,
                path: errorBody.path || url,
                timestamp: errorBody.timestamp || new Date().toISOString(),
            },
        };
    } catch (networkError) {
        // Network failure (offline, CORS, DNS): retry if possible
        if (attempt < MAX_RETRIES) {
            const delay = RETRY_DELAYS[attempt] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
            await _sleep(delay);
            return _fetch(url, options, attempt + 1);
        }
        return {
            ok: false,
            status: 0,
            error: {
                code: 'NETWORK_ERROR',
                message: networkError.message || 'Network request failed',
                path: url,
                timestamp: new Date().toISOString(),
            },
        };
    }
}

function _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// =============================================================================
// PUBLIC API
// =============================================================================

export const api = {
    // =========================================================================
    // READS — single endpoints, no batch needed
    // =========================================================================

    /**
     * Get all notes for a session, optionally with details.
     * @param {string} userId
     * @param {string} sessionId
     * @param {boolean} [details=true]
     * @returns {Promise<ApiResult>}
     */
    async getSessionNotes(userId, sessionId, details = true) {
        const url = _buildUrl([userId, sessionId], { details: String(details) });
        return _fetch(url, { method: 'GET' });
    },

    /**
     * Get a single note, optionally with its detail.
     * @param {string} userId
     * @param {string} sessionId
     * @param {string} noteId
     * @param {boolean} [includeDetail=true]
     * @returns {Promise<ApiResult>}
     */
    async getNote(userId, sessionId, noteId, includeDetail = true) {
        const url = _buildUrl([userId, sessionId, noteId], { includeDetail: String(includeDetail) });
        return _fetch(url, { method: 'GET' });
    },

    /**
     * Get the detail for a parent note.
     * @param {string} userId
     * @param {string} sessionId
     * @param {string} noteId
     * @returns {Promise<ApiResult>}
     */
    async getDetail(userId, sessionId, noteId) {
        const url = _buildUrl([userId, sessionId, noteId, 'detail']);
        return _fetch(url, { method: 'GET' });
    },

    /**
     * Create or update a note detail (upsert).
     *
     * Note: detail operations are not yet supported by the batch endpoint
     * (the API docs list them as "future"), so this uses the single-operation
     * endpoint directly. Notes and flashcards still go through `batch()`.
     *
     * @param {string} userId
     * @param {string} sessionId
     * @param {string} noteId
     * @param {{ detailedNote: string, exampleSentence?: string }} data
     * @returns {Promise<ApiResult>}
     */
    async saveDetail(userId, sessionId, noteId, data) {
        const url = _buildUrl([userId, sessionId, noteId, 'detail']);
        return _fetch(url, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    /**
     * Delete a note detail.
     * @param {string} userId
     * @param {string} sessionId
     * @param {string} noteId
     * @returns {Promise<ApiResult>}
     */
    async deleteDetail(userId, sessionId, noteId) {
        const url = _buildUrl([userId, sessionId, noteId, 'detail']);
        return _fetch(url, { method: 'DELETE' });
    },

    /**
     * Get flashcard deck by HSK level (paginated).
     * @param {string} userId
     * @param {string} hskLevel — e.g., 'HSK1', 'HSK3'
     * @param {{ pageSize?: number, nextToken?: string, studyMode?: string }} [opts]
     * @returns {Promise<ApiResult>}
     */
    async getDeckByHsk(userId, hskLevel, opts = {}) {
        const query = {};
        if (opts.pageSize) query.pageSize = String(opts.pageSize);
        if (opts.nextToken) query.nextToken = opts.nextToken;
        if (opts.studyMode) query.studyMode = opts.studyMode;
        const url = _buildUrl([userId, 'flashcard', 'deck', 'hsk', hskLevel], query);
        return _fetch(url, { method: 'GET' });
    },

    /**
     * Get flashcard deck by category (paginated).
     * @param {string} userId
     * @param {string} category — e.g., 'Verbs', 'Travel'
     * @param {{ pageSize?: number, nextToken?: string, studyMode?: string }} [opts]
     * @returns {Promise<ApiResult>}
     */
    async getDeckByCategory(userId, category, opts = {}) {
        const query = {};
        if (opts.pageSize) query.pageSize = String(opts.pageSize);
        if (opts.nextToken) query.nextToken = opts.nextToken;
        if (opts.studyMode) query.studyMode = opts.studyMode;
        const url = _buildUrl([userId, 'flashcard', 'deck', 'category', category], query);
        return _fetch(url, { method: 'GET' });
    },

    // =========================================================================
    // WRITES — all go through the batch endpoint, except note details
    // =========================================================================
    //
    // Note details use single-operation endpoints because the batch endpoint
    // does not yet support createDetails/updateDetails/deleteDetails.
    // See saveDetail() / deleteDetail() above.

    /**
     * Execute a mixed batch of create/update/delete operations.
     * The endpoint returns 200 even with partial failures.
     * Always inspect `response.data.failed` and `response.data.results`.
     *
     * @param {string} userId
     * @param {BatchOperationRequest} payload
     * @returns {Promise<ApiResult>}
     */
    async batch(userId, payload) {
        const url = _buildUrl([userId, 'batch']);
        return _fetch(url, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    },
};

// =============================================================================
// TYPE DEFINITIONS (JSDoc for IDE support)
// =============================================================================

/**
 * @typedef {Object} ApiError
 * @property {string} code — e.g., 'TP_VAL_004', 'NETWORK_ERROR'
 * @property {string} message — human-readable error description
 * @property {string} path — the URL that failed
 * @property {string} timestamp — ISO timestamp
 */

/**
 * @typedef {Object} ApiResult
 * @property {boolean} ok — true if the request succeeded
 * @property {number} status — HTTP status code
 * @property {any} [data] — response body on success
 * @property {ApiError} [error] — error details on failure
 */

/**
 * @typedef {Object} BatchOperationRequest
 * @property {string} [sessionId] — default session ID for note operations
 * @property {BatchCreateNoteItem[]} [createNotes]
 * @property {BatchUpdateNoteItem[]} [updateNotes]
 * @property {BatchDeleteNoteItem[]} [deleteNotes]
 * @property {BatchCreateFlashCardItem[]} [createFlashCards]
 * @property {BatchUpdateFlashCardItem[]} [updateFlashCards]
 * @property {BatchDeleteFlashCardItem[]} [deleteFlashCards]
 */

/**
 * @typedef {Object} BatchCreateNoteItem
 * @property {string} character
 * @property {string} pinyin
 * @property {string} hsk
 * @property {string} [parentNoteId]
 * @property {string} [sessionId]
 */

/**
 * @typedef {Object} BatchUpdateNoteItem
 * @property {string} sessionId
 * @property {string} noteId
 * @property {string} character
 * @property {string} pinyin
 */

/**
 * @typedef {Object} BatchDeleteNoteItem
 * @property {string} sessionId
 * @property {string} noteId
 */

/**
 * @typedef {Object} BatchCreateFlashCardItem
 * @property {string} character
 * @property {string} pinyin
 * @property {string} meaning
 * @property {string} hsk
 * @property {string} category
 * @property {string} [sessionId]
 * @property {string} [tags]
 * @property {string} [masteryStatus]
 */

/**
 * @typedef {Object} BatchUpdateFlashCardItem
 * @property {string} category
 * @property {string} flashCardId
 * @property {string} [character]
 * @property {string} [pinyin]
 * @property {string} [meaning]
 * @property {string} [hsk]
 * @property {string} [masteryStatus]
 * @property {string} [tags]
 */

/**
 * @typedef {Object} BatchDeleteFlashCardItem
 * @property {string} category
 * @property {string} flashCardId
 */
