document.addEventListener('DOMContentLoaded', () => {
    // DOM Core Handles
    const video = document.getElementById('main-video');
    const playBtn = document.getElementById('btn-play-toggle');
    const rewindBtn = document.getElementById('btn-rewind');
    const fullscreenBtn = document.getElementById('btn-fullscreen');
    const timeline = document.getElementById('progress-timeline');
    const timelineFill = document.getElementById('progress-timeline-fill');
    const timeDisplay = document.getElementById('timestamp-display');
    const ccBtn = document.getElementById('btn-cc-toggle');
    const captionsContainer = document.getElementById('captions-container');
    const linesContainer = document.getElementById('script-lines-container');
    const toggleZh = document.getElementById('toggle-zh');
    const togglePy = document.getElementById('toggle-py');
    const toggleEn = document.getElementById('toggle-en');

    let subtitlesVisible = false;

    // A. Language Toggle Matrix Constraints Engine
    function updateLanguageVisibility(mode) {
        // Clear layout visibility rules classes
        linesContainer.classList.remove('show-zh', 'show-py', 'show-en');

        // Clear active button presentation properties
        [toggleZh, togglePy, toggleEn].forEach(btn => {
            btn.className = "w-8 h-8 rounded-full bg-surface-container-highest text-on-surface-variant font-bold text-xs transition-colors";
        });

        const activeBtnClass = "w-8 h-8 rounded-full bg-primary text-on-primary font-bold text-xs transition-colors";

        if (mode === 'ZH') {
            linesContainer.classList.add('show-zh');
            toggleZh.className = activeBtnClass;
        } else if (mode === 'PY') {
            linesContainer.classList.add('show-zh', 'show-py');
            toggleZh.className = activeBtnClass;
            togglePy.className = activeBtnClass;
        } else if (mode === 'EN') {
            linesContainer.classList.add('show-en');
            toggleEn.className = activeBtnClass;
        }
    }

    toggleZh.addEventListener('click', () => updateLanguageVisibility('ZH'));
    togglePy.addEventListener('click', () => updateLanguageVisibility('PY'));
    toggleEn.addEventListener('click', () => updateLanguageVisibility('EN'));

    // B. Render JSON Script Elements dynamically
    function renderScriptLines() {
        linesContainer.innerHTML = '';

        videoScript.forEach((item, index) => {
            const row = document.createElement('div');
            row.id = `script-row-${index}`;
            row.className = "p-md rounded-2xl hover:bg-surface-container-highest cursor-pointer transition-all border border-transparent transition-colors duration-200";

            // Auto calculate visible clock display representation text
            const displayTime = formatTime(item.start);

            row.innerHTML = `
              <div class="flex gap-sm mb-xs">
                <span class="breadcrumb-item text-primary font-mono">${displayTime}</span>
                <div class="flex items-center gap-xs w-full">
                  <button class="btn-tts-speak material-symbols-outlined text-sm text-primary hover:scale-120 transition-transform" data-text="${item.text}">play_circle</button>
                  <p class="font-body-md text-on-surface script-zh font-medium">${item.text}</p>
                </div>
              </div>
              <p class="text-xs text-on-surface-variant italic script-py mb-xs">${item.pinyin || ''}</p>
              <p class="text-sm text-on-surface-variant script-en">${item.english || 'Translation unavailable'}</p>
            `;

            // Jump video timeline to position when clicking the text track row background
            row.addEventListener('click', (e) => {
                if (!e.target.classList.contains('btn-tts-speak')) {
                    video.currentTime = item.start;
                }
            });

            linesContainer.appendChild(row);
        });

        // Attach Audio Slow Play Engine to individual rows
        document.querySelectorAll('.btn-tts-speak').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // Avoid triggering parent row video timeline jumps
                speakSlowMandarin(btn.getAttribute('data-text'));
            });
        });
    }

    // C. Slow Mechanical Audio Voice Playback System (Web Speech API Synthesis)
    function speakSlowMandarin(rawText) {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel(); // Terminate pending utterances safely

            // Remove pinyin or syntax formatting symbols if present
            const cleanText = rawText.replace(/[^\u4e00-\u9fa5]/g, '');
            const utterance = new SpeechSynthesisUtterance(cleanText);

            utterance.lang = 'zh-CN';
            utterance.rate = 0.55; // Controlled slow cadence for structural tone review
            utterance.pitch = 1.0;

            window.speechSynthesis.speak(utterance);
        } else {
            console.warn("Local browser configuration environment lacks Web Speech API drivers.");
        }
    }

    // D. Sync Scrolling Highlighting Track Line (Extend your existing handleTimeUpdate)
    let lastActiveIndex = -1;

    function syncScriptSidebarHighlight(currentTime) {
        let activeIndex = -1;

        // Find current line segment
        for (let i = 0; i < videoScript.length; i++) {
            if (currentTime >= videoScript[i].start && (!videoScript[i + 1] || currentTime < videoScript[i + 1].start)) {
                activeIndex = i;
                break;
            }
        }

        // Trigger update only when row threshold crosses over
        if (activeIndex !== lastActiveIndex && activeIndex !== -1) {
            // 1. Remove previous row active styles
            document.querySelectorAll('.script-row-active').forEach(el => el.classList.remove('script-row-active'));

            const currentActiveRow = document.getElementById(`script-row-${activeIndex}`);
            if (currentActiveRow) {
                // 2. Add active focus styles to current element block
                currentActiveRow.classList.add('script-row-active');

                // 3. Precision Smart Centering Scroll Calculation
                const containerHeight = linesContainer.clientHeight;
                const rowTopPosition = currentActiveRow.offsetTop;
                const rowHeight = currentActiveRow.clientHeight;

                // Calculate target top point so item sits exactly in middle of layout track area
                const targetScrollPosition = rowTopPosition - (containerHeight / 2) + (rowHeight / 2);

                linesContainer.scrollTo({
                    top: targetScrollPosition,
                    behavior: 'smooth'
                });
            }
            lastActiveIndex = activeIndex;
        }
    }

    // Captions Display Elements
    const captionCn = document.getElementById('caption-text-cn');

    // Script Database Variable
    let videoScript = [];

    // 1. Fetch JSON Script Data
    async function loadScriptData() {
        try {
            // Points to relative asset folder matching your local project directory structure
            const response = await fetch('assets/captions/AAA000.json');
            if (!response.ok) throw new Error('Failed to retrieve script database.');

            videoScript = await response.json();

            // Sort array by timestamp safely to guarantee binary search calculations pass
            videoScript.sort((a, b) => a.start - b.start);
            renderScriptLines();
        } catch (error) {
            console.error('Error compiling timeline scripts:', error);
            captionCn.textContent = "Error loading subtitles.";
        }
    }

    // 2. Playback State Synchronization Toggle
    function togglePlay() {
        if (video.paused) {
            video.play();
            playBtn.textContent = 'pause';
        } else {
            video.pause();
            playBtn.textContent = 'play_arrow';
        }
    }

    // 3. Time Tracker & Active Subtitle Evaluation Line
    function handleTimeUpdate() {
        const currentTime = video.currentTime;
        const duration = video.duration || 0;

        // Refresh structural tracking bar visual
        const progressPercent = (currentTime / duration) * 100;
        timelineFill.style.width = `${progressPercent}%`;

        // Refresh structural clock layout text
        timeDisplay.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;

        // Sync Active Captions via iterative timestamp indexing
        let activeText = "";

        for (let i = 0; i < videoScript.length; i++) {
            const currentSegment = videoScript[i];
            const nextSegment = videoScript[i + 1];

            // If current time is past start marker and safely behind next block or end of file
            if (currentTime >= currentSegment.start && (!nextSegment || currentTime < nextSegment.start)) {
                activeText = currentSegment.text;
                break;
            }
        }

        if (activeText) {
            captionCn.textContent = activeText;
        }

        syncScriptSidebarHighlight(currentTime);
    }

    // 4. Interactive Scrubbing System
    function scrubVideo(e) {
        const rect = timeline.getBoundingClientRect();
        const clickPositionOffset = (e.clientX - rect.left) / rect.width;
        video.currentTime = clickPositionOffset * video.duration;
    }

    ccBtn.addEventListener('click', () => {
        subtitlesVisible = !subtitlesVisible;

        if (subtitlesVisible) {
            // Reveal tray and turn button active (red accent color)
            captionsContainer.classList.remove('opacity-0', 'pointer-events-none');
            ccBtn.classList.remove('text-neutral-500', 'line-through');
            ccBtn.classList.add('text-primary');
        } else {
            // Hide tray and dim button state
            captionsContainer.classList.add('opacity-0', 'pointer-events-none');
            ccBtn.classList.remove('text-primary');
            ccBtn.classList.add('text-neutral-500', 'line-through');
        }
    });

    // Helper Utility: Formatting raw milliseconds/seconds to standard text outputs
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    // Interactive Control Event Bindings
    playBtn.addEventListener('click', togglePlay);
    video.addEventListener('click', togglePlay);

    rewindBtn.addEventListener('click', () => {
        video.currentTime = Math.max(0, video.currentTime - 10);
    });

    fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            video.requestFullscreen().catch(err => console.error(err));
        } else {
            document.exitFullscreen();
        }
    });

    // Structural update triggers
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleTimeUpdate);
    timeline.addEventListener('click', scrubVideo);

    // Micro-interaction for HSK highlighting simulation
    document.querySelectorAll('.hsk-level-1, .hsk-level-2').forEach(el => {
        el.addEventListener('mouseenter', () => {
            el.style.backgroundColor = 'rgba(183, 16, 42, 0.08)';
            el.style.transition = 'background-color 0.2s ease';
        });
        el.addEventListener('mouseleave', () => {
            el.style.backgroundColor = 'transparent';
        });
    });

    // Video Library Collapsible Logic
    const categoryToggles = document.querySelectorAll('.category-toggle');
    categoryToggles.forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            const parent = toggle.closest('.collapsible-category');
            const list = parent.querySelector('.nested-list');
            const chevron = toggle.querySelector('.chevron');

            // Toggle list visibility
            list.classList.toggle('hidden');

            // Toggle chevron rotation
            if (list.classList.contains('hidden')) {
                chevron.classList.remove('rotate-90');
            } else {
                chevron.classList.add('rotate-90');
            }
        });
    });

    // Simple interactive script syncing simulation
    const scriptItems = document.querySelectorAll('.overflow-y-auto > div');
    scriptItems.forEach(item => {
        item.addEventListener('click', () => {
            scriptItems.forEach(i => i.classList.remove('bg-secondary-container', 'border-outline-variant', 'shadow-sm', 'font-bold'));
            scriptItems.forEach(i => i.classList.add('hover:bg-surface-container-highest', 'border-transparent'));

            item.classList.add('bg-secondary-container', 'border-outline-variant', 'shadow-sm', 'font-bold');
            item.classList.remove('hover:bg-surface-container-highest', 'border-transparent');
        });
    });

    // Floating Action Button logic for Quick Notes
    const fab = document.querySelector('button.bg-tertiary');
    if (fab) {
        fab.addEventListener('click', () => {
            alert('Quick Note interface triggered!');
        });
    }

    // Initialization Runtime Routine
    loadScriptData();
});