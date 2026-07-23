/**
 * Reusable HSK level legend.
 *
 * Exposes:
 *   MandoComponents.renderHskLegend(container, options)
 *
 * Options:
 *   - mode: 'all' | 'focused' (default 'all')
 *   - hskLevel: string like 'HSK4' — used by focused mode to pick the band
 *   - highlightEnabled: boolean — if true, the legend label says highlighting is on
 */

(function (window) {
  'use strict';

  const HSK_LEVELS = ['HSK1', 'HSK2', 'HSK3', 'HSK4', 'HSK5', 'HSK6'];

  const LEVEL_META = {
    HSK1: { label: 'HSK 1', colorClass: 'hsk1' },
    HSK2: { label: 'HSK 2', colorClass: 'hsk2' },
    HSK3: { label: 'HSK 3', colorClass: 'hsk3' },
    HSK4: { label: 'HSK 4', colorClass: 'hsk4' },
    HSK5: { label: 'HSK 5', colorClass: 'hsk5' },
    HSK6: { label: 'HSK 6', colorClass: 'hsk6' },
    BEYOND: { label: 'Beyond', colorClass: 'beyond' },
    MODERN: { label: 'Modern', colorClass: 'modern' },
  };

  function extractLevelNumber(level) {
    const match = String(level || '').match(/(\d)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  function focusedBand(level) {
    const n = extractLevelNumber(level);
    if (n >= 4) {
      return ['HSK4', 'HSK5', 'HSK6', 'BEYOND'];
    }
    return ['HSK1', 'HSK2', 'HSK3'];
  }

  function renderHskLegend(container, options) {
    options = options || {};
    const mode = options.mode === 'focused' ? 'focused' : 'all';
    const levels = mode === 'focused' ? focusedBand(options.hskLevel) : HSK_LEVELS.concat(['BEYOND', 'MODERN']);

    if (typeof container === 'string') {
      container = document.getElementById(container);
    }
    if (!container) return;

    const items = levels.map(function (level) {
      const meta = LEVEL_META[level] || { label: level, colorClass: level.toLowerCase() };
      return `
        <div class="flex items-center gap-xs">
          <span class="w-3 h-3 rounded-full ${meta.colorClass}"></span>
          <span class="text-xs text-on-surface-variant">${meta.label}</span>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="flex flex-wrap items-center gap-x-md gap-y-xs">
        ${items}
      </div>
      ${options.highlightEnabled === false ? '<p class="text-xs text-on-surface-variant/70 mt-xs">Highlighting is off.</p>' : ''}
    `;
  }

  window.MandoComponents = window.MandoComponents || {};
  window.MandoComponents.renderHskLegend = renderHskLegend;
  window.MandoComponents.HSK_LEVELS = HSK_LEVELS;
})(window);
