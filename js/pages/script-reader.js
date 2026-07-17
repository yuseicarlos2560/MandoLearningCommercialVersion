/**
 * Script Reader page handler.
 *
 * Wires the script reader page to:
 * - MandoApi.scripts  (script metadata + content + audio)
 * - MandoApi.notes    (script-scoped notes + details)
 * - MandoApi.batch    (flashcard creates from "Also add to deck")
 * - MandoApi.videos   (related videos by HSK level)
 * - MandoApi.stats    (USER_ACTIVE event)
 */

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Constants & fixtures
  // ---------------------------------------------------------------------------

  const DEMO_SCRIPT_ID = 'SCRIPT_DEMO_001';

  const DEMO_SCRIPT = {
    scriptId: DEMO_SCRIPT_ID,
    title: 'Discuss returning home after studying abroad',
    description: 'Focus on emotional vocabulary and cultural nuances of returning to one\'s roots.',
    scriptType: 'ARTICLE',
    status: 'READY',
    authorUserId: 'USR_000789',
    thumbnailUrl: null,
    hasAudio: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const DEMO_SCRIPT_LINES = [
    {
      lineNumber: 1,
      chinese: '是啊，你就说来我们公司面试的这几个吧……',
      pinyin: 'Shì a, nǐ jiù shuō lái wǒmen gōngsī miànshì de zhè jǐ gè ba.',
      english: 'Yeah, just take these few people who came to our company for interviews as an example...',
    },
    {
      lineNumber: 2,
      chinese: '行，我先说第一个。',
      pinyin: 'Xíng, wǒ xiān shuō dì yī gè.',
      english: 'Okay, I will start with the first one.',
    },
    {
      lineNumber: 3,
      chinese: '他的简历看起来不错。',
      pinyin: 'Tā de jiǎnlì kàn qǐlái búcuò.',
      english: 'His resume looks pretty good.',
    },
    {
      lineNumber: 4,
      chinese: '不过，他的中文水平怎么样？',
      pinyin: 'Búguò, tā de Zhōngwén shuǐpíng zěnme yàng?',
      english: 'But how is his Chinese level?',
    },
    {
      lineNumber: 5,
      chinese: '回国之后，我想要更多的时间陪父母。',
      pinyin: 'Huíguó zhīhòu, wǒ xiǎng yào gèng duō de shíjiān péi fùmǔ.',
      english: 'After returning home, I want more time to accompany my parents.',
    },
  ];

  const DEMO_NOTES = [
    {
      noteId: 'NOTE_DEMO_001',
      contentType: 'SCRIPT',
      contentId: DEMO_SCRIPT_ID,
      character: '面试',
      pinyin: 'miànshì',
      parentNoteId: null,
      timestamp: new Date().toISOString(),
    },
    {
      noteId: 'NOTE_DEMO_002',
      contentType: 'SCRIPT',
      contentId: DEMO_SCRIPT_ID,
      character: '面',
      pinyin: 'miàn',
      parentNoteId: 'NOTE_DEMO_001',
      timestamp: new Date().toISOString(),
    },
    {
      noteId: 'NOTE_DEMO_003',
      contentType: 'SCRIPT',
      contentId: DEMO_SCRIPT_ID,
      character: '试',
      pinyin: 'shì',
      parentNoteId: 'NOTE_DEMO_001',
      timestamp: new Date().toISOString(),
    },
    {
      noteId: 'NOTE_DEMO_004',
      contentType: 'SCRIPT',
      contentId: DEMO_SCRIPT_ID,
      character: '公司',
      pinyin: 'gōngsī',
      parentNoteId: null,
      timestamp: new Date().toISOString(),
    },
  ];

  const DEMO_NOTE_DETAILS = {
    NOTE_DEMO_001: {
      noteId: 'NOTE_DEMO_001',
      detailedNote: 'A formal meeting to assess whether someone is suitable for a job.',
      exampleSentence: '明天我要去公司面试。',
    },
    NOTE_DEMO_004: {
      noteId: 'NOTE_DEMO_004',
      detailedNote: 'A company or business organization.',
      exampleSentence: '这家公司的环境很好。',
    },
  };

  const DEMO_RELATED_VIDEOS = [
    {
      videoId: 'DEMO_REL_001',
      title: 'HSK3 Travel Vocabulary',
      description: 'Essential words for buying tickets and asking directions.',
      durationSeconds: 920,
      thumbnail: 'https://lh3.googleusercontent.com/aida-public/AB6AXuALPPBwB1vBOKHzIbtsoVGBa_bum56PS9oqIh0oWUqiNM-KaS9sWtDhpXh5zA3uZqv865ojan5XYzDMepgcKPdE9OgY7CdPmdiTl19p7iM8P4Pc-UlnAjGp1prxbBkdWYpCJ60wWp3cwEhdqe9KS36LZX4xml9mQDSKvPEEzu60YJFUfv6GHbwyhZTg5NDM7SshzRNhw2fOC5bbfTUq9KL5hmPslBa1B1F_6PqGS4_vCXU4P9KjDOhL',
    },
    {
      videoId: 'DEMO_REL_002',
      title: 'HSK3 Daily Routine',
      description: 'Talk about your morning and evening habits in Mandarin.',
      durationSeconds: 780,
      thumbnail: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDBe7z8onD2RVf4Vx7gU8UPSX-2jypiPSsnYxmbQbllG12Rx8n17SMQgrTRasaD8J0XcvRwPUMjaedaMgCIPcH3PrglsJsZvYiI34C29P_kB2ZAVDY3Rly7Dm_QJjZI2P0TwC-RsCZgY5iTOzUN81uRKi_1RSrSQxDn2siXZsW58rHX_0PhIGuiNTYjaxC8kY-FgV69rFLUHpMhJMYZ_4dqTZ4Dulp0bIO42AEi3CxpGQGAxtUr7vDy',
    },
  ];

  const DEMO_RELATED_SCRIPTS = [
    {
      scriptId: 'SCRIPT_DEMO_002',
      title: 'Job Interview Etiquette',
      description: 'How to behave during a Chinese job interview.',
      scriptType: 'ARTICLE',
      hasAudio: false,
    },
    {
      scriptId: 'SCRIPT_DEMO_003',
      title: 'Workplace Vocabulary',
      description: 'Useful words for office conversations.',
      scriptType: 'ARTICLE',
      hasAudio: true,
    },
  ];

  const SCRIPT_TYPE_LABELS = {
    ARTICLE: 'Article',
    NEWS: 'News',
    SPEECH: 'Speech',
  };

  // ---------------------------------------------------------------------------
  // Shared utilities
  // ---------------------------------------------------------------------------

  const {
    safeLocalStorageGet,
    safeLocalStorageSet,
    safeLocalStorageRemove,
    getUserId,
    uuid,
    $,
    setText,
    setHtml,
    formatTime,
    formatDuration,
    escapeHtml,
    extractHsk,
    inferHskLabel,
    difficultyFromHsk,
    thumbnailUrl,
  } = window.MandoUtils;

  const MandoUi = window.MandoUi;

  // ---------------------------------------------------------------------------
  // Page-specific helpers
  // ---------------------------------------------------------------------------

  function getScriptId() {
    const params = new URLSearchParams(window.location.search);
    const urlId = params.get('scriptId');
    if (urlId) return urlId;

    const storedId = safeLocalStorageGet('mando.lastScriptId');
    if (storedId) return storedId;

    return null;
  }

  function persistLastScriptId(scriptId) {
    if (scriptId) {
      safeLocalStorageSet('mando.lastScriptId', scriptId);
    }
  }

  function generatePinyin(text) {
    if (!text || !text.trim()) return '';
    const lib = window.pinyinPro || window.pinyin;
    if (lib && typeof lib.pinyin === 'function') {
      try {
        return lib.pinyin(text.trim(), { toneType: 'symbol' });
      } catch (e) {
        return '';
      }
    }
    return '';
  }

  /**
   * Normalize the structured ScriptLine array returned by the API.
   *
   * The backend now stores scripts as `lines: ScriptLine[]` with
   * lineNumber, chinese, pinyin, and english. We ensure each line has a
   * fallback pinyin (auto-generated) and english (placeholder) when the
   * admin did not provide them.
   */
  function normalizeScriptLines(lines) {
    if (!Array.isArray(lines)) return [];

    return lines.map(function (line, index) {
      const chinese = line.chinese || '';
      const pinyin = line.pinyin && line.pinyin.trim()
        ? line.pinyin.trim()
        : generatePinyin(chinese);
      const english = line.english && line.english.trim()
        ? line.english.trim()
        : 'Translation not available.';

      return {
        lineNumber: line.lineNumber || index + 1,
        chinese: chinese,
        pinyin: pinyin,
        english: english,
      };
    });
  }

  /**
   * Format an ISO date as a human-readable relative string.
   */
  function formatRelativeDate(isoDate) {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return '';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 1) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  }

  /**
   * Resolve a thumbnail URL for a script entity.
   */
  function scriptThumbnailUrl(script, fallbackUrl) {
    if (script.thumbnailUrl) return script.thumbnailUrl;
    return fallbackUrl || '';
  }

  /**
   * Return `count` random items from `array` using Fisher-Yates shuffle.
   * Temporary helper until a real Recommendations service is available.
   */
  function pickRandomItems(array, count) {
    if (!Array.isArray(array) || array.length === 0) return [];
    const source = array.slice();
    const limit = Math.min(count, source.length);
    for (let i = source.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = source[i];
      source[i] = source[j];
      source[j] = temp;
    }
    return source.slice(0, limit);
  }

  // ---------------------------------------------------------------------------
  // Font size helpers
  // ---------------------------------------------------------------------------

  const SCRIPT_FONT_SIZE_CLASSES = {
    sm: { chinese: 'text-[22px] md:text-[26px]', pinyin: 'text-sm', english: 'text-sm' },
    md: { chinese: 'text-[26px] md:text-[32px]', pinyin: 'text-base', english: 'text-base' },
    lg: { chinese: 'text-[30px] md:text-[38px]', pinyin: 'text-base', english: 'text-base' },
    xl: { chinese: 'text-[36px] md:text-[44px]', pinyin: 'text-lg', english: 'text-lg' },
  };

  function getScriptFontSize() {
    const stored = safeLocalStorageGet('mando.scriptFontSize');
    if (stored && SCRIPT_FONT_SIZE_CLASSES[stored]) return stored;
    return 'md';
  }

  function setScriptFontSize(size) {
    if (!SCRIPT_FONT_SIZE_CLASSES[size]) return;
    safeLocalStorageSet('mando.scriptFontSize', size);
    state.fontSize = size;
    const container = $('script-lines');
    if (container) container.dataset.fontSize = size;
    renderLines();
  }

  function adjustScriptFontSize(delta) {
    const sizes = ['sm', 'md', 'lg', 'xl'];
    const current = getScriptFontSize();
    const index = sizes.indexOf(current);
    const nextIndex = Math.max(0, Math.min(sizes.length - 1, index + delta));
    setScriptFontSize(sizes[nextIndex]);
  }

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const state = {
    userId: getUserId(),
    scriptId: getScriptId(),
    script: null,
    lines: [],
    audioUrl: null,
    notes: [],
    noteDetails: {},
    pendingChanges: [],
    isSaving: false,
    saveError: null,
    demoMode: false,
    readerMode: 'zh',
    fontSize: getScriptFontSize(),
    activeLineIndex: -1,
    isPlaying: false,
    playbackProgress: 0,
    relatedScripts: [],
    relatedVideos: [],
  };

  // Persist userId and lastScriptId for subsequent visits.
  if (state.userId) safeLocalStorageSet('mando.userId', state.userId);
  persistLastScriptId(state.scriptId);

  // ---------------------------------------------------------------------------
  // Pending-change queue
  // ---------------------------------------------------------------------------

  function queueChange(operation, data) {
    state.pendingChanges.push({
      _id: uuid(),
      operation,
      data,
    });
    updateSaveButtonState();
  }

  function removePendingChange(changeId) {
    state.pendingChanges = state.pendingChanges.filter(function (c) {
      return c._id !== changeId;
    });
    updateSaveButtonState();
  }

  function removePendingChangeByPredicate(predicate) {
    let removed = false;
    state.pendingChanges = state.pendingChanges.filter(function (c) {
      if (!removed && predicate(c)) {
        removed = true;
        return false;
      }
      return true;
    });
    updateSaveButtonState();
  }

  function hasPendingChanges() {
    return state.pendingChanges.length > 0;
  }

  function updateSaveButtonState() {
    const btn = $('save-notes-btn');
    if (!btn) return;
    const count = state.pendingChanges.length;
    btn.disabled = count === 0 || state.isSaving || state.demoMode;
    const label = count > 0 ? `Save (${count})` : 'Save';
    btn.innerHTML = `<span class="material-symbols-outlined text-sm">save</span> ${escapeHtml(label)} (Ctrl+S)`;
  }

  function validatePendingChanges() {
    const errors = [];

    state.pendingChanges.forEach(function (change) {
      if (change.operation === 'CREATE_NOTE' || change.operation === 'UPDATE_NOTE') {
        if (!change.data.character || !change.data.character.trim()) {
          errors.push('Character cannot be empty.');
        }
      }
      if (change.operation === 'CREATE_NOTE') {
        if (!change.data.pinyin || !change.data.pinyin.trim()) {
          errors.push('Pinyin cannot be empty for new notes.');
        }
      }
      if (change.operation === 'CREATE_FLASHCARD') {
        if (!change.data.character || !change.data.character.trim()) {
          errors.push('Flashcard character cannot be empty.');
        }
        if (!change.data.pinyin || !change.data.pinyin.trim()) {
          errors.push('Flashcard pinyin cannot be empty.');
        }
        if (!change.data.meaning || !change.data.meaning.trim()) {
          errors.push('Flashcard meaning cannot be empty.');
        }
        if (!change.data.category || !change.data.category.trim()) {
          errors.push('Flashcard category cannot be empty.');
        }
      }
    });

    return errors.filter(function (value, index, self) {
      return self.indexOf(value) === index;
    });
  }

  // Separate note operations from flashcard operations.
  function partitionPendingChanges() {
    const noteChanges = [];
    const flashcardChanges = [];

    state.pendingChanges.forEach(function (change) {
      if (change.operation === 'CREATE_FLASHCARD' || change.operation === 'UPDATE_FLASHCARD' || change.operation === 'DELETE_FLASHCARD') {
        flashcardChanges.push(change);
      } else {
        noteChanges.push(change);
      }
    });

    return { noteChanges, flashcardChanges };
  }

  function buildFlashcardBatchPayload(flashcardChanges) {
    const payload = {};
    const mapping = [];

    flashcardChanges.forEach(function (change) {
      if (change.operation === 'CREATE_FLASHCARD') {
        payload.createFlashCards = payload.createFlashCards || [];
        const index = payload.createFlashCards.length;
        payload.createFlashCards.push({
          character: change.data.character,
          pinyin: change.data.pinyin || '',
          meaning: change.data.meaning || '',
          hsk: change.data.hsk || inferHskLabel((state.script || DEMO_SCRIPT).title),
          category: change.data.category || 'MISCELLANEOUS',
          sessionId: 'NO_SESSION',
        });
        mapping.push({ changeId: change._id, operation: 'CREATE_FLASHCARD', index: index });
      }
    });

    return { payload, mapping };
  }

  async function executeNoteChange(change) {
    if (!state.userId) return { ok: false, error: 'No userId' };

    const scriptId = state.scriptId;

    try {
      if (change.operation === 'CREATE_NOTE') {
        const res = await window.MandoApi.notes.createScriptNote(
          state.userId,
          scriptId,
          {
            character: change.data.character,
            pinyin: change.data.pinyin || '',
            hsk: change.data.hsk || inferHskLabel((state.script || DEMO_SCRIPT).title),
          },
          change.data.parentNoteId || null
        );
        return { ok: res.ok, error: res.error };
      }

      if (change.operation === 'UPDATE_NOTE') {
        const res = await window.MandoApi.notes.updateScriptNote(
          state.userId,
          scriptId,
          change.data.noteId,
          {
            character: change.data.character,
            pinyin: change.data.pinyin || '',
          }
        );
        return { ok: res.ok, error: res.error };
      }

      if (change.operation === 'DELETE_NOTE') {
        const res = await window.MandoApi.notes.deleteScriptNote(
          state.userId,
          scriptId,
          change.data.noteId
        );
        return { ok: res.ok || res.status === 204, error: res.error };
      }

      return { ok: false, error: 'Unknown note operation' };
    } catch (err) {
      return { ok: false, error: err.message || 'Network error' };
    }
  }

  async function flushPendingChanges() {
    if (state.pendingChanges.length === 0) return;

    if (state.demoMode) {
      MandoUi.toast('Notes cannot be saved in demo mode. Open a real script to save.', 'info');
      return;
    }

    if (!state.userId) {
      MandoUi.toast('Please sign in to save notes.', 'error');
      return;
    }

    const validationErrors = validatePendingChanges();
    if (validationErrors.length > 0) {
      MandoUi.toast(validationErrors.join(' '), 'error');
      return;
    }

    state.isSaving = true;
    state.saveError = null;
    updateSaveButtonState();

    const { noteChanges, flashcardChanges } = partitionPendingChanges();
    const succeededIds = [];
    const failedMessages = [];

    // Execute note changes in parallel.
    if (noteChanges.length > 0) {
      const noteResults = await Promise.all(
        noteChanges.map(function (change) {
          return executeNoteChange(change).then(function (result) {
            return { change, result };
          });
        })
      );

      noteResults.forEach(function (item) {
        if (item.result.ok) {
          succeededIds.push(item.change._id);
        } else {
          failedMessages.push(item.result.error && item.result.error.message ? item.result.error.message : 'Note save failed');
        }
      });
    }

    // Execute flashcard changes via batch.
    if (flashcardChanges.length > 0) {
      const { payload, mapping } = buildFlashcardBatchPayload(flashcardChanges);
      const res = await window.MandoApi.batch.flush(state.userId, payload);

      if (!res.ok) {
        failedMessages.push(res.error && res.error.message ? res.error.message : 'Flashcard save failed');
      } else {
        const results = res.data && res.data.results ? res.data.results : [];
        results.forEach(function (result) {
          if (result.status !== 'SUCCESS') return;
          const mapItem = mapping.find(function (m) {
            return m.operation === result.operation && m.index === result.index;
          });
          if (mapItem) succeededIds.push(mapItem.changeId);
        });

        const failedCount = flashcardChanges.length - succeededIds.filter(function (id) {
          return flashcardChanges.some(function (c) { return c._id === id; });
        }).length;
        if (failedCount > 0) {
          failedMessages.push(`${failedCount} flashcard(s) could not be saved.`);
        }
      }
    }

    state.pendingChanges = state.pendingChanges.filter(function (c) {
      return !succeededIds.includes(c._id);
    });

    state.isSaving = false;
    updateSaveButtonState();

    if (state.pendingChanges.length > 0) {
      MandoUi.toast(failedMessages.length > 0 ? failedMessages.join(' ') : 'Some changes could not be saved.', 'error');
    } else {
      MandoUi.toast('Notes saved successfully.', 'success');
    }

    await loadNotes();
    renderNotes();
  }

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------

  async function loadScriptMeta() {
    if (state.demoMode) {
      state.script = { ...DEMO_SCRIPT };
      return true;
    }

    const res = await window.MandoApi.scripts.getReady(state.scriptId);
    if (res.ok && res.data && res.data.script) {
      state.script = res.data.script;
      return true;
    }

    state.script = { ...DEMO_SCRIPT, scriptId: state.scriptId };
    return false;
  }

  async function loadScriptContent() {
    if (state.demoMode) {
      state.lines = DEMO_SCRIPT_LINES.map(function (line) { return { ...line }; });
      return true;
    }

    const res = await window.MandoApi.scripts.getContent(state.scriptId);
    if (res.ok && res.data && Array.isArray(res.data.lines)) {
      state.lines = normalizeScriptLines(res.data.lines);
      return true;
    }

    state.lines = [];
    return false;
  }

  async function loadAudioUrl() {
    state.audioUrl = null;

    const script = state.script;
    if (!script || !script.hasAudio) return false;

    if (state.demoMode) return false;

    const res = await window.MandoApi.scripts.getAudioUrl(state.scriptId);
    if (res.ok && res.data && res.data.audioUrl) {
      state.audioUrl = res.data.audioUrl;
      return true;
    }

    return false;
  }

  async function loadNotes() {
    if (state.demoMode) {
      state.notes = DEMO_NOTES.map(function (n) { return { ...n }; });
      state.noteDetails = { ...DEMO_NOTE_DETAILS };
      return true;
    }

    if (!state.userId) {
      state.notes = [];
      state.noteDetails = {};
      return true;
    }

    const res = await window.MandoApi.notes.listScript(state.userId, state.scriptId, true);
    if (res.ok && res.data) {
      state.notes = Array.isArray(res.data.notes) ? res.data.notes : [];
      state.noteDetails = res.data.noteDetails || {};
      return true;
    }

    state.notes = [];
    state.noteDetails = {};
    return false;
  }

  // ---------------------------------------------------------------------------
  // Related content
  // ---------------------------------------------------------------------------
  // TODO: Recommend the backend add an `hsk` field to the Scripts API so we
  // can match related scripts by proficiency level instead of only by type.
  // TODO: Replace the temporary random sampling below with a call to a proper
  // Recommendations algorithm/service once one exists.
  // ---------------------------------------------------------------------------

  async function loadRelatedScripts() {
    const currentType = state.script && state.script.scriptType;

    if (state.demoMode || !currentType) {
      state.relatedScripts = DEMO_RELATED_SCRIPTS.map(function (s) { return { ...s }; });
      return state.demoMode;
    }

    // The public GET /api/scripts endpoint currently returns all published
    // scripts newest-first and does not support server-side filtering by
    // scriptType. We fetch a broad pool and filter client-side so the
    // recommendation container actually matches the current script's category.
    const res = await window.MandoApi.scripts.listReady({ pageSize: 50 });
    if (!res.ok || !res.data || !Array.isArray(res.data.scripts)) {
      state.relatedScripts = DEMO_RELATED_SCRIPTS.map(function (s) { return { ...s }; });
      return false;
    }

    const allScripts = res.data.scripts.filter(function (s) { return s.scriptId !== state.scriptId; });

    // 1) Prefer scripts of the same type.
    let pool = allScripts.filter(function (s) { return s.scriptType === currentType; });

    // 2) Supplement with other scripts if we have fewer than 5 matches.
    if (pool.length < 5) {
      const sameTypeIds = new Set(pool.map(function (s) { return s.scriptId; }));
      const others = allScripts.filter(function (s) { return !sameTypeIds.has(s.scriptId); });
      pool = pool.concat(others);
    }

    if (pool.length > 0) {
      // The API already returns newest first; use that order for a stable
      // recommendation surface instead of shuffling.
      state.relatedScripts = pool.slice(0, 5);
      return true;
    }

    state.relatedScripts = DEMO_RELATED_SCRIPTS.map(function (s) { return { ...s }; });
    return false;
  }

  async function loadRelatedVideos() {
    if (state.demoMode) {
      state.relatedVideos = DEMO_RELATED_VIDEOS.map(function (v) { return { ...v }; });
      return true;
    }

    // Fetch a larger pool so the random sample has variety.
    const res = await window.MandoApi.videos.listReady({ pageSize: 50 });
    if (res.ok && res.data && Array.isArray(res.data.videos)) {
      const pool = res.data.videos.filter(function (v) { return v.videoId; });
      state.relatedVideos = pickRandomItems(pool, 5);
      return true;
    }

    state.relatedVideos = DEMO_RELATED_VIDEOS.map(function (v) { return { ...v }; });
    return false;
  }

  async function loadScriptLibrary() {
    const container = document.getElementById('script-library-container');
    if (!container) return;

    let scripts = [];

    if (!state.demoMode) {
      const res = await window.MandoApi.scripts.listReady({ pageSize: 50 });
      if (res.ok && res.data && Array.isArray(res.data.scripts)) {
        scripts = res.data.scripts;
      }
    }

    if (scripts.length === 0) {
      container.innerHTML = `
        <p class="text-xs text-on-surface-variant px-sm py-xs">
          No scripts available yet.
        </p>
      `;
      return;
    }

    container.innerHTML = scripts.map(function (script) {
      const isActive = script.scriptId === state.scriptId;
      const typeLabel = SCRIPT_TYPE_LABELS[script.scriptType] || 'Script';
      return `
        <a class="flex items-center gap-sm px-sm py-xs rounded-lg text-sm ${isActive ? 'bg-primary-container text-on-primary-container font-semibold' : 'text-on-surface-variant hover:bg-surface-container'} transition-colors truncate"
           href="script-reader.html?scriptId=${encodeURIComponent(script.scriptId)}"
           title="${escapeHtml(script.title)} (${escapeHtml(typeLabel)})">
          <span class="material-symbols-outlined text-base ${isActive ? 'text-on-primary-container' : 'text-secondary'}">description</span>
          <span class="truncate">${escapeHtml(script.title)}</span>
        </a>
      `;
    }).join('');
  }

  async function sendUserActive() {
    if (!state.userId) return;
    try {
      await window.MandoApi.stats.recordEvent(state.userId, {
        eventId: uuid(),
        eventType: 'USER_ACTIVE',
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('USER_ACTIVE event failed', err);
    }
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  function renderStatus(message, showRetry) {
    const container = $('reader-status');
    const messageEl = $('reader-status-message');
    const retryBtn = $('reader-status-retry');
    if (!container || !messageEl) return;

    setText('reader-status-message', message);
    container.classList.remove('hidden');

    if (retryBtn) {
      if (showRetry) {
        retryBtn.classList.remove('hidden');
        retryBtn.onclick = function () {
          container.classList.add('hidden');
          initPage();
        };
      } else {
        retryBtn.classList.add('hidden');
      }
    }
  }

  function hideStatus() {
    const container = $('reader-status');
    if (container) container.classList.add('hidden');
  }

  function renderHeader() {
    const script = state.script || DEMO_SCRIPT;
    const typeLabel = SCRIPT_TYPE_LABELS[script.scriptType] || 'Script';

    const badge = $('script-type-badge');
    if (badge) badge.textContent = typeLabel;

    setText('script-title', script.title || 'Untitled Script');
    setText('script-description', script.description || '');
    document.title = `MandoLearning | ${script.title || 'Script Reader'}`;
  }

  function renderAccentChar() {
    const el = $('script-accent-char');
    if (!el) return;

    // Pick the first Chinese character from the first line, or a default.
    const firstLine = state.lines[0];
    if (firstLine && firstLine.chinese) {
      const match = firstLine.chinese.match(/[\u4e00-\u9fff]/);
      if (match) {
        el.textContent = match[0];
        return;
      }
    }
    el.textContent = '文';
  }

  function renderLines() {
    const container = $('script-lines');
    if (!container) return;

    if (state.lines.length === 0) {
      container.innerHTML = `
        <div class="text-center py-xl text-on-surface-variant">
          <p>This script has no readable content.</p>
        </div>
      `;
      return;
    }

    const zhDisplay = state.readerMode === 'zh' || state.readerMode === 'py' ? 'block' : 'hidden';
    const pyDisplay = state.readerMode === 'py' ? 'block' : 'hidden';
    const enDisplay = state.readerMode === 'en' ? 'block' : 'hidden';
    const fontSize = getScriptFontSize();
    const classes = SCRIPT_FONT_SIZE_CLASSES[fontSize];

    container.dataset.fontSize = fontSize;

    container.innerHTML = state.lines.map(function (line, index) {
      const isActive = index === state.activeLineIndex;
      return `
        <div class="script-line group cursor-pointer py-2 px-md hover:bg-surface-container-low rounded-xl transition-all duration-200 ${isActive ? 'bg-surface-container-low' : ''}" data-index="${index}">
          <div class="flex flex-col items-center text-center">
            <div class="script-chinese font-character-display text-on-surface leading-relaxed text-center ${zhDisplay} ${classes.chinese}">
              <button class="script-play-line inline-block mr-sm text-primary hover:scale-110 transition-transform align-middle" data-index="${index}" title="Play sentence audio">
                <span class="material-symbols-outlined text-[20px]">play_circle</span>
              </button>
              ${escapeHtml(line.chinese)}
              <button class="script-lookup-line inline-block ml-sm text-primary hover:scale-110 transition-transform align-middle" data-index="${index}" title="Look up word">
                <span class="material-symbols-outlined text-[20px]">search</span>
              </button>
            </div>
            <div class="script-pinyin font-body-md text-secondary mt-1 ${pyDisplay} ${classes.pinyin}">${escapeHtml(line.pinyin)}</div>
            <div class="script-english font-body-md text-on-surface-variant italic mt-1 ${enDisplay} ${classes.english}">
              "${escapeHtml(line.english)}"
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Attach line interactions.
    container.querySelectorAll('.script-line').forEach(function (lineEl) {
      lineEl.addEventListener('click', function (e) {
        if (e.target.closest('.script-play-line') || e.target.closest('.script-lookup-line')) return;
        const index = parseInt(lineEl.dataset.index, 10);
        setActiveLine(index);
      });
    });

    container.querySelectorAll('.script-play-line').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        const index = parseInt(btn.dataset.index, 10);
        playLineAudio(index);
      });
    });

    container.querySelectorAll('.script-lookup-line').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        const index = parseInt(btn.dataset.index, 10);
        openSaveWordModal(state.lines[index].chinese, state.lines[index].pinyin);
      });
    });
  }

  function renderReaderModeToggles() {
    document.querySelectorAll('.reader-mode-btn').forEach(function (btn) {
      const isActive = btn.dataset.mode === state.readerMode;
      btn.className = isActive
        ? 'reader-mode-btn w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xs'
        : 'reader-mode-btn w-10 h-10 rounded-full bg-surface-container-highest text-on-surface-variant flex items-center justify-center font-bold text-xs';
    });
  }

  function setReaderMode(mode) {
    if (!['zh', 'py', 'en'].includes(mode)) return;
    state.readerMode = mode;
    renderReaderModeToggles();
    renderLines();
  }

  function setActiveLine(index) {
    state.activeLineIndex = index;
    renderLines();
  }

  // ---------------------------------------------------------------------------
  // Notes rendering
  // ---------------------------------------------------------------------------

  function buildNoteTree() {
    const roots = state.notes.filter(function (n) { return n.parentNoteId === null || n.parentNoteId === undefined; });
    const childrenOf = function (parentId) {
      return state.notes.filter(function (n) { return n.parentNoteId === parentId; });
    };
    return { roots, childrenOf };
  }

  function renderNotes() {
    const container = $('notes-container');
    if (!container) return;

    if (state.notes.length === 0) {
      container.innerHTML = `
        <div class="text-center py-md text-on-surface-variant bg-surface-container-low rounded-2xl border border-outline-variant/40">
          <p>No vocabulary notes yet. Select a word and save it, or click New Note.</p>
        </div>
      `;
      return;
    }

    const { roots, childrenOf } = buildNoteTree();

    container.innerHTML = roots.map(function (note) {
      return renderNoteItem(note, childrenOf, 0);
    }).join('');

    attachNoteEventListeners();
  }

  function renderNoteItem(note, childrenOf, depth) {
    const detail = state.noteDetails[note.noteId];
    const children = childrenOf(note.noteId);
    const paddingLeft = depth > 0 ? `pl-${Math.min(depth * 4, 12)}` : '';
    const isPending = !!note._pending;

    return `
      <div class="note-item rounded-2xl border border-outline-variant/40 ${isPending ? 'bg-surface-container-high/50' : 'bg-surface-container-lowest'} p-md ${paddingLeft}" data-note-id="${note.noteId}">
        <div class="flex items-start justify-between gap-sm">
          <div class="flex items-center gap-md min-w-0">
            <div class="text-center">
              <p class="font-character-display text-[32px] text-primary leading-none">${escapeHtml(note.character)}</p>
              <p class="pinyin text-secondary text-sm">${escapeHtml(note.pinyin || '')}</p>
              ${isPending ? '<span class="text-xs text-on-surface-variant">unsaved</span>' : ''}
            </div>
            <div class="min-w-0">
              ${detail ? `
                <p class="font-body-md text-on-surface-variant text-sm">${escapeHtml(detail.detailedNote || '')}</p>
                ${detail.exampleSentence ? `<p class="font-body-md text-secondary text-sm mt-xs">${escapeHtml(detail.exampleSentence)}</p>` : ''}
              ` : `
                <p class="font-body-md text-on-surface-variant text-sm italic">No explanation yet.</p>
              `}
            </div>
          </div>
          <div class="flex items-center gap-xs shrink-0">
            <button class="note-add-child p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant ${isPending ? 'opacity-40 cursor-not-allowed' : ''}" title="Add child note" ${isPending ? 'disabled' : ''}>
              <span class="material-symbols-outlined text-sm">add</span>
            </button>
            <button class="note-edit p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant ${isPending ? 'opacity-40 cursor-not-allowed' : ''}" title="Edit" ${isPending ? 'disabled' : ''}>
              <span class="material-symbols-outlined text-sm">edit</span>
            </button>
            <button class="note-detail p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant ${isPending ? 'opacity-40 cursor-not-allowed' : ''}" title="Add explanation" ${isPending ? 'disabled' : ''}>
              <span class="material-symbols-outlined text-sm">description</span>
            </button>
            <button class="note-delete p-1.5 rounded-lg hover:bg-error-container text-error" title="Delete">
              <span class="material-symbols-outlined text-sm">delete</span>
            </button>
          </div>
        </div>
        ${children.length > 0 ? `
          <div class="mt-sm space-y-sm border-t border-outline-variant/30 pt-sm">
            ${children.map(function (child) { return renderNoteItem(child, childrenOf, depth + 1); }).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  function attachNoteEventListeners() {
    const container = $('notes-container');
    if (!container) return;

    container.querySelectorAll('.note-add-child').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const noteId = btn.closest('.note-item').dataset.noteId;
        openSaveWordModal('', '', noteId);
      });
    });

    container.querySelectorAll('.note-edit').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const noteId = btn.closest('.note-item').dataset.noteId;
        openEditNoteModal(noteId);
      });
    });

    container.querySelectorAll('.note-detail').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const noteId = btn.closest('.note-item').dataset.noteId;
        openDetailModal(noteId);
      });
    });

    container.querySelectorAll('.note-delete').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        const noteId = btn.closest('.note-item').dataset.noteId;
        const note = state.notes.find(function (n) { return n.noteId === noteId; });
        const confirmed = await MandoUi.confirm(
          'Delete note?',
          note ? `Remove "${note.character}" from your notes?` : 'Remove this note?'
        );
        if (confirmed) {
          if (note && note._pending) {
            // Remove the queued CREATE_NOTE instead of asking the backend to delete
            // a record that does not exist yet.
            removePendingChangeByPredicate(function (c) {
              return c.operation === 'CREATE_NOTE' &&
                c.data.character === note.character &&
                c.data.pinyin === note.pinyin;
            });
          } else {
            queueChange('DELETE_NOTE', { noteId });
          }
          state.notes = state.notes.filter(function (n) { return n.noteId !== noteId; });
          renderNotes();
        }
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Modals
  // ---------------------------------------------------------------------------

  function createModalOverlay(title, bodyHtml) {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm flex items-center justify-center p-md';
    overlay.innerHTML = `
      <div class="bg-surface rounded-3xl shadow-2xl w-full max-w-md p-lg border border-outline-variant max-h-[90vh] overflow-y-auto">
        <h3 class="font-headline-md text-headline-md text-on-surface mb-md">${escapeHtml(title)}</h3>
        ${bodyHtml}
        <div class="flex justify-end gap-sm mt-lg">
          <button class="modal-cancel px-md py-xs rounded-lg border border-outline-variant text-on-surface font-body-md hover:bg-surface-container transition-all">Cancel</button>
          <button class="modal-confirm px-md py-xs rounded-lg bg-primary text-on-primary font-body-md hover:bg-primary-dim transition-all shadow-md">Save</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    return overlay;
  }

  function openSaveWordModal(prefilledCharacter, prefilledPinyin, parentNoteId) {
    const title = parentNoteId ? 'Add Child Note' : 'Save Word';
    const character = prefilledCharacter || '';
    const pinyin = prefilledPinyin || generatePinyin(character);
    const hsk = inferHskLabel((state.script || DEMO_SCRIPT).title);

    const body = `
      <div class="space-y-md">
        <div>
          <label class="font-label-caps text-label-caps text-on-surface-variant uppercase">Character</label>
          <input type="text" id="modal-character" class="w-full mt-xs px-md py-sm rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface focus:border-primary focus:outline-none" value="${escapeHtml(character)}">
        </div>
        <div>
          <label class="font-label-caps text-label-caps text-on-surface-variant uppercase">Pinyin</label>
          <input type="text" id="modal-pinyin" class="w-full mt-xs px-md py-sm rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface focus:border-primary focus:outline-none" value="${escapeHtml(pinyin)}">
        </div>
        <div>
          <label class="font-label-caps text-label-caps text-on-surface-variant uppercase">HSK</label>
          <input type="text" id="modal-hsk" class="w-full mt-xs px-md py-sm rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface focus:border-primary focus:outline-none" value="${escapeHtml(hsk)}">
        </div>
        <div>
          <label class="font-label-caps text-label-caps text-on-surface-variant uppercase">Meaning</label>
          <input type="text" id="modal-meaning" class="w-full mt-xs px-md py-sm rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface focus:border-primary focus:outline-none" placeholder="Optional English meaning">
        </div>
        <div class="flex items-center gap-sm">
          <input type="checkbox" id="modal-add-to-deck" class="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary">
          <label for="modal-add-to-deck" class="font-body-md text-on-surface">Also add to flashcard deck</label>
        </div>
      </div>
    `;

    const overlay = createModalOverlay(title, body);

    overlay.querySelector('.modal-cancel').addEventListener('click', function () {
      overlay.remove();
    });

    overlay.querySelector('.modal-confirm').addEventListener('click', function () {
      const characterVal = $('modal-character').value.trim();
      const pinyinVal = $('modal-pinyin').value.trim();
      const hskVal = $('modal-hsk').value.trim() || hsk;
      const meaningVal = $('modal-meaning').value.trim();
      const addToDeck = $('modal-add-to-deck').checked;

      if (!characterVal) {
        MandoUi.toast('Character is required.', 'error');
        return;
      }

      queueChange('CREATE_NOTE', {
        character: characterVal,
        pinyin: pinyinVal || generatePinyin(characterVal),
        hsk: hskVal,
        parentNoteId: parentNoteId || null,
      });

      if (addToDeck) {
        queueChange('CREATE_FLASHCARD', {
          character: characterVal,
          pinyin: pinyinVal || generatePinyin(characterVal),
          meaning: meaningVal || '—',
          hsk: hskVal,
          category: 'MISCELLANEOUS',
        });
      }

      // Optimistic render.
      const tempNote = {
        noteId: 'TEMP_' + uuid(),
        contentType: 'SCRIPT',
        contentId: state.scriptId,
        character: characterVal,
        pinyin: pinyinVal || generatePinyin(characterVal),
        parentNoteId: parentNoteId || null,
        timestamp: new Date().toISOString(),
        _pending: true,
      };
      state.notes.push(tempNote);
      renderNotes();

      overlay.remove();
    });
  }

  function openEditNoteModal(noteId) {
    const note = state.notes.find(function (n) { return n.noteId === noteId; });
    if (!note) return;

    const body = `
      <div class="space-y-md">
        <div>
          <label class="font-label-caps text-label-caps text-on-surface-variant uppercase">Character</label>
          <input type="text" id="modal-character" class="w-full mt-xs px-md py-sm rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface focus:border-primary focus:outline-none" value="${escapeHtml(note.character)}">
        </div>
        <div>
          <label class="font-label-caps text-label-caps text-on-surface-variant uppercase">Pinyin</label>
          <input type="text" id="modal-pinyin" class="w-full mt-xs px-md py-sm rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface focus:border-primary focus:outline-none" value="${escapeHtml(note.pinyin || '')}">
        </div>
      </div>
    `;

    const overlay = createModalOverlay('Edit Note', body);

    overlay.querySelector('.modal-cancel').addEventListener('click', function () {
      overlay.remove();
    });

    overlay.querySelector('.modal-confirm').addEventListener('click', function () {
      const characterVal = $('modal-character').value.trim();
      const pinyinVal = $('modal-pinyin').value.trim();

      if (!characterVal) {
        MandoUi.toast('Character is required.', 'error');
        return;
      }

      queueChange('UPDATE_NOTE', {
        noteId,
        character: characterVal,
        pinyin: pinyinVal || generatePinyin(characterVal),
      });

      note.character = characterVal;
      note.pinyin = pinyinVal || generatePinyin(characterVal);
      renderNotes();

      overlay.remove();
    });
  }

  function openDetailModal(noteId) {
    const detail = state.noteDetails[noteId] || {};

    const body = `
      <div class="space-y-md">
        <div>
          <label class="font-label-caps text-label-caps text-on-surface-variant uppercase">Explanation</label>
          <textarea id="modal-detail-note" rows="4" class="w-full mt-xs px-md py-sm rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface focus:border-primary focus:outline-none">${escapeHtml(detail.detailedNote || '')}</textarea>
        </div>
        <div>
          <label class="font-label-caps text-label-caps text-on-surface-variant uppercase">Example Sentence</label>
          <input type="text" id="modal-detail-example" class="w-full mt-xs px-md py-sm rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface focus:border-primary focus:outline-none" value="${escapeHtml(detail.exampleSentence || '')}">
        </div>
      </div>
    `;

    const overlay = createModalOverlay('Note Detail', body);

    overlay.querySelector('.modal-cancel').addEventListener('click', function () {
      overlay.remove();
    });

    overlay.querySelector('.modal-confirm').addEventListener('click', async function () {
      const detailedNote = $('modal-detail-note').value.trim();
      const exampleSentence = $('modal-detail-example').value.trim();

      if (!detailedNote) {
        MandoUi.toast('Explanation is required.', 'error');
        return;
      }

      if (state.userId && !state.demoMode) {
        const res = await window.MandoApi.notes.saveScriptDetail(state.userId, state.scriptId, noteId, {
          detailedNote,
          exampleSentence,
        });
        if (!res.ok) {
          MandoUi.toast('Could not save detail. Please retry.', 'error');
          return;
        }
      }

      state.noteDetails[noteId] = {
        noteId,
        detailedNote,
        exampleSentence,
      };
      renderNotes();

      overlay.remove();
    });
  }

  // ---------------------------------------------------------------------------
  // Related content rendering
  // ---------------------------------------------------------------------------

  function renderRelatedScripts() {
    const container = $('related-scripts-container');
    if (!container) return;

    if (state.relatedScripts.length === 0) {
      container.innerHTML = `<p class="text-on-surface-variant">No related scripts found.</p>`;
      return;
    }

    const fallbackThumb = (DEMO_RELATED_SCRIPTS[0] && DEMO_RELATED_SCRIPTS[0].thumbnailUrl) || '';

    container.innerHTML = '';
    state.relatedScripts.forEach(function (script) {
      const typeLabel = SCRIPT_TYPE_LABELS[script.scriptType] || 'Script';
      const updated = formatRelativeDate(script.updatedAt);
      const thumb = scriptThumbnailUrl(script, fallbackThumb);
      const hasThumb = !!thumb;

      const card = document.createElement('a');
      card.href = `script-reader.html?scriptId=${encodeURIComponent(script.scriptId)}`;
      card.className = 'min-w-[280px] max-w-[280px] bg-surface-container-lowest rounded-xl overflow-hidden border border-outline-variant shadow-sm hover:shadow-lg transition-all group block flex flex-col';

      const thumbnailBlock = hasThumb
        ? `<div class="aspect-[16/9] relative overflow-hidden">
             <img class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src="${escapeHtml(thumb)}" alt="${escapeHtml(script.title)}">
             <div class="absolute top-2 left-2 bg-surface/90 backdrop-blur-sm px-sm py-xs rounded text-[10px] font-bold text-primary border border-primary/20">${escapeHtml(typeLabel)}</div>
           </div>`
        : `<div class="aspect-[16/9] bg-surface-container-high flex items-center justify-center relative overflow-hidden">
             <span class="font-character-display text-[64px] text-primary/20 select-none">文</span>
             <div class="absolute top-2 left-2 bg-surface/90 backdrop-blur-sm px-sm py-xs rounded text-[10px] font-bold text-primary border border-primary/20">${escapeHtml(typeLabel)}</div>
           </div>`;

      card.innerHTML = `
        ${thumbnailBlock}
        <div class="p-md flex flex-col flex-1">
          <div class="flex items-center justify-between mb-xs">
            <span class="font-label-caps text-label-caps text-secondary bg-secondary-container px-sm py-xs rounded">${escapeHtml(typeLabel)}</span>
            <div class="flex items-center gap-xs text-on-surface-variant">
              ${script.hasAudio ? '<span class="material-symbols-outlined text-primary text-sm" title="Has audio">volume_up</span>' : ''}
            </div>
          </div>
          <h4 class="font-bold text-on-surface text-base leading-tight group-hover:text-primary transition-colors line-clamp-1">${escapeHtml(script.title)}</h4>
          <p class="text-sm text-on-surface-variant mt-xs line-clamp-2 flex-1">${escapeHtml(script.description || '')}</p>
          ${updated ? `<p class="text-xs text-on-surface-variant/70 mt-md">Updated ${escapeHtml(updated)}</p>` : ''}
        </div>
      `;
      container.appendChild(card);
    });
  }

  function renderRelatedVideos() {
    const container = $('related-videos-container');
    if (!container) return;

    if (state.relatedVideos.length === 0) {
      container.innerHTML = `<p class="text-on-surface-variant">No related videos found.</p>`;
      return;
    }

    const fallbackThumb = (DEMO_RELATED_VIDEOS[0] && DEMO_RELATED_VIDEOS[0].thumbnail) || '';

    container.innerHTML = '';
    state.relatedVideos.forEach(function (video) {
      const hsk = extractHsk(video.title);
      const difficulty = difficultyFromHsk(hsk);
      const duration = formatDuration(video.durationSeconds);
      const thumb = thumbnailUrl(video, fallbackThumb);

      const card = document.createElement('div');
      card.className = 'min-w-[260px] max-w-[260px] bg-surface-container-lowest rounded-xl overflow-hidden border border-outline-variant shadow-sm hover:shadow-lg transition-all group cursor-pointer';
      card.innerHTML = `
        <div class="aspect-video relative overflow-hidden" data-video-id="${escapeHtml(video.videoId)}">
          <img class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src="${escapeHtml(thumb)}" alt="${escapeHtml(video.title)}">
          <div class="absolute top-2 left-2 bg-surface/90 backdrop-blur-sm px-sm py-xs rounded text-[10px] font-bold text-primary border border-primary/20">${escapeHtml(hsk)}</div>
        </div>
        <div class="p-md">
          <h4 class="font-bold text-on-surface text-base leading-tight group-hover:text-primary transition-colors line-clamp-1">${escapeHtml(video.title)}</h4>
          <p class="text-sm text-on-surface-variant mt-xs line-clamp-2">${escapeHtml(video.description || '')}</p>
          <div class="flex items-center gap-md mt-md text-xs text-on-surface-variant">
            ${duration ? `<span class="flex items-center gap-xs"><span class="material-symbols-outlined text-sm">schedule</span> ${escapeHtml(duration)}</span>` : ''}
            <span class="flex items-center gap-xs"><span class="material-symbols-outlined text-sm">bar_chart</span> ${escapeHtml(difficulty)}</span>
          </div>
        </div>
      `;

      card.addEventListener('click', function () {
        window.location.href = `video-session.html?videoId=${encodeURIComponent(video.videoId)}`;
      });

      container.appendChild(card);
    });
  }

  // ---------------------------------------------------------------------------
  // Audio & toolbar
  // ---------------------------------------------------------------------------

  function getAudioElement() {
    return $('script-audio');
  }

  function updateToolbarTime() {
    const audio = getAudioElement();
    const timeEl = $('toolbar-time');
    if (!audio || !timeEl) return;

    const current = audio.currentTime || 0;
    const duration = audio.duration || 0;
    timeEl.textContent = `${formatTime(current)} / ${formatTime(duration)}`;

    const progressBar = $('toolbar-progress-bar');
    if (progressBar && duration) {
      progressBar.style.width = `${(current / duration) * 100}%`;
    }
  }

  function updatePlayButton() {
    const btn = $('toolbar-play');
    if (!btn) return;
    const icon = state.isPlaying ? 'pause' : 'play_arrow';
    btn.innerHTML = `<span class="material-symbols-outlined">${icon}</span>`;
  }

  function initAudio() {
    const audio = getAudioElement();
    if (!audio) return;

    if (state.audioUrl) {
      audio.src = state.audioUrl;
    }

    audio.addEventListener('timeupdate', updateToolbarTime);
    audio.addEventListener('loadedmetadata', updateToolbarTime);
    audio.addEventListener('play', function () {
      state.isPlaying = true;
      updatePlayButton();
    });
    audio.addEventListener('pause', function () {
      state.isPlaying = false;
      updatePlayButton();
    });
    audio.addEventListener('ended', function () {
      state.isPlaying = false;
      updatePlayButton();
    });

    const playBtn = $('toolbar-play');
    if (playBtn) {
      playBtn.addEventListener('click', function () {
        if (!state.audioUrl) {
          if (state.demoMode) {
            const index = state.activeLineIndex >= 0 ? state.activeLineIndex : 0;
            playLineAudio(index);
          } else {
            MandoUi.toast('No audio available for this script.', 'info');
          }
          return;
        }
        if (state.isPlaying) {
          audio.pause();
        } else {
          audio.play().catch(function (err) {
            console.warn('Audio playback failed', err);
            MandoUi.toast('Could not play audio.', 'error');
          });
        }
      });
    }

    const progressContainer = $('toolbar-progress-container');
    if (progressContainer) {
      progressContainer.addEventListener('click', function (e) {
        if (!audio.duration || !state.audioUrl) return;
        const rect = progressContainer.getBoundingClientRect();
        const ratio = (e.clientX - rect.left) / rect.width;
        audio.currentTime = ratio * audio.duration;
      });
    }

    const pinyinBtn = $('toolbar-pinyin');
    if (pinyinBtn) {
      pinyinBtn.addEventListener('click', function () {
        setReaderMode(state.readerMode === 'py' ? 'zh' : 'py');
      });
    }

    const translateBtn = $('toolbar-translate');
    if (translateBtn) {
      translateBtn.addEventListener('click', function () {
        setReaderMode(state.readerMode === 'en' ? 'zh' : 'en');
      });
    }

    const volumeBtn = $('toolbar-volume');
    if (volumeBtn) {
      volumeBtn.addEventListener('click', function () {
        if (!audio) return;
        audio.muted = !audio.muted;
        volumeBtn.innerHTML = `<span class="material-symbols-outlined">${audio.muted ? 'volume_off' : 'volume_up'}</span>`;
      });
    }
  }

  function speakLine(text) {
    if (!window.speechSynthesis) {
      MandoUi.toast('Text-to-speech is not supported in this browser.', 'error');
      return;
    }

    // Cancel any ongoing speech so repeated clicks don't queue up endlessly.
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.9;

    const voices = window.speechSynthesis.getVoices();
    const zhVoice = voices.find(function (v) { return v.lang && v.lang.startsWith('zh'); });
    if (zhVoice) utterance.voice = zhVoice;

    window.speechSynthesis.speak(utterance);
  }

  function playLineAudio(index) {
    const line = state.lines[index];
    if (!line) return;

    // Demo fallback: use the browser's speech synthesis when no real audio is attached.
    if (!state.audioUrl) {
      if (state.demoMode) {
        speakLine(line.chinese);
      } else {
        MandoUi.toast('No audio available for this script.', 'info');
      }
      return;
    }

    // We don't have per-line timestamps, so we just play/pause the full audio.
    const audio = getAudioElement();
    if (!audio) return;

    if (state.isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(function (err) {
        console.warn('Line audio playback failed', err);
        MandoUi.toast('Could not play audio.', 'error');
      });
    }
  }

  function updateToolbarVisibility() {
    const toolbar = $('reader-toolbar');
    if (!toolbar) return;

    // Show the toolbar when real audio exists, or in demo mode where it
    // doubles as a text-to-speech controller.
    if (state.audioUrl || state.demoMode) {
      toolbar.classList.remove('hidden');
    } else {
      toolbar.classList.add('hidden');
    }
  }

  // ---------------------------------------------------------------------------
  // Event listeners
  // ---------------------------------------------------------------------------

  function initEventListeners() {
    // Reader mode toggles.
    document.querySelectorAll('.reader-mode-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setReaderMode(btn.dataset.mode);
      });
    });

    // Font size controls.
    const fontSizeDecrease = $('font-size-decrease');
    if (fontSizeDecrease) {
      fontSizeDecrease.addEventListener('click', function () { adjustScriptFontSize(-1); });
    }
    const fontSizeIncrease = $('font-size-increase');
    if (fontSizeIncrease) {
      fontSizeIncrease.addEventListener('click', function () { adjustScriptFontSize(1); });
    }

    // New note button.
    const newNoteBtn = $('new-note-btn');
    if (newNoteBtn) {
      newNoteBtn.addEventListener('click', function () {
        openSaveWordModal('', '', null);
      });
    }

    // Save notes button.
    const saveBtn = $('save-notes-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', flushPendingChanges);
    }

    // Ctrl/Cmd + S shortcut.
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        flushPendingChanges();
      }
    });

    // Back to dashboard.
    const backBtn = $('topnav-back');
    if (backBtn) {
      backBtn.addEventListener('click', function () {
        window.location.href = '../index.html';
      });
    }

    // Beforeunload warning.
    window.addEventListener('beforeunload', function (e) {
      if (hasPendingChanges()) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Page initialization
  // ---------------------------------------------------------------------------

  async function initPage() {
    // No user id or no specific script requested: run in demo mode so the
    // page always renders useful content. The full catalog view is still a
    // future TODO (see SCRIPTS_MVP_PLAN §5.3).
    if (!state.userId || !state.scriptId) {
      state.demoMode = true;
      state.scriptId = DEMO_SCRIPT_ID;
    }

    persistLastScriptId(state.scriptId);

    // Show skeletons or loading state.
    setText('script-title', 'Loading script…');
    setText('script-description', 'Please wait while we load the script.');

    try {
      let metaOk = await loadScriptMeta();

      // If the requested script does not exist on the backend, fall back to
      // demo content rather than rendering a broken reader.
      if (!metaOk && !state.demoMode) {
        console.warn(`Script ${state.scriptId} not found; falling back to demo.`);
        state.demoMode = true;
        state.scriptId = DEMO_SCRIPT_ID;
        persistLastScriptId(state.scriptId);
        metaOk = await loadScriptMeta();
      }

      await Promise.all([
        loadScriptContent(),
        loadAudioUrl(),
        loadNotes(),
      ]);
      await Promise.all([
        loadRelatedScripts(),
        loadRelatedVideos(),
        loadScriptLibrary(),
      ]);

      renderHeader();
      renderAccentChar();
      renderLines();
      renderReaderModeToggles();
      renderNotes();
      renderRelatedScripts();
      renderRelatedVideos();
      updateToolbarVisibility();
      initAudio();
      updateSaveButtonState();
      sendUserActive();
    } catch (err) {
      console.error('Failed to initialize script reader', err);
      renderStatus('Unable to load the script. Please try again.', true);
    }
  }

  // ---------------------------------------------------------------------------
  // Bootstrap
  // ---------------------------------------------------------------------------

  if (window.MandoShell) {
    window.MandoShell.initMobileDrawer({});
    window.MandoShell.renderSidebarProfile();
  }

  initEventListeners();
  initPage();
})();
