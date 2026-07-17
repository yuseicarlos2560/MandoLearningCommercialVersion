/**
 * Flashcards API client.
 * Base path: /api/textprocessing/{userId}/flashcard/deck
 *
 * Wraps the deck query endpoints documented in
 * MandoLearningTextProcessing_api_documentation.md §4.2.
 *
 * Study modes (server-side filters applied to deck queries):
 * - MANAGE:      plain list with HSK/category filter (default)
 * - NEW:         only cards with masteryStatus = UNSTARTED
 * - DIFFICULTY:  only cards with masteryStatus = LEARNING
 * - SPACED:      only cards with masteryStatus = MASTERED
 * - RANDOM:      shuffled results from the base table
 * - CONFIDENCE:  shuffled cards with masteryStatus = MASTERED
 *
 * Pagination is cursor-based: pass the previous response's
 * `nextPageStateToken` as `nextToken`. Never cache tokens across
 * filter changes.
 *
 * All methods return a normalized { ok, status, data, error } result.
 */

(function (window) {
  'use strict';

  const STUDY_MODES = ['MANAGE', 'NEW', 'DIFFICULTY', 'SPACED', 'RANDOM', 'CONFIDENCE'];

  function base(userId) {
    return `/api/textprocessing/${encodeURIComponent(userId)}/flashcard/deck`;
  }

  function buildQuery(options) {
    const params = new URLSearchParams();
    if (options && options.studyMode) {
      const mode = String(options.studyMode).toUpperCase();
      if (STUDY_MODES.indexOf(mode) !== -1) {
        params.set('studyMode', mode);
      }
    }
    if (options && options.pageSize) params.set('pageSize', String(options.pageSize));
    if (options && options.nextToken) params.set('nextToken', options.nextToken);
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  }

  /**
   * Load cards across every HSK level and category.
   * GET /api/textprocessing/{userId}/flashcard/deck/all
   *
   * @param {string} userId
   * @param {{studyMode?: string, pageSize?: number, nextToken?: string}} [options]
   */
  async function getDeckAll(userId, options) {
    return window.MandoApi.get(`${base(userId)}/all${buildQuery(options)}`);
  }

  /**
   * Load cards filtered by HSK level.
   * GET /api/textprocessing/{userId}/flashcard/deck/hsk/{level}
   *
   * @param {string} userId
   * @param {string|number} hsk e.g. 'HSK3', 'HSK 3', or 3
   * @param {{studyMode?: string, pageSize?: number, nextToken?: string}} [options]
   */
  async function getDeckByHsk(userId, hsk, options) {
    const level = String(hsk).replace(/\D/g, '');
    return window.MandoApi.get(`${base(userId)}/hsk/${level}${buildQuery(options)}`);
  }

  /**
   * Load cards filtered by category (deck).
   * GET /api/textprocessing/{userId}/flashcard/deck/category/{category}
   *
   * @param {string} userId
   * @param {string} category e.g. 'TRAVEL', 'MISCELLANEOUS'
   * @param {{studyMode?: string, pageSize?: number, nextToken?: string}} [options]
   */
  async function getDeckByCategory(userId, category, options) {
    return window.MandoApi.get(`${base(userId)}/category/${encodeURIComponent(category)}${buildQuery(options)}`);
  }

  window.MandoApi = window.MandoApi || {};
  window.MandoApi.flashcards = {
    getDeckAll,
    getDeckByHsk,
    getDeckByCategory,
    STUDY_MODES,
  };
})(window);
