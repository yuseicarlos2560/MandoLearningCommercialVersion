# MandoLearning Commercial Frontend

This repository contains the logged-in learner frontend for **MandoLearning**, a Mandarin Chinese learning platform built around video lessons, hierarchical notes, synced scripts, and flashcards.

The frontend is a static HTML/CSS/JavaScript application with no build step. It consumes the MandoLearning backend APIs documented in the companion Java/Spring Boot project.

---

## Table of Contents

- [Project Purpose](#project-purpose)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Backend API Surface](#backend-api-surface)
- [Implementation Status](#implementation-status)
- [Known Limitations & Problems](#known-limitations--problems)
- [Ongoing Work & Next Steps](#ongoing-work--next-steps)
- [Architecture Notes](#architecture-notes)
- [Backend Status](#backend-status)
- [How to Run Locally](#how-to-run-locally)

---

## Project Purpose

The core learning loop is:

```
Dashboard
   ↓
Continue Learning / Recommended Video
   ↓
Video Session
   ↓
Save words to hierarchical notes
   ↓
Read synced script
   ↓
(optional) Open full Script Reader
   ↓
Study captured words in Flashcards
   ↓
Review progress in Stats
   ↓
Back to Dashboard
```

This repo implements the logged-in frontend only. Authentication, onboarding, admin tooling, and marketing pages are out of scope for this phase.

---

## Tech Stack

- **No build step / bundler** — plain HTML, CSS, and vanilla JavaScript.
- **Tailwind CSS** loaded from CDN, extended via `js/tailwind-config.js`.
- **Design system** defined in `css/design-system.css` and `templates/lumina_learning/DESIGN.md`.
- **Icons** via Material Symbols Outlined.
- **Fonts** via Google Fonts: Plus Jakarta Sans, Inter, Noto Serif SC / Noto Serif.
- **Backend** consumed as REST JSON from a configurable host (default `http://localhost:8080`).

---

## Project Structure

```
MandoLearningCommercialVersion/
│
├── index.html                          # Dashboard
├── package.json                        # Placeholder only (no real scripts)
│
├── pages/                              # Page HTML files
│   ├── video-session.html              # ✅ Implemented
│   ├── flashcards.html                 # ✅ Implemented (hub)
│   ├── study-mode.html                 # ✅ Implemented
│   ├── deck-editor.html                # ✅ Implemented
│   ├── stats.html                      # ✅ Implemented
│   ├── document-study.html             # ✅ Implemented
│   └── script-reader.html              # ✅ Implemented
│
├── js/
│   ├── tailwind-config.js              # Tailwind theme tokens
│   ├── utils.js                        # ✅ Shared formatting, HSK, identity, DOM helpers
│   ├── shell.js                        # ✅ Shared mobile drawer + sidebar profile logic
│   ├── api/                            # API client modules
│   │   ├── client.js                   # Shared fetch wrapper + retry logic
│   │   ├── videos.js                   # Video catalog + script endpoints
│   │   ├── notes.js                    # Session notes + note details
│   │   ├── batch.js                    # TextProcessing batch flush
│   │   └── stats.js                    # Stats aggregate / activity / events
│   └── pages/                          # Page-specific handlers
│       ├── index.js                    # ✅ Dashboard handler
│       └── video-session.js            # ✅ Video session handler
│
├── css/
│   └── design-system.css               # Global styles, sidebar, scrollbar
│
├── templates/                          # Source-of-truth HTML references
│   ├── logged_in_home_dashboard/
│   ├── video_session_interface/
│   ├── updated_script_reading_interface/
│   ├── document_study_interface/
│   ├── flashcards_management_hub/
│   ├── flashcards_study_interface/
│   ├── flashcards_deck_management_editor/
│   ├── learning_statistics_dashboard/
│   └── lumina_learning/DESIGN.md
│
├── PRD.md                              # Product requirements
├── HIGH_LEVEL_PLAN.md                  # Frontend integration architecture
├── API_LOW_LEVEL_IMPLEMENTATION_PLAN.md# Dashboard + video session plan
└── SHARED_COMPONENTS.md                # Component audit
```

---

## Backend API Surface

The frontend talks to three backend services running on the same host (default `http://localhost:8080`):

| Service | Base Path | Purpose |
|---|---|---|
| Video API | `/api/videos` | Catalog, video metadata, timestamped scripts |
| TextProcessing API | `/api/textprocessing` | Notes, flashcards, batch operations |
| Stats API | `/api/stats` | Aggregate stats, activity history, events |

Full backend API documentation lives in the companion Java project (`~/IdeaProjects/MandoLearning/`):

- `MandoLearningVideo_api_documentation.md`
- `MandoLearningTextProcessing_api_documentation.md`
- `MandoLearningStats_api_documentation.md`

---

## Implementation Status

### Implemented pages

| Page | Files | Backend APIs Used |
|---|---|---|
| **Dashboard** | `index.html`, `js/pages/index.js` | `GET /api/stats/{userId}`, `GET /api/stats/{userId}/activity`, `GET /api/videos`, `POST /api/stats/{userId}/events` |
| **Video Session** | `pages/video-session.html`, `js/pages/video-session.js` | `GET /api/videos/{videoId}`, `GET /api/videos/{videoId}/script`, `GET /api/textprocessing/{userId}/{sessionId}`, `GET /api/videos`, `POST /api/textprocessing/{userId}/batch`, `POST /api/stats/{userId}/events` |
| **Script Reader** | `pages/script-reader.html`, `js/pages/script-reader.js` | `GET /api/scripts/{scriptId}`, `GET /api/scripts/{scriptId}/content`, `GET /api/scripts/{scriptId}/audio`, `GET /api/textprocessing/{userId}/scripts/{scriptId}`, `POST /api/textprocessing/{userId}/batch`, `GET /api/videos`, `POST /api/stats/{userId}/events` |
| **Flashcards Hub** | `pages/flashcards.html`, `js/pages/flashcards.js` | `GET /api/textprocessing/{userId}/flashcard/deck/all`, `POST /api/textprocessing/{userId}/batch` |
| **Flashcard Study** | `pages/study-mode.html`, `js/pages/study-mode.js` | `GET /api/textprocessing/{userId}/flashcard/deck/all`, `GET /api/textprocessing/{userId}/flashcard/deck/hsk/{level}`, `GET /api/textprocessing/{userId}/flashcard/deck/category/{category}`, `POST /api/textprocessing/{userId}/batch`, `POST /api/stats/{userId}/events` |
| **Deck Editor** | `pages/deck-editor.html`, `js/pages/deck-editor.js` | `GET /api/textprocessing/{userId}/flashcard/deck/all`, `GET /api/textprocessing/{userId}/flashcard/deck/category/{category}`, `POST /api/textprocessing/{userId}/batch` |
| **Document Study** | `pages/document-study.html`, `js/pages/document-study.js` | `GET /api/documents` ⏳, `GET /api/documents/{id}` ⏳, `GET /api/textprocessing/{userId}/documents/{id}` ⏳, `POST /api/textprocessing/{userId}/batch`, `POST /api/stats/{userId}/events` (⏳ = specified, backend pending — page degrades to demo/local mode) |

### Missing shared modules

Modules planned in `HIGH_LEVEL_PLAN.md` that are still not created:

- `js/main.js`
- `js/state.js`
<<<<<<< Updated upstream
- `js/pages/document-study.js`
=======
>>>>>>> Stashed changes

Created and in use:

- `js/utils.js` — shared formatting, HSK inference, identity, localStorage, DOM helpers
- `js/shell.js` — shared mobile sidebar drawer + sidebar profile rendering
- `js/ui-components.js` — toast and confirm modal primitives
- `js/pinyin-helper.js` — lazy pinyin-pro wrapper + form auto-fill
- `js/api/client.js` — shared fetch wrapper with retry logic
- `js/api/videos.js` — video catalog + script endpoints
- `js/api/scripts.js` — script catalog + content + audio endpoints
- `js/api/notes.js` — session, script-scoped, and document-scoped notes + details
- `js/api/documents.js` — document library + upload/download (backend pending)
- `js/api/flashcards.js` — flashcard deck queries (all / HSK / category)
- `js/api/batch.js` — TextProcessing batch flush
- `js/api/stats.js` — stats aggregate / activity / events
- `js/pages/flashcards.js` — flashcards hub handler
- `js/pages/study-mode.js` — flashcard study session handler
- `js/pages/deck-editor.js` — deck editor handler
- `js/pages/document-study.js` — document library + study handler

---

## Known Limitations & Problems

### 1. All MVP pages are built
All eight MVP pages are functional: Dashboard, Video Session, Script Reader, Flashcards Hub, Study Mode, Deck Editor, Stats, and Document Study. The Documents page degrades gracefully until the backend documents module ships (see below).

### 2. Video playback is mostly complete
The video session page supports two source types:

- **S3 / service-hosted videos:** The native `<video>` player is wired and hardened with error handling, but actual playback depends on a publicly accessible S3 URL, presigned URL, or CloudFront distribution.
- **YouTube videos:** The YouTube IFrame Player API is integrated. Subtitles, script highlighting, auto-scroll, click-to-seek, Space-to-play/pause, and playback speed all work.
- **Resume + speed:** Watch progress resumes from `localStorage` on load; playback speed is controllable for both source types.

### 3. Watch progress is local-only
Resume progress is stored in `localStorage` under `mando.progress.{videoId}` and the video session now seeks to it on load. The backend has no `POST /api/videos/{videoId}/progress` endpoint yet, so cross-device resume is not possible.

### 4. No shared component layer
The sidebar markup is still copy-pasted into `index.html` and `pages/video-session.html`. `js/shell.js` now provides shared drawer interaction and profile rendering, but full markup extraction is still pending.

### 5. No shared state / pending-change queue
Each page with mutations (video session, study mode, deck editor) carries its own inline pending-change queue. The queues follow the same pattern but are not yet extracted into a shared `state.js`.

### 6. Brand consistency
All pages and source templates use **MandoLearning**. The last two `MandarinFlow` references (in the flashcards study and deck editor templates) were renamed during the flashcards migration.

### 7. No frontend tests or tooling
`package.json` is a placeholder. There is no linting, formatting, or test framework configured. `node --check` passes on all JS files, but that is the only validation.

### 8. Identity is URL/localStorage only
`userId` is read from `?userId=...` query param or `localStorage`. There is no JWT, session cookie, or auth guard.

---

## Ongoing Work & Next Steps

### P0 — Core loop (completed)

- ✅ **YouTube IFrame Player API integration** — subtitles, script highlight, auto-scroll, click-to-seek, and Space-to-play/pause all work for YouTube videos.
- ✅ **S3/native video error handling** — `error` and `canplay` listeners show a clear toast and unavailable overlay when playback fails.
- ✅ **`beforeunload` warning** — users are warned before reloading with unsaved note/flashcard changes.
- ✅ **Mobile sidebar drawer** — both Dashboard and Video Session collapse the sidebar to a hamburger drawer on narrow viewports.
- ✅ **Shared utilities + shell** — `js/utils.js` and `js/shell.js` created and wired into Dashboard and Video Session.
- ✅ **Subtitle overlay controls** — floating CC toggle, size picker dropdown, and pinyin on/off toggle for the on-video Hanzi/Pinyin overlay; preferences persisted in `localStorage`.
- ✅ **Fixed-height scrollable script panel** — script container is `600px` / `60vh` with internal vertical scrolling.

### P1 — Complete the MVP experience (completed)

- ✅ **Resume playback position** from `localStorage` on page load for both S3 and YouTube videos.
- ✅ **Playback speed control** via settings popover for both native `<video>` and YouTube.
- ✅ **Global loading and error states** — per-section skeletons and retryable error UI for notes, script, video library, and related lessons.
- ✅ **Previous/Next lesson navigation** in the video session topnav based on the video catalog order.

### P2 — Shared components and quality

1. **Extract shared UI components** (`js/ui-components.js`) for toast, confirm modal, and detail modal.
2. **Extract shared state / pending-change queue** (`js/state.js`) for reuse across pages.
3. **Full sidebar markup extraction** into `js/shell.js` to eliminate duplication between `index.html` and `pages/video-session.html`.
4. **Add `package.json` scripts** (serve, check, lint) and optionally ESLint.

### Short-term (MVP pages)

5. **Flashcards Hub** — migrate `templates/flashcards_management_hub/` into `pages/flashcards.html` + `js/pages/flashcards.js`.
6. **Study Mode** — migrate `templates/flashcards_study_interface/` and wire deck endpoints with `studyMode` filters.
7. **Deck Editor** — migrate `templates/flashcards_deck_management_editor/` and implement CRUD + cursor pagination.
8. **Stats** — migrate `templates/learning_statistics_dashboard/` and render aggregate + activity data.
9. **Script Reader** — migrate `templates/updated_script_reading_interface/` and reuse the script API.
10. **Document Study** — migrate `templates/document_study_interface/` and remove the AI tutor panel per the PRD.

### Polish

11. Clean up remaining `MandarinFlow` branding in templates.
12. Add linting, formatting, and/or a minimal test harness.

---

## Architecture Notes

### API client design

- `js/api/client.js` wraps `fetch` with:
  - Configurable base host (`localStorage.mando.apiHost` or `window.__MANDO_HOST__`, default `http://localhost:8080`)
  - JSON headers
  - Exponential backoff (`1s`, `2s`, `4s`) for 5xx / network errors
  - Normalized `{ ok, status, data, error }` responses

### Identity resolution

All pages read `userId` from the URL first, then `localStorage`. If neither exists, the page renders in **demo mode** with static fallback data and no API calls.

### Batch-first writes

Note and flashcard creates/updates/deletes are queued in memory and flushed via `POST /api/textprocessing/{userId}/batch` when the user clicks **Save** or presses `Ctrl/Cmd+S`. Note details use immediate single-endpoint calls (`PUT /api/textprocessing/{userId}/{sessionId}/{noteId}/detail`).

### Optimistic UI

The video session page renders pending changes immediately. Created notes receive temporary IDs and are refreshed from the API after a successful batch save.

---

## Backend Status

The companion Java/Spring Boot backend (in `~/IdeaProjects/MandoLearning/`) reports the **Video & Stats MVP complete through Phase 4**:

- S3-hosted and YouTube-embedded video sources
- S3-based timestamped script storage
- Public and admin script endpoints
- Multipart upload support
- Stats aggregation and event ingestion
- Unit tests passing (`./gradlew test`)

### Backend post-MVP backlog

- CloudFront distribution / signed URLs
- AWS Elemental MediaConvert transcoding pipeline
- Async stats aggregation
- CloudWatch monitoring
- Admin lifecycle APIs (publish/unpublish)
- Watch progress persistence endpoint (`POST /api/videos/{videoId}/progress`)

---

## How to Run Locally

### Frontend only (demo mode)

```bash
python3 -m http.server 8000
```

Open:

```
http://localhost:8000/index.html
```

### With a local backend

Start the backend from the companion project:

```bash
cd /Users/yuseicarloschina2560/IdeaProjects/MandoLearning
./gradlew bootRun
```

Then open the frontend with a user ID:

```
http://localhost:8000/index.html?userId=USR_000789
http://localhost:8000/pages/video-session.html?videoId=VIDEO_xxx&userId=USR_000789
```

The `userId` is persisted to `localStorage` after the first visit, so subsequent pages do not need the query param.

---

## Documentation References

- `PRD.md` — product requirements and MVP scope
- `HIGH_LEVEL_PLAN.md` — frontend integration architecture
- `API_LOW_LEVEL_IMPLEMENTATION_PLAN.md` — detailed dashboard + video session plan
- `SHARED_COMPONENTS.md` — component audit and shared-asset inventory
- `templates/lumina_learning/DESIGN.md` — design tokens

Backend API docs (in the companion Java project):

- `MandoLearningVideo_api_documentation.md`
- `MandoLearningTextProcessing_api_documentation.md`
- `MandoLearningStats_api_documentation.md`
