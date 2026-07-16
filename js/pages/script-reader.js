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

  const DEMO_SCRIPT_BODY = `是啊，你就说来我们公司面试的这几个吧……
*Shì a, nǐ jiù shuō lái wǒmen gōngsī miànshì de zhè jǐ gè ba.*
> "Yeah, just take these few people who came to our company for interviews as an example..."

行，我先说第一个。
*Xíng, wǒ xiān shuō dì yī gè.*
> "Okay, I will start with the first one."

他的简历看起来不错。
*Tā de jiǎnlì kàn qǐlái búcuò.*
> "His resume looks pretty good."

不过，他的中文水平怎么样？
*Búguò, tā de Zhōngwén shuǐpíng zěnme yàng?*
> "But how is his Chinese level?"

回国之后，我想要更多的时间陪父母。
*Huíguó zhīhòu, wǒ xiǎng yào gèng duō de shíjiān péi fùmǔ.*
> "After returning home, I want more time to accompany my parents."`;

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
    escapeHtml,
    extractHsk,
    inferHskLabel,
    difficultyFromHsk,
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

    return DEMO_SCRIPT_ID;
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
   * Parse the structured Markdown body into reader lines.
   *
   * Expected format per block (separated by blank lines):
   *   Chinese text
   *   *pinyin with tone marks*
   *   > "English translation"
   */
  function parseScriptBody(body) {
    if (!body) return [];

    const blocks = body.split(/\n\s*\n/);
    const lines = [];
    let lineNumber = 1;

    blocks.forEach(function (block) {
      const rawLines = block.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
      if (rawLines.length === 0) return;

      const chinese = rawLines[0];
      let pinyin = '';
      let english = '';

      rawLines.slice(1).forEach(function (line) {
        if (line.startsWith('*') && line.endsWith('*') && line.length > 2) {
          pinyin = line.slice(1, -1).trim();
        } else if (line.startsWith('>')) {
          english = line.slice(1).trim().replace(/^["']|["']$/g, '');
        }
      });

      if (!pinyin) {
        pinyin = generatePinyin(chinese);
      }

      lines.push({
        lineNumber: lineNumber++,
        chinese: chinese,
        pinyin: pinyin,
        english: english || 'Translation not available.',
      });
    });

    return lines;
  }

  function getHskFromScript(script) {
    return extractHsk(script && script.title, 'HSK 4');
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
    btn.disabled = count === 0 || state.isSaving;
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
      state.lines = parseScriptBody(DEMO_SCRIPT_BODY);
      return true;
    }

    const res = await window.MandoApi.scripts.getContent(state.scriptId);
    if (res.ok && res.data && typeof res.data.body === 'string') {
      state.lines = parseScriptBody(res.data.body);
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

  async function loadRelatedScripts() {
    const currentType = state.script && state.script.scriptType;
    if (!currentType) {
      state.relatedScripts = DEMO_RELATED_SCRIPTS.map(function (s) { return { ...s }; });
      return false;
    }

    if (state.demoMode) {
      state.relatedScripts = DEMO_RELATED_SCRIPTS.map(function (s) { return { ...s }; });
      return true;
    }

    const res = await window.MandoApi.scripts.listReady({ pageSize: 10, scriptType: currentType });
    if (res.ok && res.data && Array.isArray(res.data.scripts)) {
      state.relatedScripts = res.data.scripts
        .filter(function (s) { return s.scriptId !== state.scriptId; })
        .slice(0, 5);
      return true;
    }

    state.relatedScripts = DEMO_RELATED_SCRIPTS.map(function (s) { return { ...s }; });
    return false;
  }

  async function loadRelatedVideos() {
    const hsk = getHskFromScript(state.script);
    const hskLevel = hsk.replace(/\D/g, '');

    if (state.demoMode) {
      state.relatedVideos = DEMO_RELATED_VIDEOS.map(function (v) { return { ...v }; });
      return true;
    }

    const res = await window.MandoApi.videos.listReady({ pageSize: 10 });
    if (res.ok && res.data && Array.isArray(res.data.videos)) {
      state.relatedVideos = res.data.videos
        .filter(function (v) {
          const videoHsk = extractHsk(v.title, '').replace(/\D/g, '');
          return videoHsk === hskLevel;
        })
        .slice(0, 5);
      return true;
    }

    state.relatedVideos = DEMO_RELATED_VIDEOS.map(function (v) { return { ...v }; });
    return false;
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

    container.innerHTML = state.lines.map(function (line, index) {
      const isActive = index === state.activeLineIndex;
      return `
        <div class="script-line group cursor-pointer p-md hover:bg-surface-container-low rounded-2xl transition-all duration-300 ${isActive ? 'bg-surface-container-low' : ''}" data-index="${index}">
          <div class="flex flex-col items-center">
            <div class="pinyin font-body-md text-secondary mb-xs transform -translate-y-1 ${pyDisplay}">${escapeHtml(line.pinyin)}</div>
            <div class="font-character-display text-[32px] md:text-[40px] text-on-surface leading-relaxed text-center ${zhDisplay}">
              <button class="script-play-line inline-block mr-sm text-primary hover:scale-110 transition-transform align-middle" data-index="${index}" title="Play sentence audio">
                <span class="material-symbols-outlined text-[24px]">play_circle</span>
              </button>
              ${escapeHtml(line.chinese)}
              <button class="script-lookup-line inline-block ml-sm text-primary hover:scale-110 transition-transform align-middle" data-index="${index}" title="Look up word">
                <span class="material-symbols-outlined text-[24px]">search</span>
              </button>
            </div>
            <div class="mt-md font-body-md text-on-surface-variant italic ${enDisplay}">
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

    container.innerHTML = state.relatedScripts.map(function (script) {
      return `
        <a href="script-reader.html?scriptId=${encodeURIComponent(script.scriptId)}" class="min-w-[300px] bg-surface-container rounded-2xl p-md border border-outline-variant hover:scale-[1.02] transition-transform cursor-pointer block">
          <span class="font-label-caps text-label-caps text-secondary">${escapeHtml(SCRIPT_TYPE_LABELS[script.scriptType] || 'Script')}</span>
          <h4 class="font-bold mt-xs text-on-surface">${escapeHtml(script.title)}</h4>
          ${script.hasAudio ? '<span class="material-symbols-outlined text-primary text-sm mt-xs">volume_up</span>' : ''}
        </a>
      `;
    }).join('');
  }

  function renderRelatedVideos() {
    const container = $('related-videos-container');
    if (!container) return;

    if (state.relatedVideos.length === 0) {
      container.innerHTML = `<p class="text-on-surface-variant">No related videos found.</p>`;
      return;
    }

    container.innerHTML = state.relatedVideos.map(function (video) {
      const duration = video.durationSeconds ? `${Math.floor(video.durationSeconds / 60)} min` : '';
      return `
        <a href="video-session.html?videoId=${encodeURIComponent(video.videoId)}" class="min-w-[320px] aspect-video bg-surface-container-highest rounded-2xl overflow-hidden relative group block">
          <img src="${escapeHtml(video.thumbnail || '')}" alt="${escapeHtml(video.title)}" class="w-full h-full object-cover">
          <div class="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
            <span class="material-symbols-outlined text-white text-[48px]">play_circle</span>
          </div>
          <div class="absolute bottom-0 left-0 right-0 p-md bg-gradient-to-t from-black/60 to-transparent">
            <p class="text-white font-bold">${escapeHtml(video.title)}</p>
            ${duration ? `<p class="text-white/80 text-sm">${escapeHtml(duration)}</p>` : ''}
          </div>
        </a>
      `;
    }).join('');
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
          MandoUi.toast('No audio available for this script.', 'info');
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

  function playLineAudio(index) {
    if (!state.audioUrl) {
      MandoUi.toast('No audio available for this script.', 'info');
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

    if (!state.audioUrl) {
      toolbar.classList.add('hidden');
    } else {
      toolbar.classList.remove('hidden');
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
    state.demoMode = !state.userId;

    if (state.demoMode) {
      state.scriptId = DEMO_SCRIPT_ID;
    }

    persistLastScriptId(state.scriptId);

    // Show skeletons or loading state.
    setText('script-title', 'Loading script…');
    setText('script-description', 'Please wait while we load the script.');

    try {
      await loadScriptMeta();
      await Promise.all([
        loadScriptContent(),
        loadAudioUrl(),
        loadNotes(),
      ]);
      await Promise.all([
        loadRelatedScripts(),
        loadRelatedVideos(),
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
