/**
 * Lazy-loaded pinyin-pro wrapper + form auto-fill helper.
 *
 * The pinyin-pro library (same 3.26.0 build used by video-session and
 * script-reader) is only needed inside "add card" forms, so it is injected on
 * first use instead of render-blocking every page load.
 *
 * Exposes:
 * - MandoPinyin.load()                idempotent; resolves when the lib is ready
 * - MandoPinyin.toPinyin(text)        sync; '' until the lib is loaded
 * - MandoPinyin.autoFill(charInput, pinyinInput, [options])
 *     Wires automatic pinyin generation. The helper never clobbers manual
 *     edits: it only writes while the pinyin field is empty or still holds
 *     the previously generated value. Returns a controller with reset().
 */

(function (window) {
  'use strict';

  const CDN_URL = 'https://cdn.jsdelivr.net/npm/pinyin-pro@3.26.0/dist/index.js';

  let loadPromise = null;

  /**
   * Inject the pinyin-pro script once.
   * @returns {Promise<boolean>} resolves true when the lib is usable
   */
  function load() {
    if (getLib()) return Promise.resolve(true);
    if (loadPromise) return loadPromise;

    loadPromise = new Promise(function (resolve) {
      const script = document.createElement('script');
      script.src = CDN_URL;
      script.async = true;
      script.onload = function () { resolve(!!getLib()); };
      script.onerror = function () {
        console.warn('pinyin-pro failed to load; pinyin fields stay manual.');
        resolve(false);
      };
      document.head.appendChild(script);
    });

    return loadPromise;
  }

  function getLib() {
    const lib = window.pinyinPro || window.pinyin;
    return lib && typeof lib.pinyin === 'function' ? lib : null;
  }

  /**
   * Convert Hanzi to pinyin with tone marks (e.g. "nǐ hǎo").
   * Returns '' when the input is blank or the lib is not loaded yet.
   */
  function toPinyin(text) {
    if (!text || !String(text).trim()) return '';
    const lib = getLib();
    if (!lib) return '';
    try {
      return lib.pinyin(String(text).trim(), { toneType: 'symbol' });
    } catch (e) {
      return '';
    }
  }

  /**
   * Wire automatic pinyin generation from a character input into a pinyin
   * input.
   *
   * Rules:
   * - Typing characters regenerates pinyin, unless the user has manually
   *   edited the pinyin field since the last generated value.
   * - Manual pinyin edits stop auto-fill until the field is cleared.
   * - Clearing the character field clears an auto-filled pinyin.
   *
   * @param {HTMLElement} characterInput
   * @param {HTMLElement} pinyinInput
   * @param {{prefillIsManual?: boolean}} [options]
   *        prefillIsManual: pass true in edit forms so an existing pinyin is
   *        preserved until the character actually changes.
   * @returns {{reset: function({auto: boolean}=)}}
   */
  function autoFill(characterInput, pinyinInput, options) {
    if (!characterInput || !pinyinInput) {
      return { reset: function () {} };
    }

    let lastGenerated = '';
    let baseCharacter = String(characterInput.value || '');
    let manual = !!(options && options.prefillIsManual && pinyinInput.value);

    function sync() {
      const charVal = String(characterInput.value || '');
      const charChanged = charVal.trim() !== baseCharacter.trim();
      const generated = toPinyin(charVal);
      baseCharacter = charVal;

      if (!generated) {
        // Blank (or unconvertible) character: only clear an auto-filled value.
        if (!manual && !charVal.trim()) {
          pinyinInput.value = '';
          lastGenerated = '';
        }
        return;
      }

      const current = String(pinyinInput.value || '');
      const untouched = !current || current === lastGenerated;

      // Regenerate when the pinyin is still automatic, or when the character
      // changed out from under a manual/pre-filled value (the old pinyin
      // belongs to the old character).
      if (!manual || untouched || charChanged) {
        pinyinInput.value = generated;
        lastGenerated = generated;
        manual = false;
      }
    }

    characterInput.addEventListener('input', sync);

    pinyinInput.addEventListener('input', function () {
      const current = String(pinyinInput.value || '');
      // A value that differs from the last generated one is a manual edit.
      manual = current !== '' && current !== lastGenerated;
    });

    // Warm the library up front so the first keystroke already converts.
    load().then(function (ready) {
      if (ready && !manual && String(characterInput.value || '').trim()) {
        sync();
      }
    });

    return {
      /**
       * Re-baseline the helper (e.g. each time a modal opens).
       * @param {{auto: boolean}=} state auto=true → start auto-filling;
       *   auto=false → treat the current pinyin as belonging to the current
       *   character (preserved until the character changes).
       */
      reset: function (state) {
        lastGenerated = '';
        baseCharacter = String(characterInput.value || '');
        manual = !(state && state.auto) && !!String(pinyinInput.value || '').trim();
      },
    };
  }

  window.MandoPinyin = {
    load,
    toPinyin,
    autoFill,
  };
})(window);
