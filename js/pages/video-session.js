/**
 * MandoLearning — Video Session Page Logic
 *
 * Handles all interactivity for the video learning page:
 *   - Video playback & subtitle sync
 *   - Note CRUD (queued for batch)
 *   - Hierarchical note tree rendering
 *   - Detail annotations
 *   - Script panel with timestamp navigation
 *
 * All mutations go through the pendingChanges queue in state.js.
 */

import { api } from '../api-client.js';
import {
    subscribe,
    setState,
    getState,
    queueChange,
    setSessionId,
} from '../state.js';
import { toast, modal, confirm, spinner } from '../ui-components.js';
import {
    buildNoteTree,
    validateNote,
    validateFlashcard,
    validateDetail,
    escapeHtml,
    generateTempId,
    formatDuration,
} from '../utils.js';

// =============================================================================
// DOM REFERENCES
// =============================================================================

const els = {
    video: document.getElementById('main-video'),
    subtitleOverlay: document.getElementById('subtitle-overlay'),
    subtitleCharacter: document.getElementById('subtitle-character'),
    subtitlePinyin: document.getElementById('subtitle-pinyin'),
    saveWordBar: document.getElementById('save-word-bar'),
    selectedText: document.getElementById('selected-text'),
    chkAddToDeck: document.getElementById('chk-add-to-deck'),
    btnSaveWord: document.getElementById('btn-save-word'),
    btnNewNote: document.getElementById('btn-new-note'),
    btnSaveAll: document.getElementById('btn-save-all'),
    notesList: document.getElementById('notes-list'),
    notesEmptyState: document.getElementById('notes-empty-state'),
    pendingBadge: document.getElementById('pending-badge'),
    pendingIndicator: document.getElementById('pending-changes-indicator'),
    breadcrumbSession: document.getElementById('breadcrumb-session'),
    scriptContent: document.getElementById('script-content'),
    scriptProgress: document.getElementById('script-progress'),
    scriptProgressText: document.getElementById('script-progress-text'),
    relatedLessons: document.getElementById('related-lessons'),
    // Templates
    tplParentNote: document.getElementById('tpl-parent-note'),
    tplChildNote: document.getElementById('tpl-child-note'),
    tplDetailModal: document.getElementById('tpl-detail-modal'),
    tplNewNoteForm: document.getElementById('tpl-new-note-form'),
    tplScriptLine: document.getElementById('tpl-script-line'),
};

// =============================================================================
// DEMO DATA (until API is available)
// =============================================================================

const DEMO_SCRIPT = [
    { time: 0, char: '是啊，你就说来我们公司面试的这几个吧……', pinyin: 'shì a, nǐ jiù shuō lái wǒmen gōngsī miànshì de zhè jǐ gè ba...', en: "Yeah, just look at these people coming to our company for interviews..." },
    { time: 12, char: '面试官问了我很多问题。', pinyin: 'miànshìguān wèn le wǒ hěn duō wèntí.', en: "The interviewer asked me many questions." },
    { time: 24, char: '这家公司很大。', pinyin: 'zhè jiā gōngsī hěn dà.', en: "This company is very large." },
    { time: 36, char: '我和同事一起工作。', pinyin: 'wǒ hé tóngshì yīqǐ gōngzuò.', en: "I work with my colleagues." },
    { time: 48, char: '应聘者需要准备简历。', pinyin: 'yìngpìnzhě xūyào zhǔnbèi jiǎnlì.', en: "Candidates need to prepare a resume." },
];

const DEMO_RELATED = [
    { title: 'Introduce yourself during a job interview', tag: 'Story 1 • 12 mins', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAdN4BcN5cUD46Zr2yggA9VNZVgg70ka28pVUTMGWOID8CLO4qF36IH9nqRPhISQI7W65xOf2nuQDVooWjaQOQ2llLGhKbdG9G45xWTST1vmLrXzFV7Z6Wb3FwQdroqig8S0vjAkmk8zoPgiIhN0m-JuY3Y6W4Zy1r_39Pl9EZK5SUVXIQgpvIY4fe4wPMGSMyRb0r7W65WTulV4XBMblvil-3aGQvSokqoMqi4RKLIr-zTnda_eoElj4BppnDHgy93sIlu_fVz5zY' },
];

// =============================================================================
// INITIALIZATION
// =============================================================================

export function init() {
    initSession();
    initVideoPlayer();
    initScriptPanel();
    initRelatedLessons();
    initNoteInteractions();
    initStateSubscriptions();
    loadSessionNotes();

    // Register batch failure callback so main.js can notify us of partial failures
    window.__mandoOnBatchFailure__ = highlightFailedNotes;
}

/** Read session ID from URL and set it in state. */
function initSession() {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session') || 'VID_DEMO_001';
    setSessionId(sessionId);
    els.breadcrumbSession.textContent = sessionId.replace('VID_', '').replace(/_/g, ' ');
}

// =============================================================================
// VIDEO PLAYER
// =============================================================================

function initVideoPlayer() {
    // For demo: use a placeholder. In production, set src from session data.
    // els.video.src = getVideoUrlForSession(getState('currentSessionId'));

    // Subtitle sync: update overlay based on current time
    els.video.addEventListener('timeupdate', () => {
        updateSubtitleOverlay(els.video.currentTime);
    });

    // Text selection in subtitles → show Save Word bar
    els.subtitleOverlay.addEventListener('mouseup', handleSubtitleSelection);
    els.subtitleOverlay.addEventListener('touchend', handleSubtitleSelection);

    // Save Word button
    els.btnSaveWord.addEventListener('click', () => {
        const text = els.selectedText.textContent;
        if (text && text !== '—') {
            openNewNoteModal({
                character: text.trim(),
                addToDeck: els.chkAddToDeck.checked,
            });
            hideSaveWordBar();
        }
    });
}

function updateSubtitleOverlay(currentTime) {
    // Find the script line closest to current time
    const line = DEMO_SCRIPT.slice().reverse().find(l => currentTime >= l.time);
    if (line) {
        els.subtitleCharacter.textContent = line.char;
        els.subtitlePinyin.textContent = line.pinyin;
    }
}

function handleSubtitleSelection() {
    const selection = window.getSelection();
    const text = selection.toString().trim();
    if (text.length > 0) {
        els.selectedText.textContent = text;
        els.saveWordBar.classList.remove('hidden');
    }
}

function hideSaveWordBar() {
    els.saveWordBar.classList.add('hidden');
    window.getSelection().removeAllRanges();
}

// =============================================================================
// SCRIPT PANEL
// =============================================================================

function initScriptPanel() {
    renderScript();

    // Toggle buttons
    document.getElementById('script-toggle-zh')?.addEventListener('click', () => setScriptMode('zh'));
    document.getElementById('script-toggle-py')?.addEventListener('click', () => setScriptMode('py'));
    document.getElementById('script-toggle-en')?.addEventListener('click', () => setScriptMode('en'));
}

let scriptMode = 'zh';

function setScriptMode(mode) {
    scriptMode = mode;
    document.getElementById('script-toggle-zh').className = `w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${mode === 'zh' ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container-highest text-on-surface-variant'}`;
    document.getElementById('script-toggle-py').className = `w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${mode === 'py' ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container-highest text-on-surface-variant'}`;
    document.getElementById('script-toggle-en').className = `w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${mode === 'en' ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container-highest text-on-surface-variant'}`;
    renderScript();
}

function renderScript() {
    els.scriptContent.innerHTML = '';
    DEMO_SCRIPT.forEach((line, idx) => {
        const clone = els.tplScriptLine.content.cloneNode(true);
        const row = clone.querySelector('.script-line');
        row.dataset.time = line.time;
        row.dataset.index = idx;

        clone.querySelector('.script-time').textContent = formatDuration(line.time);

        let displayText = line.char;
        if (scriptMode === 'py') displayText = line.pinyin;
        if (scriptMode === 'en') displayText = line.en;
        clone.querySelector('.script-text').textContent = displayText;
        clone.querySelector('.script-translation').textContent = scriptMode === 'zh' ? line.en : '';
        clone.querySelector('.script-translation').style.display = scriptMode === 'zh' ? 'block' : 'none';

        clone.querySelector('.btn-play-at-time').addEventListener('click', () => {
            els.video.currentTime = line.time;
            els.video.play();
        });

        // Click line to seek
        row.addEventListener('click', (e) => {
            if (!e.target.closest('.btn-play-at-time')) {
                els.video.currentTime = line.time;
            }
        });

        els.scriptContent.appendChild(clone);
    });

    updateScriptProgress();
}

function updateScriptProgress() {
    const duration = els.video.duration || 60;
    const pct = Math.min(100, Math.round((els.video.currentTime / duration) * 100));
    els.scriptProgress.style.width = `${pct}%`;
    els.scriptProgressText.textContent = `${pct}% Complete`;
}

els.video.addEventListener('timeupdate', updateScriptProgress);
els.video.addEventListener('loadedmetadata', updateScriptProgress);

// =============================================================================
// RELATED LESSONS
// =============================================================================

function initRelatedLessons() {
    els.relatedLessons.innerHTML = '';
    DEMO_RELATED.forEach(lesson => {
        const card = document.createElement('div');
        card.className = 'min-w-[320px] bg-white rounded-3xl overflow-hidden card-elevation-1 hover:card-elevation-2 transition-all cursor-pointer group';
        card.innerHTML = `
            <div class="relative h-40 bg-surface-container overflow-hidden">
                <img class="w-full h-full object-cover group-hover:scale-105 transition-transform" src="${escapeHtml(lesson.img)}" alt="${escapeHtml(lesson.title)}" />
            </div>
            <div class="p-md">
                <h4 class="font-headline-md text-[18px] leading-6 mb-xs">${escapeHtml(lesson.title)}</h4>
                <p class="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-widest">${escapeHtml(lesson.tag)}</p>
            </div>
        `;
        els.relatedLessons.appendChild(card);
    });
}

// =============================================================================
// NOTES SYSTEM
// =============================================================================

/** Fetch notes from API and render. */
async function loadSessionNotes() {
    const userId = getState('userId');
    const sessionId = getState('currentSessionId');

    if (!userId) {
        // No user — show empty state (demo mode)
        setState('notes', []);
        return;
    }

    spinner.show('Loading notes...');
    const result = await api.getSessionNotes(userId, sessionId, true);
    spinner.hide();

    if (result.ok) {
        setState('notes', result.data || []);
    } else {
        toast.error('Failed to load notes: ' + (result.error?.message || 'Unknown error'));
        setState('notes', []);
    }
}

/** Subscribe to state changes for re-rendering. */
function initStateSubscriptions() {
    subscribe('notes', (notes) => {
        renderNotes(notes);
    });

    subscribe('pendingChanges', (changes) => {
        updatePendingIndicator(changes);
    });
}

function updatePendingIndicator(changes) {
    const count = changes.length;
    if (count > 0) {
        els.pendingBadge.classList.remove('hidden');
        els.pendingBadge.textContent = count;
        els.pendingIndicator.classList.add('text-primary');
        els.pendingIndicator.classList.remove('text-on-surface-variant');
        els.pendingIndicator.title = `${count} pending change${count > 1 ? 's' : ''}`;
    } else {
        els.pendingBadge.classList.add('hidden');
        els.pendingIndicator.classList.remove('text-primary');
        els.pendingIndicator.classList.add('text-on-surface-variant');
        els.pendingIndicator.title = 'No pending changes';
    }
}

/** Render the hierarchical notes tree. */
function renderNotes(notes) {
    if (!notes || notes.length === 0) {
        els.notesList.classList.add('hidden');
        els.notesEmptyState.classList.remove('hidden');
        return;
    }

    els.notesEmptyState.classList.add('hidden');
    els.notesList.classList.remove('hidden');
    els.notesList.innerHTML = '';

    const tree = buildNoteTree(notes);
    tree.forEach(node => {
        els.notesList.appendChild(renderParentNote(node));
    });
}

function renderParentNote(node) {
    const clone = els.tplParentNote.content.cloneNode(true);
    const el = clone.querySelector('.note-parent');
    el.dataset.noteId = node.noteId;

    // Character & Pinyin
    const charEl = clone.querySelector('.note-character');
    charEl.textContent = node.character || '—';
    const pinyinEl = clone.querySelector('.note-pinyin');
    pinyinEl.textContent = node.pinyin ? `${node.pinyin} • ${node.hsk || ''}` : (node.hsk || '—');

    // Inline edit: double-click character to edit
    charEl.addEventListener('dblclick', () => enableInlineEdit(charEl, node, 'character'));
    pinyinEl.addEventListener('dblclick', () => enableInlineEdit(pinyinEl, node, 'pinyin'));

    // Delete
    clone.querySelector('.btn-delete-note').addEventListener('click', (e) => {
        e.stopPropagation();
        handleDeleteNote(node.noteId);
    });

    // Add child
    clone.querySelector('.btn-add-child').addEventListener('click', (e) => {
        e.stopPropagation();
        openNewNoteModal({ parentNoteId: node.noteId });
    });

    // Details button
    clone.querySelector('.btn-details').addEventListener('click', (e) => {
        e.stopPropagation();
        openDetailModal(node);
    });

    // Render children
    const childrenContainer = clone.querySelector('.note-children');
    if (node.children && node.children.length > 0) {
        node.children.forEach(child => {
            childrenContainer.appendChild(renderChildNote(child));
        });
    } else {
        childrenContainer.classList.add('hidden');
    }

    return clone;
}

function renderChildNote(node) {
    const clone = els.tplChildNote.content.cloneNode(true);
    const el = clone.querySelector('.note-child');
    el.dataset.noteId = node.noteId;

    clone.querySelector('.note-character').textContent = node.character || '—';
    clone.querySelector('.note-pinyin').textContent = node.pinyin ? `${node.pinyin} • ${node.hsk || ''}` : (node.hsk || '—');

    // Delete
    clone.querySelector('.btn-delete-note').addEventListener('click', (e) => {
        e.stopPropagation();
        handleDeleteNote(node.noteId);
    });

    // Edit
    clone.querySelector('.btn-edit-note').addEventListener('click', (e) => {
        e.stopPropagation();
        openEditNoteModal(node);
    });

    return clone;
}

// =============================================================================
// INLINE EDITING
// =============================================================================

function enableInlineEdit(el, note, field) {
    if (el.isContentEditable) return;
    el.contentEditable = 'true';
    el.focus();

    const originalValue = el.textContent;

    function save() {
        el.contentEditable = 'false';
        const newValue = el.textContent.trim();
        if (newValue && newValue !== originalValue) {
            queueChange('UPDATE_NOTE', {
                sessionId: note.sessionId || getState('currentSessionId'),
                noteId: note.noteId,
                character: field === 'character' ? newValue : note.character,
                pinyin: field === 'pinyin' ? newValue : note.pinyin,
            });
            toast.success('Change queued. Press Ctrl+S to save.');
        }
    }

    el.addEventListener('blur', save, { once: true });
    el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            el.blur();
        }
        if (e.key === 'Escape') {
            el.textContent = originalValue;
            el.contentEditable = 'false';
        }
    }, { once: true });
}

// =============================================================================
// NOTE MODALS
// =============================================================================

function initNoteInteractions() {
    els.btnNewNote.addEventListener('click', () => openNewNoteModal());
    els.btnSaveAll.addEventListener('click', () => window.__mandoHandleSaveAll__?.());
}

/** Open the New Note modal. Optionally pre-fill fields. */
function openNewNoteModal(prefill = {}) {
    const clone = els.tplNewNoteForm.content.cloneNode(true);

    // Pre-fill
    if (prefill.character) {
        clone.querySelector('#new-note-character').value = prefill.character;
    }
    if (prefill.parentNoteId) {
        // Will populate after building options
        clone.querySelector('#new-note-parent').dataset.preselect = prefill.parentNoteId;
    }

    // Populate parent dropdown with current root notes
    const parentSelect = clone.querySelector('#new-note-parent');
    const notes = getState('notes') || [];
    const roots = notes.filter(n => !n.parentNoteId);
    roots.forEach(root => {
        const opt = document.createElement('option');
        opt.value = root.noteId;
        opt.textContent = `${root.character} (${root.pinyin || root.hsk})`;
        parentSelect.appendChild(opt);
    });
    if (prefill.parentNoteId) {
        parentSelect.value = prefill.parentNoteId;
    }

    // Toggle deck fields
    const chkDeck = clone.querySelector('#new-note-add-to-deck');
    const deckFields = clone.querySelector('#new-note-deck-fields');
    if (prefill.addToDeck) {
        chkDeck.checked = true;
        deckFields.classList.remove('hidden');
    }
    chkDeck.addEventListener('change', () => {
        deckFields.classList.toggle('hidden', !chkDeck.checked);
    });

    modal.open({
        title: prefill.character ? 'Save Word' : 'New Note',
        content: clone,
        confirmText: 'Queue Note',
        onConfirm: () => {
            const character = document.getElementById('new-note-character').value.trim();
            const pinyin = document.getElementById('new-note-pinyin').value.trim();
            const hsk = document.getElementById('new-note-hsk').value;
            const parentNoteId = document.getElementById('new-note-parent').value || null;
            const addToDeck = document.getElementById('new-note-add-to-deck').checked;

            const noteData = { character, pinyin, hsk, parentNoteId };
            const validation = validateNote(noteData);
            if (!validation.valid) {
                toast.error(validation.errors.join(' '));
                return false; // prevent modal close
            }

            // Queue CREATE_NOTE
            queueChange('CREATE_NOTE', {
                character,
                pinyin,
                hsk,
                parentNoteId,
                sessionId: getState('currentSessionId'),
            });

            // Optionally queue CREATE_FLASHCARD
            if (addToDeck) {
                const meaning = document.getElementById('new-note-meaning').value.trim();
                const category = document.getElementById('new-note-category').value;
                const fcData = { character, pinyin, meaning, hsk, category };
                const fcValidation = validateFlashcard(fcData);
                if (!fcValidation.valid) {
                    toast.error(fcValidation.errors.join(' '));
                    return false;
                }
                queueChange('CREATE_FLASHCARD', {
                    character,
                    pinyin,
                    meaning,
                    hsk,
                    category,
                    sessionId: getState('currentSessionId'),
                });
            }

            toast.success('Note queued. Press Ctrl+S to save.');
            return true;
        },
    });
}

/** Open edit modal for a note (used for child notes). */
function openEditNoteModal(note) {
    const content = document.createElement('div');
    content.className = 'space-y-md';
    content.innerHTML = `
        <div>
            <label class="font-label-caps text-label-caps text-on-surface-variant block mb-xs">Character</label>
            <input type="text" class="w-full p-sm bg-surface-container-low rounded-lg border border-outline-variant text-sm font-character-display text-on-surface" id="edit-note-character" value="${escapeHtml(note.character)}" maxlength="25" />
        </div>
        <div>
            <label class="font-label-caps text-label-caps text-on-surface-variant block mb-xs">Pinyin</label>
            <input type="text" class="w-full p-sm bg-surface-container-low rounded-lg border border-outline-variant text-sm font-body-md text-on-surface" id="edit-note-pinyin" value="${escapeHtml(note.pinyin || '')}" maxlength="250" />
        </div>
    `;

    modal.open({
        title: 'Edit Note',
        content,
        confirmText: 'Queue Update',
        onConfirm: () => {
            const character = document.getElementById('edit-note-character').value.trim();
            const pinyin = document.getElementById('edit-note-pinyin').value.trim();

            if (!character) {
                toast.error('Character is required.');
                return false;
            }

            queueChange('UPDATE_NOTE', {
                sessionId: note.sessionId || getState('currentSessionId'),
                noteId: note.noteId,
                character,
                pinyin,
            });

            toast.success('Update queued. Press Ctrl+S to save.');
            return true;
        },
    });
}

/** Confirm and queue delete. */
async function handleDeleteNote(noteId) {
    const ok = await confirm('Delete this note? This will also remove its children.');
    if (!ok) return;

    const note = (getState('notes') || []).find(n => n.noteId === noteId);
    if (!note) return;

    queueChange('DELETE_NOTE', {
        sessionId: note.sessionId || getState('currentSessionId'),
        noteId,
    });

    // Optimistically remove from UI
    const el = document.querySelector(`[data-note-id="${noteId}"]`);
    if (el) {
        el.style.opacity = '0.5';
        el.style.pointerEvents = 'none';
    }

    toast.success('Delete queued. Press Ctrl+S to save.');
}

// =============================================================================
// DETAIL MODAL
// =============================================================================

async function openDetailModal(note) {
    const userId = getState('userId');
    const sessionId = getState('currentSessionId');

    let detail = null;
    if (userId) {
        const result = await api.getDetail(userId, sessionId, note.noteId);
        if (result.ok) detail = result.data;
    }

    const clone = els.tplDetailModal.content.cloneNode(true);
    clone.querySelector('.detail-character').textContent = note.character;
    clone.querySelector('.detail-pinyin').textContent = note.pinyin || note.hsk || '';

    const exampleEl = clone.querySelector('#detail-example');
    const explanationEl = clone.querySelector('#detail-explanation');

    if (detail) {
        exampleEl.value = detail.exampleSentence || '';
        explanationEl.value = detail.detailedNote || '';
    }

    // Delete detail
    clone.querySelector('.btn-delete-detail').addEventListener('click', async () => {
        if (!detail) {
            modal.close();
            return;
        }
        if (!userId) {
            toast.error('No user ID. Cannot delete detail.');
            return;
        }
        spinner.show('Deleting detail...');
        const result = await api.deleteDetail(userId, sessionId, note.noteId);
        spinner.hide();
        if (result.ok) {
            toast.success('Detail deleted.');
        } else {
            toast.error('Failed to delete detail: ' + (result.error?.message || 'Unknown error'));
        }
        modal.close();
    });

    // Update detail
    clone.querySelector('.btn-update-detail').addEventListener('click', async () => {
        const exampleSentence = exampleEl.value.trim();
        const detailedNote = explanationEl.value.trim();

        const validation = validateDetail({ detailedNote, exampleSentence });
        if (!validation.valid) {
            toast.error(validation.errors.join(' '));
            return;
        }
        if (!userId) {
            toast.error('No user ID. Cannot save detail.');
            return;
        }

        spinner.show('Saving detail...');
        const result = await api.saveDetail(userId, sessionId, note.noteId, {
            detailedNote,
            exampleSentence,
        });
        spinner.hide();

        if (result.ok) {
            toast.success('Detail saved.');
        } else {
            toast.error('Failed to save detail: ' + (result.error?.message || 'Unknown error'));
        }
        modal.close();
    });

    modal.open({
        title: 'Note Details',
        content: clone,
    });
}

// =============================================================================
// PARTIAL FAILURE UI
// =============================================================================

/** Highlight notes that failed to save. Called by main.js after batch attempt. */
export function highlightFailedNotes(failedChanges) {
    // Clear previous highlights
    document.querySelectorAll('.note-parent, .note-child').forEach(el => {
        el.classList.remove('border-error', 'ring-2', 'ring-error');
    });

    failedChanges.forEach(({ change }) => {
        const noteId = change.data?.noteId;
        if (!noteId) return;
        const el = document.querySelector(`[data-note-id="${noteId}"]`);
        if (el) {
            el.classList.add('border-error', 'ring-2', 'ring-error');
        }
    });
}

// =============================================================================
// RUN
// =============================================================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
