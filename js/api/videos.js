/**
 * Video API client.
 * Base path: /api/videos
 */

(function (window) {
  'use strict';

  const BASE = '/api/videos';

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

  async function getReady(videoId) {
    return window.MandoApi.get(`${BASE}/${encodeURIComponent(videoId)}`);
  }

  window.MandoApi = window.MandoApi || {};
  window.MandoApi.videos = { listReady, getReady };
})(window);
