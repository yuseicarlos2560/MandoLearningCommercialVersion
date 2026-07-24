/**
 * Word lookup popover.
 *
 * Exposes:
 *   MandoWordLookup.show(anchorEl, card)
 *   MandoWordLookup.hide()
 *
 * Renders a small interactive popover anchored near `anchorEl` showing the
 * card's character, pinyin, meaning, HSK/category chips, a TTS button and a
 * link to study the card's deck. One popover at a time; closes on outside
 * click or Escape. Styled with Tailwind utilities only (no external CSS).
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

  /** 'BUSINESS_MANDARIN' → 'Business Mandarin' (mirrors flashcards.js displayCategory). */
  function displayCategory(category) {
    return String(category || 'MISCELLANEOUS')
      .split(/[_\s]+/)
      .filter(Boolean)
      .map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(); })
      .join(' ');
  }

  let popoverEl = null;

  function onDocumentClick(e) {
    if (popoverEl && !popoverEl.contains(e.target)) hide();
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') hide();
  }

  function hide() {
    if (!popoverEl) return;
    popoverEl.remove();
    popoverEl = null;
    document.removeEventListener('click', onDocumentClick, true);
    document.removeEventListener('keydown', onKeyDown, true);
  }

  /** Anchor above the tile when there is room, otherwise below; clamp horizontally. */
  function positionPopover(popover, anchor) {
    const rect = anchor.getBoundingClientRect();
    const popRect = popover.getBoundingClientRect();
    let top = rect.top - popRect.height - 8;
    let left = rect.left + rect.width / 2 - popRect.width / 2;

    if (left < 8) left = 8;
    if (left + popRect.width > window.innerWidth - 8) {
      left = window.innerWidth - popRect.width - 8;
    }
    if (top < 8) {
      top = rect.bottom + 8;
    }

    popover.style.top = `${top + window.scrollY}px`;
    popover.style.left = `${left + window.scrollX}px`;
  }

  function show(anchorEl, card) {
    if (!anchorEl || !card) return;
    hide();

    const hsk = String(card.hsk || '').replace(/\s+/g, '');
    const hskLabel = hsk ? hsk.replace('HSK', 'HSK ') : '';
    const deckHref = `study-mode.html?mode=random&category=${encodeURIComponent(card.category || 'MISCELLANEOUS')}`;

    const popover = document.createElement('div');
    popover.className = 'mando-word-lookup absolute w-[280px] bg-surface rounded-2xl shadow-2xl border border-outline-variant p-md z-[100]';
    popover.style.top = '-9999px';
    popover.style.left = '-9999px';
    popover.innerHTML = `
      <div class="flex items-start justify-between gap-sm">
        <span class="font-character-display text-3xl text-primary">${escapeHtml(card.character || '')}</span>
        <button type="button" data-role="speak" title="Listen" class="w-8 h-8 rounded-full bg-primary-container/40 text-primary flex items-center justify-center hover:bg-primary-container transition-colors shrink-0">
          <span class="material-symbols-outlined text-[18px]">volume_up</span>
        </button>
      </div>
      <p class="text-sm font-bold text-on-surface mt-sm">${escapeHtml(card.pinyin || '')}</p>
      <p class="text-xs text-on-surface-variant mt-xs">${escapeHtml(card.meaning || '')}</p>
      <div class="flex flex-wrap items-center gap-xs mt-md">
        ${hskLabel ? `<span class="px-sm py-xs rounded-lg bg-primary-container/40 text-on-primary-container text-[10px] font-bold">${escapeHtml(hskLabel)}</span>` : ''}
        <span class="px-sm py-xs rounded-lg bg-surface-container-low text-on-surface-variant text-[10px] font-bold">${escapeHtml(displayCategory(card.category))}</span>
      </div>
      <a href="${deckHref}" class="inline-flex items-center gap-xs text-xs font-bold text-primary mt-md hover:underline">
        Study this deck
        <span class="material-symbols-outlined text-[14px]">arrow_forward</span>
      </a>
    `;

    const speakBtn = popover.querySelector('[data-role="speak"]');
    speakBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (MandoUtils.speak && card.character) {
        MandoUtils.speak(card.character, { id: 'word-lookup-' + (card.flashCardId || card.character) });
      }
    });

    document.body.appendChild(popover);
    popoverEl = popover;
    positionPopover(popover, anchorEl);

    // Capture phase: listeners added during the opening click's bubble phase
    // will not fire for that same event.
    document.addEventListener('click', onDocumentClick, true);
    document.addEventListener('keydown', onKeyDown, true);
  }

  window.MandoWordLookup = {
    show: show,
    hide: hide,
  };
})(window);
