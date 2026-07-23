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
 *   - userLevel: stored HSK level, e.g. 'HSK4', used to show a "Recommended" badge
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
  const getDomainFromUrl = MandoUtils.getDomainFromUrl || function () { return ''; };

  const SCRIPT_TYPE_LABELS = {
    ARTICLE: 'Article',
    NEWS: 'News',
    SPEECH: 'Speech',
  };

  const SCRIPT_TYPE_ICONS = {
    ARTICLE: 'article',
    NEWS: 'newspaper',
    SPEECH: 'mic',
  };

  const HSK_BAND_COLORS = {
    hsk1: '#22c55e',
    hsk2: '#0ea5e9',
    hsk3: '#f59e0b',
    hsk4: '#f97316',
    hsk5: '#8b5cf6',
    hsk6: '#ec4899',
    beyond: '#64748b',
    modern: '#14b8a6',
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

  /**
   * Build a normalized HSK distribution bar for the focused band.
   * The displayed segments always fill 100% of the track so the bar never looks empty,
   * while the tooltip preserves the original percentages.
   */
  function renderMiniBar(stats, level) {
    const band = focusedBand(level);
    const segments = band.map(function (key) {
      return { key, percent: getStatPercent(stats, key) };
    });

    const total = segments.reduce(function (sum, s) { return sum + s.percent; }, 0);
    if (total <= 0) {
      return `<div class="hsk-mini-bar" aria-label="HSK distribution"><span class="beyond" style="width:100%"></span></div>`;
    }

    const tooltipParts = segments
      .filter(function (s) { return s.percent > 0; })
      .map(function (s) {
        return `${s.key.toUpperCase().replace('HSK', 'HSK ')}: ${s.percent.toFixed(1)}%`;
      })
      .join(' · ');

    const rendered = segments
      .filter(function (s) { return s.percent > 0; })
      .map(function (s) {
        const normalized = (s.percent / total) * 100;
        return `<span class="${s.key}" style="width:${normalized.toFixed(1)}%"></span>`;
      })
      .join('');

    return `<div class="hsk-mini-bar" aria-label="HSK distribution" title="${escapeHtml(tooltipParts)}">${rendered}</div>`;
  }

  /**
   * Clean up the description text so it doesn't contain raw source URLs.
   */
  function cleanDescription(description) {
    if (!description) return '';
    let text = String(description).trim();
    // Strip common prefixes injected by the helper pipeline.
    text = text.replace(/^Original article:\s*/i, '');
    text = text.replace(/^Source:\s*/i, '');
    return text.trim();
  }

  function normalizeLevel(level) {
    return String(level || '').toUpperCase().replace(/\s+/g, '');
  }

  function createArticleCard(script, options) {
    options = options || {};
    const rootPath = typeof options.rootPath === 'string' ? options.rootPath : '../';
    const userLevel = normalizeLevel(options.userLevel);
    const typeLabel = SCRIPT_TYPE_LABELS[script.scriptType] || 'Article';
    const typeIcon = SCRIPT_TYPE_ICONS[script.scriptType] || 'article';
    const hskLevel = script.hskLevel || '';
    const hskDisplay = hskLevel ? hskLevel.replace('HSK', 'HSK ') : '';
    const idiomCount = Array.isArray(script.idioms) ? script.idioms.length : 0;
    const thumb = script.thumbnailUrl || '';
    const hasThumb = !!thumb;
    const href = `${rootPath}pages/script-reader.html?scriptId=${encodeURIComponent(script.scriptId || '')}`;
    const sourceDomain = getDomainFromUrl(script.sourceUrl);
    const isRecommended = userLevel && normalizeLevel(hskLevel) === userLevel;

    const card = document.createElement('a');
    card.href = href;
    card.className = 'group bg-surface-container-lowest rounded-2xl overflow-hidden border border-outline-variant shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all flex flex-col';

    const thumbnailBlock = hasThumb
      ? `<div class="aspect-[16/9] relative overflow-hidden bg-surface-container-high">
           <img class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src="${escapeHtml(thumb)}" alt="${escapeHtml(script.title)}">
           <div class="absolute top-2 left-2 bg-surface/90 backdrop-blur-sm px-sm py-xs rounded-lg text-[10px] font-bold text-primary border border-primary/20 flex items-center gap-xs">
             <span class="material-symbols-outlined text-[12px]">${typeIcon}</span>
             ${escapeHtml(typeLabel)}
           </div>
           ${hskDisplay ? `<div class="absolute bottom-2 left-2 bg-primary-container/95 backdrop-blur-sm px-sm py-xs rounded-lg text-[10px] font-bold text-on-primary-container border border-primary/20">${escapeHtml(hskDisplay)}</div>` : ''}
           ${isRecommended ? `<div class="absolute top-2 right-2 bg-tertiary-container/95 backdrop-blur-sm px-sm py-xs rounded-lg text-[10px] font-bold text-on-tertiary-container border border-tertiary/20 flex items-center gap-xs"><span class="material-symbols-outlined text-[12px]">star</span> Recommended</div>` : ''}
         </div>`
      : `<div class="aspect-[16/9] relative overflow-hidden bg-gradient-to-br from-surface-container-high to-surface-container flex items-center justify-center">
           <div class="flex flex-col items-center text-on-surface-variant/30">
             <span class="material-symbols-outlined text-[48px]">${typeIcon}</span>
           </div>
           <div class="absolute top-2 left-2 bg-surface/90 backdrop-blur-sm px-sm py-xs rounded-lg text-[10px] font-bold text-primary border border-primary/20 flex items-center gap-xs">
             <span class="material-symbols-outlined text-[12px]">${typeIcon}</span>
             ${escapeHtml(typeLabel)}
           </div>
           ${hskDisplay ? `<div class="absolute bottom-2 left-2 bg-primary-container/95 backdrop-blur-sm px-sm py-xs rounded-lg text-[10px] font-bold text-on-primary-container border border-primary/20">${escapeHtml(hskDisplay)}</div>` : ''}
           ${isRecommended ? `<div class="absolute top-2 right-2 bg-tertiary-container/95 backdrop-blur-sm px-sm py-xs rounded-lg text-[10px] font-bold text-on-tertiary-container border border-tertiary/20 flex items-center gap-xs"><span class="material-symbols-outlined text-[12px]">star</span> Recommended</div>` : ''}
         </div>`;

    const description = cleanDescription(script.description);
    const sourceBlock = sourceDomain
      ? `<div class="flex items-center gap-xs text-xs text-on-surface-variant/80 mt-xs">
           <span class="material-symbols-outlined text-[12px]">link</span>
           <span>${escapeHtml(sourceDomain)}</span>
           <span class="material-symbols-outlined text-[12px]">open_in_new</span>
         </div>`
      : '';

    const idiomBlock = idiomCount > 0
      ? `<span class="inline-flex items-center gap-xs" title="${idiomCount} idiom${idiomCount === 1 ? '' : 's'}">
           <span class="material-symbols-outlined text-[12px]">emoji_objects</span>
           ${idiomCount} 成语
         </span>`
      : '';

    const audioBlock = script.hasAudio
      ? `<span class="inline-flex items-center gap-xs text-primary">
           <span class="material-symbols-outlined text-[12px]">volume_up</span>
           Audio
         </span>`
      : '';

    const metaItems = [idiomBlock, audioBlock].filter(Boolean).join('');
    const metaBlock = metaItems
      ? `<div class="flex items-center gap-md text-xs text-on-surface-variant mt-xs">${metaItems}</div>`
      : '';

    card.innerHTML = `
      ${thumbnailBlock}
      <div class="p-md flex flex-col flex-1">
        <h4 class="font-bold text-on-surface text-base leading-tight group-hover:text-primary transition-colors line-clamp-1">${escapeHtml(script.title)}</h4>
        <p class="text-sm text-on-surface-variant mt-xs line-clamp-2 flex-1">${escapeHtml(description)}</p>
        ${sourceBlock}
        <div class="mt-md pt-md border-t border-outline-variant/30">
          ${renderMiniBar(script.hskStats, hskLevel)}
          ${metaBlock}
        </div>
      </div>
    `;

    return card;
  }

  window.MandoComponents = window.MandoComponents || {};
  window.MandoComponents.createArticleCard = createArticleCard;
})(window);
