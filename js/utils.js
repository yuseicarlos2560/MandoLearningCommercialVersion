/**
 * MandoLearning — Utility Functions
 *
 * Pure helper functions with no side effects.
 * Tree building, pagination helpers, date formatting, validation.
 */

// =============================================================================
// NOTE TREE BUILDER
// =============================================================================

/**
 * Build a hierarchical tree from a flat array of notes.
 *
 * The API returns notes as a flat array with `parentNoteId`.
 * Root notes have `parentNoteId: null`.
 * Child notes reference their parent's `noteId`.
 *
 * @param {Array<NoteEntity>} notes — flat array from API
 * @returns {Array<TreeNode>} — array of root nodes with nested `children`
 *
 * @example
 *   const tree = buildNoteTree([
 *     { noteId: 'N1', character: '举办', parentNoteId: null },
 *     { noteId: 'N2', character: '校', parentNoteId: 'N1' }
 *   ]);
 *   // => [{ noteId: 'N1', character: '举办', children: [{ noteId: 'N2', ... }] }]
 */
export function buildNoteTree(notes) {
    if (!Array.isArray(notes) || notes.length === 0) return [];

    const map = new Map();
    const roots = [];

    // First pass: create all nodes
    for (const note of notes) {
        map.set(note.noteId, { ...note, children: [] });
    }

    // Second pass: link children to parents
    for (const note of notes) {
        const node = map.get(note.noteId);
        if (note.parentNoteId === null || note.parentNoteId === undefined) {
            roots.push(node);
        } else {
            const parent = map.get(note.parentNoteId);
            if (parent) {
                parent.children.push(node);
            } else {
                // Orphan child: parent not in this batch. Treat as root.
                roots.push(node);
            }
        }
    }

    return roots;
}

/**
 * Flatten a note tree back to a flat array (for API submission).
 * @param {Array<TreeNode>} tree
 * @returns {Array<NoteEntity>}
 */
export function flattenNoteTree(tree) {
    const result = [];
    function walk(nodes) {
        for (const node of nodes) {
            const { children, ...note } = node;
            result.push(note);
            if (children && children.length > 0) {
                walk(children);
            }
        }
    }
    walk(tree);
    return result;
}

// =============================================================================
// PAGINATION HELPERS
// =============================================================================

/**
 * Create pagination state for deck queries.
 * @param {Object} response — API response from deck endpoint
 * @returns {{ hasMore: boolean, nextToken: string | null }}
 */
export function parsePagination(response) {
    if (!response || !response.data) {
        return { hasMore: false, nextToken: null };
    }
    const nextToken = response.data.nextPageStateToken || null;
    return {
        hasMore: !!nextToken,
        nextToken,
    };
}

/**
 * Check if we can load more pages.
 * @param {{ hasMore: boolean, nextToken: string | null }} pagination
 * @returns {boolean}
 */
export function canLoadMore(pagination) {
    return pagination && pagination.hasMore && !!pagination.nextToken;
}

// =============================================================================
// DATE / TIME FORMATTING
// =============================================================================

/**
 * Format an ISO timestamp to a human-readable string.
 * @param {string} iso — ISO 8601 timestamp
 * @returns {string} — e.g., "Jan 15, 2024, 10:30 AM"
 */
export function formatDate(iso) {
    if (!iso) return '';
    const date = new Date(iso);
    if (isNaN(date.getTime())) return iso; // fallback if invalid

    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
}

/**
 * Format a duration in seconds to mm:ss.
 * @param {number} seconds
 * @returns {string} — e.g., "1:40"
 */
export function formatDuration(seconds) {
    if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get current timestamp in ISO format (for note creation).
 * @returns {string}
 */
export function nowIso() {
    return new Date().toISOString();
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate a note creation payload.
 * @param {{ character: string, hsk: string, pinyin?: string }} data
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateNote(data) {
    const errors = [];
    if (!data.character || data.character.trim().length === 0) {
        errors.push('Character is required.');
    } else if (data.character.length > 25) {
        errors.push('Character must be 25 characters or fewer.');
    }
    if (!data.hsk || data.hsk.trim().length === 0) {
        errors.push('HSK level is required.');
    }
    if (data.pinyin && data.pinyin.length > 250) {
        errors.push('Pinyin must be 250 characters or fewer.');
    }
    return { valid: errors.length === 0, errors };
}

/**
 * Validate a flashcard creation payload.
 * @param {{ character: string, hsk: string, meaning?: string, pinyin?: string, category?: string }} data
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateFlashcard(data) {
    const errors = [];
    if (!data.character || data.character.trim().length === 0) {
        errors.push('Character is required.');
    } else if (data.character.length > 25) {
        errors.push('Character must be 25 characters or fewer.');
    }
    if (!data.hsk || data.hsk.trim().length === 0) {
        errors.push('HSK level is required.');
    }
    if (data.meaning && data.meaning.length > 150) {
        errors.push('Meaning must be 150 characters or fewer.');
    }
    if (data.pinyin && data.pinyin.length > 250) {
        errors.push('Pinyin must be 250 characters or fewer.');
    }
    return { valid: errors.length === 0, errors };
}

/**
 * Validate a note detail payload.
 * @param {{ detailedNote: string, exampleSentence?: string }} data
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateDetail(data) {
    const errors = [];
    if (!data.detailedNote || data.detailedNote.trim().length === 0) {
        errors.push('Detailed note is required.');
    } else if (data.detailedNote.length > 1000) {
        errors.push('Detailed note must be 1000 characters or fewer.');
    }
    if (data.exampleSentence && data.exampleSentence.length > 100) {
        errors.push('Example sentence must be 100 characters or fewer.');
    }
    return { valid: errors.length === 0, errors };
}

// =============================================================================
// STRING UTILITIES
// =============================================================================

/**
 * Escape HTML special characters to prevent XSS.
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
    if (typeof str !== 'string') return String(str);
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Generate a client-side temporary ID.
 * @param {string} [prefix='temp']
 * @returns {string}
 */
export function generateTempId(prefix = 'temp') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Normalize HSK level to uppercase (HSK1, HSK2, etc.).
 * @param {string} hsk
 * @returns {string}
 */
export function normalizeHsk(hsk) {
    return hsk.toUpperCase().replace(/\s/g, '');
}

/**
 * Normalize category to uppercase (the API auto-uppercases, but we do it client-side too).
 * @param {string} category
 * @returns {string}
 */
export function normalizeCategory(category) {
    return category.toUpperCase().replace(/\s/g, '_');
}

// =============================================================================
// TYPE DEFINITIONS (JSDoc)
// =============================================================================

/**
 * @typedef {Object} NoteEntity
 * @property {string} userId
 * @property {string} sessionId
 * @property {string} noteId
 * @property {string} character
 * @property {string} pinyin
 * @property {string|null} parentNoteId
 * @property {string} timestamp
 */

/**
 * @typedef {Object} TreeNode
 * @property {string} noteId
 * @property {string} character
 * @property {string} pinyin
 * @property {string|null} parentNoteId
 * @property {string} timestamp
 * @property {TreeNode[]} children
 */
