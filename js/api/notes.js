/**
 * TextProcessing Notes API client.
 * Base path: /api/textprocessing
 */

(function (window) {
  'use strict';

  const BASE = '/api/textprocessing';

  function encode(value) {
    return encodeURIComponent(value);
  }

  async function listSession(userId, sessionId, details = true) {
    const query = details ? '?details=true' : '';
    return window.MandoApi.get(`${BASE}/${encode(userId)}/${encode(sessionId)}${query}`);
  }

  async function get(userId, sessionId, noteId, includeDetail = true) {
    const query = includeDetail ? '?includeDetail=true' : '';
    return window.MandoApi.get(`${BASE}/${encode(userId)}/${encode(sessionId)}/${encode(noteId)}${query}`);
  }

  async function create(userId, sessionId, data, parentNoteId = null) {
    const query = parentNoteId ? `?parentNoteId=${encode(parentNoteId)}` : '';
    return window.MandoApi.post(`${BASE}/${encode(userId)}/${encode(sessionId)}/notes/add${query}`, data);
  }

  async function update(userId, sessionId, noteId, data) {
    return window.MandoApi.put(`${BASE}/${encode(userId)}/${encode(sessionId)}/${encode(noteId)}`, data);
  }

  async function deleteNote(userId, sessionId, noteId) {
    return window.MandoApi.delete(`${BASE}/${encode(userId)}/${encode(sessionId)}/${encode(noteId)}`);
  }

  async function getDetail(userId, sessionId, noteId) {
    return window.MandoApi.get(`${BASE}/${encode(userId)}/${encode(sessionId)}/${encode(noteId)}/detail`);
  }

  async function saveDetail(userId, sessionId, noteId, detail) {
    return window.MandoApi.put(`${BASE}/${encode(userId)}/${encode(sessionId)}/${encode(noteId)}/detail`, detail);
  }

  async function deleteDetail(userId, sessionId, noteId) {
    return window.MandoApi.delete(`${BASE}/${encode(userId)}/${encode(sessionId)}/${encode(noteId)}/detail`);
  }

  // ---------------------------------------------------------------------------
  // Script-scoped notes (admin-managed articles)
  // Base path: /api/textprocessing/{userId}/scripts/{scriptId}
  // ---------------------------------------------------------------------------

  async function listScript(userId, scriptId, details = true) {
    const query = details ? '?details=true' : '';
    return window.MandoApi.get(`${BASE}/${encode(userId)}/scripts/${encode(scriptId)}${query}`);
  }

  async function getScriptNote(userId, scriptId, noteId, includeDetail = true) {
    const query = includeDetail ? '?includeDetail=true' : '';
    return window.MandoApi.get(`${BASE}/${encode(userId)}/scripts/${encode(scriptId)}/${encode(noteId)}${query}`);
  }

  async function createScriptNote(userId, scriptId, data, parentNoteId = null) {
    const query = parentNoteId ? `?parentNoteId=${encode(parentNoteId)}` : '';
    return window.MandoApi.post(`${BASE}/${encode(userId)}/scripts/${encode(scriptId)}/notes/add${query}`, data);
  }

  async function updateScriptNote(userId, scriptId, noteId, data) {
    return window.MandoApi.put(`${BASE}/${encode(userId)}/scripts/${encode(scriptId)}/${encode(noteId)}`, data);
  }

  async function deleteScriptNote(userId, scriptId, noteId) {
    return window.MandoApi.delete(`${BASE}/${encode(userId)}/scripts/${encode(scriptId)}/${encode(noteId)}`);
  }

  async function getScriptDetail(userId, scriptId, noteId) {
    return window.MandoApi.get(`${BASE}/${encode(userId)}/scripts/${encode(scriptId)}/${encode(noteId)}/detail`);
  }

  async function saveScriptDetail(userId, scriptId, noteId, detail) {
    return window.MandoApi.put(`${BASE}/${encode(userId)}/scripts/${encode(scriptId)}/${encode(noteId)}/detail`, detail);
  }

  async function deleteScriptDetail(userId, scriptId, noteId) {
    return window.MandoApi.delete(`${BASE}/${encode(userId)}/scripts/${encode(scriptId)}/${encode(noteId)}/detail`);
  }

  // ---------------------------------------------------------------------------
  // Document-scoped notes (user-uploaded documents)
  // Base path: /api/textprocessing/{userId}/documents/{documentId}
  //
  // Mirrors the script-scoped endpoints. The backend documents module is
  // specified but not yet deployed — expect 404 until Phase 3/4 ships.
  // ---------------------------------------------------------------------------

  async function listDocument(userId, documentId, details = true) {
    const query = details ? '?details=true' : '';
    return window.MandoApi.get(`${BASE}/${encode(userId)}/documents/${encode(documentId)}${query}`);
  }

  async function getDocumentNote(userId, documentId, noteId, includeDetail = true) {
    const query = includeDetail ? '?includeDetail=true' : '';
    return window.MandoApi.get(`${BASE}/${encode(userId)}/documents/${encode(documentId)}/${encode(noteId)}${query}`);
  }

  async function createDocumentNote(userId, documentId, data, parentNoteId = null) {
    const query = parentNoteId ? `?parentNoteId=${encode(parentNoteId)}` : '';
    return window.MandoApi.post(`${BASE}/${encode(userId)}/documents/${encode(documentId)}/notes/add${query}`, data);
  }

  async function updateDocumentNote(userId, documentId, noteId, data) {
    return window.MandoApi.put(`${BASE}/${encode(userId)}/documents/${encode(documentId)}/${encode(noteId)}`, data);
  }

  async function deleteDocumentNote(userId, documentId, noteId) {
    return window.MandoApi.delete(`${BASE}/${encode(userId)}/documents/${encode(documentId)}/${encode(noteId)}`);
  }

  async function getDocumentDetail(userId, documentId, noteId) {
    return window.MandoApi.get(`${BASE}/${encode(userId)}/documents/${encode(documentId)}/${encode(noteId)}/detail`);
  }

  async function saveDocumentDetail(userId, documentId, noteId, detail) {
    return window.MandoApi.put(`${BASE}/${encode(userId)}/documents/${encode(documentId)}/${encode(noteId)}/detail`, detail);
  }

  async function deleteDocumentDetail(userId, documentId, noteId) {
    return window.MandoApi.delete(`${BASE}/${encode(userId)}/documents/${encode(documentId)}/${encode(noteId)}/detail`);
  }

  window.MandoApi = window.MandoApi || {};
  window.MandoApi.notes = {
    listSession,
    get,
    create,
    update,
    delete: deleteNote,
    getDetail,
    saveDetail,
    deleteDetail,
    listScript,
    getScriptNote,
    createScriptNote,
    updateScriptNote,
    deleteScriptNote,
    getScriptDetail,
    saveScriptDetail,
    deleteScriptDetail,
    listDocument,
    getDocumentNote,
    createDocumentNote,
    updateDocumentNote,
    deleteDocumentNote,
    getDocumentDetail,
    saveDocumentDetail,
    deleteDocumentDetail,
  };
})(window);
