/**
 * Scripts API client.
 * Base path: /api/scripts (public learner catalog)
 *
 * Note: the public list endpoint currently returns all published scripts
 * newest-first and does not support server-side filtering by scriptType.
 * Callers that need type-specific results should filter the returned
 * `scripts` array client-side.
 */

(function (window) {
  'use strict';

  const BASE = '/api/scripts';

  function encode(value) {
    return encodeURIComponent(value);
  }

  async function listReady({ pageSize = 20, nextToken = null } = {}) {
    const params = new URLSearchParams();
    if (pageSize !== undefined && pageSize !== null) {
      params.set('pageSize', String(pageSize));
    }
    if (nextToken) {
      params.set('nextToken', nextToken);
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    return window.MandoApi.get(`${BASE}${query}`);
  }

  async function getReady(scriptId) {
    return window.MandoApi.get(`${BASE}/${encode(scriptId)}`);
  }

  async function getContent(scriptId) {
    return window.MandoApi.get(`${BASE}/${encode(scriptId)}/content`);
  }

  async function getAudioUrl(scriptId) {
    return window.MandoApi.get(`${BASE}/${encode(scriptId)}/audio`);
  }

  window.MandoApi = window.MandoApi || {};
  window.MandoApi.scripts = { listReady, getReady, getContent, getAudioUrl };
})(window);
