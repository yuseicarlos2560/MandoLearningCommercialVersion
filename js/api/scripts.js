/**
 * Scripts API client.
 * Base path: /api/scripts (public learner catalog)
 */

(function (window) {
  'use strict';

  const BASE = '/api/scripts';

  function encode(value) {
    return encodeURIComponent(value);
  }

  async function listReady({ pageSize = 20, nextToken = null, scriptType = null } = {}) {
    const params = new URLSearchParams();
    if (pageSize !== undefined && pageSize !== null) {
      params.set('pageSize', String(pageSize));
    }
    if (nextToken) {
      params.set('nextToken', nextToken);
    }
    if (scriptType) {
      params.set('scriptType', scriptType);
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
