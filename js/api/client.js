/**
 * Shared API client for MandoLearning frontend.
 *
 * Responsibilities:
 * - Build absolute URLs from a configurable base host.
 * - Attach JSON headers.
 * - Inject userId into path parameters where required.
 * - Exponential backoff for 5xx / network errors.
 * - Return a normalized { ok, status, data, error } result object.
 */

(function (window) {
  'use strict';

  const DEFAULT_HOST = 'http://localhost:8080';

  function getBaseUrl() {
    let storedHost = null;
    try {
      storedHost = window.localStorage.getItem('mando.apiHost');
    } catch (e) {
      storedHost = null;
    }
    return window.__MANDO_HOST__ || storedHost || DEFAULT_HOST;
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Perform an HTTP request with retries.
   *
   * @param {string} method HTTP method
   * @param {string} path Absolute or relative path (may already include base)
   * @param {object} options
   * @param {object} [options.body] JSON-serializable body
   * @param {object} [options.headers] Extra headers
   * @param {number} [options.retries=3]
   * @returns {Promise<{ok: boolean, status: number, data: any, error: any}>}
   */
  async function request(method, path, options = {}) {
    const baseUrl = path.startsWith('http') ? '' : getBaseUrl();
    const url = `${baseUrl}${path}`;

    const headers = {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    };

    const fetchOptions = {
      method,
      headers,
    };

    if (options.body !== undefined) {
      fetchOptions.body = JSON.stringify(options.body);
    }

    let lastError = null;
    const maxRetries = options.retries !== undefined ? options.retries : 3;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, fetchOptions);
        const status = response.status;

        // 204 No Content
        if (status === 204) {
          return { ok: true, status, data: null, error: null };
        }

        let data = null;
        const contentType = response.headers.get('Content-Type') || '';
        if (contentType.includes('application/json')) {
          data = await response.json();
        } else if (status !== 204) {
          data = await response.text();
        }

        if (response.ok) {
          return { ok: true, status, data, error: null };
        }

        // 4xx: do not retry
        if (status >= 400 && status < 500) {
          return { ok: false, status, data, error: data };
        }

        // 5xx: retry with backoff
        lastError = { status, data };
        if (attempt < maxRetries) {
          const delay = 1000 * Math.pow(2, attempt);
          await sleep(delay);
          continue;
        }

        return { ok: false, status, data, error: data };
      } catch (networkError) {
        // Network failures: retry with backoff
        lastError = networkError;
        if (attempt < maxRetries) {
          const delay = 1000 * Math.pow(2, attempt);
          await sleep(delay);
          continue;
        }
        return {
          ok: false,
          status: 0,
          data: null,
          error: { message: networkError.message || 'Network error' },
        };
      }
    }

    return {
      ok: false,
      status: lastError?.status || 0,
      data: null,
      error: lastError,
    };
  }

  window.MandoApi = {
    request,
    get: (path, options) => request('GET', path, options),
    post: (path, body, options) => request('POST', path, { ...options, body }),
    put: (path, body, options) => request('PUT', path, { ...options, body }),
    delete: (path, options) => request('DELETE', path, options),
  };
})(window);
