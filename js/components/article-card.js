/**
 * Reusable article card component.
 *
 * Exposes:
 *   MandoComponents.createArticleCard(script, options)
 *
 * Returns a DOM element ready to append to a grid/list.
 *
 * Options:
 *   - linkTarget: 'reader' (default) — currently only the reader page is supported
 *   - rootPath: '../' or '' — path prefix for hrefs (default '../')
 */

(function (window) {
  'use strict';

  const MandoUtils = window.MandoUtils || {};
  const escapeHtml = MandoUtils.escapeHtml || function (str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const SCRIPT_TYPE_LABELS = {
    ARTICLE: 'Article',
    NEWS: 'News',
    SPEECH: 'Speech',
  };

  function extractLevelNumber(level) {
    const match = String(level || '').match(/(\d)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  function focusedBand(level) {
    const n = extractLevelNumber(level);
    if (n >= 4) {
      return ['hsk4', 'hsk5', 'hsk6', 'beyond'];
    }
    return ['hsk1', 'hsk2', 'hsk3'];
  }

  function getStatPercent(stats, key) {
    if (!stats || typeof stats !== 'object') return 0;
    const value = stats[key];
    return typeof value === 'number' ? value : 0;
  }

  function renderMiniBar(stats, level) {
    const band = focusedBand(level);
    const segments = band.map(function (key) {
      const percent = getStatPercent(stats, key);
      if (percent <= 0) return '';
      return `<span class="${key}" style="width:${percent.toFixed(1)}%" title="${key}: ${percent.toFixed(1)}%"></span>`;
    }).join('');
    return `<div class="hsk-mini-bar" aria-label="HSK distribution">${segments || '<span class="beyond" style="width:100%"></span>'}</div>`;
  }

  function createArticleCard(script, options) {
    options = options || {};
    const rootPath = typeof options.rootPath === 'string' ? options.rootPath : '../';
    const typeLabel = SCRIPT_TYPE_LABELS[script.scriptType] || 'Article';
    const hskLevel = script.hskLevel || '';
    const hskDisplay = hskLevel ? hskLevel.replace('HSK', 'HSK ') : '';
    const idiomCount = Array.isArray(script.idioms) ? script.idioms.length : 0;
    const thumb = script.thumbnailUrl || '';
    const hasThumb = !!thumb;
    const href = `${rootPath}pages/script-reader.html?scriptId=${encodeURIComponent(script.scriptId || '')}`;

    const card = document.createElement('a');
    card.href = href;
    card.className = 'group bg-surface-container-lowest rounded-2xl overflow-hidden border border-outline-variant shadow-sm hover:shadow-lg transition-all flex flex-col';

    const thumbnailBlock = hasThumb
      ? `<div class="aspect-[16/9] relative overflow-hidden">
           <img class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src="${escapeHtml(thumb)}" alt="${escapeHtml(script.title)}">
           <div class="absolute top-2 left-2 bg-surface/90 backdrop-blur-sm px-sm py-xs rounded text-[10px] font-bold text-primary border border-primary/20">${escapeHtml(typeLabel)}</div>
           ${hskDisplay ? `<div class="absolute bottom-2 left-2 bg-surface/90 backdrop-blur-sm px-sm py-xs rounded text-[10px] font-bold text-on-surface border border-outline-variant/30">${escapeHtml(hskDisplay)}</div>` : ''}
         </div>`
      : `<div class="aspect-[16/9] bg-surface-container-high flex items-center justify-center relative overflow-hidden">
           <span class="font-character-display text-[64px] text-primary/20 select-none">文</span>
           <div class="absolute top-2 left-2 bg-surface/90 backdrop-blur-sm px-sm py-xs rounded text-[10px] font-bold text-primary border border-primary/20">${escapeHtml(typeLabel)}</div>
           ${hskDisplay ? `<div class="absolute bottom-2 left-2 bg-surface/90 backdrop-blur-sm px-sm py-xs rounded text-[10px] font-bold text-on-surface border border-outline-variant/30">${escapeHtml(hskDisplay)}</div>` : ''}
         </div>`;

    card.innerHTML = `
      ${thumbnailBlock}
      <div class="p-md flex flex-col flex-1">
        <div class="flex items-center justify-between mb-xs">
          <span class="font-label-caps text-label-caps text-secondary bg-secondary-container px-sm py-xs rounded">${escapeHtml(hskDisplay || typeLabel)}</span>
          <div class="flex items-center gap-xs text-on-surface-variant">
            ${script.hasAudio ? '<span class="material-symbols-outlined text-primary text-sm" title="Has audio">volume_up</span>' : ''}
          </div>
        </div>
        <h4 class="font-bold text-on-surface text-base leading-tight group-hover:text-primary transition-colors line-clamp-1">${escapeHtml(script.title)}</h4>
        <p class="text-sm text-on-surface-variant mt-xs line-clamp-2 flex-1">${escapeHtml(script.description || '')}</p>
        <div class="mt-md">
          ${renderMiniBar(script.hskStats, hskLevel)}
          <div class="flex items-center justify-between mt-xs text-xs text-on-surface-variant">
            <span>${idiomCount > 0 ? `${idiomCount} 成语` : 'No idioms'}</span>
            ${script.hasAudio ? '<span class="flex items-center gap-xs"><span class="material-symbols-outlined text-sm">volume_up</span> Audio</span>' : ''}
          </div>
        </div>
      </div>
    `;

    return card;
  }

  window.MandoComponents = window.MandoComponents || {};
  window.MandoComponents.createArticleCard = createArticleCard;
})(window);
