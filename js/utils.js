/**
 * Shared utility helpers for MandoLearning frontend.
 *
 * These functions are used across multiple page handlers and shell components.
 * Keeping them in one place avoids duplication and keeps page handlers focused
 * on page-specific behavior.
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
    const params = new URLSearchParams(window.location.search);
    return params.get('userId') || safeLocalStorageGet('mando.userId') || null;
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
  };
})(window);
