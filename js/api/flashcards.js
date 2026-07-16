/**
 * Flashcards API client.
 * Base path: /api/textprocessing/{userId}/flashcards
 *
 * Methods match the contract described in HIGH_LEVEL_PLAN.md.
 * All methods return a normalized { ok, status, data, error } result.
 */

(function (window) {
  'use strict';

  function base(userId) {
    return `/api/textprocessing/${encodeURIComponent(userId)}/flashcard/deck`;
  }

  function buildQuery(options) {
    const params = new URLSearchParams();
    if (options && options.studyMode) params.set('studyMode', options.studyMode);
    if (options && options.pageSize) params.set('pageSize', String(options.pageSize));
    if (options && options.nextToken) params.set('nextToken', options.nextToken);
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  }

  async function getDeckAll(userId, options) {
    return window.MandoApi.get(`${base(userId)}/all${buildQuery(options)}`);
  }

  async function getDeckByHsk(userId, hsk, options) {
    const level = String(hsk).replace(/\D/g, '');
    return window.MandoApi.get(`${base(userId)}/hsk/${level}${buildQuery(options)}`);
  }

  async function getDeckByCategory(userId, category, options) {
    return window.MandoApi.get(`${base(userId)}/category/${encodeURIComponent(category)}${buildQuery(options)}`);
  }

  window.MandoApi = window.MandoApi || {};
  window.MandoApi.flashcards = {
    getDeckAll,
    getDeckByHsk,
    getDeckByCategory,
  };
})(window);
