/**
 * TextProcessing Batch API client.
 * Base path: /api/textprocessing
 */

(function (window) {
  'use strict';

  const BASE = '/api/textprocessing';

  async function flush(userId, payload) {
    return window.MandoApi.post(`${BASE}/${encodeURIComponent(userId)}/batch`, payload);
  }

  window.MandoApi = window.MandoApi || {};
  window.MandoApi.batch = { flush };
})(window);
