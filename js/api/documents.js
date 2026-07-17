/**
 * Documents API client.
 * Base path: /api/documents
 *
 * Wraps the user-private documents contract specified in
 * SCRIPTS_DOCUMENTS_LOW_LEVEL_PLAN.md §4.2.
 *
 * IMPORTANT: the backend documents module is specified but not yet deployed.
 * Every method can therefore return a 404 in practice — callers must treat
 * 404 as "module not deployed" and degrade gracefully (see
 * DOCUMENTS_MVP_PLAN.md §3.4).
 *
 * All methods return a normalized { ok, status, data, error } result.
 */

(function (window) {
  'use strict';

  const BASE = '/api/documents';

  function encode(value) {
    return encodeURIComponent(value);
  }

  /**
   * Initiate an upload: creates PENDING_UPLOAD metadata and returns a
   * presigned S3 PUT URL.
   * POST /api/documents
   *
   * @param {string} userId
   * @param {{fileName: string, fileSizeBytes: number, mimeType: string}} data
   */
  async function initiateUpload(userId, data) {
    return window.MandoApi.post(`${BASE}?userId=${encode(userId)}`, data);
  }

  /**
   * Mark an upload complete: verifies the S3 object and flips status to READY.
   * POST /api/documents/{documentId}/complete
   */
  async function completeUpload(documentId) {
    return window.MandoApi.post(`${BASE}/${encode(documentId)}/complete`, {});
  }

  /**
   * List the caller's documents, newest first.
   * GET /api/documents?userId&pageSize&nextToken
   *
   * @param {string} userId
   * @param {{pageSize?: number, nextToken?: string}} [options]
   */
  async function list(userId, options) {
    const params = new URLSearchParams();
    params.set('userId', userId);
    if (options && options.pageSize) params.set('pageSize', String(options.pageSize));
    if (options && options.nextToken) params.set('nextToken', options.nextToken);
    return window.MandoApi.get(`${BASE}?${params.toString()}`);
  }

  /**
   * Get document metadata + presigned download URL.
   * GET /api/documents/{documentId}?userId
   */
  async function get(userId, documentId) {
    return window.MandoApi.get(`${BASE}/${encode(documentId)}?userId=${encode(userId)}`);
  }

  /**
   * Delete a document (metadata + S3 object).
   * DELETE /api/documents/{documentId}?userId
   */
  async function remove(userId, documentId) {
    return window.MandoApi.delete(`${BASE}/${encode(documentId)}?userId=${encode(userId)}`);
  }

  window.MandoApi = window.MandoApi || {};
  window.MandoApi.documents = {
    initiateUpload,
    completeUpload,
    list,
    get,
    remove,
  };
})(window);
