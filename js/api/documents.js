/**
 * Documents API client.
 * Base path: /api/documents/{userId}
 *
 * Wraps the user-private documents contract documented in
 * ~/IdeaProjects/MandoLearning/MandoLearningDocuments_api_documentation.md.
 *
 * IMPORTANT: the backend documents module may not be deployed in every
 * environment. Every method can therefore return a 404 — callers must treat
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
   * POST /api/documents/{userId}
   *
   * @param {string} userId
   * @param {{fileName: string, contentType: string, fileSizeBytes: number}} data
   */
  async function initiateUpload(userId, data) {
    return window.MandoApi.post(`${BASE}/${encode(userId)}`, data);
  }

  /**
   * Mark an upload complete: verifies the S3 object and flips status to READY.
   * POST /api/documents/{userId}/{documentId}/complete
   */
  async function completeUpload(userId, documentId) {
    return window.MandoApi.post(`${BASE}/${encode(userId)}/${encode(documentId)}/complete`, {});
  }

  /**
   * List the caller's documents, newest first.
   * GET /api/documents/{userId}?pageSize&nextToken
   *
   * @param {string} userId
   * @param {{pageSize?: number, nextToken?: string}} [options]
   */
  async function list(userId, options) {
    const params = new URLSearchParams();
    if (options && options.pageSize) params.set('pageSize', String(options.pageSize));
    if (options && options.nextToken) params.set('nextToken', options.nextToken);
    const query = params.toString() ? `?${params.toString()}` : '';
    return window.MandoApi.get(`${BASE}/${encode(userId)}${query}`);
  }

  /**
   * Get document metadata + presigned download URL.
   * GET /api/documents/{userId}/{documentId}
   */
  async function get(userId, documentId) {
    return window.MandoApi.get(`${BASE}/${encode(userId)}/${encode(documentId)}`);
  }

  /**
   * Delete a document (metadata + S3 object).
   * DELETE /api/documents/{userId}/{documentId}
   */
  async function remove(userId, documentId) {
    return window.MandoApi.delete(`${BASE}/${encode(userId)}/${encode(documentId)}`);
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
