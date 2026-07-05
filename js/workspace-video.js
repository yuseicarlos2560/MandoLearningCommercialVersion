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
    const notebook = document.getElementById('study-notebook');

    if (!notebook) return;

    const userId = notebook.getAttribute('data-user-id');
    const videoId = notebook.getAttribute('data-video-id');

    // Track our live API root URL (running locally on port 8000)
    const API_BASE = 'http://127.0.0.1:8000/api/v1';
    let debounceTimeout = null;

    // ==========================================
    // PHASE 1: Fetch and Populate Existing Data
    // ==========================================
    function loadInitialWorkspace() {
        fetch(`${API_BASE}/workspace/load-page?user_id=${userId}&video_id=${videoId}`)
            .then(response => {
                if (!response.ok) throw new Error("Failed to extract data path.");
                return response.json();
            })
            .then(data => {
                // If a workspace exists, pull out long-form detailed_analysis notes if present
                const workspace = data.workspace;

                if (workspace && workspace.notes) {
                    // Find the detailed analysis block within our polymorphic data structure array
                    const longFormNote = workspace.notes.find(note => note.type === "detailed_analysis");
                    if (longFormNote && longFormNote.content) {
                        notebook.innerText = longFormNote.content;
                        return;
                    }
                }

                // Fallback layout template structure if workspace records are entirely blank
                notebook.innerHTML = `Start typing your detailed analysis here...<br/><br/>• Key grammar points:<br/>• Cultural context:`;
            })
            .catch(err => {
                console.error("Workspace recovery failure:", err);
                notebook.innerText = "Error pulling cloud sync records. Local offline changes will cache.";
            });
    }

    // ==========================================
    // PHASE 2: Send Debounced Updates via Sync API
    // ==========================================
    function saveWorkspaceNotes(textContents) {
        console.log("⚡ Debounce timer cleared. Instigating network background sync process...");

        // 1. Fetch current document layout parameters to preserve progress variables
        fetch(`${API_BASE}/workspace/load-page?user_id=${userId}&video_id=${videoId}`)
            .then(res => res.json())
            .then(currentData => {
                const existingNotes = currentData.workspace?.notes || [];

                // 2. Locate or structure our long-form document row map element within the array
                const detailedNoteIndex = existingNotes.findIndex(n => n.type === "detailed_analysis");

                const updatedNoteBlock = {
                    "type": "detailed_analysis",
                    "timestamp": "00:00", // Can hook into video.currentTime later
                    "content": textContents
                };

                if (detailedNoteIndex !== -1) {
                    // Update the content field of the existing note in-place
                    existingNotes[detailedNoteIndex].content = textContents;
                } else {
                    // If the array doesn't have a detailed analysis note yet, push a new one
                    existingNotes.push(updatedNoteBlock);
                }

                // 3. Compile full payload back to our standard workspace synchronization controller
                const payload = {
                    user_id: userId,
                    video_id: videoId,
                    progress_percent: currentData.workspace?.progress_percent || 0.0,
                    playback_position_seconds: currentData.workspace?.playback_position_seconds || 0.0,
                    notes: existingNotes
                };

                return fetch(`${API_BASE}/workspace/sync`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            })
            .then(response => response.json())
            .then(result => {
                if (result.status === "success") {
                    console.log("✅ Cloud Core synchronization complete. Workspace state locked.");
                }
            })
            .catch(err => console.error("❌ Real-time synchronization failure:", err));
    }

    // ==========================================
    // PHASE 3: Event Listeners & Debounce Logic
    // ==========================================
    notebook.addEventListener('input', (e) => {
        // Clear any pending sync operations while the user continues typing
        clearTimeout(debounceTimeout);

        // Read the text content immediately
        const textSnapshot = e.target.innerText;

        // Reset timer: Will execute 1000ms after the user completely stops pressing keys
        debounceTimeout = setTimeout(() => {
            saveWorkspaceNotes(textSnapshot);
        }, 1000);
    });

    // Run initial loading sequence immediately on boot
    loadInitialWorkspace();

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