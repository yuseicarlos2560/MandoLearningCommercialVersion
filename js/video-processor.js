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
            // Added 'flex gap-sm items-start' to separate the narrow controls column from the text content cleanly
            row.className = "p-md rounded-2xl hover:bg-surface-container-highest cursor-pointer border border-transparent transition-all duration-200 flex gap-sm items-start";

            const displayTime = formatTime(item.start);

            row.innerHTML = `
              <div class="flex flex-col items-center justify-center w-14 flex-shrink-0 gap-1 bg-surface-container rounded-lg py-1.5 border border-outline-variant/30 select-none">
                <span class="text-[11px] font-mono font-bold text-primary leading-none">${displayTime}</span>
                <button class="btn-tts-speak material-symbols-outlined text-[18px] text-on-surface-variant hover:text-primary hover:scale-110 transition-all p-0 m-0 leading-none" data-text="${item.text}" title="Slow Audio Response">
                  volume_up
                </button>
              </div>

              <div class="flex-1 min-w-0 flex flex-col justify-center pt-0.5">
                <p class="font-body-md text-on-surface script-zh font-medium text-base leading-relaxed break-words">${item.text}</p>
                <p class="text-xs text-on-surface-variant italic script-py mt-0.5 break-words">${item.pinyin || ''}</p>
                <p class="text-sm text-on-surface-variant script-en mt-1 break-words">${item.english || 'Translation unavailable'}</p>
              </div>
            `;

            // Jump video timeline to position when clicking the text track row background
            row.addEventListener('click', (e) => {
                if (!e.target.closest('.btn-tts-speak')) {
                    video.currentTime = item.start;
                }
            });

            linesContainer.appendChild(row);
        });

        // Re-attach TTS slow audio listeners
        document.querySelectorAll('.btn-tts-speak').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
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
            const response = await fetch('assets/captions/AAA000_script.json');
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

    // Initialization Runtime Routine
    loadScriptData();
});