/**
 * Document Study page handler.
 *
 * Two modes in one page:
 * - Library mode (no documentId): grid of the user's documents.
 * - Study mode (?documentId=X): viewer + study notes + vocabulary capture.
 *
 * Backend reality (DOCUMENTS_MVP_PLAN.md §2.2): the documents module is
 * specified but not yet deployed, so every documents/notes call must
 * tolerate 404 and degrade into demo/local mode. Flashcard creation uses the
 * already-live batch path and always persists for authenticated users.
 */

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Constants & demo fixtures
  // ---------------------------------------------------------------------------

  const BATCH_CHUNK_SIZE = 25;
  const ZOOM_MIN = 0.5;
  const ZOOM_MAX = 2.0;
  const ZOOM_STEP = 0.25;

  const DEMO_DOCUMENTS = [
    { documentId: 'DOC_DEMO_001', fileName: 'HSK3 Reading Practice - Lesson 57.pdf', fileSizeBytes: 245000, contentType: 'application/pdf', status: 'READY', createdAt: '2026-07-12T09:30:00Z' },
    { documentId: 'DOC_DEMO_002', fileName: 'Travel Abroad Comprehension.pdf', fileSizeBytes: 188000, contentType: 'application/pdf', status: 'READY', createdAt: '2026-07-08T14:10:00Z' },
    { documentId: 'DOC_DEMO_003', fileName: 'Business Etiquette Guide.pdf', fileSizeBytes: 320000, contentType: 'application/pdf', status: 'READY', createdAt: '2026-07-03T11:45:00Z' },
  ];

  const DEMO_DOCUMENT_ID = 'DOC_DEMO_001';

  const FALLBACK_TOPICS = ['Business Etiquette', 'Interview Grammar', 'Job Application', 'Resume Writing', 'Networking'];

  const STATUS_BADGES = {
    READY: { label: 'Ready', classes: 'bg-on-tertiary text-tertiary' },
    PENDING_UPLOAD: { label: 'Uploading', classes: 'bg-secondary-container text-on-secondary-container' },
    ERROR: { label: 'Error', classes: 'bg-error-container/20 text-error' },
  };

  // ---------------------------------------------------------------------------
  // Shared utilities (js/utils.js)
  // ---------------------------------------------------------------------------

  const {
    safeLocalStorageGet,
    safeLocalStorageSet,
    getUserId,
    persistUserId,
    isAdmin,
    escapeHtml,
    uuid,
    $,
    setText,
  } = window.MandoUtils;

  const MandoUi = window.MandoUi;

  // ---------------------------------------------------------------------------
  // Small formatting helpers
  // ---------------------------------------------------------------------------

  function formatBytes(bytes) {
    const n = Number(bytes) || 0;
    if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
    if (n >= 1024) return `${Math.round(n / 1024)} KB`;
    return `${n} B`;
  }

  function formatDateShort(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso).slice(0, 10);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function storageKey(prefix) {
    return `${prefix}.${state.documentId}`;
  }

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const params = new URLSearchParams(window.location.search);

  const state = {
    userId: getUserId(),
    demoMode: false,
    mode: params.get('documentId') ? 'study' : 'library',
    // Library
    documents: [],
    nextToken: null,
    backendDeployed: true,
    // Study
    documentId: params.get('documentId'),
    document: null,
    downloadUrl: null,
    notes: [],
    pendingChanges: [],
    localOnlyNotes: false,
    isSaving: false,
    zoom: 1,
  };

  if (state.userId) {
    persistUserId(state.userId);
  }
  state.demoMode = !state.userId;

  // ---------------------------------------------------------------------------
  // Local persistence helpers (study notes, progress, zoom, offline queue)
  // ---------------------------------------------------------------------------

  function loadJson(key, fallback) {
    try {
      const raw = safeLocalStorageGet(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function saveJson(key, value) {
    try {
      safeLocalStorageSet(key, JSON.stringify(value));
    } catch (e) {
      // ignore
    }
  }

  function persistQueue() {
    saveJson(storageKey('mando.docqueue'), state.pendingChanges);
  }

  function restoreQueue() {
    state.pendingChanges = loadJson(storageKey('mando.docqueue'), []);
  }

  // ---------------------------------------------------------------------------
  // Pending-change queue
  // ---------------------------------------------------------------------------

  function queueChange(operation, data) {
    const change = { _id: uuid(), operation: operation, data: data };
    state.pendingChanges.push(change);
    persistQueue();
    return change;
  }

  function removeChange(changeId) {
    state.pendingChanges = state.pendingChanges.filter(function (c) { return c._id !== changeId; });
    persistQueue();
  }

  function hasPendingChanges() {
    return state.pendingChanges.length > 0;
  }

  // ---------------------------------------------------------------------------
  // View switching
  // ---------------------------------------------------------------------------

  function showView(mode) {
    const library = $('library-view');
    const study = $('study-view');
    const fab = $('fab-save-word');
    if (mode === 'study') {
      if (library) library.classList.add('hidden');
      if (study) study.classList.remove('hidden');
      if (fab) {
        fab.classList.remove('hidden');
        fab.classList.add('flex');
      }
    } else {
      if (study) study.classList.add('hidden');
      if (library) library.classList.remove('hidden');
      if (fab) {
        fab.classList.add('hidden');
        fab.classList.remove('flex');
      }
    }
  }

  function showBanner(show) {
    const banner = $('doc-banner');
    if (!banner) return;
    banner.classList.toggle('hidden', !show);
    banner.classList.toggle('flex', !!show);
  }

  // ---------------------------------------------------------------------------
  // Library mode
  // ---------------------------------------------------------------------------

  async function loadLibrary() {
    if (state.demoMode) {
      state.documents = DEMO_DOCUMENTS.slice();
      renderDocumentGrid();
      return;
    }

    let res;
    try {
      res = await window.MandoApi.documents.list(state.userId, { pageSize: 20 });
    } catch (err) {
      res = { ok: false, status: 0, error: { message: err.message } };
    }

    if (res.ok && res.data) {
      const items = res.data.documents || [];
      state.documents = Array.isArray(items) ? items : [];
      state.nextToken = res.data.nextPageStateToken || null;
      state.backendDeployed = true;
    } else if (res.status === 404) {
      // Documents module not deployed yet: demo fixtures + notice.
      state.backendDeployed = false;
      state.documents = DEMO_DOCUMENTS.slice();
      showBanner(true);
    } else {
      state.backendDeployed = false;
      state.documents = DEMO_DOCUMENTS.slice();
      if (MandoUi) MandoUi.toast('Could not load your documents. Showing demo content.', 'error');
    }

    renderDocumentGrid();
  }

  function documentCardHtml(doc, showDelete) {
    const badge = STATUS_BADGES[doc.status] || STATUS_BADGES.READY;
    const deleteBtn = showDelete
      ? `<button type="button" data-action="delete-doc" data-id="${escapeHtml(doc.documentId)}" class="p-2 text-outline hover:text-error transition-colors rounded-full hover:bg-error-container/10" title="Delete document"><span class="material-symbols-outlined text-[18px]">delete</span></button>`
      : '';
    return `
      <div class="flex justify-between items-start mb-4">
        <div class="bg-primary-container/20 p-3 rounded-xl">
          <span class="material-symbols-outlined text-primary text-3xl">picture_as_pdf</span>
        </div>
        <span class="${badge.classes} text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider">${badge.label}</span>
      </div>
      <h4 class="font-headline-md text-lg text-on-surface mb-1 line-clamp-2">${escapeHtml(doc.fileName || 'Document')}</h4>
      <p class="text-label-caps text-on-surface-variant">${escapeHtml(formatBytes(doc.fileSizeBytes))}${doc.createdAt ? ' · ' + escapeHtml(formatDateShort(doc.createdAt)) : ''}</p>
      <div class="mt-lg pt-md border-t border-outline-variant/20 flex justify-between items-center">
        <span class="text-xs font-bold text-primary">Open</span>
        <div class="flex items-center gap-sm">
          ${deleteBtn}
          <span class="material-symbols-outlined text-[18px] text-outline-variant group-hover:translate-x-1 transition-transform">arrow_forward</span>
        </div>
      </div>
    `;
  }

  function renderDocumentGrid() {
    const grid = $('document-grid');
    if (!grid) return;
    grid.innerHTML = '';

    if (state.documents.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'sm:col-span-2 lg:col-span-3 text-center py-xl';
      empty.innerHTML = `
        <div class="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant mx-auto mb-md">
          <span class="material-symbols-outlined text-[36px]">folder_open</span>
        </div>
        <h3 class="font-headline-md text-headline-md text-on-surface mb-sm">No documents yet</h3>
        <p class="font-body-md text-on-surface-variant">Study materials uploaded by your admin will appear here.</p>
      `;
      grid.appendChild(empty);
      return;
    }

    state.documents.forEach(function (doc) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'text-left group relative bg-surface-container-lowest border border-outline-variant rounded-xl p-md transition-all duration-300 hover:border-primary hover:shadow-lg hover:-translate-y-1';
      card.innerHTML = documentCardHtml(doc, isAdmin());
      card.addEventListener('click', function (e) {
        if (e.target.closest('[data-action="delete-doc"]')) return;
        window.location.href = `document-study.html?documentId=${encodeURIComponent(doc.documentId)}`;
      });
      const deleteBtn = card.querySelector('[data-action="delete-doc"]');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', async function (e) {
          e.stopPropagation();
          await deleteDocument(doc);
        });
      }
      grid.appendChild(card);
    });
  }

  // ---------------------------------------------------------------------------
  // Library: admin upload flow
  // ---------------------------------------------------------------------------

  function initUpload() {
    const uploadBtn = $('upload-btn');
    const fileInput = $('upload-file-input');
    if (!uploadBtn || !fileInput) return;

    if (isAdmin()) {
      uploadBtn.classList.remove('hidden');
      uploadBtn.classList.add('flex');
    } else {
      return;
    }

    uploadBtn.addEventListener('click', function () {
      fileInput.click();
    });

    fileInput.addEventListener('change', async function () {
      const file = fileInput.files && fileInput.files[0];
      fileInput.value = '';
      if (!file) return;

      if (!state.backendDeployed) {
        if (MandoUi) MandoUi.toast('Upload is unavailable until the documents backend is deployed.', 'error');
        return;
      }

      uploadBtn.disabled = true;
      try {
        const initRes = await window.MandoApi.documents.initiateUpload(state.userId, {
          fileName: file.name,
          contentType: file.type || 'application/pdf',
          fileSizeBytes: file.size,
        });

        if (!initRes.ok) {
          if (initRes.status === 404) {
            state.backendDeployed = false;
            showBanner(true);
            if (MandoUi) MandoUi.toast('Upload is unavailable until the documents backend is deployed.', 'error');
          } else {
            if (MandoUi) MandoUi.toast('Could not start the upload. Please try again.', 'error');
          }
          return;
        }

        const uploadUrl = initRes.data && (initRes.data.uploadUrl || initRes.data.presignedUrl);
        const documentId = initRes.data && (initRes.data.documentId || (initRes.data.document && initRes.data.document.documentId));
        if (!uploadUrl || !documentId) {
          if (MandoUi) MandoUi.toast('Unexpected upload response from the server.', 'error');
          return;
        }

        // Raw PUT to the presigned S3 URL (no JSON envelope).
        const putRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type || 'application/pdf' },
          body: file,
        });
        if (!putRes.ok) {
          if (MandoUi) MandoUi.toast('The file upload failed. Please try again.', 'error');
          return;
        }

        const completeRes = await window.MandoApi.documents.completeUpload(state.userId, documentId);
        if (!completeRes.ok) {
          if (MandoUi) MandoUi.toast('Upload verification failed. Please try again.', 'error');
          return;
        }

        if (MandoUi) MandoUi.toast(`"${file.name}" uploaded.`, 'success');
        await loadLibrary();
      } catch (err) {
        console.error('Upload failed', err);
        if (MandoUi) MandoUi.toast('The upload failed. Please try again.', 'error');
      } finally {
        uploadBtn.disabled = false;
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Library: admin delete document
  // ---------------------------------------------------------------------------

  async function deleteDocument(doc) {
    if (!isAdmin()) return;
    const proceed = MandoUi
      ? await MandoUi.confirm('Delete this document?', `"${doc.fileName}" will be permanently removed.`, { okText: 'Delete' })
      : true;
    if (!proceed) return;

    if (!state.backendDeployed) {
      if (MandoUi) MandoUi.toast('Document deletion is unavailable until the documents backend is deployed.', 'error');
      return;
    }

    try {
      const res = await window.MandoApi.documents.remove(state.userId, doc.documentId);
      if (res.ok || res.status === 404) {
        state.documents = state.documents.filter(function (d) { return d.documentId !== doc.documentId; });
        renderDocumentGrid();
        if (res.ok && MandoUi) MandoUi.toast('Document deleted.', 'success');
      } else {
        if (MandoUi) MandoUi.toast('Could not delete the document. Please try again.', 'error');
      }
    } catch (err) {
      console.error('Delete document failed', err);
      if (MandoUi) MandoUi.toast('Could not delete the document. Please try again.', 'error');
    }
  }

  // ---------------------------------------------------------------------------
  // Study mode: document loading
  // ---------------------------------------------------------------------------

  async function loadStudyDocument() {
    safeLocalStorageSet('mando.lastDocumentId', state.documentId);

    if (state.demoMode) {
      state.document = DEMO_DOCUMENTS.find(function (d) { return d.documentId === state.documentId; }) || DEMO_DOCUMENTS[0];
      state.downloadUrl = null;
      renderDocumentMeta();
      renderCanvas();
      return;
    }

    let res;
    try {
      res = await window.MandoApi.documents.get(state.userId, state.documentId);
    } catch (err) {
      res = { ok: false, status: 0, error: { message: err.message } };
    }

    if (res.ok && res.data) {
      const doc = res.data.document || res.data;
      state.document = doc;
      state.downloadUrl = res.data.downloadUrl || doc.downloadUrl || doc.presignedUrl || null;
      state.backendDeployed = true;
    } else {
      if (res.status === 404) {
        state.backendDeployed = false;
        showBanner(true);
      } else if (MandoUi) {
        MandoUi.toast('Could not load the document. Showing demo content.', 'error');
      }
      state.document = DEMO_DOCUMENTS[0];
      state.downloadUrl = null;
    }

    renderDocumentMeta();
    renderCanvas();
  }

  function renderDocumentMeta() {
    const doc = state.document || {};
    const name = doc.fileName || 'Document';
    setText('doc-title', name.replace(/\.pdf$/i, ''));
    setText('doc-breadcrumb', name.replace(/\.pdf$/i, ''));
    setText('doc-file-name', name);

    if (isAdmin()) {
      ['export-btn', 'manage-btn'].forEach(function (id) {
        const btn = $(id);
        if (btn) {
          btn.classList.remove('hidden');
          btn.classList.add('flex');
        }
      });
    }
  }

  /** Render the real PDF in the iframe, or the styled HTML canvas as fallback. */
  function renderCanvas() {
    const frame = $('document-frame');
    const demo = $('demo-canvas');

    if (state.downloadUrl && frame) {
      frame.src = state.downloadUrl;
      frame.classList.remove('hidden');
      if (demo) demo.classList.add('hidden');
    } else {
      if (frame) frame.classList.add('hidden');
      if (demo) demo.classList.remove('hidden');
    }
  }

  // ---------------------------------------------------------------------------
  // Study mode: viewer controls (zoom, fullscreen, scroll progress)
  // ---------------------------------------------------------------------------

  function applyZoom() {
    const scaleEl = $('viewer-scale');
    const label = $('zoom-label');
    if (scaleEl) {
      // Counter-scale the layout box so the scroll area matches the visual size.
      scaleEl.style.width = `${100 / state.zoom}%`;
      scaleEl.style.transform = `scale(${state.zoom})`;
    }
    if (label) label.textContent = `${Math.round(state.zoom * 100)}%`;
    saveJson(storageKey('mando.doczoom'), { zoom: state.zoom });
    updateScrollProgress();
  }

  function setZoom(zoom) {
    state.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));
    applyZoom();
  }

  function initViewerControls() {
    const stored = loadJson(storageKey('mando.doczoom'), null);
    if (stored && typeof stored.zoom === 'number') {
      state.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, stored.zoom));
    }

    const zoomIn = $('zoom-in-btn');
    const zoomOut = $('zoom-out-btn');
    const fullscreenBtn = $('fullscreen-btn');
    const container = $('viewer-container');

    if (zoomIn) zoomIn.addEventListener('click', function () { setZoom(state.zoom + ZOOM_STEP); });
    if (zoomOut) zoomOut.addEventListener('click', function () { setZoom(state.zoom - ZOOM_STEP); });

    if (fullscreenBtn && container) {
      fullscreenBtn.addEventListener('click', function () {
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else if (container.requestFullscreen) {
          container.requestFullscreen();
        }
      });
      document.addEventListener('fullscreenchange', function () {
        const icon = fullscreenBtn.querySelector('.material-symbols-outlined');
        if (icon) icon.textContent = document.fullscreenElement ? 'fullscreen_exit' : 'fullscreen';
      });
    }

    if (container) {
      container.addEventListener('scroll', updateScrollProgress);
    }

    applyZoom();
    restoreScrollProgress();
  }

  function updateScrollProgress() {
    const container = $('viewer-container');
    if (!container) return;
    const maxScroll = container.scrollHeight - container.clientHeight;
    const percent = maxScroll <= 0 ? 100 : Math.min(100, Math.round((container.scrollTop / maxScroll) * 100));

    setText('progress-percent', `${percent}%`);
    const bar = $('progress-bar');
    if (bar) bar.style.width = `${percent}%`;

    saveJson(storageKey('mando.docprogress'), { percent: percent });
  }

  function restoreScrollProgress() {
    const container = $('viewer-container');
    if (!container) return;
    const stored = loadJson(storageKey('mando.docprogress'), null);
    const percent = stored && typeof stored.percent === 'number' ? stored.percent : 0;

    setText('progress-percent', `${percent}%`);
    const bar = $('progress-bar');
    if (bar) bar.style.width = `${percent}%`;

    if (percent > 0) {
      const maxScroll = container.scrollHeight - container.clientHeight;
      if (maxScroll > 0) {
        container.scrollTop = (percent / 100) * maxScroll;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Study mode: Study Notes panel (localStorage, debounced autosave)
  // ---------------------------------------------------------------------------

  let notesAutosaveTimer = null;

  function loadStudyNotes() {
    const textarea = $('notes-textarea');
    if (!textarea) return;
    textarea.value = safeLocalStorageGet(storageKey('mando.docnotes')) || '';
  }

  function saveStudyNotes(showFeedback) {
    const textarea = $('notes-textarea');
    if (!textarea) return;
    safeLocalStorageSet(storageKey('mando.docnotes'), textarea.value || '');
    const stateEl = $('notes-save-state');
    if (stateEl) {
      const now = new Date();
      stateEl.textContent = `Saved ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    }
    if (showFeedback && MandoUi) MandoUi.toast('Study notes saved locally.', 'success');
  }

  function scheduleNotesAutosave() {
    const stateEl = $('notes-save-state');
    if (stateEl) stateEl.textContent = 'Editing…';
    if (notesAutosaveTimer) clearTimeout(notesAutosaveTimer);
    notesAutosaveTimer = setTimeout(function () {
      saveStudyNotes(false);
    }, 1000);
  }

  /** Insert a Markdown-ish marker at the cursor in the notes textarea. */
  function insertAtMarker(kind) {
    const textarea = $('notes-textarea');
    if (!textarea) return;
    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const value = textarea.value || '';
    const selected = value.slice(start, end);

    let insert;
    if (kind === 'bold') {
      insert = `**${selected || 'bold text'}**`;
    } else if (kind === 'italic') {
      insert = `*${selected || 'italic text'}*`;
    } else {
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      textarea.value = value.slice(0, lineStart) + '• ' + value.slice(lineStart);
      textarea.selectionStart = textarea.selectionEnd = start + 2;
      textarea.focus();
      scheduleNotesAutosave();
      return;
    }

    textarea.value = value.slice(0, start) + insert + value.slice(end);
    textarea.selectionStart = start;
    textarea.selectionEnd = start + insert.length;
    textarea.focus();
    scheduleNotesAutosave();
  }

  // ---------------------------------------------------------------------------
  // Study mode: vocabulary notes (render + optimistic ops)
  // ---------------------------------------------------------------------------

  function noteCardHtml(note) {
    const unsaved = note._pending
      ? '<span class="ml-xs text-[9px] font-bold text-error uppercase tracking-wider">Unsaved</span>'
      : '';
    const hskLevel = String(note.hsk || '').replace(/\D/g, '');
    const isDeleted = note._pending === 'delete';
    return `
      <div class="flex items-center justify-between p-sm rounded-lg border border-outline-variant/40 ${isDeleted ? 'opacity-40' : 'hover:border-primary/40'} transition-colors">
        <div class="flex items-center gap-md min-w-0">
          <span class="font-character-display text-2xl text-on-surface">${escapeHtml(note.character || '')}</span>
          <div class="min-w-0">
            <p class="text-sm text-secondary font-medium truncate">${escapeHtml(note.pinyin || '')}</p>
            <p class="text-xs text-on-surface-variant">${hskLevel ? 'HSK ' + escapeHtml(hskLevel) : ''}${unsaved}</p>
          </div>
        </div>
        ${isDeleted
          ? '<span class="text-label-caps text-on-surface-variant italic text-xs">Pending delete</span>'
          : `<button class="p-2 text-outline hover:text-error transition-colors shrink-0" data-action="delete-note" data-id="${escapeHtml(note.noteId)}" title="Delete word">
              <span class="material-symbols-outlined text-lg">delete</span>
            </button>`}
      </div>
    `;
  }

  function renderVocabList() {
    const list = $('vocab-notes-list');
    if (!list) return;

    if (state.notes.length === 0) {
      list.innerHTML = '<p class="text-sm text-on-surface-variant py-sm">No words saved yet. Click <strong>Save Word</strong> to capture vocabulary from this document.</p>';
    } else {
      list.innerHTML = state.notes.map(noteCardHtml).join('');
    }

    const badge = $('vocab-pending-badge');
    const saveAllBtn = $('save-all-btn');
    const count = state.pendingChanges.length;
    if (saveAllBtn) {
      saveAllBtn.disabled = count === 0 || state.isSaving;
    }
    if (badge) {
      badge.textContent = String(count);
      badge.classList.toggle('hidden', count === 0);
      badge.classList.toggle('flex', count > 0);
    }

    const notice = $('notes-sync-notice');
    if (notice) {
      if (state.localOnlyNotes) {
        notice.textContent = 'Vocabulary notes are stored locally until the documents backend is deployed. Flashcards still save to your deck.';
        notice.classList.remove('hidden');
      } else {
        notice.classList.add('hidden');
      }
    }
  }

  async function loadDocumentNotes() {
    restoreQueue();

    if (state.demoMode) {
      state.notes = [];
      reapplyPendingNotes();
      renderVocabList();
      return;
    }

    let res;
    try {
      res = await window.MandoApi.notes.listDocument(state.userId, state.documentId, true);
    } catch (err) {
      res = { ok: false, status: 0, error: { message: err.message } };
    }

    if (res.ok && res.data && Array.isArray(res.data.notes)) {
      state.notes = res.data.notes;
      state.localOnlyNotes = false;
    } else if (res.status === 404) {
      // Documents notes endpoints not deployed: local-only mode.
      state.notes = [];
      state.localOnlyNotes = true;
    } else {
      state.notes = [];
      if (MandoUi) MandoUi.toast('Could not load vocabulary notes.', 'error');
    }

    reapplyPendingNotes();
    renderVocabList();
  }

  /** Rebuild the optimistic view from the persisted queue after a (re)load. */
  function reapplyPendingNotes() {
    state.pendingChanges.forEach(function (change) {
      if (change.operation === 'CREATE_DOCUMENT_NOTE') {
        const d = change.data;
        state.notes.unshift({
          noteId: 'PENDING_' + change._id,
          character: d.character,
          pinyin: d.pinyin,
          hsk: d.hsk,
          _pending: 'create',
        });
      } else if (change.operation === 'DELETE_DOCUMENT_NOTE') {
        const note = state.notes.find(function (n) { return n.noteId === change.data.noteId; });
        if (note) note._pending = 'delete';
      }
    });
  }

  function queueDeleteNote(note) {
    if (note._pending === 'create') {
      const createChange = state.pendingChanges.find(function (c) {
        return c.operation === 'CREATE_DOCUMENT_NOTE' && ('PENDING_' + c._id) === note.noteId;
      });
      if (createChange) removeChange(createChange._id);
      state.notes = state.notes.filter(function (n) { return n.noteId !== note.noteId; });
      return;
    }
    queueChange('DELETE_DOCUMENT_NOTE', { documentId: state.documentId, noteId: note.noteId });
    note._pending = 'delete';
  }

  // ---------------------------------------------------------------------------
  // Study mode: Save Word modal
  // ---------------------------------------------------------------------------

  let saveWordPinyin = { reset: function () {} };

  function openSaveWordModal() {
    const modal = $('save-word-modal');
    if (!modal) return;

    const setVal = function (id, value) { const el = $(id); if (el) el.value = value; };
    setVal('sw-character', '');
    setVal('sw-pinyin', '');
    setVal('sw-meaning', '');
    setVal('sw-category', '');
    const hsk = $('sw-hsk');
    if (hsk) hsk.value = 'HSK3';
    const addToDeck = $('sw-add-to-deck');
    if (addToDeck) addToDeck.checked = true;
    const error = $('sw-error');
    if (error) {
      error.classList.add('hidden');
      error.textContent = '';
    }

    saveWordPinyin.reset({ auto: true });
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    const charInput = $('sw-character');
    if (charInput) charInput.focus();
  }

  function closeSaveWordModal() {
    const modal = $('save-word-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  function showSaveWordError(message) {
    const error = $('sw-error');
    if (!error) return;
    error.textContent = message;
    error.classList.remove('hidden');
  }

  function submitSaveWord(event) {
    event.preventDefault();

    const character = ($('sw-character') ? $('sw-character').value : '').trim();
    const pinyin = ($('sw-pinyin') ? $('sw-pinyin').value : '').trim();
    const meaning = ($('sw-meaning') ? $('sw-meaning').value : '').trim();
    const hsk = $('sw-hsk') ? $('sw-hsk').value : 'HSK3';
    const categoryRaw = ($('sw-category') ? $('sw-category').value : '').trim();
    const addToDeck = $('sw-add-to-deck') ? $('sw-add-to-deck').checked : false;

    if (!character) {
      showSaveWordError('Chinese character(s) are required.');
      return;
    }

    const change = queueChange('CREATE_DOCUMENT_NOTE', {
      documentId: state.documentId,
      character: character,
      pinyin: pinyin,
      hsk: hsk,
    });

    state.notes.unshift({
      noteId: 'PENDING_' + change._id,
      character: character,
      pinyin: pinyin,
      hsk: hsk,
      _pending: 'create',
    });

    if (addToDeck) {
      queueChange('CREATE_FLASHCARD', {
        character: character,
        pinyin: pinyin,
        meaning: meaning,
        hsk: hsk,
        category: (categoryRaw || 'Miscellaneous').toUpperCase().replace(/\s+/g, '_'),
      });
    }

    closeSaveWordModal();
    renderVocabList();
    if (MandoUi) MandoUi.toast(`"${character}" queued. Click Save All to persist.`, 'success');
  }

  // ---------------------------------------------------------------------------
  // Study mode: Save All (batch flush with local-only fallback)
  // ---------------------------------------------------------------------------

  const OP_TO_ARRAY = {
    CREATE_FLASHCARD: 'createFlashCards',
  };

  function buildBatchItem(change) {
    const d = change.data;
    // Only flashcards go through the batch endpoint.
    if (change.operation !== 'CREATE_FLASHCARD') {
      return null;
    }
    return { character: d.character, pinyin: d.pinyin, meaning: d.meaning, hsk: d.hsk, category: d.category };
  }

  function packChunks(changes) {
    const chunks = [];
    let current = null;
    changes.forEach(function (change) {
      if (!current || current.size >= BATCH_CHUNK_SIZE) {
        current = { entries: [], size: 0 };
        chunks.push(current);
      }
      const arrayName = OP_TO_ARRAY[change.operation];
      if (!current[arrayName]) current[arrayName] = [];
      current[arrayName].push(buildBatchItem(change));
      current.entries.push({ changeId: change._id, arrayName: arrayName, index: current[arrayName].length - 1, operation: change.operation });
      current.size += 1;
    });
    return chunks;
  }

  /**
   * Flush one document-note change through its single TextProcessing endpoint.
   * Returns 'ok' | 'error' | 'not-deployed'.
   */
  async function flushDocumentNoteChange(change) {
    const d = change.data;
    try {
      let res;
      if (change.operation === 'CREATE_DOCUMENT_NOTE') {
        res = await window.MandoApi.notes.createDocumentNote(state.userId, d.documentId, {
          character: d.character,
          pinyin: d.pinyin,
          hsk: d.hsk,
        });
      } else if (change.operation === 'UPDATE_DOCUMENT_NOTE') {
        res = await window.MandoApi.notes.updateDocumentNote(state.userId, d.documentId, d.noteId, {
          character: d.character,
          pinyin: d.pinyin,
        });
      } else if (change.operation === 'DELETE_DOCUMENT_NOTE') {
        res = await window.MandoApi.notes.deleteDocumentNote(state.userId, d.documentId, d.noteId);
      } else {
        return 'ok';
      }

      if (res.ok) return 'ok';
      if (res.status === 404) return 'not-deployed';
      console.error('Document note flush failed', change.operation, res.error);
      return 'error';
    } catch (err) {
      console.error('Document note flush error', change.operation, err);
      return 'error';
    }
  }

  /**
   * Flush one packed flashcard chunk via the batch endpoint.
   * Returns 'ok' | 'error' | 'not-deployed'.
   * Per-item results are matched when present; an ok response with no
   * recognizable results resolves the whole chunk.
   */
  async function flushChunk(payload, entries, resolved) {
    try {
      const res = await window.MandoApi.batch.flush(state.userId, payload);
      if (!res.ok) {
        if (res.status === 404) return 'not-deployed';
        console.error('Batch chunk failed', res.error);
        return 'error';
      }
      const results = res.data && Array.isArray(res.data.results) ? res.data.results : [];
      if (results.length === 0) {
        entries.forEach(function (entry) { resolved.add(entry.changeId); });
        return 'ok';
      }
      entries.forEach(function (entry) {
        const result = results.find(function (r) {
          return r.operation === entry.operation && r.index === entry.index;
        });
        if (result && result.status === 'SUCCESS') {
          resolved.add(entry.changeId);
        }
      });
      return 'ok';
    } catch (err) {
      console.error('Batch chunk error', err);
      return 'error';
    }
  }

  async function flushPendingChanges() {
    if (state.demoMode) {
      // Demo: apply locally, nothing to persist.
      state.pendingChanges = [];
      persistQueue();
      state.notes.forEach(function (n) { n._pending = null; });
      return { ok: true };
    }

    const resolved = new Set();

    // 1. Flashcards flush on their own request: the live batch path must
    //    never be taken down by the not-yet-deployed document-note arrays.
    const flashcardChanges = state.pendingChanges.filter(function (c) {
      return c.operation === 'CREATE_FLASHCARD';
    });
    for (const chunk of packChunks(flashcardChanges)) {
      await flushChunk({ createFlashCards: chunk.createFlashCards }, chunk.entries, resolved);
    }

    // 2. Document notes flush through single TextProcessing endpoints; a 404
    //    here means "module not deployed" and only affects note changes.
    let hitNotes404 = false;
    const noteChanges = state.pendingChanges.filter(function (c) {
      return c.operation !== 'CREATE_FLASHCARD';
    });
    for (const change of noteChanges) {
      const outcome = await flushDocumentNoteChange(change);
      if (outcome === 'ok') {
        resolved.add(change._id);
      } else if (outcome === 'not-deployed') {
        hitNotes404 = true;
        break;
      }
      // 'error' leaves the change in the queue for retry.
    }

    state.pendingChanges = state.pendingChanges.filter(function (c) { return !resolved.has(c._id); });
    persistQueue();

    if (hitNotes404) {
      state.localOnlyNotes = true;
    }

    return { ok: state.pendingChanges.length === 0, hitNotes404: hitNotes404 };
  }

  async function saveAll() {
    if (!hasPendingChanges() || state.isSaving) return;
    state.isSaving = true;
    renderVocabList();

    const result = await flushPendingChanges();

    state.isSaving = false;

    if (state.localOnlyNotes && result.hitNotes404) {
      if (MandoUi) MandoUi.toast('Flashcards saved. Vocabulary notes are kept locally until the backend ships.', 'success');
      // Keep the pending flags: notes are queued locally, not synced yet.
    } else if (result.ok) {
      if (MandoUi) MandoUi.toast('All changes saved.', 'success');
      state.notes.forEach(function (n) { n._pending = null; });
      // Resync note IDs from the backend when deployed.
      if (state.backendDeployed && !state.localOnlyNotes) {
        await loadDocumentNotes();
      }
    } else {
      if (MandoUi) MandoUi.toast(`${state.pendingChanges.length} change(s) could not be saved and remain queued.`, 'error');
    }

    renderVocabList();
  }

  // ---------------------------------------------------------------------------
  // Study mode: Related Topics chips
  // ---------------------------------------------------------------------------

  function renderTopics() {
    const cloud = $('topics-cloud');
    if (!cloud) return;
    cloud.innerHTML = '';

    const chips = [];
    const seen = new Set();

    // Derive topics from vocabulary: HSK levels and (for flashcard-bound words) categories.
    state.notes.forEach(function (note) {
      const hskLevel = String(note.hsk || '').replace(/\D/g, '');
      if (hskLevel && !seen.has(`hsk:${hskLevel}`)) {
        seen.add(`hsk:${hskLevel}`);
        chips.push({ label: `HSK ${hskLevel}`, href: `study-mode.html?mode=random&hsk=${encodeURIComponent(hskLevel)}` });
      }
    });

    state.pendingChanges.forEach(function (change) {
      if (change.operation === 'CREATE_FLASHCARD' && change.data.category && !seen.has(`cat:${change.data.category}`)) {
        seen.add(`cat:${change.data.category}`);
        chips.push({
          label: change.data.category.split(/[_\s]+/).map(function (w) { return w.charAt(0) + w.slice(1).toLowerCase(); }).join(' '),
          href: `study-mode.html?mode=random&category=${encodeURIComponent(change.data.category)}`,
        });
      }
    });

    if (chips.length === 0) {
      FALLBACK_TOPICS.forEach(function (topic) {
        chips.push({ label: topic, href: 'flashcards.html' });
      });
    }

    chips.slice(0, 8).forEach(function (chip) {
      const el = document.createElement('a');
      el.href = chip.href;
      el.className = 'px-sm py-1 bg-tertiary-container/40 text-on-tertiary-container rounded-full text-xs font-semibold cursor-pointer hover:bg-tertiary-container transition-colors border border-tertiary/20';
      el.textContent = chip.label;
      cloud.appendChild(el);
    });
  }

  // ---------------------------------------------------------------------------
  // Interactions
  // ---------------------------------------------------------------------------

  function initStudyInteractions() {
    const bind = function (id, fn) {
      const el = $(id);
      if (el) el.addEventListener('click', fn);
    };

    // Study notes
    const textarea = $('notes-textarea');
    if (textarea) {
      textarea.addEventListener('input', scheduleNotesAutosave);
    }
    bind('save-notes-btn', function () { saveStudyNotes(true); });
    bind('fmt-bold', function () { insertAtMarker('bold'); });
    bind('fmt-italic', function () { insertAtMarker('italic'); });
    bind('fmt-list', function () { insertAtMarker('list'); });

    // Save Word
    bind('save-word-btn', openSaveWordModal);
    bind('fab-save-word', openSaveWordModal);
    bind('sw-cancel', closeSaveWordModal);
    const swForm = $('sw-form');
    if (swForm) swForm.addEventListener('submit', submitSaveWord);
    const swModal = $('save-word-modal');
    if (swModal) {
      swModal.addEventListener('click', function (e) {
        if (e.target === swModal) closeSaveWordModal();
      });
    }

    if (window.MandoPinyin) {
      saveWordPinyin = window.MandoPinyin.autoFill($('sw-character'), $('sw-pinyin'));
    }

    // Vocabulary list actions (event delegation)
    const list = $('vocab-notes-list');
    if (list) {
      list.addEventListener('click', async function (e) {
        const btn = e.target.closest('[data-action="delete-note"]');
        if (!btn) return;
        const note = state.notes.find(function (n) { return n.noteId === btn.dataset.id; });
        if (!note) return;
        const proceed = MandoUi
          ? await MandoUi.confirm('Delete this word?', `"${note.character}" will be removed when you save.`, { okText: 'Delete' })
          : true;
        if (!proceed) return;
        queueDeleteNote(note);
        renderVocabList();
      });
    }

    bind('save-all-btn', saveAll);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && swModal && !swModal.classList.contains('hidden')) {
        closeSaveWordModal();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveAll();
      }
    });

    window.addEventListener('beforeunload', function (e) {
      // The queue is backed up to localStorage, so there is nothing to lose
      // in local-only mode; warn only while a live save is still pending.
      if (hasPendingChanges() && !state.localOnlyNotes && !state.demoMode) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Main init
  // ---------------------------------------------------------------------------

  async function init() {
    try {
      window.MandoShell.renderSidebarProfile();
      window.MandoShell.initMobileDrawer({ sidebarId: 'sidebar', overlayId: 'sidebar-overlay', toggleId: 'mobile-menu-toggle' });

      if (state.userId) {
        window.MandoApi.stats.recordEvent(state.userId, {
          eventId: uuid(),
          eventType: 'USER_ACTIVE',
          timestamp: new Date().toISOString(),
        }).then(function (res) {
          if (!res.ok) console.warn('USER_ACTIVE event failed', res.error);
        });
      }

      if (state.mode === 'library') {
        showView('library');
        initUpload();
        await loadLibrary();
      } else {
        showView('study');
        initStudyInteractions();
        await loadStudyDocument();
        initViewerControls();
        loadStudyNotes();
        await loadDocumentNotes();
        renderTopics();
      }
    } catch (err) {
      console.error('Document study init failed:', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
