/**
 * Shared utility helpers for MandoLearning frontend.
 *
 * These functions are used across multiple page handlers and shell components.
 * Keeping them in one place avoids duplication and keeps page handlers focused
 * on page-specific behavior.
 *
 * Includes:
 * - localStorage, identity, UUID, date/formatting, DOM helpers
 * - `MandoUtils.speak(text, { id })` / `MandoUtils.stopSpeaking()` for
 *   browser-based Mandarin text-to-speech with per-line play/stop toggle
 * - `MandoUtils.convertChinese(text, target, onReady)` for display-time
 *   Simplified/Traditional conversion via opencc-js (lazy-loaded from CDN)
 */

(function (window) {
  'use strict';

  // ---------------------------------------------------------------------------
  // localStorage helpers (guarded for private browsing / sandboxed contexts)
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

  function safeLocalStorageRemove(key) {
    try {
      window.localStorage.removeItem(key);
    } catch (e) {
      // Ignore
    }
  }

  function getStoredProgress(videoId) {
    try {
      const raw = window.localStorage.getItem(`mando.progress.${videoId}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.currentTime === 'number' && parsed.currentTime > 0) {
        return parsed;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Identity helpers
  // ---------------------------------------------------------------------------

  function getUserId() {
    // Prefer the logged-in session; the ?userId= query param stays as a
    // fallback (dev override) until Phase 3 removes it.
    const params = new URLSearchParams(window.location.search);
    return safeLocalStorageGet('mando.userId') || params.get('userId') || null;
  }

  function deriveNameFromUserId(userId) {
    if (!userId) return null;
    const parts = userId.split('_');
    if (parts.length > 1) {
      return 'Learner ' + parts[parts.length - 1];
    }
    return userId;
  }

  function getDisplayName() {
    return (
      safeLocalStorageGet('mando.displayName') ||
      deriveNameFromUserId(getUserId()) ||
      'Learner'
    );
  }

  function isAdmin() {
    const role = safeLocalStorageGet('mando.userRole') || '';
    return role === 'ADMIN' || role === 'MASTER';
  }

  function persistUserId(userId) {
    if (userId) {
      safeLocalStorageSet('mando.userId', userId);
    }
  }

  // ---------------------------------------------------------------------------
  // UUID helper
  // ---------------------------------------------------------------------------

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
  // Date helpers
  // ---------------------------------------------------------------------------

  function formatDate(d) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function today() {
    return formatDate(new Date());
  }

  function daysAgo(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return formatDate(d);
  }

  // ---------------------------------------------------------------------------
  // Formatting helpers
  // ---------------------------------------------------------------------------

  /**
   * Formats seconds as m:ss. Always returns a string, even for 0.
   * Use this for playback positions and durations that should always be visible.
   */
  function formatTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) seconds = 0;
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  /**
   * Formats total seconds as m:ss for badges/cards.
   * Returns an empty string when the input is missing or non-positive,
   * allowing the caller to hide the duration pill cleanly.
   */
  function formatDuration(totalSeconds) {
    if (!totalSeconds || totalSeconds <= 0) return '';
    const m = Math.floor(totalSeconds / 60);
    const s = Math.floor(totalSeconds % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function formatRemaining(totalSeconds, percentWatched) {
    if (!totalSeconds) return '9 mins remaining';
    const remaining = Math.max(0, totalSeconds * (1 - percentWatched / 100));
    const mins = Math.ceil(remaining / 60);
    return `${mins} min${mins === 1 ? '' : 's'} remaining`;
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

  // ---------------------------------------------------------------------------
  // HSK / metadata helpers
  // ---------------------------------------------------------------------------

  function extractHsk(title, defaultLevel) {
    defaultLevel = defaultLevel || 'HSK 4';
    if (!title) return defaultLevel;
    const match = title.match(/HSK\s?(\d)/i);
    if (match) return `HSK ${match[1]}`;
    return defaultLevel;
  }

  function inferHskLabel(title, defaultLevel) {
    return extractHsk(title, defaultLevel).replace(' ', '').toUpperCase();
  }

  function difficultyFromHsk(hsk) {
    const level = parseInt(String(hsk).replace(/\D/g, ''), 10) || 4;
    if (level <= 2) return 'Beginner';
    if (level <= 4) return 'Intermediate';
    return 'Advanced';
  }

  // ---------------------------------------------------------------------------
  // Video thumbnail helper
  // ---------------------------------------------------------------------------

  /**
   * Resolves a thumbnail URL from a video entity.
   * Falls back to the provided fallback URL if no thumbnail can be determined.
   */
  function thumbnailUrl(video, fallbackUrl) {
    if (video.thumbnail) return video.thumbnail;
    if (video.thumbnailUrl) return video.thumbnailUrl;
    if (video.s3Bucket && video.s3Key) {
      return `https://${video.s3Bucket}.s3.amazonaws.com/${video.s3Key}`;
    }
    return fallbackUrl || '';
  }

  // ---------------------------------------------------------------------------
  // DOM helpers
  // ---------------------------------------------------------------------------

  function $(id) {
    return document.getElementById(id);
  }

  function setText(id, text) {
    const el = $(id);
    if (el) el.textContent = text;
  }

  function setAttr(id, attr, value) {
    const el = $(id);
    if (el) el.setAttribute(attr, value);
  }

  function setHtml(id, html) {
    const el = $(id);
    if (el) el.innerHTML = html;
  }

  // ---------------------------------------------------------------------------
  // Chinese script conversion (Simplified <-> Traditional) via opencc-js
  //
  // The opencc-js bundles are large (dictionary data), so they are NEVER loaded
  // up front: the first `convertChinese` call for a non-'original' target
  // injects the matching directional UMD bundle from jsDelivr and returns the
  // original text in the meantime. Once the bundle is ready, the optional
  // `onReady` callback fires so renderers can re-render with converted text.
  // 'original' is a pure passthrough and never triggers any loading.
  //
  // Bundles (opencc-js@1.4.1, UMD global `OpenCC`):
  // - t2cn.js (~100KB): Traditional -> Simplified, Converter({ from: 'tw', to: 'cn' })
  // - cn2t.js (~1MB):   Simplified -> Traditional, Converter({ from: 'cn', to: 'tw' })
  // Each bundle overwrites window.OpenCC, so the converter instance is created
  // immediately on load and cached per target variant.
  // ---------------------------------------------------------------------------

  const OPENCC_BUNDLE_URLS = {
    simplified: 'https://cdn.jsdelivr.net/npm/opencc-js@1.4.1/dist/umd/t2cn.js',
    traditional: 'https://cdn.jsdelivr.net/npm/opencc-js@1.4.1/dist/umd/cn2t.js',
  };

  const OPENCC_CONVERTER_OPTIONS = {
    simplified: { from: 'tw', to: 'cn' },
    traditional: { from: 'cn', to: 'tw' },
  };

  const openccConverters = {}; // variant -> converter function
  const openccLoading = {}; // variant -> in-flight Promise (null after failure)

  function loadOpenCC(variant) {
    if (openccLoading[variant]) return openccLoading[variant];

    openccLoading[variant] = new Promise(function (resolve, reject) {
      const script = document.createElement('script');
      script.src = OPENCC_BUNDLE_URLS[variant];
      script.async = true;

      script.onload = function () {
        try {
          if (!window.OpenCC || typeof window.OpenCC.Converter !== 'function') {
            throw new Error('OpenCC global not found after script load');
          }
          openccConverters[variant] = window.OpenCC.Converter(OPENCC_CONVERTER_OPTIONS[variant]);
          resolve(openccConverters[variant]);
        } catch (err) {
          openccLoading[variant] = null; // Allow retry on next call.
          reject(err);
        }
      };

      script.onerror = function () {
        openccLoading[variant] = null; // Allow retry on next call.
        reject(new Error('Failed to load OpenCC bundle for ' + variant));
      };

      document.head.appendChild(script);
    });

    return openccLoading[variant];
  }

  /**
   * Converts Chinese text between Simplified and Traditional for DISPLAY ONLY.
   *
   * @param {string} text   Original text (never mutated; data stays as-is).
   * @param {string} target 'original' | 'simplified' | 'traditional'.
   * @param {function} [onReady] Called once the lazy-loaded converter becomes
   *   available, so callers can re-render with converted output.
   * @returns {string} Converted text, or the original text when the target is
   *   'original', unknown, or the converter has not finished loading yet.
   */
  function convertChinese(text, target, onReady) {
    if (!text || target === 'original') return text;
    if (target !== 'simplified' && target !== 'traditional') return text;

    const converter = openccConverters[target];
    if (converter) {
      try {
        return converter(text);
      } catch (e) {
        return text;
      }
    }

    loadOpenCC(target)
      .then(function () {
        if (typeof onReady === 'function') onReady();
      })
      .catch(function (err) {
        console.warn('Chinese conversion unavailable:', err);
      });

    return text;
  }

  // ---------------------------------------------------------------------------
  // Text-to-speech helper
  // ---------------------------------------------------------------------------

  let currentSpeechId = null;
  let isSpeakingFlag = false;

  function getChineseVoice() {
    if (!window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices();
    return voices.find(function (v) { return v.lang && v.lang.startsWith('zh'); }) || null;
  }

  /** Stop any in-progress speech synthesis playback. */
  function stopSpeaking() {
    if (!window.speechSynthesis) return;
    isSpeakingFlag = false;
    currentSpeechId = null;
    window.speechSynthesis.cancel();
  }

  /** @returns {boolean} whether speech synthesis is currently playing. */
  function isSpeaking() {
    return isSpeakingFlag;
  }

  /**
   * Speaks the given text using the browser's speech synthesis.
   *
   * If the same `id` is passed while it is still speaking, the playback stops
   * (toggle behaviour). Calling with a different `id` cancels the previous
   * utterance and starts the new one.
   */
  function speak(text, options) {
    options = options || {};
    const id = options.id || null;

    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
      if (window.MandoUi && typeof window.MandoUi.toast === 'function') {
        window.MandoUi.toast('Text-to-speech is not supported in this browser.', 'error');
      }
      return;
    }

    const normalized = String(text || '').trim();
    if (!normalized) return;

    // Toggle: pressing the same line again stops playback.
    if (id && id === currentSpeechId && isSpeakingFlag) {
      stopSpeaking();
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new window.SpeechSynthesisUtterance(normalized);
    utterance.lang = options.lang || 'zh-CN';
    utterance.rate = typeof options.rate === 'number' ? options.rate : 0.9;

    const zhVoice = getChineseVoice();
    if (zhVoice) utterance.voice = zhVoice;

    utterance.onstart = function () {
      isSpeakingFlag = true;
      currentSpeechId = id;
      if (typeof options.onStart === 'function') options.onStart(id);
    };

    utterance.onend = function () {
      isSpeakingFlag = false;
      if (currentSpeechId === id) currentSpeechId = null;
      if (typeof options.onEnd === 'function') options.onEnd(id);
    };

    utterance.onerror = function (e) {
      isSpeakingFlag = false;
      if (currentSpeechId === id) currentSpeechId = null;
      console.warn('Speech synthesis error', e.error);
      if (e.error === 'not-allowed') {
        if (window.MandoUi && typeof window.MandoUi.toast === 'function') {
          window.MandoUi.toast('Speech playback was blocked. Check browser permissions.', 'error');
        }
      } else if (e.error !== 'canceled' && e.error !== 'interrupted') {
        if (window.MandoUi && typeof window.MandoUi.toast === 'function') {
          window.MandoUi.toast('Could not play speech. Try again.', 'error');
        }
      }
      if (typeof options.onEnd === 'function') options.onEnd(id);
    };

    window.speechSynthesis.speak(utterance);
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  window.MandoUtils = {
    safeLocalStorageGet,
    safeLocalStorageSet,
    safeLocalStorageRemove,
    getStoredProgress,
    getUserId,
    deriveNameFromUserId,
    getDisplayName,
    isAdmin,
    persistUserId,
    uuid,
    formatDate,
    today,
    daysAgo,
    formatTime,
    formatDuration,
    formatRemaining,
    escapeHtml,
    extractHsk,
    inferHskLabel,
    difficultyFromHsk,
    thumbnailUrl,
    $,
    setText,
    setAttr,
    setHtml,
    speak,
    stopSpeaking,
    isSpeaking,
    convertChinese,
  };
})(window);
