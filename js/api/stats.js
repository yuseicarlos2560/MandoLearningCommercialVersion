/**
 * Stats API client.
 * Base path: /api/stats
 */

(function (window) {
  'use strict';

  const BASE = '/api/stats';

  function encode(userId) {
    return encodeURIComponent(userId);
  }

  async function getAggregate(userId) {
    return window.MandoApi.get(`${BASE}/${encode(userId)}`);
  }

  async function getActivity(userId, { granularity = 'daily', start, end } = {}) {
    const params = new URLSearchParams();
    params.set('granularity', granularity);
    if (start) params.set('start', start);
    if (end) params.set('end', end);
    return window.MandoApi.get(`${BASE}/${encode(userId)}/activity?${params.toString()}`);
  }

  async function recordEvent(userId, event) {
    return window.MandoApi.post(`${BASE}/${encode(userId)}/events`, event);
  }

  async function recordBatchEvents(userId, events) {
    return window.MandoApi.post(`${BASE}/${encode(userId)}/batch-events`, { events });
  }

  window.MandoApi = window.MandoApi || {};
  window.MandoApi.stats = {
    getAggregate,
    getActivity,
    recordEvent,
    recordBatchEvents,
  };
})(window);
