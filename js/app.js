document.addEventListener('DOMContentLoaded', () => {
    // DOM Core Handles
    const video = document.getElementById('main-video');
    const playBtn = document.getElementById('btn-play-toggle');
    const rewindBtn = document.getElementById('btn-rewind');
    const fullscreenBtn = document.getElementById('btn-fullscreen');
    const timeline = document.getElementById('progress-timeline');
    const timelineFill = document.getElementById('progress-timeline-fill');
    const timeDisplay = document.getElementById('timestamp-display');

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
    }

    // 4. Interactive Scrubbing System
    function scrubVideo(e) {
        const rect = timeline.getBoundingClientRect();
        const clickPositionOffset = (e.clientX - rect.left) / rect.width;
        video.currentTime = clickPositionOffset * video.duration;
    }

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