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
  };
})(window);
