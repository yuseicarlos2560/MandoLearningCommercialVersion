/**
 * Dashboard page handler for index.html.
 *
 * Wires the dashboard to:
 * - MandoApi.stats   (aggregate, activity, events)
 * - MandoApi.videos  (listReady)
 *
 * Keeps all markup intact; only dynamic text/attributes are updated via ids.
 */

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------

  const DAILY_GOAL_TARGET = 15;
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const FALLBACK_VIDEOS = [
    {
      videoId: 'DEMO_001',
      title: 'Discussing Hobbies (爱好)',
      description: 'Learn how to express your interests and ask others about their free time activities using common sentence patterns.',
      durationSeconds: 860,
      thumbnail: 'https://lh3.googleusercontent.com/aida-public/AB6AXuALPPBwB1vBOKHzIbtsoVGBa_bum56PS9oqIh0oWUqiNM-KaS9sWtDhpXh5zA3uZqv865ojan5XYzDMepgcKPdE9OgY7CdPmdiTl19p7iM8P4Pc-UlnAjGp1prxbBkdWYpCJ60wWp3cwEhdqe9KS36LZX4xml9mQDSKvPEEzu60YJFUfv6GHbwyhZTg5NDM7SshzRNhw2fOC5bbfTUq9KL5hmPslBa1B1F_6PqGS4_vCXU4P9KjDOhL',
    },
    {
      videoId: 'DEMO_002',
      title: 'Professional Emails & Etiquette',
      description: 'Master the art of formal correspondence in a Chinese business environment.',
      durationSeconds: 1080,
      thumbnail: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDBe7z8onD2RVf4Vx7gU8UPSX-2jypiPSsnYxmbQbllG12Rx8n17SMQgrTRasaD8J0XcvRwPUMjaedaMgCIPcH3PrglsJsZvYiI34C29P_kB2ZAVDY3Rly7Dm_QJjZI2P0TwC-RsCZgY5iTOzUN81uRKi_1RSrSQxDn2siXZsW58rHX_0PhIGuiNTYjaxC8kY-FgV69rFLUHpMhJMYZ_4dqTZ4Dulp0bIO42AEi3CxpGQGAxtUr7vDy',
    },
    {
      videoId: 'DEMO_003',
      title: 'Ordering at the Night Market',
      description: 'Survival Chinese for navigating the delicious world of street food and vendors.',
      durationSeconds: 720,
      thumbnail: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBtsHkqvb0kreVEcLM37x6dZy_eZdxFbcsgAXx7750hKmpAqu0dpBf_dE9a6rCyk5VZXX1hYtZSbpgB6qOgfEYafyLwrZRnzTyhMJvC-Nw2_DiyMnYofW2E47m8TqxnEU0sUNStEj1_8hw4OrdQuQxhc7neG8Ieui6R7n-bqXdddaYGdimA_K29_j-fKrCHq_AKnzkNOi_BH1tVF9_f0LSw3uU8oa---59DRuZJsvDnjkSZHeWAszlm',
    },
    {
      videoId: 'DEMO_004',
      title: 'Traveling by High-Speed Rail',
      description: 'Learn vocabulary for booking tickets and navigating modern travel hubs in China.',
      durationSeconds: 1320,
      thumbnail: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCTQer4pj3bvsWh3gnJ8fAsfw8Zidp2YBAcyz54Q0cEMvS2HFQ6T3jlzqAXIwyyIjmw9a_1lYMWJIbndS5WkEnQNMEs7lbyiH3pFNG0RKu1l-ms7XSWCuU7kxKIxSRvlukcIlswuSu8HLRrgLKknR5dBLYV21NLS06qW73rCv5A15rLxKI8v2SYnxGipVRqoz9TbJARQ6ov0oWXOpHt2uPBLcyfm6Xa2w5VVe2xVQMwimtxLGkfrDcc',
    },
  ];

  // Shared utilities exposed by js/utils.js
  const {
    safeLocalStorageGet,
    safeLocalStorageSet,
    getUserId,
    getDisplayName,
    isAdmin,
    uuid,
    formatDate,
    today,
    daysAgo,
    formatDuration,
    formatRemaining,
    extractHsk,
    difficultyFromHsk,
    escapeHtml,
    $,
    setText,
    setAttr,
    getStoredProgress,
  } = window.MandoUtils;

  function thumbnailUrl(video) {
    // Prefer backend thumbnailUrl, then S3 construction, then fallback.
    if (video.thumbnail) return video.thumbnail;
    if (video.thumbnailUrl) return video.thumbnailUrl;
    if (video.s3Bucket && video.s3Key) {
      return `https://${video.s3Bucket}.s3.amazonaws.com/${video.s3Key}`;
    }
    return FALLBACK_VIDEOS[0].thumbnail;
  }

  // ---------------------------------------------------------------------------
  // Rendering: identity & streak motivation
  // ---------------------------------------------------------------------------

  function renderIdentity(state) {
    if (state.userId) {
      setText('user-name', state.displayName);
    }

    const aggregate = state.stats.aggregate;
    if (!aggregate) {
      // Demo mode: keep the static fallback motivation text in the HTML.
      return;
    }

    const daysToRecord = Math.max(0, (aggregate.longestStreakDays || 0) - (aggregate.currentStreakDays || 0));

    let motivation;
    if (daysToRecord > 0) {
      motivation = `You're ${daysToRecord} day${daysToRecord === 1 ? '' : 's'} away from hitting your personal streak record. Keep it up!`;
    } else if (aggregate.currentStreakDays > 0) {
      motivation = `You're on a ${aggregate.currentStreakDays} day streak. Great consistency!`;
    } else {
      motivation = 'Start learning today to build your first streak!';
    }
    setText('streak-motivation', motivation);
  }

  // ---------------------------------------------------------------------------
  // Rendering: continue learning
  // ---------------------------------------------------------------------------

  function renderContinueLearning(state) {
    const video = state.videos.hero || FALLBACK_VIDEOS[0];
    const stored = getStoredProgress(video.videoId);
    const percent = stored && typeof stored.percent === 'number' ? stored.percent : 0;

    setText('continue-learning-title', video.title || 'Continue Learning');
    setText('continue-learning-description', video.description || '');
    setAttr('continue-learning-image', 'src', thumbnailUrl(video));
    setText('continue-learning-duration', formatDuration(video.durationSeconds));
    setText('continue-learning-progress', `Progress: ${percent}%`);
    setText('continue-learning-remaining', formatRemaining(video.durationSeconds, percent));

    const bar = $('continue-learning-progress-bar');
    if (bar) {
      bar.style.width = `${percent}%`;
      bar.className = `h-full bg-primary rounded-full shadow-[0_0_8px_rgba(175,35,48,0.3)]`;
    }

    const btn = $('resume-lesson-btn');
    if (btn) {
      btn.onclick = function () {
        window.location.href = `pages/video-session.html?videoId=${encodeURIComponent(video.videoId)}`;
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Rendering: daily goal + streaks
  // ---------------------------------------------------------------------------

  function renderDailyGoal(state) {
    const aggregate = state.stats.aggregate;
    const todayWords = state.stats.todayWordsAdded;
    const hasData = aggregate !== null || todayWords > 0;

    // In demo mode (no backend data), keep the static fallback values in the HTML.
    if (!hasData) return;

    const percent = Math.min(100, Math.round(((todayWords || 0) / DAILY_GOAL_TARGET) * 100));

    setText('daily-goal-percent', `${percent}%`);
    setText('daily-goal-ratio', `${todayWords || 0}/${DAILY_GOAL_TARGET}`);

    const circle = $('daily-goal-circle');
    if (circle) {
      const radius = 36;
      const circumference = 2 * Math.PI * radius; // ~226
      const offset = circumference - (percent / 100) * circumference;
      circle.setAttribute('stroke-dasharray', String(circumference));
      circle.setAttribute('stroke-dashoffset', String(offset));
    }

    const streakDays = aggregate ? aggregate.currentStreakDays || 0 : 0;
    const recordDays = aggregate ? aggregate.longestStreakDays || 0 : 0;

    setText('streak-days', `${streakDays} Day Streak`);
    setText('record-streak', `Personal record: ${recordDays} days`);

    // Topnav mini version
    setText('topnav-daily-goal-percent', `Daily Goal: ${percent}%`);
    const topBar = $('topnav-daily-goal-bar');
    if (topBar) topBar.style.width = `${percent}%`;
  }

  // ---------------------------------------------------------------------------
  // Rendering: quick actions
  // ---------------------------------------------------------------------------

  function renderQuickActions(state) {
    const flashBtn = $('action-flashcards');
    if (flashBtn) {
      flashBtn.onclick = function () {
        window.location.href = 'pages/study-mode.html?mode=spaced&global=true';
      };
    }

    const uploadBtn = $('action-upload');
    if (uploadBtn) {
      if (isAdmin()) {
        uploadBtn.classList.remove('hidden');
        uploadBtn.onclick = function () {
          alert('Upload Document is only available in the admin interface.');
        };
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Rendering: recommendations
  // ---------------------------------------------------------------------------

  function createRecommendationCard(video) {
    const hsk = extractHsk(video.title);
    const difficulty = difficultyFromHsk(hsk);
    const duration = formatDuration(video.durationSeconds);
    const thumb = thumbnailUrl(video);

    const card = document.createElement('div');
    card.className = 'bg-surface-container-lowest rounded-xl overflow-hidden border border-outline-variant shadow-sm hover:shadow-lg transition-all group';
    card.innerHTML = `
      <div class="aspect-video relative overflow-hidden cursor-pointer" data-video-id="${escapeHtml(video.videoId)}">
        <img class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src="${escapeHtml(thumb)}" alt="${escapeHtml(video.title)}">
        <div class="absolute top-2 left-2 bg-surface/90 backdrop-blur-sm px-sm py-xs rounded text-[10px] font-bold text-primary border border-primary/20">${escapeHtml(hsk)}</div>
      </div>
      <div class="p-md">
        <h4 class="font-bold text-on-surface text-lg leading-tight group-hover:text-primary transition-colors">${escapeHtml(video.title)}</h4>
        <p class="text-sm text-on-surface-variant mt-xs line-clamp-2">${escapeHtml(video.description || '')}</p>
        <div class="flex items-center gap-md mt-md text-xs text-on-surface-variant">
          ${duration ? `<span class="flex items-center gap-xs"><span class="material-symbols-outlined text-sm" data-icon="schedule">schedule</span> ${escapeHtml(duration)}</span>` : ''}
          <span class="flex items-center gap-xs"><span class="material-symbols-outlined text-sm" data-icon="bar_chart">bar_chart</span> ${escapeHtml(difficulty)}</span>
        </div>
      </div>
    `;

    const thumbEl = card.querySelector('[data-video-id]');
    if (thumbEl) {
      thumbEl.onclick = function () {
        window.location.href = `pages/video-session.html?videoId=${encodeURIComponent(video.videoId)}`;
      };
    }

    return card;
  }

  function renderRecommendations(state) {
    const grid = $('recommended-grid');
    if (!grid) return;

    // Keep only the first static card as a template? No, replace all children.
    grid.innerHTML = '';

    const videos = state.videos.recommended.length > 0 ? state.videos.recommended : FALLBACK_VIDEOS.slice(1);
    videos.slice(0, 3).forEach(function (video) {
      grid.appendChild(createRecommendationCard(video));
    });
  }

  // ---------------------------------------------------------------------------
  // Rendering: weekly chart
  // ---------------------------------------------------------------------------

  function renderWeeklyChart(state) {
    const activity = state.stats.activity || [];
    const today = new Date();
    const data = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = formatDate(d);
      const dayName = DAYS[d.getDay()];
      const record = activity.find(function (r) {
        return r.statKey === `DAILY#${dateStr}`;
      });
      const count = record ? record.wordsAdded || 0 : 0;
      data.push({ day: dayName, count: count });
    }

    const maxCount = Math.max(1, ...data.map(function (d) { return d.count; }));

    data.forEach(function (item) {
      const id = `bar-${item.day.toLowerCase()}`;
      const bar = $(id);
      if (!bar) return;

      const height = Math.round((item.count / maxCount) * 100);
      bar.style.height = `${height}%`;
      bar.title = `${item.day}: ${item.count}`;

      // Highlight today if it is this day
      const todayDayName = DAYS[today.getDay()];
      if (item.day === todayDayName) {
        bar.className = 'flex-1 bg-primary rounded-t-sm transition-all hover:bg-primary-dim cursor-pointer';
      } else {
        bar.className = 'flex-1 bg-primary/20 rounded-t-sm transition-all hover:bg-primary/40 cursor-pointer';
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------

  async function loadDashboardData(state) {
    if (!state.userId) {
      // Demo mode: use fallback data everywhere.
      return;
    }

    const todayStr = today();

    try {
      const [aggregateRes, activityRes, videosRes, activeRes] = await Promise.all([
        window.MandoApi.stats.getAggregate(state.userId),
        window.MandoApi.stats.getActivity(state.userId, {
          granularity: 'daily',
          start: daysAgo(6),
          end: todayStr,
        }),
        window.MandoApi.videos.listReady({ pageSize: 4 }),
        window.MandoApi.stats.recordEvent(state.userId, {
          eventId: uuid(),
          eventType: 'USER_ACTIVE',
          timestamp: new Date().toISOString(),
        }),
      ]);

      if (aggregateRes.ok && aggregateRes.data && aggregateRes.data.stats) {
        state.stats.aggregate = aggregateRes.data.stats;
      }

      if (activityRes.ok && activityRes.data && Array.isArray(activityRes.data.activity)) {
        state.stats.activity = activityRes.data.activity;
        const todayRecord = activityRes.data.activity.find(function (r) {
          return r.statKey === `DAILY#${todayStr}`;
        });
        state.stats.todayWordsAdded = todayRecord ? todayRecord.wordsAdded || 0 : 0;
      }

      if (videosRes.ok && videosRes.data && Array.isArray(videosRes.data.videos)) {
        const videos = videosRes.data.videos;
        state.videos.hero = videos[0] || null;
        state.videos.recommended = videos.slice(1, 4);
      }

      if (!activeRes.ok) {
        console.warn('USER_ACTIVE event failed', activeRes.error);
      }
    } catch (err) {
      console.error('Dashboard load failed', err);
      // Fallback data already in state via FALLBACK_VIDEOS during render.
    }
  }

  // ---------------------------------------------------------------------------
  // Micro-interactions (preserved from original template)
  // ---------------------------------------------------------------------------

  function initMicroInteractions() {
    document.querySelectorAll('.rounded-xl').forEach(function (card) {
      card.addEventListener('mouseenter', function () {
        if (!card.classList.contains('bg-primary')) {
          card.classList.add('shadow-md');
        }
      });
      card.addEventListener('mouseleave', function () {
        if (!card.classList.contains('bg-primary')) {
          card.classList.remove('shadow-md');
        }
      });
    });

    const searchInput = document.querySelector('input[type="text"]');
    if (searchInput) {
      searchInput.addEventListener('focus', function () {
        searchInput.parentElement.classList.add('w-[500px]');
      });
      searchInput.addEventListener('blur', function () {
        searchInput.parentElement.classList.remove('w-[500px]');
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Main init
  // ---------------------------------------------------------------------------

  async function init() {
    const state = {
      userId: getUserId(),
      displayName: getDisplayName(),
      stats: {
        aggregate: null,
        activity: [],
        todayWordsAdded: 0,
      },
      videos: {
        hero: null,
        recommended: [],
      },
    };

    // Persist userId if it came from URL.
    if (state.userId) {
      safeLocalStorageSet('mando.userId', state.userId);
    }

    try {
      initMicroInteractions();
      renderQuickActions(state);
      window.MandoShell.renderSidebarProfile();
      window.MandoShell.initMobileDrawer({ sidebarId: 'sidebar', overlayId: 'sidebar-overlay', toggleId: 'mobile-menu-toggle' });

      // Render with fallback data immediately for perceived performance.
      renderIdentity(state);
      renderContinueLearning(state);
      renderDailyGoal(state);
      renderRecommendations(state);
      renderWeeklyChart(state);

      // Then load backend data and re-render.
      await loadDashboardData(state);

      renderIdentity(state);
      renderContinueLearning(state);
      renderDailyGoal(state);
      renderRecommendations(state);
      renderWeeklyChart(state);
    } catch (err) {
      console.error('Dashboard init failed:', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
