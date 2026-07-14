/**
 * MandoLearning — Shared Layout Shell Injector
 *
 * Injects a consistent header + sidebar into every page.
 * Pages should include this script BEFORE main.js and remove their own
 * header/aside markup.
 *
 * Path handling:
 *   - Root pages (e.g. index.html) get paths like "pages/deck-browser.html".
 *   - Pages in /pages/ get paths like "deck-browser.html" and "../index.html".
 */

(function () {
    const pathname = window.location.pathname;
    const inPagesDir = pathname.includes('/pages/');
    const rootPath = inPagesDir ? '../' : '';
    const pagePath = inPagesDir ? '' : 'pages/';

    const pageName = (pathname.split('/').pop() || 'index.html').replace('.html', '') || 'index';

    const isDisabled = 'pointer-events-none opacity-50 cursor-not-allowed';

    const shellHtml = `
    <!-- Mobile sidebar backdrop -->
    <div id="mobile-sidebar-backdrop" class="fixed inset-0 bg-inverse-surface/40 z-[55] hidden md:hidden opacity-0 transition-opacity duration-300"></div>

    <!-- TOP NAVIGATION BAR -->
    <header class="fixed top-0 left-0 right-0 z-50 glass-nav bg-surface/90 border-b border-outline-variant h-[72px]">
        <div class="flex justify-between items-center w-full h-full px-md lg:px-lg max-w-max-width mx-auto">
            <div class="flex items-center gap-md">
                <button id="mobile-menu-toggle" class="md:hidden p-2 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors" aria-label="Open menu">
                    <span class="material-symbols-outlined">menu</span>
                </button>
                <a href="${rootPath}index.html" class="text-headline-md font-headline-md font-bold text-primary">MandoLearning</a>
                <nav class="hidden md:flex gap-md ml-lg">
                    <a class="nav-link-top text-on-surface-variant font-medium hover:text-primary transition-colors font-body-md text-body-md ${pageName === 'index' ? 'text-primary font-bold' : ''}" href="${rootPath}index.html" data-page="index">Dashboard</a>
                    <a class="nav-link-top text-on-surface-variant font-medium hover:text-primary transition-colors font-body-md text-body-md ${pageName === 'video-session' ? 'text-primary font-bold' : ''}" href="${pagePath}video-session.html" data-page="video-session">Videos</a>
                    <a class="nav-link-top text-on-surface-variant font-medium hover:text-primary transition-colors font-body-md text-body-md ${['deck-browser','study-mode','flashcard-editor'].includes(pageName) ? 'text-primary font-bold' : ''}" href="${pagePath}deck-browser.html" data-page="flashcards">Flashcards</a>
                </nav>
            </div>
            <div class="flex items-center gap-md">
                <button class="flex items-center gap-xs text-on-surface-variant hover:text-primary transition-colors" id="pending-changes-indicator" title="No pending changes">
                    <span class="material-symbols-outlined">save</span>
                </button>
                <button class="hidden sm:flex px-md py-xs rounded-lg text-on-surface font-medium border border-outline-variant hover:bg-surface-container transition-all" onclick="window.location.href='${pagePath}study-mode.html?mode=random&global=true'">
                    Study Now
                </button>
                <img alt="User Profile" class="w-10 h-10 rounded-full object-cover ring-2 ring-primary-container" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB82jUAlXAkov_25SX7S1L-AuNwKItdv3kl-pd93K1pTfY5MJA8SzDHPJrW0uvB9Q5Wabsk7Tp9IvPk_0BkRI-GyM5FurOKptJ6-9YODzYZMAspSyK6Sds99iyMyP1F2JfMLO3GyA_IDgR8GaoKQKvTMK55oXhBBWBMBkl9c8FUoPJ0GHjL1QvOemTieK6CT1klHa6kquRsOqorGgKgAPblzLhFl7L8LxVs7Tvk6OHZwNbRmtiX0meE" />
            </div>
        </div>
    </header>

    <!-- SIDE NAVIGATION BAR -->
    <aside id="app-sidebar" class="w-[280px] h-screen fixed left-0 top-0 bg-surface-container shadow-sm flex flex-col py-md px-base z-[60] transform -translate-x-full md:translate-x-0 transition-transform duration-300">
        <div class="mb-lg px-base flex items-center justify-between">
            <div>
                <h1 class="font-headline-md text-headline-md font-bold text-primary">MandoLearning</h1>
                <p class="font-label-caps text-label-caps text-on-surface-variant tracking-wider mt-1 uppercase">Modern Mandarin Mastery</p>
            </div>
            <button id="mobile-sidebar-close" class="md:hidden p-2 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors" aria-label="Close menu">
                <span class="material-symbols-outlined">close</span>
            </button>
        </div>

        <nav class="flex-1 space-y-1 overflow-y-auto custom-scrollbar">
            <a class="nav-link-sidebar flex items-center gap-sm px-base py-sm rounded-lg transition-all ${pageName === 'index' ? 'text-primary font-bold border-r-4 border-primary bg-surface-container-high' : 'text-on-surface-variant hover:bg-secondary-container'}" href="${rootPath}index.html">
                <span class="material-symbols-outlined">dashboard</span>
                <span class="font-body-md text-body-md">Dashboard</span>
            </a>
            <a class="nav-link-sidebar flex items-center gap-sm px-base py-sm rounded-lg transition-all ${pageName === 'video-session' ? 'text-primary font-bold border-r-4 border-primary bg-surface-container-high' : 'text-on-surface-variant hover:bg-secondary-container'}" href="${pagePath}video-session.html">
                <span class="material-symbols-outlined">play_circle</span>
                <span class="font-body-md text-body-md">Videos</span>
            </a>
            <a class="nav-link-sidebar flex items-center gap-sm px-base py-sm rounded-lg transition-all ${isDisabled} text-on-surface-variant hover:bg-secondary-container" href="#" title="Coming soon">
                <span class="material-symbols-outlined">description</span>
                <span class="font-body-md text-body-md">Scripts</span>
                <span class="ml-auto text-[10px] font-label-caps bg-surface-container-high px-2 py-0.5 rounded-full">Soon</span>
            </a>
            <a class="nav-link-sidebar flex items-center gap-sm px-base py-sm rounded-lg transition-all ${isDisabled} text-on-surface-variant hover:bg-secondary-container" href="#" title="Coming soon">
                <span class="material-symbols-outlined">folder_open</span>
                <span class="font-body-md text-body-md">Documents</span>
                <span class="ml-auto text-[10px] font-label-caps bg-surface-container-high px-2 py-0.5 rounded-full">Soon</span>
            </a>
            <a class="nav-link-sidebar flex items-center gap-sm px-base py-sm rounded-lg transition-all ${['deck-browser','study-mode','flashcard-editor'].includes(pageName) ? 'text-primary font-bold border-r-4 border-primary bg-surface-container-high' : 'text-on-surface-variant hover:bg-secondary-container'}" href="${pagePath}deck-browser.html">
                <span class="material-symbols-outlined">quiz</span>
                <span class="font-body-md text-body-md">Flashcards</span>
            </a>
            <a class="nav-link-sidebar flex items-center gap-sm px-base py-sm rounded-lg transition-all ${pageName === 'stats' ? 'text-primary font-bold border-r-4 border-primary bg-surface-container-high' : 'text-on-surface-variant hover:bg-secondary-container'}" href="${pagePath}stats.html">
                <span class="material-symbols-outlined">query_stats</span>
                <span class="font-body-md text-body-md">Stats</span>
            </a>

            <!-- Page-specific sidebar section (populated by page scripts if needed) -->
            <div id="shell-sidebar-extra" class="mt-md pt-md border-t border-outline-variant/30"></div>
        </nav>

        <div class="mt-auto px-base py-md space-y-md">
            <button class="w-full bg-primary text-on-primary font-headline-md text-headline-md py-base rounded-xl hover:bg-primary-dim transition-all shadow-md active:scale-95" onclick="window.location.href='${pagePath}study-mode.html?mode=random&global=true'">
                Start Practice
            </button>
            <div class="flex items-center gap-sm">
                <div class="w-10 h-10 rounded-full border-2 border-outline-variant overflow-hidden">
                    <img class="w-full h-full object-cover" alt="User Profile" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB82jUAlXAkov_25SX7S1L-AuNwKItdv3kl-pd93K1pTfY5MJA8SzDHPJrW0uvB9Q5Wabsk7Tp9IvPk_0BkRI-GyM5FurOKptJ6-9YODzYZMAspSyK6Sds99iyMyP1F2JfMLO3GyA_IDgR8GaoKQKvTMK55oXhBBWBMBkl9c8FUoPJ0GHjL1QvOemTieK6CT1klHa6kquRsOqorGgKgAPblzLhFl7L8LxVs7Tvk6OHZwNbRmtiX0meE" />
                </div>
                <div class="flex flex-col">
                    <span class="text-on-surface font-bold text-sm">Li Wei</span>
                    <span class="text-on-surface-variant text-xs font-label-caps">HSK 4 Learner</span>
                </div>
            </div>
        </div>
    </aside>
    `;

    function injectShell() {
        // Remove any existing header/aside to avoid duplicates
        document.querySelectorAll('header, aside').forEach((el) => el.remove());

        const wrapper = document.createElement('div');
        wrapper.innerHTML = shellHtml.trim();
        while (wrapper.firstChild) {
            document.body.prepend(wrapper.firstChild);
        }

        // Adjust main content spacing for desktop sidebar
        const main = document.querySelector('main');
        if (main) {
            main.classList.add('md:ml-[280px]');
            // Ensure top padding accounts for fixed header
            if (!main.classList.contains('pt-[88px]')) {
                main.classList.add('pt-[88px]');
            }
        }

        initMobileNav();
    }

    function initMobileNav() {
        const toggle = document.getElementById('mobile-menu-toggle');
        const close = document.getElementById('mobile-sidebar-close');
        const sidebar = document.getElementById('app-sidebar');
        const backdrop = document.getElementById('mobile-sidebar-backdrop');

        if (!toggle || !sidebar || !backdrop) return;

        function open() {
            sidebar.classList.remove('-translate-x-full');
            backdrop.classList.remove('hidden');
            // Trigger reflow for transition
            void backdrop.offsetWidth;
            backdrop.classList.remove('opacity-0');
            document.body.style.overflow = 'hidden';
        }

        function closeMenu() {
            sidebar.classList.add('-translate-x-full');
            backdrop.classList.add('opacity-0');
            setTimeout(() => {
                backdrop.classList.add('hidden');
                document.body.style.overflow = '';
            }, 300);
        }

        toggle.addEventListener('click', open);
        close?.addEventListener('click', closeMenu);
        backdrop.addEventListener('click', closeMenu);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectShell);
    } else {
        injectShell();
    }
})();
