/**
 * MandoLearning — Shared UI Components
 *
 * Lightweight DOM-based UI helpers: toast, modal, confirm dialog, loading spinner.
 * No external dependencies. All components are created on-demand and removed after use.
 *
 * Usage:
 *   import { toast, modal, confirm, spinner } from './ui-components.js';
 *   toast.success('Saved!');
 *   toast.error('Something went wrong');
 *   const ok = await confirm('Delete this note?');
 *   modal.open({ title: 'Details', content: htmlElement });
 *   spinner.show('Saving...');
 *   spinner.hide();
 */

// =============================================================================
// TOAST SYSTEM
// =============================================================================

const TOAST_DURATION = 4000; // ms
const TOAST_CONTAINER_ID = 'mando-toast-container';

function _ensureToastContainer() {
    let container = document.getElementById(TOAST_CONTAINER_ID);
    if (!container) {
        container = document.createElement('div');
        container.id = TOAST_CONTAINER_ID;
        container.className =
            'fixed bottom-lg right-lg z-[100] flex flex-col gap-sm pointer-events-none';
        document.body.appendChild(container);
    }
    return container;
}

/**
 * Show a toast notification.
 * @param {string} message
 * @param {'success' | 'error' | 'warning' | 'info'} type
 */
export function toast(message, type = 'info') {
    const container = _ensureToastContainer();

    const el = document.createElement('div');
    const colors = {
        success: 'bg-primary-container text-on-primary-container border-primary',
        error: 'bg-error-container text-on-error-container border-error',
        warning: 'bg-secondary-container text-on-secondary-container border-secondary',
        info: 'bg-surface-container-high text-on-surface border-outline',
    };
    const icons = {
        success: 'check_circle',
        error: 'error',
        warning: 'warning',
        info: 'info',
    };

    el.className = `
        pointer-events-auto flex items-center gap-sm px-md py-sm rounded-xl
        border shadow-lg font-body-md text-body-md
        animate-slide-up transition-all duration-300
        ${colors[type] || colors.info}
    `;
    el.innerHTML = `
        <span class="material-symbols-outlined text-[20px]">${icons[type] || icons.info}</span>
        <span>${escapeHtml(message)}</span>
    `;

    container.appendChild(el);

    // Auto-dismiss
    setTimeout(() => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(8px)';
        setTimeout(() => el.remove(), 300);
    }, TOAST_DURATION);
}

toast.success = (msg) => toast(msg, 'success');
toast.error = (msg) => toast(msg, 'error');
toast.warning = (msg) => toast(msg, 'warning');
toast.info = (msg) => toast(msg, 'info');

// =============================================================================
// MODAL DIALOG
// =============================================================================

const MODAL_OVERLAY_ID = 'mando-modal-overlay';

function _ensureModalOverlay() {
    let overlay = document.getElementById(MODAL_OVERLAY_ID);
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = MODAL_OVERLAY_ID;
        overlay.className =
            'fixed inset-0 z-[90] hidden items-center justify-center bg-inverse-surface/40 backdrop-blur-sm p-md';
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) modal.close();
        });
        document.body.appendChild(overlay);
    }
    return overlay;
}

export const modal = {
    /**
     * Open a modal dialog.
     * @param {Object} opts
     * @param {string} [opts.title]
     * @param {HTMLElement | string} opts.content — HTML element or string
     * @param {string} [opts.confirmText] — if provided, shows a confirm button
     * @param {string} [opts.cancelText='Cancel']
     * @param {Function} [opts.onConfirm]
     * @param {Function} [opts.onCancel]
     */
    open(opts) {
        const overlay = _ensureModalOverlay();
        overlay.innerHTML = '';
        overlay.classList.remove('hidden');
        overlay.classList.add('flex');

        const panel = document.createElement('div');
        panel.className =
            'bg-surface-container-lowest rounded-3xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto custom-scrollbar p-lg border border-outline-variant animate-slide-up';

        // Header
        if (opts.title) {
            const header = document.createElement('div');
            header.className = 'flex items-center justify-between mb-md';
            header.innerHTML = `
                <h3 class="font-headline-md text-headline-md text-on-surface">${escapeHtml(opts.title)}</h3>
                <button class="material-symbols-outlined text-on-surface-variant hover:bg-surface-container p-xs rounded-full transition-colors" id="mando-modal-close">
                    close
                </button>
            `;
            panel.appendChild(header);
            header.querySelector('#mando-modal-close').addEventListener('click', () => this.close());
        }

        // Content
        const content = document.createElement('div');
        content.className = 'mb-md';
        if (opts.content instanceof HTMLElement) {
            content.appendChild(opts.content);
        } else {
            content.innerHTML = opts.content;
        }
        panel.appendChild(content);

        // Actions
        if (opts.confirmText) {
            const actions = document.createElement('div');
            actions.className = 'flex justify-end gap-sm pt-sm border-t border-outline-variant';
            actions.innerHTML = `
                <button class="px-md py-xs rounded-lg text-on-surface font-medium border border-outline-variant hover:bg-surface-container transition-all font-body-md" id="mando-modal-cancel">
                    ${escapeHtml(opts.cancelText || 'Cancel')}
                </button>
                <button class="px-md py-xs rounded-lg bg-primary text-on-primary font-medium hover:bg-primary-dim transition-all shadow-md font-body-md" id="mando-modal-confirm">
                    ${escapeHtml(opts.confirmText)}
                </button>
            `;
            panel.appendChild(actions);

            actions.querySelector('#mando-modal-cancel').addEventListener('click', () => {
                if (opts.onCancel) opts.onCancel();
                this.close();
            });
            actions.querySelector('#mando-modal-confirm').addEventListener('click', () => {
                if (opts.onConfirm) opts.onConfirm();
                this.close();
            });
        }

        overlay.appendChild(panel);
        document.body.style.overflow = 'hidden'; // prevent background scroll
    },

    close() {
        const overlay = document.getElementById(MODAL_OVERLAY_ID);
        if (overlay) {
            overlay.classList.add('hidden');
            overlay.classList.remove('flex');
            overlay.innerHTML = '';
        }
        document.body.style.overflow = '';
    },
};

// =============================================================================
// CONFIRM DIALOG (promise-based)
// =============================================================================

/**
 * Show a confirm dialog. Returns a Promise that resolves to true/false.
 * @param {string} message
 * @param {string} [confirmText='Confirm']
 * @param {string} [cancelText='Cancel']
 * @returns {Promise<boolean>}
 */
export function confirm(message, confirmText = 'Confirm', cancelText = 'Cancel') {
    return new Promise((resolve) => {
        modal.open({
            title: 'Confirm',
            content: `<p class="font-body-md text-body-md text-on-surface">${escapeHtml(message)}</p>`,
            confirmText,
            cancelText,
            onConfirm: () => resolve(true),
            onCancel: () => resolve(false),
        });
    });
}

// =============================================================================
// LOADING SPINNER
// =============================================================================

const SPINNER_ID = 'mando-spinner-overlay';

export const spinner = {
    /**
     * Show a full-screen loading spinner with optional message.
     * @param {string} [message='Loading...']
     */
    show(message = 'Loading...') {
        let overlay = document.getElementById(SPINNER_ID);
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = SPINNER_ID;
            overlay.className =
                'fixed inset-0 z-[100] flex flex-col items-center justify-center bg-surface/80 backdrop-blur-sm';
            document.body.appendChild(overlay);
        }
        overlay.classList.remove('hidden');
        overlay.innerHTML = `
            <div class="w-12 h-12 border-4 border-primary-container border-t-primary rounded-full animate-spin mb-sm"></div>
            <p class="font-body-md text-body-md text-on-surface">${escapeHtml(message)}</p>
        `;
        document.body.style.overflow = 'hidden';
    },

    hide() {
        const overlay = document.getElementById(SPINNER_ID);
        if (overlay) {
            overlay.classList.add('hidden');
            overlay.innerHTML = '';
        }
        document.body.style.overflow = '';
    },
};

// =============================================================================
// UTILITY
// =============================================================================

/**
 * Escape HTML special characters to prevent XSS.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
    if (typeof str !== 'string') return String(str);
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
