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
  // Shared utilities (js/utils.js)
  // ---------------------------------------------------------------------------

  const {
    safeLocalStorageGet,
    safeLocalStorageSet,
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
    getStoredProgress,
  } = window.MandoUtils;

  // ---------------------------------------------------------------------------
  // Page-specific helpers
  // ---------------------------------------------------------------------------

  function getVideoId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('videoId') || safeLocalStorageGet('mando.lastVideoId') || DEMO_VIDEO_ID;
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

  function thumbnailUrl(video) {
    if (video.thumbnail) return video.thumbnail;
    if (video.thumbnailUrl) return video.thumbnailUrl;
    if (video.s3Bucket && video.s3Key) {
      return `https://${video.s3Bucket}.s3.amazonaws.com/${video.s3Key}`;
    }
    return FALLBACK_VIDEO.thumbnail;
  }

  function videoSourceUrl(video) {
    if (video.sourceType === 'YOUTUBE') return null;
    if (video.s3Bucket && video.s3Key) {
      return `https://${video.s3Bucket}.s3.amazonaws.com/${video.s3Key}`;
    }
    return null;
  }

  function isYouTubeVideo(video) {
    return video && video.sourceType === 'YOUTUBE' && video.youtubeVideoId;
  }

  function isS3Video(video) {
    return video && video.sourceType !== 'YOUTUBE' && videoSourceUrl(video);
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
    scriptLines: [],
  };

  // YouTube IFrame Player API state.
  let youtubePlayer = null;
  let youtubeTimer = null;
  let pendingYouTubeVideoId = null;
  let youTubeApiReady = false;

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

  function validatePendingChanges() {
    const errors = [];

    if (state.pendingChanges.length > 25) {
      errors.push(`You have ${state.pendingChanges.length} pending changes. Please save in groups of 25 or fewer.`);
    }

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

    // Deduplicate messages.
    return errors.filter(function (value, index, self) {
      return self.indexOf(value) === index;
    });
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
      } else if (change.operation === 'CREATE_FLASHCARD') {
        payload.createFlashCards = payload.createFlashCards || [];
        const index = payload.createFlashCards.length;
        payload.createFlashCards.push({
          character: change.data.character,
          pinyin: change.data.pinyin || '',
          meaning: change.data.meaning || '',
          hsk: change.data.hsk || inferHskLabel((state.video || FALLBACK_VIDEO).title),
          category: change.data.category || 'MISCELLANEOUS',
          sessionId: change.data.sessionId || state.sessionId,
        });
        mapping.push({ changeId: change._id, operation: 'CREATE_FLASHCARD', index: index });
      }
    });

    return { payload, mapping };
  }

  async function flushPendingChanges() {
    if (!state.userId || state.pendingChanges.length === 0) return;

    const validationErrors = validatePendingChanges();
    if (validationErrors.length > 0) {
      showToast(validationErrors.join(' '), 'error');
      return;
    }

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

  async function loadScript() {
    setHtml('script-container', renderScriptSkeleton());

    if (state.demoMode) {
      state.scriptLines = SCRIPT_FIXTURE.map(function (line) { return { ...line }; });
      return;
    }

    try {
      const res = await window.MandoApi.videos.getScript(state.videoId);
      if (res.ok && res.data && Array.isArray(res.data.lines) && res.data.lines.length > 0) {
        state.scriptLines = res.data.lines.map(function (line) {
          return {
            t: line.timestampSeconds,
            zh: line.chinese,
            py: line.pinyin,
            en: line.english,
          };
        });
      } else {
        state.scriptLines = SCRIPT_FIXTURE.map(function (line) { return { ...line }; });
      }
    } catch (err) {
      console.warn('Failed to load script, falling back to fixture:', err);
      state.scriptLines = SCRIPT_FIXTURE.map(function (line) { return { ...line }; });
    }
  }

  function renderScriptSkeleton() {
    let html = '';
    for (let i = 0; i < 6; i++) {
      html += `
        <div class="p-sm rounded-xl bg-surface-container animate-pulse">
          <div class="flex items-start gap-sm">
            <div class="w-4 h-4 mt-1 rounded-full bg-outline-variant/40"></div>
            <div class="flex-1 space-y-xs">
              <div class="h-4 bg-outline-variant/40 rounded w-3/4"></div>
              <div class="h-3 bg-outline-variant/30 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      `;
    }
    return html;
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
    renderPlayerForVideo();
    if (isYouTubeVideo(state.video)) {
      initYouTubePlayer();
    } else {
      stopYouTubeSync();
      if (youtubePlayer && typeof youtubePlayer.destroy === 'function') {
        try {
          youtubePlayer.destroy();
        } catch (e) {
          // ignore
        }
      }
      youtubePlayer = null;
      initNativeVideoPlayer();
    }
  }

  function renderPlayerForVideo() {
    const video = $('video-player');
    const wrapper = $('video-player-wrapper');
    const controls = $('video-custom-controls');
    const unavailableOverlay = $('video-unavailable-overlay');
    const unavailableThumbnail = $('video-unavailable-thumbnail');

    if (!video || !wrapper) return;

    // Remove any previously injected YouTube iframe.
    const existingIframe = $('youtube-player');
    if (existingIframe) existingIframe.remove();

    // Remove any previously injected thumbnail overlay.
    const existingThumb = wrapper.querySelector('.video-thumbnail-overlay');
    if (existingThumb) existingThumb.remove();

    video.classList.remove('hidden');
    if (controls) controls.classList.remove('hidden');
    if (unavailableOverlay) unavailableOverlay.classList.add('hidden');

    const currentVideo = state.video || FALLBACK_VIDEO;

    if (isS3Video(currentVideo)) {
      updateVideoSource(video);
      return;
    }

    if (isYouTubeVideo(currentVideo)) {
      video.classList.add('hidden');
      if (controls) controls.classList.add('hidden');

      const placeholder = document.createElement('div');
      placeholder.id = 'youtube-player';
      placeholder.className = 'w-full h-full';
      wrapper.appendChild(placeholder);

      pendingYouTubeVideoId = currentVideo.youtubeVideoId;
      // If the API loaded before we reached this point, create the player now.
      if (youTubeApiReady && window.YT && window.YT.Player) {
        createYouTubePlayer(currentVideo.youtubeVideoId);
      }
      return;
    }

    // Missing or unknown source: show thumbnail + unavailable overlay.
    video.classList.add('hidden');
    if (controls) controls.classList.add('hidden');
    if (unavailableOverlay) {
      unavailableOverlay.classList.remove('hidden');
      if (unavailableThumbnail) unavailableThumbnail.src = thumbnailUrl(currentVideo);
    }
  }

  function initNativeVideoPlayer() {
    const video = $('video-player');
    if (!video || video.classList.contains('hidden')) return;

    if (video._mandoPlayerSetup) return;
    video._mandoPlayerSetup = true;

    const playBtn = $('video-play-btn');
    const progressBar = $('video-progress-bar');
    const progressContainer = $('video-progress-container');
    const timeDisplay = $('video-time');
    const fullscreenBtn = $('video-fullscreen-btn');
    const settingsBtn = $('video-settings-btn');
    const unavailableOverlay = $('video-unavailable-overlay');
    const unavailableThumbnail = $('video-unavailable-thumbnail');

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
    video.addEventListener('canplay', function () {
      if (unavailableOverlay) unavailableOverlay.classList.add('hidden');
    });
    video.addEventListener('error', function () {
      console.error('Native video load error', video.error);
      showToast('Unable to play this video. Please try again later.', 'error');
      if (unavailableOverlay) {
        unavailableOverlay.classList.remove('hidden');
        if (unavailableThumbnail) unavailableThumbnail.src = thumbnailUrl(state.video || FALLBACK_VIDEO);
      }
    });
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

    resumeStoredProgress();
  }

  function initYouTubePlayer() {
    // Player creation is triggered by renderPlayerForVideo + onYouTubeIframeAPIReady.
    // If the API is already ready and we have a pending video id, create it now.
    if (window.YT && window.YT.Player) {
      youTubeApiReady = true;
    }
    if (youTubeApiReady && pendingYouTubeVideoId) {
      createYouTubePlayer(pendingYouTubeVideoId);
    }
  }

  function createYouTubePlayer(videoId) {
    const wrapper = $('video-player-wrapper');
    if (!wrapper) return;

    // Clean up any previous player before creating a new one.
    stopYouTubeSync();
    if (youtubePlayer && typeof youtubePlayer.destroy === 'function') {
      try {
        youtubePlayer.destroy();
      } catch (e) {
        // ignore
      }
    }
    youtubePlayer = null;

    // Make sure the placeholder exists.
    let placeholder = $('youtube-player');
    if (!placeholder) {
      placeholder = document.createElement('div');
      placeholder.id = 'youtube-player';
      placeholder.className = 'w-full h-full';
      wrapper.appendChild(placeholder);
    }

    try {
      youtubePlayer = new window.YT.Player('youtube-player', {
        videoId: videoId,
        playerVars: {
          enablejsapi: 1,
          rel: 0,
          modestbranding: 1,
        },
        events: {
          onReady: onYouTubePlayerReady,
          onStateChange: onYouTubePlayerStateChange,
          onError: onYouTubePlayerError,
        },
      });
      pendingYouTubeVideoId = null;
    } catch (err) {
      console.error('Failed to create YouTube player', err);
      showToast('YouTube player could not be loaded. Some features may be limited.', 'error');
    }
  }

  function onYouTubePlayerReady(event) {
    // Ensure the overlay and controls reflect the player state.
    updateScriptProgress();
    resumeStoredProgress();
  }

  function onYouTubePlayerStateChange(event) {
    if (event.data === window.YT.PlayerState.PLAYING) {
      startYouTubeSync();
    } else {
      stopYouTubeSync();
    }

    if (event.data === window.YT.PlayerState.ENDED) {
      updateScriptProgress();
    }
  }

  function onYouTubePlayerError(event) {
    console.error('YouTube player error', event.data);
    showToast('YouTube playback failed. Please try again later.', 'error');
    stopYouTubeSync();
  }

  function startYouTubeSync() {
    if (youtubeTimer) return;
    youtubeTimer = window.setInterval(function () {
      if (!youtubePlayer || typeof youtubePlayer.getCurrentTime !== 'function') return;
      const current = youtubePlayer.getCurrentTime() || 0;
      const duration = youtubePlayer.getDuration() || state.video.durationSeconds || 0;
      updateSubtitleOverlay(current);
      updateScriptHighlight(current);
      updateScriptProgress(current, duration);
      saveProgress(current, duration);
    }, 250);
  }

  function stopYouTubeSync() {
    if (youtubeTimer) {
      window.clearInterval(youtubeTimer);
      youtubeTimer = null;
    }
  }

  // Global callback required by the YouTube IFrame Player API.
  window.onYouTubeIframeAPIReady = function () {
    youTubeApiReady = true;
    if (pendingYouTubeVideoId) {
      createYouTubePlayer(pendingYouTubeVideoId);
    }
  };

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

  function resumeStoredProgress() {
    if (!state.videoId) return;
    const stored = getStoredProgress(state.videoId);
    if (!stored || stored.currentTime <= 0) return;

    const video = $('video-player');
    if (video && !video.classList.contains('hidden')) {
      if (video.readyState >= 1) {
        video.currentTime = stored.currentTime;
      } else {
        video.addEventListener('loadedmetadata', function once() {
          video.currentTime = stored.currentTime;
          video.removeEventListener('loadedmetadata', once);
        });
      }
      return;
    }

    if (youtubePlayer && typeof youtubePlayer.seekTo === 'function') {
      try {
        youtubePlayer.seekTo(stored.currentTime, true);
      } catch (err) {
        console.warn('Resume YouTube progress failed', err);
      }
    }
  }

  function updateSubtitleOverlay(currentTime) {
    const hanzi = $('subtitle-hanzi');
    const pinyin = $('subtitle-pinyin');
    if (!hanzi || !pinyin) return;

    const lines = state.scriptLines.length > 0 ? state.scriptLines : SCRIPT_FIXTURE;
    // Find the line whose timestamp is closest without exceeding currentTime.
    let active = lines[0];
    for (let i = 0; i < lines.length; i++) {
      if (currentTime >= lines[i].t) {
        active = lines[i];
      }
    }

    hanzi.textContent = active ? active.zh : '';
    pinyin.textContent = active ? active.py : '';
  }

  // ---------------------------------------------------------------------------
  // Rendering: notes tree (real-time inline editing)
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

    container.innerHTML = '';

    if (roots.length === 0) {
      container.appendChild(createEmptyState());
      return;
    }

    roots.forEach(function (note) {
      container.appendChild(createNoteNode(note, childrenMap, 0));
    });
  }

  function createEmptyState() {
    const el = document.createElement('div');
    el.className = 'text-center py-xl text-on-surface-variant';
    el.innerHTML = `
      <span class="material-symbols-outlined text-4xl mb-sm">notes</span>
      <p class="font-body-md">No notes yet. Click "New Note" to capture vocabulary.</p>
    `;
    return el;
  }

  function createNoteNode(note, childrenMap, depth) {
    const isChild = depth > 0;
    const children = childrenMap[note.noteId] || [];
    const detail = state.noteDetails[note.noteId];
    const hasDetail = detail && (detail.detailedNote || detail.exampleSentence);
    const isPending = note._pendingCreate || note._pendingUpdate || note._pendingDelete;
    const safeId = note.noteId.replace(/[^a-zA-Z0-9_-]/g, '_');

    const wrapper = document.createElement('div');
    wrapper.className = `note-node rounded-2xl border transition-all ${
      isPending
        ? 'border-primary/40 bg-primary-container/10'
        : 'border-outline-variant/40 bg-surface-container-lowest'
    } ${depth > 0 ? 'ml-lg mt-sm' : ''}`;

    const content = document.createElement('div');
    content.className = 'p-md';

    const detailIcon = hasDetail ? 'sticky_note' : 'sticky_note_2';
    const autoPinyin = generatePinyin(note.character || '');

    content.innerHTML = `
      <div class="flex items-start gap-sm">
        <div class="flex-1 min-w-0">
          <input id="note-char-${safeId}" type="text" value="${escapeHtml(note.character || '')}" placeholder="Character" maxlength="25" class="w-full bg-surface-container-high text-on-surface rounded-lg px-sm py-xs border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none font-character-display text-2xl">
          <div class="mt-xs flex items-center gap-sm">
            <input id="note-py-${safeId}" type="text" value="${escapeHtml(note.pinyin || '')}" placeholder="Pinyin" maxlength="250" class="flex-1 bg-surface-container-high text-on-surface-variant rounded-lg px-sm py-xs border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none font-body-md text-sm">
            ${autoPinyin && autoPinyin !== (note.pinyin || '').trim() ? `<span class="text-xs text-on-surface-variant whitespace-nowrap">↳ ${escapeHtml(autoPinyin)}</span>` : ''}
          </div>
        </div>
        <div class="flex items-start gap-xs pt-1 shrink-0">
          ${!isChild ? `<button class="note-detail-btn p-xs rounded-lg hover:bg-surface-container transition-colors text-on-surface-variant" title="Details"><span class="material-symbols-outlined text-sm">${detailIcon}</span></button>` : ''}
          ${!isChild && !note._pendingCreate ? `<button class="note-add-child-btn p-xs rounded-lg hover:bg-surface-container transition-colors text-on-surface-variant" title="Add child note"><span class="material-symbols-outlined text-sm">add</span></button>` : ''}
          <button class="note-delete-btn p-xs rounded-lg hover:bg-error-container transition-colors text-on-surface-variant hover:text-error" title="Delete"><span class="material-symbols-outlined text-sm">delete</span></button>
        </div>
      </div>
      ${hasDetail && (detail.detailedNote || detail.exampleSentence) ? `
        <div class="mt-sm text-sm">
          ${detail.detailedNote ? `<p class="text-on-surface-variant line-clamp-2">${escapeHtml(detail.detailedNote)}</p>` : ''}
          ${detail.exampleSentence ? `<p class="text-primary italic mt-xs">${escapeHtml(detail.exampleSentence)}</p>` : ''}
        </div>
      ` : ''}
    `;

    wrapper.appendChild(content);

    // Children
    if (children.length > 0 || !isChild) {
      const childWrap = document.createElement('div');
      childWrap.className = 'pb-sm pr-sm';
      children.forEach(function (child) {
        childWrap.appendChild(createNoteNode(child, childrenMap, depth + 1));
      });
      wrapper.appendChild(childWrap);
    }

    // Bind inputs
    const charInput = content.querySelector(`#note-char-${safeId}`);
    const pyInput = content.querySelector(`#note-py-${safeId}`);

    if (charInput) {
      charInput.addEventListener('input', function () {
        updateNoteField(note.noteId, 'character', charInput.value);
        // Auto-fill pinyin if the user hasn't manually edited it yet.
        const generated = generatePinyin(charInput.value);
        if (generated && !note._pinyinEdited) {
          pyInput.value = generated;
          updateNoteField(note.noteId, 'pinyin', generated);
        }
      });
    }
    if (pyInput) {
      pyInput.addEventListener('input', function () {
        note._pinyinEdited = true;
        updateNoteField(note.noteId, 'pinyin', pyInput.value);
      });
    }

    // Bind actions
    const detailBtn = content.querySelector('.note-detail-btn');
    if (detailBtn) {
      detailBtn.addEventListener('click', function () {
        openDetailModal(note.noteId);
      });
    }

    const addChildBtn = content.querySelector('.note-add-child-btn');
    if (addChildBtn) {
      addChildBtn.addEventListener('click', function () {
        createEmptyNote(note.noteId);
      });
    }

    const deleteBtn = content.querySelector('.note-delete-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', function () {
        promptDeleteNote(note.noteId);
      });
    }

    return wrapper;
  }

  function updateNoteField(noteId, field, value) {
    const note = state.notes.find(function (n) {
      return n.noteId === noteId;
    });
    if (!note) return;

    note[field] = value.trim();

    if (note._pendingCreate) {
      const createChange = state.pendingChanges.find(function (c) {
        return c.operation === 'CREATE_NOTE' && c.data._tempId === noteId;
      });
      if (createChange) {
        createChange.data[field] = note[field];
      }
    } else {
      note._pendingUpdate = true;
      const updateChange = state.pendingChanges.find(function (c) {
        return c.operation === 'UPDATE_NOTE' && c.data.noteId === noteId;
      });
      if (updateChange) {
        updateChange.data[field] = note[field];
      } else {
        queueChange('UPDATE_NOTE', {
          sessionId: state.sessionId,
          noteId: note.noteId,
          character: note.character,
          pinyin: note.pinyin,
        });
      }
    }

    updateSaveButtonState();
  }

  function createEmptyNote(parentNoteId) {
    const tempId = 'TEMP_' + uuid();
    const newNote = {
      noteId: tempId,
      sessionId: state.sessionId,
      character: '',
      pinyin: '',
      hsk: inferHskLabel((state.video || FALLBACK_VIDEO).title),
      parentNoteId: parentNoteId || null,
      timestamp: new Date().toISOString(),
      _pendingCreate: true,
    };

    state.notes.push(newNote);
    queueChange('CREATE_NOTE', {
      _tempId: tempId,
      sessionId: state.sessionId,
      character: newNote.character,
      pinyin: newNote.pinyin,
      hsk: newNote.hsk,
      parentNoteId: newNote.parentNoteId,
    });
    renderNotes();
    updateSaveButtonState();

    const safeId = tempId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const input = $('note-char-' + safeId);
    if (input) input.focus();
  }

  function promptDeleteNote(noteId) {
    const note = state.notes.find(function (n) {
      return n.noteId === noteId;
    });
    if (!note) return;

    openConfirmModal(
      `Delete "${note.character || 'this note'}"?`,
      'This will also remove any child notes. You can undo by clicking away until you save.',
      function () {
        confirmDeleteNote(noteId);
      }
    );
  }

  function confirmDeleteNote(noteId) {
    const note = state.notes.find(function (n) {
      return n.noteId === noteId;
    });
    if (!note) return;

    const children = state.notes.filter(function (n) {
      return n.parentNoteId === noteId;
    });

    // Helper to remove a single note and its pending changes.
    function removeNoteAndChanges(id, isExisting) {
      state.notes = state.notes.filter(function (n) {
        return n.noteId !== id;
      });
      state.pendingChanges = state.pendingChanges.filter(function (c) {
        return !((c.operation === 'CREATE_NOTE' && c.data._tempId === id) ||
                 (c.operation === 'UPDATE_NOTE' && c.data.noteId === id));
      });
      if (isExisting) {
        queueChange('DELETE_NOTE', { sessionId: state.sessionId, noteId: id });
      }
    }

    if (note._pendingCreate) {
      removeNoteAndChanges(note.noteId, false);
    } else {
      note._pendingDelete = true;
      removeNoteAndChanges(note.noteId, true);
    }

    children.forEach(function (child) {
      if (child._pendingCreate) {
        removeNoteAndChanges(child.noteId, false);
      } else {
        child._pendingDelete = true;
        removeNoteAndChanges(child.noteId, true);
      }
    });

    renderNotes();
    updateSaveButtonState();
  }

  // ---------------------------------------------------------------------------
  // Shared modal helpers
  // ---------------------------------------------------------------------------

  function openConfirmModal(title, message, onConfirm) {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center p-md';
    overlay.innerHTML = `
      <div class="bg-surface rounded-3xl shadow-2xl w-full max-w-sm p-lg border border-outline-variant">
        <div class="flex items-center gap-sm mb-md">
          <span class="material-symbols-outlined text-error text-2xl">warning</span>
          <h3 class="font-headline-md text-headline-md text-on-surface">${escapeHtml(title)}</h3>
        </div>
        <p class="font-body-md text-on-surface-variant mb-lg">${escapeHtml(message)}</p>
        <div class="flex justify-end gap-sm">
          <button class="confirm-cancel px-md py-xs rounded-lg border border-outline-variant text-on-surface font-body-md hover:bg-surface-container transition-all">Cancel</button>
          <button class="confirm-ok px-md py-xs rounded-lg bg-error text-on-error font-body-md hover:bg-error-dim transition-all shadow-md">Delete</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    function close() {
      overlay.remove();
    }

    overlay.querySelector('.confirm-cancel').addEventListener('click', close);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) close();
    });
    overlay.querySelector('.confirm-ok').addEventListener('click', function () {
      close();
      onConfirm();
    });
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
            <textarea class="detail-explanation w-full bg-surface-container-lowest rounded-xl p-md border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none text-on-surface" rows="4" maxlength="1000" placeholder="Add a longer explanation...">${escapeHtml(existing.detailedNote || '')}</textarea>
          </div>
          <div>
            <label class="block font-label-caps text-label-caps text-on-surface-variant mb-xs uppercase">Example Sentence</label>
            <textarea class="detail-example w-full bg-surface-container-lowest rounded-xl p-md border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none text-on-surface" rows="2" maxlength="100" placeholder="Add an example sentence...">${escapeHtml(existing.exampleSentence || '')}</textarea>
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

    const lines = state.scriptLines.length > 0 ? state.scriptLines : SCRIPT_FIXTURE;
    container.innerHTML = '';
    lines.forEach(function (line, index) {
      const el = document.createElement('div');
      el.className = `script-line p-sm rounded-xl cursor-pointer transition-colors hover:bg-surface-container ${index === state.activeScriptIndex ? 'bg-primary-container/30 border border-primary/20' : ''}`;
      el.dataset.index = index;
      el.dataset.time = line.t;

      const zhDisplay = state.scriptMode === 'zh' || state.scriptMode === 'py' ? 'block' : 'hidden';
      const pyDisplay = state.scriptMode === 'py' ? 'block' : 'hidden';
      const enDisplay = state.scriptMode === 'en' ? 'block' : 'hidden';

      el.innerHTML = `
        <div class="flex items-start gap-sm">
          <div class="flex flex-col items-center shrink-0 pt-1">
            <span class="material-symbols-outlined text-primary text-sm">play_arrow</span>
            <span class="text-[10px] text-on-surface-variant font-medium mt-xs">${escapeHtml(formatTime(line.t))}</span>
          </div>
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
    const lines = state.scriptLines.length > 0 ? state.scriptLines : SCRIPT_FIXTURE;
    let index = -1;
    for (let i = 0; i < lines.length; i++) {
      if (currentTime >= lines[i].t) {
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

  function updateScriptProgress(currentTime, durationSeconds) {
    const bar = $('script-progress-bar');
    const text = $('script-completion-text');
    if (!bar || !text) return;

    let current = 0;
    let duration = 0;

    if (typeof currentTime === 'number' && isFinite(currentTime)) {
      current = currentTime;
    } else if (youtubePlayer && typeof youtubePlayer.getCurrentTime === 'function') {
      current = youtubePlayer.getCurrentTime() || 0;
    } else {
      const video = $('video-player');
      current = video && video.currentTime ? video.currentTime : 0;
    }

    if (typeof durationSeconds === 'number' && isFinite(durationSeconds) && durationSeconds > 0) {
      duration = durationSeconds;
    } else if (youtubePlayer && typeof youtubePlayer.getDuration === 'function') {
      duration = youtubePlayer.getDuration() || 0;
    } else {
      const video = $('video-player');
      duration = video && video.duration ? video.duration : 0;
    }

    const lines = state.scriptLines.length > 0 ? state.scriptLines : SCRIPT_FIXTURE;
    const fallbackDuration = lines.length > 0 ? lines[lines.length - 1].t + 5 : 0;
    if (!duration) duration = fallbackDuration;

    const percent = duration ? Math.min(100, Math.round((current / duration) * 100)) : 0;

    bar.style.width = `${percent}%`;
    text.textContent = `${percent}% Complete`;
  }

  function seekTo(seconds) {
    const video = $('video-player');

    if (video && !video.classList.contains('hidden')) {
      video.currentTime = seconds;
      video.play().catch(function () {});
      return;
    }

    if (youtubePlayer && typeof youtubePlayer.seekTo === 'function') {
      try {
        youtubePlayer.seekTo(seconds, true);
        youtubePlayer.playVideo();
      } catch (err) {
        console.warn('YouTube seek failed', err);
      }
      return;
    }

    // Fallback for the rare case where the postMessage API is still present.
    const iframe = $('youtube-player');
    if (iframe && iframe.contentWindow) {
      try {
        iframe.contentWindow.postMessage(JSON.stringify({
          event: 'command',
          func: 'seekTo',
          args: [seconds, true],
        }), '*');
      } catch (err) {
        console.warn('YouTube seek fallback failed', err);
      }
    }
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

      if (e.code === 'Space' && document.activeElement && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();

        if (youtubePlayer && typeof youtubePlayer.getPlayerState === 'function') {
          const playerState = youtubePlayer.getPlayerState();
          if (playerState === window.YT.PlayerState.PLAYING) {
            youtubePlayer.pauseVideo();
          } else {
            youtubePlayer.playVideo();
          }
          return;
        }

        const video = $('video-player');
        if (!video || video.classList.contains('hidden')) return;

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

    // Shared shell behaviors.
    if (window.MandoShell) {
      window.MandoShell.renderSidebarProfile();
      window.MandoShell.initMobileDrawer({ sidebarId: 'sidebar', overlayId: 'sidebar-overlay', toggleId: 'mobile-menu-toggle' });
    }

    // Warn before leaving the page with unsaved note/flashcard changes.
    window.addEventListener('beforeunload', function (e) {
      if (hasPendingChanges()) {
        e.preventDefault();
        e.returnValue = '';
      }
    });

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
        createEmptyNote(null);
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
        loadScript(),
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
