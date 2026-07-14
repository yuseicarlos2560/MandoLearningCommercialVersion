/**
 * MandoLearning — Lightweight Pinyin Helper
 *
 * Lazy-loads pinyin-pro from jsDelivr CDN and exposes a simple API for
 * converting Chinese characters to pinyin. The library is only fetched
 * the first time a pinyin conversion is needed.
 *
 * Usage:
 *   import { getPinyin, initAutoPinyin } from './pinyin-helper.js';
 *
 *   // Convert on demand
 *   const py = await getPinyin('中文'); // 'zhōng wén'
 *
 *   // Auto-fill an input when the user leaves the character field
 *   initAutoPinyin(document.getElementById('character'), document.getElementById('pinyin'));
 */

const PINYIN_PRO_CDN = 'https://cdn.jsdelivr.net/npm/pinyin-pro@3.25.0/dist/index.js';

let loadPromise = null;

/**
 * Ensure pinyin-pro is loaded. Returns the `pinyin` function.
 */
function loadPinyinPro() {
    if (loadPromise) return loadPromise;

    loadPromise = new Promise((resolve, reject) => {
        if (typeof window === 'undefined') {
            reject(new Error('pinyin-helper requires a browser window'));
            return;
        }

        const existing = window.pinyinPro?.pinyin;
        if (typeof existing === 'function') {
            resolve(existing);
            return;
        }

        const script = document.createElement('script');
        script.src = PINYIN_PRO_CDN;
        script.async = true;
        script.crossOrigin = 'anonymous';
        script.onload = () => {
            const fn = window.pinyinPro?.pinyin;
            if (typeof fn === 'function') {
                resolve(fn);
            } else {
                reject(new Error('pinyin-pro loaded but window.pinyinPro.pinyin was not found'));
            }
        };
        script.onerror = () => reject(new Error('Failed to load pinyin-pro from CDN'));
        document.head.appendChild(script);
    });

    return loadPromise;
}

/**
 * Convert Chinese text to tone-mark pinyin.
 * @param {string} text
 * @param {Object} [options] — pinyin-pro options
 * @returns {Promise<string>}
 */
export async function getPinyin(text, options = {}) {
    if (!text || typeof text !== 'string') return '';

    const pinyin = await loadPinyinPro();
    return pinyin(text, {
        toneType: 'symbol',
        type: 'string',
        ...options,
    });
}

/**
 * Wire a character input so that pinyin is auto-filled on blur
 * when the pinyin field is empty and the character field contains Chinese.
 *
 * @param {HTMLInputElement | null} characterInput
 * @param {HTMLInputElement | null} pinyinInput
 * @param {Object} [options] — pinyin-pro options
 */
export function initAutoPinyin(characterInput, pinyinInput, options = {}) {
    if (!characterInput || !pinyinInput) return;

    characterInput.addEventListener('blur', async () => {
        const chars = characterInput.value.trim();
        if (!chars) return;
        if (pinyinInput.value.trim()) return; // respect user edits

        try {
            const py = await getPinyin(chars, options);
            if (py && !pinyinInput.value.trim()) {
                pinyinInput.value = py;
            }
        } catch (err) {
            // Non-blocking: manual entry still works if CDN fails.
            console.warn('[Mando] Pinyin lookup failed:', err);
        }
    });
}
