/**
 * Shared "Save Word" modal + pending-words drawer.
 *
 * Exposes window.MandoSaveWord:
 *   - init(adapter)   wire the modal/drawer to a page's pending-change queue.
 *                     adapter = { onQueue, listPending, editEntry, removeEntry, flush }
 *   - open(prefill?)  reset and show the Save Word modal
 *   - openDrawer()    show the pending-words drawer
 *
 * The markup is injected into document.body on load, so pages only need to
 * include this script and keep their #fab-save-word button.
 */

(function (window) {
  'use strict';

  const document = window.document;
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

  const HSK_LEVELS = ['HSK1', 'HSK2', 'HSK3', 'HSK4', 'HSK5', 'HSK6'];

  let adapter = null;
  let saveWordPinyin = { reset: function () {} };
  let drawerOpen = false;

  function $(id) {
    return document.getElementById(id);
  }

  function normalizeCategory(raw) {
    return (String(raw || '').trim() || 'Miscellaneous').toUpperCase().replace(/\s+/g, '_');
  }

  // ---------------------------------------------------------------------------
  // Markup injection
  // ---------------------------------------------------------------------------

  const MODAL_HTML = `
<div id="save-word-modal" class="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm items-center justify-center p-md hidden">
  <div class="bg-surface rounded-3xl shadow-2xl w-full max-w-md p-lg border border-outline-variant" role="dialog" aria-modal="true" aria-labelledby="sw-title">
    <div class="flex items-center gap-sm mb-md">
      <span class="material-symbols-outlined text-primary text-2xl">edit_note</span>
      <h3 id="sw-title" class="font-headline-md text-headline-md text-on-surface">Save Word</h3>
    </div>
    <form id="sw-form" class="space-y-md">
      <div>
        <label class="block font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider mb-xs" for="sw-character">Chinese <span class="text-primary">*</span></label>
        <input id="sw-character" class="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg px-sm py-xs font-character-display text-xl text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none" placeholder="e.g. 留学" type="text" maxlength="25" required/>
      </div>
      <div class="grid grid-cols-2 gap-sm">
        <div>
          <label class="block font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider mb-xs" for="sw-pinyin">Pinyin <span class="text-on-surface-variant/70 normal-case">(auto-filled)</span></label>
          <input id="sw-pinyin" class="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg px-sm py-xs text-body-md text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none" placeholder="Auto-filled" type="text" maxlength="250"/>
        </div>
        <div>
          <label class="block font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider mb-xs" for="sw-hsk">HSK Level <span class="text-primary">*</span></label>
          <select id="sw-hsk" class="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg px-sm py-xs text-body-md text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none">
            <option value="HSK1">HSK 1</option>
            <option value="HSK2">HSK 2</option>
            <option value="HSK3" selected>HSK 3</option>
            <option value="HSK4">HSK 4</option>
            <option value="HSK5">HSK 5</option>
            <option value="HSK6">HSK 6</option>
          </select>
        </div>
      </div>
      <div id="sw-deck-fields">
        <div class="mb-md">
          <label class="block font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider mb-xs" for="sw-meaning">English Meaning</label>
          <input id="sw-meaning" class="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg px-sm py-xs text-body-md text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none" placeholder="e.g. to study abroad" type="text" maxlength="150"/>
        </div>
        <div>
          <label class="block font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider mb-xs" for="sw-category">Deck (for flashcard)</label>
          <input id="sw-category" class="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg px-sm py-xs text-body-md text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none" placeholder="Miscellaneous" type="text" maxlength="50"/>
        </div>
      </div>
      <p id="sw-error" class="text-error text-sm hidden"></p>
      <div class="flex justify-end gap-sm pt-sm">
        <button type="button" id="sw-cancel" class="px-md py-xs rounded-lg border border-outline-variant text-on-surface font-body-md hover:bg-surface-container transition-all">Cancel</button>
        <button type="submit" id="sw-submit" class="px-md py-xs rounded-lg bg-primary text-on-primary font-body-md hover:bg-primary-dim transition-all shadow-md">Save Word</button>
      </div>
    </form>
  </div>
</div>`;

  const DRAWER_HTML = `
<div id="pwd-scrim" class="fixed inset-0 bg-black/40 z-[65] hidden"></div>
<aside id="pwd-drawer" class="fixed top-0 right-0 h-full w-[380px] max-w-[90vw] bg-surface border-l border-outline-variant shadow-2xl z-[70] hidden flex-col" aria-label="Pending words">
  <div class="flex items-center justify-between p-md border-b border-outline-variant shrink-0">
    <div class="flex items-center gap-sm">
      <span class="material-symbols-outlined text-primary">bookmark_add</span>
      <h3 id="pwd-title" class="font-headline-md text-headline-md text-on-surface">Pending Words (0)</h3>
    </div>
    <button id="pwd-close" type="button" class="p-xs rounded-lg hover:bg-surface-container transition-colors text-on-surface-variant" aria-label="Close pending words">
      <span class="material-symbols-outlined">close</span>
    </button>
  </div>
  <div id="pwd-list" class="flex-1 overflow-y-auto p-md space-y-md custom-scrollbar"></div>
  <div id="pwd-footer" class="p-md border-t border-outline-variant flex gap-sm shrink-0">
    <button id="pwd-save-all" type="button" class="flex-1 px-md py-xs rounded-lg bg-primary text-on-primary font-body-md hover:bg-primary-dim transition-all shadow-md">Save All (0)</button>
    <button id="pwd-discard-all" type="button" class="px-md py-xs rounded-lg border border-outline-variant text-on-surface font-body-md hover:bg-surface-container transition-all">Discard All</button>
  </div>
</aside>`;

  function injectMarkup() {
    if (!document.body) return;
    document.body.insertAdjacentHTML('beforeend', MODAL_HTML);
    document.body.insertAdjacentHTML('beforeend', DRAWER_HTML);
  }

  // This script is included in <head>, so body may not exist yet.
  if (document.body) {
    injectMarkup();
  } else {
    document.addEventListener('DOMContentLoaded', injectMarkup);
  }

  // ---------------------------------------------------------------------------
  // Save Word modal
  // ---------------------------------------------------------------------------

  function showError(message) {
    const error = $('sw-error');
    if (!error) return;
    error.textContent = message;
    error.classList.remove('hidden');
  }

  function closeModal() {
    const modal = $('save-word-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  function open(prefill) {
    const modal = $('save-word-modal');
    if (!modal) return;

    const setVal = function (id, value) { const el = $(id); if (el) el.value = value; };
    setVal('sw-character', prefill && prefill.character ? prefill.character : '');
    setVal('sw-pinyin', prefill && prefill.pinyin ? prefill.pinyin : '');
    setVal('sw-meaning', '');
    setVal('sw-category', '');
    const hsk = $('sw-hsk');
    if (hsk) hsk.value = 'HSK3';
    const error = $('sw-error');
    if (error) {
      error.classList.add('hidden');
      error.textContent = '';
    }

    saveWordPinyin.reset({ auto: true });
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    const charInput = $('sw-character');
    if (charInput) charInput.focus();
  }

  function onSubmit(event) {
    event.preventDefault();
    if (!adapter) return;

    const character = ($('sw-character') ? $('sw-character').value : '').trim();
    const pinyin = ($('sw-pinyin') ? $('sw-pinyin').value : '').trim();
    const meaning = ($('sw-meaning') ? $('sw-meaning').value : '').trim();
    const hsk = $('sw-hsk') ? $('sw-hsk').value : 'HSK3';
    const categoryRaw = ($('sw-category') ? $('sw-category').value : '').trim();

    if (!character) {
      showError('Chinese character(s) are required.');
      return;
    }

    adapter.onQueue({
      character: character,
      pinyin: pinyin,
      meaning: meaning,
      hsk: hsk,
      category: normalizeCategory(categoryRaw),
    });

    closeModal();
    const count = adapter.listPending().length;
    window.MandoUi.toast('"' + character + '" queued', 'success', {
      actionLabel: 'Review (' + count + ')',
      onAction: openDrawer,
    });
  }

  // ---------------------------------------------------------------------------
  // Pending-words drawer
  // ---------------------------------------------------------------------------

  const ROW_INPUT_CLASS = 'w-full bg-surface-container-low border border-outline-variant/50 rounded-lg px-sm py-xs text-sm text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none';

  function hskOptions(selected) {
    return HSK_LEVELS.map(function (level) {
      const sel = level === selected ? ' selected' : '';
      return '<option value="' + level + '"' + sel + '>' + level.replace('HSK', 'HSK ') + '</option>';
    }).join('');
  }

  function renderDrawer() {
    const list = $('pwd-list');
    if (!list || !adapter) return;

    const entries = adapter.listPending();

    const title = $('pwd-title');
    if (title) title.textContent = 'Pending Words (' + entries.length + ')';
    const saveAll = $('pwd-save-all');
    if (saveAll) saveAll.textContent = 'Save All (' + entries.length + ')';
    const footer = $('pwd-footer');
    if (footer) footer.classList.toggle('hidden', entries.length === 0);

    if (entries.length === 0) {
      list.innerHTML =
        '<div class="h-full flex flex-col items-center justify-center text-center gap-sm py-xl">' +
          '<span class="material-symbols-outlined text-5xl text-on-surface-variant">bookmark_add</span>' +
          '<p class="text-sm text-on-surface-variant">No pending words &mdash; select text and hit Save Word.</p>' +
        '</div>';
      return;
    }

    list.innerHTML = entries.map(function (entry) {
      return (
        '<div class="bg-surface-container-low rounded-2xl border border-outline-variant/50 p-sm space-y-xs" data-pwd-id="' + escapeHtml(entry.id) + '">' +
          '<div class="flex items-start gap-xs">' +
            '<input data-pwd-field="character" class="' + ROW_INPUT_CLASS + ' font-character-display text-2xl" type="text" maxlength="25" value="' + escapeHtml(entry.character) + '" placeholder="Chinese"/>' +
            '<button type="button" data-pwd-remove class="p-xs rounded-lg hover:bg-surface-container transition-colors text-on-surface-variant shrink-0" aria-label="Remove word">' +
              '<span class="material-symbols-outlined">close</span>' +
            '</button>' +
          '</div>' +
          '<input data-pwd-field="pinyin" class="' + ROW_INPUT_CLASS + '" type="text" maxlength="250" value="' + escapeHtml(entry.pinyin) + '" placeholder="Pinyin"/>' +
          '<input data-pwd-field="meaning" class="' + ROW_INPUT_CLASS + '" type="text" maxlength="150" value="' + escapeHtml(entry.meaning) + '" placeholder="English meaning"/>' +
          '<input data-pwd-field="category" class="' + ROW_INPUT_CLASS + '" type="text" maxlength="50" value="' + escapeHtml(entry.category) + '" placeholder="Deck"/>' +
          '<select data-pwd-field="hsk" class="' + ROW_INPUT_CLASS + '">' + hskOptions(entry.hsk) + '</select>' +
        '</div>'
      );
    }).join('');

    list.querySelectorAll('[data-pwd-id]').forEach(function (row) {
      const id = row.getAttribute('data-pwd-id');

      row.querySelectorAll('[data-pwd-field]').forEach(function (input) {
        input.addEventListener('input', function () {
          const field = input.getAttribute('data-pwd-field');
          const value = field === 'category' ? normalizeCategory(input.value) : input.value;
          adapter.editEntry(id, { [field]: value });
        });
      });

      const removeBtn = row.querySelector('[data-pwd-remove]');
      if (removeBtn) {
        removeBtn.addEventListener('click', function () {
          adapter.removeEntry(id);
          renderDrawer();
        });
      }
    });
  }

  function openDrawer() {
    if (!adapter) return;
    renderDrawer();
    const scrim = $('pwd-scrim');
    const drawer = $('pwd-drawer');
    if (scrim) scrim.classList.remove('hidden');
    if (drawer) {
      drawer.classList.remove('hidden');
      drawer.classList.add('flex');
    }
    drawerOpen = true;
  }

  function closeDrawer() {
    const scrim = $('pwd-scrim');
    const drawer = $('pwd-drawer');
    if (scrim) scrim.classList.add('hidden');
    if (drawer) {
      drawer.classList.add('hidden');
      drawer.classList.remove('flex');
    }
    drawerOpen = false;
  }

  function onSaveAll() {
    if (!adapter) return;
    Promise.resolve(adapter.flush()).then(function () {
      renderDrawer();
      if (adapter.listPending().length === 0) closeDrawer();
    });
  }

  function onDiscardAll() {
    if (!adapter) return;
    window.MandoUi.confirm('Discard all pending words?', 'This cannot be undone.').then(function (confirmed) {
      if (!confirmed) return;
      adapter.listPending().forEach(function (entry) {
        adapter.removeEntry(entry.id);
      });
      renderDrawer();
    });
  }

  // ---------------------------------------------------------------------------
  // Wiring
  // ---------------------------------------------------------------------------

  function wireStaticEvents() {
    const scrim = $('pwd-scrim');
    if (scrim) scrim.addEventListener('click', closeDrawer);
    const closeBtn = $('pwd-close');
    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
    const saveAll = $('pwd-save-all');
    if (saveAll) saveAll.addEventListener('click', onSaveAll);
    const discardAll = $('pwd-discard-all');
    if (discardAll) discardAll.addEventListener('click', onDiscardAll);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawerOpen) closeDrawer();
    });
  }

  if (document.body) {
    wireStaticEvents();
  } else {
    document.addEventListener('DOMContentLoaded', wireStaticEvents);
  }

  /**
   * Bind the component to a page's pending-change queue.
   * @param {{onQueue: function, listPending: function, editEntry: function,
   *          removeEntry: function, flush: function}} pageAdapter
   */
  function init(pageAdapter) {
    adapter = pageAdapter;

    const cancel = $('sw-cancel');
    if (cancel) cancel.addEventListener('click', closeModal);
    const form = $('sw-form');
    if (form) form.addEventListener('submit', onSubmit);
    const modal = $('save-word-modal');
    if (modal) {
      modal.addEventListener('click', function (e) {
        if (e.target === modal) closeModal();
      });
    }

    if (window.MandoPinyin) {
      saveWordPinyin = window.MandoPinyin.autoFill($('sw-character'), $('sw-pinyin'));
    }
  }

  window.MandoSaveWord = {
    init,
    open,
    openDrawer,
    closeDrawer,
  };
})(window);
