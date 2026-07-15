/**
 * Video Session page handler.
 *
 * Wires the video session page to:
 * - MandoApi.videos   (current video, video library, related lessons)
 * - MandoApi.notes    (session notes + details)
 * - MandoApi.batch    (Save All / pending changes)
 * - MandoApi.stats    (USER_ACTIVE event)
 *
 * Keeps all markup intact; only dynamic text/attributes are updated via ids.
 */

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------

  const DEMO_VIDEO_ID = 'DEMO_HSK3_001';

  const FALLBACK_VIDEO = {
    videoId: DEMO_VIDEO_ID,
    title: 'Class Review — HSK3',
    description: 'A practical HSK 3 review covering workplace conversations and polite responses.',
    s3Bucket: '',
    s3Key: '',
    durationSeconds: null,
    thumbnail:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuC4eZ5ZuRAFIKQTjbn0hO4ruI2tn5fnyB0N4-5DIeKxdK50dSg73h64_MnY3n4r_tQKSlvbaww9aKXwayvS5-pLAARtxARNAqM_gcuRtPj5zL9OEYrVSJBs-brsmnGJpw6Zw-WJKSGcuWxyrAyuP1--vX66-UD0KcSJb-S2778lG92KRHPhAVI5js9CouA2xB4jgYpeuhzxNlvznmsUR_-bhxKOF_Ssl1T1ZgsRIfd6-GKmd0cdHgwzFCF-RJv_l6L9ErOetGJ5B6w',
  };

  const FALLBACK_NOTES = [
    {
      noteId: 'NOTE_DEMO_001',
      sessionId: DEMO_VIDEO_ID,
      character: '面试',
      pinyin: 'miànshì',
      parentNoteId: null,
      timestamp: new Date().toISOString(),
    },
    {
      noteId: 'NOTE_DEMO_002',
      sessionId: DEMO_VIDEO_ID,
      character: '面',
      pinyin: 'miàn',
      parentNoteId: 'NOTE_DEMO_001',
      timestamp: new Date().toISOString(),
    },
    {
      noteId: 'NOTE_DEMO_003',
      sessionId: DEMO_VIDEO_ID,
      character: '试',
      pinyin: 'shì',
      parentNoteId: 'NOTE_DEMO_001',
      timestamp: new Date().toISOString(),
    },
    {
      noteId: 'NOTE_DEMO_004',
      sessionId: DEMO_VIDEO_ID,
      character: '公司',
      pinyin: 'gōngsī',
      parentNoteId: null,
      timestamp: new Date().toISOString(),
    },
  ];

  const FALLBACK_NOTE_DETAILS = {
    NOTE_DEMO_001: {
      noteId: 'NOTE_DEMO_001',
      sessionId: DEMO_VIDEO_ID,
      detailedNote: 'A formal meeting to assess whether someone is suitable for a job.',
      exampleSentence: '明天我要去公司面试。',
    },
    NOTE_DEMO_004: {
      noteId: 'NOTE_DEMO_004',
      sessionId: DEMO_VIDEO_ID,
      detailedNote: 'A company or business organization.',
      exampleSentence: '这家公司的环境很好。',
    },
  };

  const FALLBACK_RELATED = [
    {
      videoId: 'DEMO_REL_001',
      title: 'HSK3 Travel Vocabulary',
      description: 'Essential words for buying tickets and asking directions.',
      durationSeconds: 920,
      thumbnail:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuALPPBwB1vBOKHzIbtsoVGBa_bum56PS9oqIh0oWUqiNM-KaS9sWtDhpXh5zA3uZqv865ojan5XYzDMepgcKPdE9OgY7CdPmdiTl19p7iM8P4Pc-UlnAjGp1prxbBkdWYpCJ60wWp3cwEhdqe9KS36LZX4xml9mQDSKvPEEzu60YJFUfv6GHbwyhZTg5NDM7SshzRNhw2fOC5bbfTUq9KL5hmPslBa1B1F_6PqGS4_vCXU4P9KjDOhL',
    },
    {
      videoId: 'DEMO_REL_002',
      title: 'HSK3 Daily Routine',
      description: 'Talk about your morning and evening habits in Mandarin.',
      durationSeconds: 780,
      thumbnail:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDBe7z8onD2RVf4Vx7gU8UPSX-2jypiPSsnYxmbQbllG12Rx8n17SMQgrTRasaD8J0XcvRwPUMjaedaMgCIPcH3PrglsJsZvYiI34C29P_kB2ZAVDY3Rly7Dm_QJjZI2P0TwC-RsCZgY5iTOzUN81uRKi_1RSrSQxDn2siXZsW58rHX_0PhIGuiNTYjaxC8kY-FgV69rFLUHpMhJMYZ_4dqTZ4Dulp0bIO42AEi3CxpGQGAxtUr7vDy',
    },
    {
      videoId: 'DEMO_REL_003',
      title: 'HSK3 Dining Out',
      description: 'Order food, ask for the bill, and handle restaurant conversations.',
      durationSeconds: 840,
      thumbnail:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBtsHkqvb0kreVEcLM37x6dZy_eZdxFbcsgAXx7750hKmpAqu0dpBf_dE9a6rCyk5VZXX1hYtZSbpgB6qOgfEYafyLwrZRnzTyhMJvC-Nw2_DiyMnYofW2E47m8TqxnEU0sUNStEj1_8hw4OrdQuQxhc7neG8Ieui6R7n-bqXdddaYGdimA_K29_j-fKrCHq_AKnzkNOi_BH1tVF9_f0LSw3uU8oa---59DRuZJsvDnjkSZHeWAszlm',
    },
  ];

  const SCRIPT_FIXTURE = [
    { t: 0, zh: '是啊，你就说来我们公司面试的这几个吧。', py: 'Shì a, nǐ jiù shuō lái wǒmen gōngsī miànshì de zhè jǐ gè ba.', en: "Yeah, let's talk about the ones who came to interview at our company." },
    { t: 6, zh: '行，我先说第一个。', py: 'Xíng, wǒ xiān shuō dì yī gè.', en: 'Okay, I will start with the first one.' },
    { t: 10, zh: '他的简历看起来不错。', py: 'Tā de jiǎnlì kàn qǐlái búcuò.', en: 'His resume looks pretty good.' },
    { t: 14, zh: '工作经验也丰富。', py: 'Gōngzuò jīngyàn yě fēngfù.', en: 'He also has rich work experience.' },
    { t: 18, zh: '不过，他的中文水平怎么样？', py: 'Búguò, tā de Zhōngwén shuǐpíng zěnme yàng?', en: "But how is his Chinese level?" },
    { t: 23, zh: '他说他能用中文开会。', py: 'Tā shuō tā néng yòng Zhōngwén kāihuì.', en: 'He said he can attend meetings in Chinese.' },
    { t: 28, zh: '那应该没问题。', py: 'Nà yīnggāi méi wèntí.', en: 'Then it should be fine.' },
    { t: 32, zh: '我们再看看下一个。', py: 'Wǒmen zài kànkan xià yī gè.', en: "Let's look at the next one." },
  ];

  // ---------------------------------------------------------------------------
  // Identity helpers
  // ---------------------------------------------------------------------------

  function safeLocalStorageGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function safeLocalStorageSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (e) {
      // Ignore (private browsing, quota exceeded, etc.)
    }
  }

  function getUserId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('userId') || safeLocalStorageGet('mando.userId') || null;
  }

  function getVideoId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('videoId') || safeLocalStorageGet('mando.lastVideoId') || DEMO_VIDEO_ID;
  }

  function uuid() {
    if (window.crypto && window.crypto.randomUUID) {
      return window.crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  // ---------------------------------------------------------------------------
  // Formatting helpers
  // ---------------------------------------------------------------------------

  function $(id) {
    return document.getElementById(id);
  }

  function setText(id, text) {
    const el = $(id);
    if (el) el.textContent = text;
  }

  function setHtml(id, html) {
    const el = $(id);
    if (el) el.innerHTML = html;
  }

  function formatTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) seconds = 0;
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function extractHsk(title) {
    if (!title) return 'HSK 3';
    const match = title.match(/HSK\s?(\d)/i);
    if (match) return `HSK ${match[1]}`;
    return 'HSK 3';
  }

  function difficultyFromHsk(hsk) {
    const level = parseInt(hsk.replace(/\D/g, ''), 10) || 3;
    if (level <= 2) return 'Beginner';
    if (level <= 4) return 'Intermediate';
    return 'Advanced';
  }

  function thumbnailUrl(video) {
    if (video.thumbnail) return video.thumbnail;
    if (video.s3Bucket && video.s3Key) {
      return `https://${video.s3Bucket}.s3.amazonaws.com/${video.s3Key}`;
    }
    return FALLBACK_VIDEO.thumbnail;
  }

  function videoSourceUrl(video) {
    if (video.s3Bucket && video.s3Key) {
      return `https://${video.s3Bucket}.s3.amazonaws.com/${video.s3Key}`;
    }
    return '';
  }

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const state = {
    userId: getUserId(),
    videoId: getVideoId(),
    sessionId: getVideoId(),
    video: null,
    notes: [],
    noteDetails: {},
    pendingChanges: [],
    isSaving: false,
    saveError: null,
    allVideos: [],
    relatedVideos: [],
    scriptMode: 'zh',
    activeScriptIndex: -1,
    demoMode: false,
  };

  // Persist ids for subsequent visits / navigation.
  if (state.userId) safeLocalStorageSet('mando.userId', state.userId);
  safeLocalStorageSet('mando.lastVideoId', state.videoId);

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

  function buildBatchPayload() {
    const payload = { sessionId: state.sessionId };
    const mapping = []; // { changeId, operation, index }

    state.pendingChanges.forEach(function (change) {
      if (change.operation === 'CREATE_NOTE') {
        payload.createNotes = payload.createNotes || [];
        const index = payload.createNotes.length;
        payload.createNotes.push({
          character: change.data.character,
          pinyin: change.data.pinyin || '',
          hsk: change.data.hsk || 'HSK3',
          parentNoteId: change.data.parentNoteId || null,
          sessionId: change.data.sessionId || state.sessionId,
        });
        mapping.push({ changeId: change._id, operation: 'CREATE_NOTE', index: index });
      } else if (change.operation === 'UPDATE_NOTE') {
        payload.updateNotes = payload.updateNotes || [];
        const index = payload.updateNotes.length;
        payload.updateNotes.push({
          sessionId: change.data.sessionId || state.sessionId,
          noteId: change.data.noteId,
          character: change.data.character,
          pinyin: change.data.pinyin || '',
        });
        mapping.push({ changeId: change._id, operation: 'UPDATE_NOTE', index: index });
      } else if (change.operation === 'DELETE_NOTE') {
        payload.deleteNotes = payload.deleteNotes || [];
        const index = payload.deleteNotes.length;
        payload.deleteNotes.push({
          sessionId: change.data.sessionId || state.sessionId,
          noteId: change.data.noteId,
        });
        mapping.push({ changeId: change._id, operation: 'DELETE_NOTE', index: index });
      }
    });

    return { payload, mapping };
  }

  async function flushPendingChanges() {
    if (!state.userId || state.pendingChanges.length === 0) return;

    state.isSaving = true;
    state.saveError = null;
    updateSaveButtonState();

    const { payload, mapping } = buildBatchPayload();
    const res = await window.MandoApi.batch.flush(state.userId, payload);

    state.isSaving = false;

    if (!res.ok) {
      state.saveError = res.error || { message: 'Save failed' };
      showToast(state.saveError.message || 'Save failed. Please retry.', 'error');
      updateSaveButtonState();
      return;
    }

    // Map per-item results back to pending changes using operation + index.
    const results = res.data && res.data.results ? res.data.results : [];
    const succeededIds = [];

    results.forEach(function (result) {
      if (result.status !== 'SUCCESS') return;
      const mapItem = mapping.find(function (m) {
        return m.operation === result.operation && m.index === result.index;
      });
      if (mapItem) succeededIds.push(mapItem.changeId);
    });

    const failedCount = state.pendingChanges.length - succeededIds.length;
    state.pendingChanges = state.pendingChanges.filter(function (c) {
      return !succeededIds.includes(c._id);
    });

    if (failedCount > 0) {
      showToast(`${failedCount} change(s) could not be saved.`, 'error');
    } else {
      showToast('Notes saved successfully.', 'success');
    }

    updateSaveButtonState();

    // Refresh notes to get real IDs for created items and discard deletes.
    await loadNotes();
    renderNotes();
  }

  // ---------------------------------------------------------------------------
  // Toast (non-blocking feedback)
  // ---------------------------------------------------------------------------

  function showToast(message, type) {
    const existing = document.querySelector('.mando-toast');
    if (existing) existing.remove();

    const el = document.createElement('div');
    el.className =
      'mando-toast fixed bottom-lg right-lg z-[100] px-md py-sm rounded-xl shadow-lg text-body-md font-medium transition-opacity duration-300 ' +
      (type === 'error'
        ? 'bg-error text-on-error'
        : 'bg-primary text-on-primary');
    el.textContent = message;
    document.body.appendChild(el);

    setTimeout(function () {
      el.style.opacity = '0';
      setTimeout(function () {
        el.remove();
      }, 300);
    }, 3000);
  }

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------

  async function loadCurrentVideo() {
    const res = await window.MandoApi.videos.getReady(state.videoId);
    if (res.ok && res.data && res.data.video) {
      state.video = res.data.video;
    } else {
      state.video = { ...FALLBACK_VIDEO, videoId: state.videoId };
    }
  }

  async function loadNotes() {
    if (!state.userId) {
      state.notes = FALLBACK_NOTES.map(function (n) { return { ...n }; });
      state.noteDetails = { ...FALLBACK_NOTE_DETAILS };
      return;
    }

    const res = await window.MandoApi.notes.listSession(state.userId, state.sessionId, true);
    if (res.ok && res.data) {
      state.notes = Array.isArray(res.data.notes) ? res.data.notes : [];
      state.noteDetails = res.data.noteDetails || {};
    } else {
      state.notes = FALLBACK_NOTES.map(function (n) { return { ...n }; });
      state.noteDetails = { ...FALLBACK_NOTE_DETAILS };
    }
  }

  async function loadVideoLibrary() {
    const res = await window.MandoApi.videos.listReady({ pageSize: 50 });
    if (res.ok && res.data && Array.isArray(res.data.videos)) {
      state.allVideos = res.data.videos;
    } else {
      state.allVideos = [
        { videoId: 'DEMO_LIB_001', title: 'HSK1 Greetings', durationSeconds: 300 },
        { videoId: 'DEMO_LIB_002', title: 'HSK2 Shopping', durationSeconds: 420 },
        { videoId: 'DEMO_LIB_003', title: 'HSK3 Class Review', durationSeconds: 540 },
        { videoId: 'DEMO_LIB_004', title: 'HSK4 Workplace', durationSeconds: 600 },
        { videoId: 'DEMO_LIB_005', title: 'HSK5 Debate', durationSeconds: 720 },
        { videoId: 'DEMO_LIB_006', title: 'HSK6 Media', durationSeconds: 900 },
      ];
    }
  }

  async function loadRelatedVideos() {
    const res = await window.MandoApi.videos.listReady({ pageSize: 10 });
    if (res.ok && res.data && Array.isArray(res.data.videos)) {
      state.relatedVideos = res.data.videos
        .filter(function (v) {
          return v.videoId !== state.videoId;
        })
        .slice(0, 5);
    } else {
      state.relatedVideos = FALLBACK_RELATED.map(function (v) { return { ...v }; });
    }
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
  // Rendering: breadcrumbs, titles
  // ---------------------------------------------------------------------------

  function renderMeta() {
    const video = state.video || FALLBACK_VIDEO;
    const hsk = extractHsk(video.title);

    setText('breadcrumb-hsk', hsk);
    setText('breadcrumb-lesson', video.title || 'Class Review');
    document.title = `MandoLearning | ${video.title || 'Video Session'}`;
  }

  // ---------------------------------------------------------------------------
  // Rendering: video player
  // ---------------------------------------------------------------------------

  function initVideoPlayer() {
    const video = $('video-player');
    if (!video) return;

    updateVideoSource(video);

    if (video._mandoPlayerSetup) return;
    video._mandoPlayerSetup = true;

    const playBtn = $('video-play-btn');
    const progressBar = $('video-progress-bar');
    const progressContainer = $('video-progress-container');
    const timeDisplay = $('video-time');
    const fullscreenBtn = $('video-fullscreen-btn');
    const settingsBtn = $('video-settings-btn');

    function updateTime() {
      const current = video.currentTime || 0;
      const duration = video.duration || 0;
      if (timeDisplay) timeDisplay.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
      if (progressBar && duration) {
        progressBar.style.width = `${(current / duration) * 100}%`;
      }
      updateSubtitleOverlay(current);
      updateScriptHighlight(current);
      saveProgress(current, duration);
    }

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', updateTime);
    video.addEventListener('play', function () {
      if (playBtn) playBtn.textContent = 'pause';
    });
    video.addEventListener('pause', function () {
      if (playBtn) playBtn.textContent = 'play_arrow';
    });
    video.addEventListener('ended', function () {
      if (playBtn) playBtn.textContent = 'replay';
    });

    if (playBtn) {
      playBtn.addEventListener('click', function () {
        if (video.paused) {
          video.play().catch(function () {});
        } else {
          video.pause();
        }
      });
    }

    if (progressContainer) {
      progressContainer.addEventListener('click', function (e) {
        const rect = progressContainer.getBoundingClientRect();
        const ratio = (e.clientX - rect.left) / rect.width;
        if (video.duration) {
          video.currentTime = ratio * video.duration;
        }
      });
    }

    if (fullscreenBtn) {
      fullscreenBtn.addEventListener('click', function () {
        if (video.requestFullscreen) {
          video.requestFullscreen();
        } else if (video.webkitRequestFullscreen) {
          video.webkitRequestFullscreen();
        }
      });
    }

    if (settingsBtn) {
      settingsBtn.addEventListener('click', function () {
        // Phase 2: native controls only. Future phase can add a settings panel here.
        showToast('Playback settings will be available in a future update.', 'info');
      });
    }

    window.addEventListener('beforeunload', function () {
      saveProgress(video.currentTime, video.duration);
    });
  }

  function updateVideoSource(video) {
    const src = videoSourceUrl(state.video || FALLBACK_VIDEO);
    if (!src) return;
    if (video.src !== src) {
      const wasPlaying = !video.paused && video.currentTime > 0;
      const currentTime = video.currentTime || 0;
      video.src = src;
      if (wasPlaying && currentTime > 0) {
        video.currentTime = currentTime;
        video.play().catch(function () {});
      }
    }
  }

  function saveProgress(current, duration) {
    if (!state.videoId || !isFinite(current) || current <= 0) return;
    try {
      const percent = duration ? Math.round((current / duration) * 100) : 0;
      const payload = {
        videoId: state.videoId,
        currentTime: current,
        duration: duration || 0,
        percent: percent,
        updatedAt: new Date().toISOString(),
      };
      safeLocalStorageSet(`mando.progress.${state.videoId}`, JSON.stringify(payload));
    } catch (e) {
      // Ignore
    }
  }

  function updateSubtitleOverlay(currentTime) {
    const hanzi = $('subtitle-hanzi');
    const pinyin = $('subtitle-pinyin');
    if (!hanzi || !pinyin) return;

    // Find the line whose timestamp is closest without exceeding currentTime + 2s.
    let active = SCRIPT_FIXTURE[0];
    for (let i = 0; i < SCRIPT_FIXTURE.length; i++) {
      if (currentTime >= SCRIPT_FIXTURE[i].t) {
        active = SCRIPT_FIXTURE[i];
      }
    }

    hanzi.textContent = active.zh;
    pinyin.textContent = active.py;
  }

  // ---------------------------------------------------------------------------
  // Rendering: notes tree
  // ---------------------------------------------------------------------------

  function buildNoteTree() {
    const roots = [];
    const childrenMap = {};

    state.notes.forEach(function (note) {
      if (note._pendingDelete) return;
      if (note.parentNoteId === null || note.parentNoteId === undefined) {
        roots.push(note);
      } else {
        childrenMap[note.parentNoteId] = childrenMap[note.parentNoteId] || [];
        childrenMap[note.parentNoteId].push(note);
      }
    });

    return { roots, childrenMap };
  }

  function renderNotes() {
    const container = $('notes-container');
    if (!container) return;

    const { roots, childrenMap } = buildNoteTree();

    if (roots.length === 0) {
      container.innerHTML = `
        <div class="text-center py-xl text-on-surface-variant">
          <span class="material-symbols-outlined text-4xl mb-sm">notes</span>
          <p class="font-body-md">No notes yet. Click "New Note" to capture vocabulary.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = '';
    roots.forEach(function (note) {
      container.appendChild(createNoteNode(note, childrenMap, 0));
    });
  }

  function createNoteNode(note, childrenMap, depth) {
    const isChild = depth > 0;
    const children = childrenMap[note.noteId] || [];
    const detail = state.noteDetails[note.noteId];
    const hasDetail = detail && (detail.detailedNote || detail.exampleSentence);
    const isPending = note._pendingCreate || note._pendingUpdate || note._pendingDelete;

    const wrapper = document.createElement('div');
    wrapper.className = `note-node rounded-2xl border transition-all ${
      isPending
        ? 'border-primary/40 bg-primary-container/10'
        : 'border-outline-variant/40 bg-surface-container-lowest'
    } ${depth > 0 ? 'ml-lg mt-sm' : ''}`;

    const content = document.createElement('div');
    content.className = 'p-md flex items-start gap-md';

    const indent = depth > 0
      ? `<div class="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center text-xs font-bold shrink-0">${depth}</div>`
      : `<div class="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-lg font-bold shrink-0">${escapeHtml(note.character ? note.character.charAt(0) : '·')}</div>`;

    const detailIcon = hasDetail ? 'sticky_note' : 'sticky_note_2';

    content.innerHTML = `
      ${indent}
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-sm flex-wrap">
          <span class="note-character font-character-display text-2xl text-on-surface cursor-pointer hover:text-primary transition-colors" data-note-id="${escapeHtml(note.noteId)}">${escapeHtml(note.character)}</span>
          <span class="font-body-md text-on-surface-variant">${escapeHtml(note.pinyin || '')}</span>
          ${note.hsk ? `<span class="font-label-caps text-label-caps bg-surface-container-high text-primary px-sm py-xs rounded-md border border-outline-variant/30">${escapeHtml(note.hsk)}</span>` : ''}
        </div>
        ${hasDetail && detail.detailedNote ? `<p class="text-sm text-on-surface-variant mt-xs line-clamp-2">${escapeHtml(detail.detailedNote)}</p>` : ''}
        ${hasDetail && detail.exampleSentence ? `<p class="text-sm text-primary mt-xs italic">${escapeHtml(detail.exampleSentence)}</p>` : ''}
      </div>
      <div class="flex items-center gap-xs shrink-0">
        ${!isChild ? `<button class="note-detail-btn p-xs rounded-lg hover:bg-surface-container transition-colors text-on-surface-variant" data-note-id="${escapeHtml(note.noteId)}" title="Details"><span class="material-symbols-outlined text-sm">${detailIcon}</span></button>` : ''}
        ${!isChild ? `<button class="note-add-child-btn p-xs rounded-lg hover:bg-surface-container transition-colors text-on-surface-variant" data-note-id="${escapeHtml(note.noteId)}" title="Add child note"><span class="material-symbols-outlined text-sm">add</span></button>` : ''}
        <button class="note-delete-btn p-xs rounded-lg hover:bg-error-container transition-colors text-on-surface-variant hover:text-error" data-note-id="${escapeHtml(note.noteId)}" title="Delete"><span class="material-symbols-outlined text-sm">delete</span></button>
      </div>
    `;

    wrapper.appendChild(content);

    // Children
    if (children.length > 0) {
      const childWrap = document.createElement('div');
      childWrap.className = 'pb-sm pr-sm';
      children.forEach(function (child) {
        childWrap.appendChild(createNoteNode(child, childrenMap, depth + 1));
      });
      wrapper.appendChild(childWrap);
    }

    // Event bindings
    const charEl = content.querySelector('.note-character');
    if (charEl) {
      charEl.addEventListener('click', function () {
        startInlineEdit(note.noteId, 'character');
      });
    }

    const detailBtn = content.querySelector('.note-detail-btn');
    if (detailBtn) {
      detailBtn.addEventListener('click', function () {
        openDetailModal(note.noteId);
      });
    }

    const addChildBtn = content.querySelector('.note-add-child-btn');
    if (addChildBtn) {
      addChildBtn.addEventListener('click', function () {
        openNoteModal({ parentNoteId: note.noteId });
      });
    }

    const deleteBtn = content.querySelector('.note-delete-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', function () {
        deleteNote(note.noteId);
      });
    }

    return wrapper;
  }

  function startInlineEdit(noteId, field) {
    const note = state.notes.find(function (n) {
      return n.noteId === noteId;
    });
    if (!note) return;

    const oldValue = note[field] || '';
    const newValue = window.prompt(field === 'character' ? 'Edit character:' : 'Edit pinyin:', oldValue);
    if (newValue === null || newValue === oldValue) return;

    note[field] = newValue.trim();
    note._pendingUpdate = true;
    queueChange('UPDATE_NOTE', {
      sessionId: state.sessionId,
      noteId: note.noteId,
      character: note.character,
      pinyin: note.pinyin,
    });
    renderNotes();
  }

  function deleteNote(noteId) {
    const note = state.notes.find(function (n) {
      return n.noteId === noteId;
    });
    if (!note) return;

    if (!window.confirm(`Delete "${note.character}"?`)) return;

    note._pendingDelete = true;

    // Also mark children for deletion.
    state.notes.forEach(function (n) {
      if (n.parentNoteId === noteId) {
        n._pendingDelete = true;
      }
    });

    queueChange('DELETE_NOTE', { sessionId: state.sessionId, noteId: note.noteId });
    renderNotes();
  }

  // ---------------------------------------------------------------------------
  // Note create / edit modal
  // ---------------------------------------------------------------------------

  function openNoteModal({ parentNoteId = null } = {}) {
    const isChild = !!parentNoteId;
    const title = isChild ? 'Add Child Note' : 'New Note';

    const character = window.prompt(`${title}\nCharacter(s):`);
    if (!character || !character.trim()) return;

    const pinyin = window.prompt('Pinyin (optional):') || '';
    const hsk = window.prompt('HSK level (e.g. HSK3):') || extractHsk((state.video || FALLBACK_VIDEO).title);

    const tempId = 'TEMP_' + uuid();
    const newNote = {
      noteId: tempId,
      sessionId: state.sessionId,
      character: character.trim(),
      pinyin: pinyin.trim(),
      hsk: hsk.trim().toUpperCase(),
      parentNoteId: parentNoteId,
      timestamp: new Date().toISOString(),
      _pendingCreate: true,
    };

    state.notes.push(newNote);
    queueChange('CREATE_NOTE', {
      sessionId: state.sessionId,
      character: newNote.character,
      pinyin: newNote.pinyin,
      hsk: newNote.hsk,
      parentNoteId: newNote.parentNoteId,
    });
    renderNotes();
  }

  // ---------------------------------------------------------------------------
  // Note detail modal
  // ---------------------------------------------------------------------------

  function openDetailModal(noteId) {
    const note = state.notes.find(function (n) {
      return n.noteId === noteId;
    });
    if (!note) return;

    const existing = state.noteDetails[noteId] || {};

    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center p-md';
    overlay.innerHTML = `
      <div class="bg-surface rounded-3xl shadow-2xl w-full max-w-lg p-lg border border-outline-variant">
        <div class="flex items-center justify-between mb-md">
          <h3 class="font-headline-md text-headline-md text-on-surface">Note Details: ${escapeHtml(note.character)}</h3>
          <button class="detail-close p-xs rounded-lg hover:bg-surface-container transition-colors"><span class="material-symbols-outlined">close</span></button>
        </div>
        <div class="space-y-md">
          <div>
            <label class="block font-label-caps text-label-caps text-on-surface-variant mb-xs uppercase">Explanation</label>
            <textarea class="detail-explanation w-full bg-surface-container-lowest rounded-xl p-md border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none text-on-surface" rows="4" placeholder="Add a longer explanation...">${escapeHtml(existing.detailedNote || '')}</textarea>
          </div>
          <div>
            <label class="block font-label-caps text-label-caps text-on-surface-variant mb-xs uppercase">Example Sentence</label>
            <textarea class="detail-example w-full bg-surface-container-lowest rounded-xl p-md border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none text-on-surface" rows="2" placeholder="Add an example sentence...">${escapeHtml(existing.exampleSentence || '')}</textarea>
          </div>
          <div class="detail-error text-error text-sm hidden"></div>
          <div class="flex justify-end gap-sm pt-sm">
            <button class="detail-cancel px-md py-xs rounded-lg border border-outline-variant text-on-surface font-body-md hover:bg-surface-container transition-all">Cancel</button>
            <button class="detail-save px-md py-xs rounded-lg bg-primary text-on-primary font-body-md hover:bg-primary-dim transition-all shadow-md"><span class="material-symbols-outlined text-sm">save</span> Save Detail</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    function close() {
      overlay.remove();
    }

    overlay.querySelector('.detail-close').addEventListener('click', close);
    overlay.querySelector('.detail-cancel').addEventListener('click', close);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) close();
    });

    overlay.querySelector('.detail-save').addEventListener('click', async function () {
      const explanation = overlay.querySelector('.detail-explanation').value.trim();
      const example = overlay.querySelector('.detail-example').value.trim();
      const errorEl = overlay.querySelector('.detail-error');

      if (!explanation) {
        errorEl.textContent = 'Explanation is required.';
        errorEl.classList.remove('hidden');
        return;
      }

      if (!state.userId) {
        // Demo mode: just update local state.
        state.noteDetails[noteId] = {
          ...existing,
          noteId,
          sessionId: state.sessionId,
          detailedNote: explanation,
          exampleSentence: example,
        };
        renderNotes();
        close();
        return;
      }

      const res = await window.MandoApi.notes.saveDetail(state.userId, state.sessionId, noteId, {
        detailedNote: explanation,
        exampleSentence: example,
      });

      if (!res.ok) {
        errorEl.textContent = (res.error && res.error.message) || 'Could not save detail.';
        errorEl.classList.remove('hidden');
        return;
      }

      state.noteDetails[noteId] = res.data && res.data.noteDetail ? res.data.noteDetail : {
        noteId,
        sessionId: state.sessionId,
        detailedNote: explanation,
        exampleSentence: example,
      };
      renderNotes();
      close();
      showToast('Note detail saved.', 'success');
    });
  }

  // ---------------------------------------------------------------------------
  // Rendering: script panel
  // ---------------------------------------------------------------------------

  function renderScript() {
    const container = $('script-container');
    if (!container) return;

    container.innerHTML = '';
    SCRIPT_FIXTURE.forEach(function (line, index) {
      const el = document.createElement('div');
      el.className = `script-line p-sm rounded-xl cursor-pointer transition-colors hover:bg-surface-container ${index === state.activeScriptIndex ? 'bg-primary-container/30 border border-primary/20' : ''}`;
      el.dataset.index = index;
      el.dataset.time = line.t;

      const zhDisplay = state.scriptMode === 'zh' || state.scriptMode === 'py' ? 'block' : 'hidden';
      const pyDisplay = state.scriptMode === 'py' ? 'block' : 'hidden';
      const enDisplay = state.scriptMode === 'en' ? 'block' : 'hidden';

      el.innerHTML = `
        <div class="flex items-start gap-sm">
          <span class="material-symbols-outlined text-primary mt-1 text-sm">play_arrow</span>
          <div class="flex-1">
            <p class="script-zh font-body-md text-on-surface ${zhDisplay}">${escapeHtml(line.zh)}</p>
            <p class="script-py font-body-md text-on-surface-variant italic mt-xs ${pyDisplay}">${escapeHtml(line.py)}</p>
            <p class="script-en font-body-md text-on-surface-variant mt-xs ${enDisplay}">${escapeHtml(line.en)}</p>
          </div>
        </div>
      `;

      el.addEventListener('click', function () {
        seekTo(line.t);
      });

      container.appendChild(el);
    });

    updateScriptProgress();
  }

  function updateScriptHighlight(currentTime) {
    let index = -1;
    for (let i = 0; i < SCRIPT_FIXTURE.length; i++) {
      if (currentTime >= SCRIPT_FIXTURE[i].t) {
        index = i;
      }
    }

    if (index === state.activeScriptIndex) return;
    state.activeScriptIndex = index;

    document.querySelectorAll('.script-line').forEach(function (el, idx) {
      if (idx === index) {
        el.classList.add('bg-primary-container/30', 'border', 'border-primary/20');
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        el.classList.remove('bg-primary-container/30', 'border', 'border-primary/20');
      }
    });

    updateScriptProgress();
  }

  function updateScriptProgress() {
    const bar = $('script-progress-bar');
    const text = $('script-completion-text');
    const video = $('video-player');
    if (!bar || !text) return;

    const duration = video && video.duration ? video.duration : SCRIPT_FIXTURE[SCRIPT_FIXTURE.length - 1].t + 5;
    const current = video && video.currentTime ? video.currentTime : 0;
    const percent = duration ? Math.min(100, Math.round((current / duration) * 100)) : 0;

    bar.style.width = `${percent}%`;
    text.textContent = `${percent}% Complete`;
  }

  function seekTo(seconds) {
    const video = $('video-player');
    if (!video) return;
    video.currentTime = seconds;
    video.play().catch(function () {});
  }

  function initScriptToggles() {
    const toggles = document.querySelectorAll('.script-toggle');
    toggles.forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.scriptMode = btn.dataset.mode;
        toggles.forEach(function (b) {
          if (b.dataset.mode === state.scriptMode) {
            b.className = 'script-toggle w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xs';
          } else {
            b.className = 'script-toggle w-8 h-8 rounded-full bg-surface-container-highest text-on-surface-variant flex items-center justify-center font-bold text-xs';
          }
        });
        renderScript();
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Rendering: video library sidebar
  // ---------------------------------------------------------------------------

  function renderVideoLibrary() {
    const container = $('video-library-container');
    if (!container) return;

    const groups = {};
    state.allVideos.forEach(function (video) {
      const hsk = extractHsk(video.title);
      groups[hsk] = groups[hsk] || [];
      groups[hsk].push(video);
    });

    const sortedHsk = Object.keys(groups).sort(function (a, b) {
      const na = parseInt(a.replace(/\D/g, ''), 10) || 0;
      const nb = parseInt(b.replace(/\D/g, ''), 10) || 0;
      return na - nb;
    });

    if (sortedHsk.length === 0) {
      container.innerHTML = '<p class="text-xs text-on-surface-variant px-sm">No videos available.</p>';
      return;
    }

    container.innerHTML = '';
    sortedHsk.forEach(function (hsk) {
      const section = document.createElement('div');
      section.className = 'mb-xs';

      const header = document.createElement('button');
      header.className = 'w-full flex items-center justify-between px-sm py-xs rounded-lg hover:bg-surface-container transition-colors text-on-surface-variant';
      header.innerHTML = `<span class="font-label-caps text-label-caps">${escapeHtml(hsk)}</span><span class="material-symbols-outlined text-sm">expand_more</span>`;

      const list = document.createElement('div');
      list.className = 'pl-sm space-y-1';
      groups[hsk].forEach(function (video) {
        const link = document.createElement('a');
        link.className = 'block px-sm py-xs rounded-lg text-sm text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors truncate';
        link.href = `video-session.html?videoId=${encodeURIComponent(video.videoId)}&userId=${encodeURIComponent(state.userId || '')}`;
        link.textContent = video.title;
        list.appendChild(link);
      });

      header.addEventListener('click', function () {
        list.classList.toggle('hidden');
        const icon = header.querySelector('.material-symbols-outlined');
        icon.textContent = list.classList.contains('hidden') ? 'chevron_right' : 'expand_more';
      });

      section.appendChild(header);
      section.appendChild(list);
      container.appendChild(section);
    });
  }

  // ---------------------------------------------------------------------------
  // Rendering: related lessons
  // ---------------------------------------------------------------------------

  function renderRelatedLessons() {
    const container = $('related-lessons-container');
    if (!container) return;

    container.innerHTML = '';
    if (state.relatedVideos.length === 0) {
      container.innerHTML = '<p class="text-on-surface-variant text-sm">No related lessons found.</p>';
      return;
    }

    state.relatedVideos.forEach(function (video) {
      const hsk = extractHsk(video.title);
      const difficulty = difficultyFromHsk(hsk);
      const duration = video.durationSeconds ? formatTime(video.durationSeconds) : '';
      const thumb = thumbnailUrl(video);

      const card = document.createElement('div');
      card.className = 'min-w-[260px] max-w-[260px] bg-surface-container-lowest rounded-xl overflow-hidden border border-outline-variant shadow-sm hover:shadow-lg transition-all group';
      card.innerHTML = `
        <div class="aspect-video relative overflow-hidden cursor-pointer" data-video-id="${escapeHtml(video.videoId)}">
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
        window.location.href = `video-session.html?videoId=${encodeURIComponent(video.videoId)}&userId=${encodeURIComponent(state.userId || '')}`;
      });

      container.appendChild(card);
    });
  }

  // ---------------------------------------------------------------------------
  // Navigation wiring
  // ---------------------------------------------------------------------------

  function initNavigation() {
    const previousBtn = $('topnav-previous');
    if (previousBtn) {
      previousBtn.addEventListener('click', function () {
        window.location.href = '../index.html' + (state.userId ? `?userId=${encodeURIComponent(state.userId)}` : '');
      });
    }

    const startPracticeBtn = document.querySelector('.sidebar .btn-gradient');
    if (startPracticeBtn) {
      startPracticeBtn.addEventListener('click', function () {
        window.location.href = `study-mode.html?mode=spaced&global=true${state.userId ? `&userId=${encodeURIComponent(state.userId)}` : ''}`;
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Keyboard shortcuts
  // ---------------------------------------------------------------------------

  function initKeyboardShortcuts() {
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        flushPendingChanges();
      }

      const video = $('video-player');
      if (!video) return;

      if (e.code === 'Space' && document.activeElement && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        if (video.paused) {
          video.play().catch(function () {});
        } else {
          video.pause();
        }
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Main init
  // ---------------------------------------------------------------------------

  async function init() {
    state.demoMode = !state.userId;

    updateSaveButtonState();
    initNavigation();
    initScriptToggles();
    initKeyboardShortcuts();

    // Initial render with fallback data for perceived performance.
    state.video = FALLBACK_VIDEO;
    state.notes = FALLBACK_NOTES.map(function (n) { return { ...n }; });
    state.noteDetails = { ...FALLBACK_NOTE_DETAILS };
    state.allVideos = [];
    state.relatedVideos = FALLBACK_RELATED.map(function (v) { return { ...v }; });

    // Wire primary actions immediately so they are clickable during data load.
    const newNoteBtn = $('new-note-btn');
    if (newNoteBtn) {
      newNoteBtn.addEventListener('click', function () {
        openNoteModal();
      });
    }

    const saveNotesBtn = $('save-notes-btn');
    if (saveNotesBtn) {
      saveNotesBtn.addEventListener('click', function () {
        flushPendingChanges();
      });
    }

    renderMeta();
    initVideoPlayer();
    renderNotes();
    renderScript();
    renderVideoLibrary();
    renderRelatedLessons();

    // Load backend data in parallel.
    try {
      await Promise.all([
        loadCurrentVideo(),
        loadNotes(),
        loadVideoLibrary(),
        loadRelatedVideos(),
      ]);

      renderMeta();
      initVideoPlayer();
      renderNotes();
      renderScript();
      renderVideoLibrary();
      renderRelatedLessons();

      sendUserActive();
    } catch (err) {
      console.error('Video session init failed:', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
