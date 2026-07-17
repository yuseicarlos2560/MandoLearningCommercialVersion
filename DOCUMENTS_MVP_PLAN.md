# Documents — Low-Level Implementation Plan to 100% MVP

> Principal Engineer review of the MandoLearning documents experience.
> Scope: document library and document study page (`pages/document-study.html` + `js/pages/document-study.js`).
> Goal: define the exact UI/UX behavior, API wiring, state management, and validation steps required to ship a cohesive MVP — with an honest account of what the backend does and does not provide today.

---

## 1. MVP Definition for Documents

Per `PRD.md` §7.4 and `HIGH_LEVEL_PLAN.md` §5.4, the documents experience must deliver:

1. **Document Library** (no `documentId` in URL)
   - Grid of the user's documents: file name, size, upload date, status.
   - Empty state with a clear call to action.
   - **Upload Document button visible to admins only** (PRD §9.5: uploads are admin-only in production).
   - Click a document → study view. The last opened document is remembered (`mando.lastDocumentId`).

2. **Document Study** (`?documentId=DOC_xxx`)
   - Document viewer with zoom and fullscreen.
   - Rendered document canvas (real PDF via presigned URL; styled HTML reading canvas in demo mode).
   - **Study Notes** panel with formatting toolbar and save.
   - **Related Topics** chip cloud that deep-links into flashcards.
   - Section progress (scroll-based, local).
   - Save Word flow: capture vocabulary into notes + optional flashcard (same queue pattern as video/script pages).
   - **AI Tutor chat removed** (PRD §9.4).
   - **Export PDF / Manage Files hidden for learners** (PRD §9.5).

A feature is at **100% MVP** when it is implemented, wired to the correct backend API (or intentionally mocked with a documented fallback), works end-to-end for both authenticated users and demo mode, and follows the shared design system and shell patterns.

---

## 2. Current State

### 2.1 Frontend assets

| Asset | Status |
|---|---|
| `templates/document_study_interface/code.html` | ✅ Complete static template (already `MandoLearning`-branded) |
| `pages/document-study.html` | ❌ Empty placeholder |
| `js/pages/document-study.js` | ❌ Missing |
| `js/api/documents.js` | ❌ Missing |
| `js/api/notes.js` | ⚠️ Has script-scoped methods; no document-scoped methods |
| `js/api/batch.js` | ✅ Generic flush (payload built by callers) |
| `js/shell.js`, `js/utils.js`, `js/ui-components.js`, `js/pinyin-helper.js` | ✅ Shared infrastructure in place |
| Library/catalog template | ❌ Does not exist — must be designed within the design system |

### 2.2 Backend reality (critical)

The Documents backend module is **specified but not implemented**:

- `SCRIPTS_DOCUMENTS_LOW_LEVEL_PLAN.md` (backend repo) states: *"Phase 1 and Phase 2 (Scripts) Complete — Documents module pending."*
- The backend `README.md` lists *"Documents module (Phase 3)"* and *"Batch operations for script/document notes (Phase 4)"* as upcoming work.
- There is no `documents` package in the backend source tree and no `MandoLearningDocuments_api_documentation.md`.
- The TextProcessing API (v1.2.0) already supports `contentType: DOCUMENT` in the notes data model, but exposes **no document-scoped note endpoints** yet.

**Consequence:** every documents endpoint below is a documented contract that will return `404` until backend Phase 3/4 ships. The frontend must treat that 404 as *"module not deployed"* and degrade gracefully into demo/local mode — never as a hard failure.

---

## 3. Backend API Coverage (planned contract)

Source: `SCRIPTS_DOCUMENTS_LOW_LEVEL_PLAN.md` §4.2–4.4.

### 3.1 Documents API (`/api/documents`) — ⏳ pending backend

| Endpoint | Method | Used For | Status |
|---|---|---|---|
| `POST /api/documents` | POST | Initiate upload; returns `documentId` + presigned S3 PUT URL | ⏳ Specified, not deployed |
| `POST /api/documents/{documentId}/complete` | POST | Verify S3 object; flip status `PENDING_UPLOAD` → `READY` | ⏳ Specified, not deployed |
| `GET /api/documents?pageSize&nextToken` | GET | List my documents (newest first) | ⏳ Specified, not deployed |
| `GET /api/documents/{documentId}` | GET | Metadata + presigned download URL | ⏳ Specified, not deployed |
| `DELETE /api/documents/{documentId}` | DELETE | Delete metadata + S3 object | ⏳ Specified, not deployed |

`DocumentEntity` fields: `documentId`, `userId`, `fileName`, `fileSizeBytes`, `mimeType`, `status` (`PENDING_UPLOAD|READY|ERROR`), `s3Bucket`, `s3Key`, `createdAt`, `updatedAt`.

### 3.2 Document notes (`/api/textprocessing/{userId}/documents/{documentId}/...`) — ⏳ pending backend

Mirrors the script-scoped note endpoints exactly:

| Endpoint | Method | Used For |
|---|---|---|
| `POST .../documents/{documentId}/notes/add` | POST | Create note (optional `parentNoteId`) |
| `GET .../documents/{documentId}?details=true` | GET | List notes + details map |
| `PUT .../documents/{documentId}/{noteId}` | PUT | Update `character`/`pinyin` |
| `DELETE .../documents/{documentId}/{noteId}` | DELETE | Delete note |
| `PUT .../documents/{documentId}/{noteId}/detail` | PUT | Upsert explanation + example sentence |
| `GET/DELETE .../documents/{documentId}/{noteId}/detail` | GET/DELETE | Detail read/delete |

### 3.3 Batch extension — ⏳ pending backend

`BatchOperationRequest` gains `createDocumentNotes`, `updateDocumentNotes`, `deleteDocumentNotes` arrays (each item carries `documentId` + `noteId`). The 25-item total limit still applies. Flashcard arrays are unchanged, so **Save Word → flashcard works today** via the already-live `createFlashCards` batch path.

### 3.4 Degradation strategy

| Call | On 404 (module not deployed) |
|---|---|
| `GET /api/documents` | Render demo library fixtures; show a subtle "documents backend not deployed" banner in authenticated mode. |
| `GET /api/documents/{id}` | Use the demo document fixture (HTML reading canvas). |
| Document note endpoints | Switch the page to **local-only notes mode**: keep the queue in memory, back it up to `localStorage` (`mando.docqueue.{documentId}`), show an info notice that notes will sync once the backend ships. |
| `createFlashCards` batch | Live today — flashcards are always persisted for authenticated users. |

---

## 4. UI/UX Design Decisions

### 4.1 PDF rendering: native `<iframe>`, not pdf.js

| Option | Verdict | Why |
|---|---|---|
| **Native `<iframe>` with presigned URL** | ✅ MVP | Zero dependencies; the browser's built-in viewer supplies page navigation, in-PDF search, zoom, and print for free. |
| pdf.js canvas + textLayer | ⏳ P2 | ~400 KB CDN weight, CORS requirements on the presigned URL, and custom page/search UI to rebuild. Only needed for in-document text selection. |

Consequences for the custom toolbar:

- **Keep:** zoom out/in (CSS `transform: scale()` on the iframe container, 50–200%), fullscreen toggle (`requestFullscreen` on the viewer container).
- **Drop for MVP:** the custom page indicator and custom search button — the native viewer already provides both for real PDFs. The template's "Page 1 of 4" and search icon are design fiction without a text layer.
- **Demo mode:** no PDF exists, so the viewer renders a styled HTML reading canvas (adapted from the template's static canvas); zoom/fullscreen work on it identically.

### 4.2 Word capture is manual (no in-PDF selection)

An `<iframe>` PDF exposes no text DOM to the parent page, so the video-session "select subtitle text" pattern is impossible. MVP flow:

1. **Save Word** button (in the notes panel and the Quick Notes FAB) opens the shared note modal.
2. User types/pastes the character; **pinyin auto-fills via `MandoPinyin.autoFill`** (already built for flashcards).
3. On confirm: `queueChange('CREATE_DOCUMENT_NOTE', {...})` plus optional `CREATE_FLASHCARD` when "Also add to deck" is checked.
4. Save All / `Ctrl+S` flushes via `POST /batch` (extended document-note arrays) with the degradation strategy of §3.4.

P2: pdf.js textLayer would enable true select-to-capture.

### 4.3 Study Notes (free-text) are local-only for MVP

The template's Study Notes textarea has no corresponding backend field — document notes are vocabulary cards (`character`/`pinyin`/`detail`), not free text.

**Decision:** persist the textarea to `localStorage` under `mando.docnotes.{documentId}`, with a debounced autosave and an explicit Save button for parity with the template. Documented as a deliberate MVP local-first feature; migration path is a future backend free-text field or a well-known `NoteDetail` convention.

### 4.4 Formatting toolbar inserts Markdown markers

A `<textarea>` cannot render rich text, but the PRD calls for a formatting toolbar. The buttons insert lightweight markers at the cursor: `**bold**`, `*italic*`, `• ` list items. Cheap, honest, and the notes remain portable plain text.

### 4.5 Section progress is scroll-based and local

The template's "65% Complete" has no backend source. MVP tracks scroll position of the viewer container, persists `mando.docprogress.{documentId}` (`{ percent }`), and restores it on load — mirroring the video watch-progress pattern.

### 4.6 Related Topics chips deep-link to flashcards

Chips are derived from the document's vocabulary-note categories (fallback: static topics in demo mode). Clicking a chip navigates to `flashcards.html` (hub) — or, when the chip matches a deck category, directly to `study-mode.html?mode=random&category=X`, closing the PRD §6.3 reading loop.

### 4.7 Admin-only actions

- **Upload Document** (library), **Export PDF**, **Manage Files** (study view) render only when `MandoUtils.isAdmin()` — same gate as the dashboard.
- Learners still get PDF download/print through the native viewer, so nothing is lost.
- Upload flow (admin): `POST /api/documents` → `PUT` file to the presigned S3 URL → `POST /complete`, then refresh the library. Until the backend ships, the admin upload shows the same "not deployed" notice.

### 4.8 Routing & resume

```
pages/document-study.html
└── Library mode (or redirect to mando.lastDocumentId only when ?resume=1)

pages/document-study.html?documentId=DOC_xxx
└── Study mode: viewer + notes + vocabulary + related topics
```

The sidebar Documents link always lands on the library. Opening a document persists `mando.lastDocumentId` for a future "continue reading" entry point.

---

## 5. Element-by-Element Audit

### Legend

| Symbol | Meaning |
|---|---|
| ✅ | Implemented and working |
| ⚠️ | Implemented but partial / fragile |
| ❌ | Not implemented |
| API ✅ | Backend API exists today |
| API ⏳ | Specified, backend pending |
| N/A | No backend needed |

### 5.1 Library mode

| # | Feature | Backend API | Implemented | Working | Notes |
|---|---|---|---|---|---|
| L1 | Shared sidebar, Documents active | N/A | ✅ | ✅ | `js/shell.js` |
| L2 | Mobile drawer | N/A | ✅ | ✅ | |
| L3 | Document grid (name, size, date, status) | API ⏳ | ✅ | ✅ | Demo fixtures + graceful 404 fallback + banner |
| L4 | Empty state | N/A | ✅ | ✅ | "No documents yet" |
| L5 | Upload Document (admin-only) | API ⏳ | ✅ | ✅ | `isAdmin()` gate; presigned PUT flow; 404 notice |
| L6 | Document card → study view | N/A | ✅ | ✅ | Persists `mando.lastDocumentId` |
| L7 | Delete document (admin-only) | API ⏳ | ❌ | ❌ | Confirm modal → DELETE; P1 |

### 5.2 Study mode

| # | Feature | Backend API | Implemented | Working | Notes |
|---|---|---|---|---|---|
| S1 | Shared sidebar, Documents active | N/A | ✅ | ✅ | |
| S2 | Document metadata header (title, breadcrumb) | API ⏳ | ✅ | ✅ | |
| S3 | PDF viewer (iframe, presigned URL) | API ⏳ | ✅ | ✅ | Demo/fallback: HTML reading canvas |
| S4 | Zoom in/out (CSS scale) | N/A | ✅ | ✅ | 50–200%, persisted per document |
| S5 | Fullscreen toggle | N/A | ✅ | ✅ | `requestFullscreen` |
| S6 | Study Notes textarea + save | N/A (local) | ✅ | ✅ | `localStorage`, debounced autosave |
| S7 | Formatting toolbar (bold/italic/list) | N/A | ✅ | ✅ | Markdown marker insertion |
| S8 | Save Word → note + optional flashcard | API ⏳ / ✅ (flashcards) | ✅ | ✅ | Manual input + pinyin auto-fill |
| S9 | Vocabulary notes panel | API ⏳ | ✅ | ✅ | |
| S10 | Batch save (`POST /batch`) | API ⏳ | ✅ | ✅ | Flashcards flush on a separate request from notes |
| S11 | Local-only fallback on 404 | N/A | ✅ | ✅ | `localStorage` queue backup + sync notice |
| S12 | Section progress (scroll) | N/A (local) | ✅ | ✅ | `mando.docprogress.{id}` |
| S13 | Related Topics chips → flashcards | N/A | ✅ | ✅ | Derived from vocab HSK/categories; static fallback |
| S14 | Export PDF / Manage Files (admin-only) | N/A | ✅ | ✅ | Hidden for learners |
| S15 | AI Tutor panel | — | ✅ | ✅ | **Removed per PRD §9.4** |
| S16 | `beforeunload` with unsaved changes | N/A | ✅ | ✅ | Suppressed in local-only mode (queue is backed up) |

---

## 6. State Management

### 6.1 Page state

```js
{
  userId: string | null,
  demoMode: boolean,
  mode: 'library' | 'study',
  // Library
  documents: DocumentEntity[],
  nextToken: string | null,
  backendDeployed: boolean,        // flips false on first documents-API 404
  // Study
  documentId: string | null,
  document: DocumentEntity | null,
  downloadUrl: string | null,      // presigned S3 URL for the iframe
  notes: NoteEntity[],
  noteDetails: Record<noteId, NoteDetailEntity>,
  pendingChanges: PendingChange[],
  localOnlyNotes: boolean,         // true once a note call 404s
  isSaving: boolean,
  zoom: number,                    // 0.5–2.0
  scrollPercent: number,
  studyNotesDraft: string,
}
```

### 6.2 Pending change item (reuses the established queue shape)

```js
{
  _id: string,
  operation: 'CREATE_DOCUMENT_NOTE' | 'UPDATE_DOCUMENT_NOTE' | 'DELETE_DOCUMENT_NOTE' |
             'CREATE_FLASHCARD',
  data: object,
  optimisticId?: string
}
```

Batch payload builder maps operations to `createDocumentNotes` / `updateDocumentNotes` / `deleteDocumentNotes` / `createFlashCards` arrays, chunked at 25, with per-item failure mapping — the same mechanics as the deck editor.

---

## 7. Plan to 100% MVP

### Priority Definitions

- **P0** — Blocks the core documents experience.
- **P1** — Required for a complete, polished MVP.
- **P2** — Post-MVP polish.

---

### Phase 1: P0 — API client + Library ✅

#### 1.1 Create `js/api/documents.js` ✅

**Changes:**
1. `MandoApi.documents` with:
   - `initiateUpload(userId, { fileName, fileSizeBytes, mimeType })`
   - `completeUpload(documentId)`
   - `list(userId, { pageSize, nextToken })`
   - `get(documentId)` → metadata + presigned download URL
   - `remove(documentId)`
2. JSDoc noting the module is specified-but-pending; callers must tolerate 404.

**Acceptance criteria:** `node --check` passes; methods return normalized results.

#### 1.2 Extend `js/api/notes.js` with document scope ✅

**Changes:** add `listDocument`, `createDocumentNote`, `updateDocumentNote`, `deleteDocumentNote`, `getDocumentDetail`, `saveDocumentDetail`, `deleteDocumentDetail` — exact mirrors of the script-scoped methods under `.../documents/{documentId}/...`.

#### 1.3 Scaffold `pages/document-study.html` ✅

**Changes:**
1. Shared head (fonts, Tailwind CDN + config, design-system.css, utils/shell/ui-components/pinyin-helper, api clients: client, documents, notes, batch, stats).
2. Shared sidebar (`activeNavItem: 'documents'`) + glass header + mobile drawer.
3. Two top-level containers: `#library-view` and `#study-view`, toggled by mode.
4. Study view adapted from the template: breadcrumb + title header, viewer toolbar (zoom out / zoom % / zoom in / fullscreen), viewer container (`#document-frame` iframe + `#demo-canvas` HTML fallback), Study Notes panel (toolbar + textarea + save), vocabulary notes panel, progress card, Related Topics chips.
5. **AI Tutor panel and its chat markup removed entirely.**
6. Export PDF / Manage Files buttons present but `hidden` unless `isAdmin()`.
7. Save Word modal (character, pinyin auto-fill, HSK, meaning, "Also add to deck") — same markup pattern as the flashcards create-deck modal.
8. Stable IDs per §5 audit (`document-grid`, `upload-btn`, `doc-title`, `zoom-*`, `viewer-container`, `notes-textarea`, `save-notes-btn`, `save-word-btn`, `vocab-notes-panel`, `progress-percent`, `progress-bar`, `topics-cloud`, `doc-banner`).

#### 1.4 Create `js/pages/document-study.js` — library mode ✅

**Changes:**
1. Parse `documentId`; absent → library mode.
2. Load `MandoApi.documents.list(userId, { pageSize: 20 })`; on 404 set `backendDeployed = false` and use demo fixtures (3 documents with realistic names/sizes/dates).
3. Render document cards (file icon by mimeType, name, size formatted, date, status badge); click → `?documentId=X`.
4. Empty state when zero documents.
5. Admin upload button → file picker → initiate → presigned PUT → complete → reload; surfaces the not-deployed notice on 404.
6. Record `USER_ACTIVE` (non-blocking, consistent with other pages).

---

### Phase 2: P0 — Study view ✅

#### 2.1 Document loading ✅

1. `GET /api/documents/{id}` → metadata + `downloadUrl`; on 404 fall back to the demo fixture document (HTML canvas content).
2. Real PDF: set `#document-frame.src = downloadUrl`. Demo: render the HTML reading canvas (adapted template markup: header, key-vocabulary callout, bilingual paragraphs).
3. Persist `mando.lastDocumentId`.

#### 2.2 Viewer controls ✅

- Zoom: 0.5→2.0 in 0.25 steps via CSS transform; zoom % label; persist per document (`mando.doczoom.{id}`).
- Fullscreen toggle on the viewer container.
- Scroll progress: listener on the scroll container → update progress card + persist `mando.docprogress.{id}`; restore on load.

#### 2.3 Study Notes panel ✅

- Load/save `mando.docnotes.{id}`; debounced autosave (1s) + explicit Save button with toast.
- Toolbar inserts `**`, `*`, `• ` at the cursor.

#### 2.4 Save Word + vocabulary panel ✅

1. Save Word modal with `MandoPinyin.autoFill` on the character field.
2. Queue `CREATE_DOCUMENT_NOTE` (+ optional `CREATE_FLASHCARD`); optimistic render in the vocabulary panel.
3. Save All / `Ctrl+S` → build mixed batch payload → chunk at 25 → flush → per-item failure mapping.
4. First document-note 404 → `localOnlyNotes = true`, persist queue to `mando.docqueue.{id}`, show the sync notice; flashcards still flush (that path is live).
5. Load existing notes on init (`listDocument`), tolerating 404.
6. `beforeunload` warning with pending changes.

---

### Phase 3: P1 — Polish

#### 3.1 Related Topics chips ✅
Derive from vocabulary-note categories/HSK; click → flashcards hub or `study-mode.html?mode=random&category=X`.

#### 3.2 Delete document (admin)
Confirm modal → `DELETE /api/documents/{id}` → navigate to library; hidden for learners.

#### 3.3 Loading skeletons + error states
Skeleton cards in the library grid; per-section retry on failure (mirrors flashcards/stats patterns).

#### 3.4 Brand/status pass
Confirm no `MandarinFlow` anywhere; add document-study status to README.

---

### Phase 4: P2 — Post-MVP

- pdf.js textLayer for in-document select-to-capture and real page indicator/search.
- Backend-coordinated study-notes persistence when a free-text field exists.
- Document detail popover editing (explanation/example) — same pattern as video/script notes.

---

## 8. Testing & Validation Plan

### Manual test matrix

| Scenario | Steps | Expected Result |
|---|---|---|
| Demo library | Open `pages/document-study.html` with no `userId` | Demo document cards render; click opens study view |
| Demo study | Open a demo document | HTML reading canvas, notes panel, chips render |
| Auth library (backend pending) | Open with `?userId=USR_xxx` | 404 → banner + demo fixtures, no hard error |
| Auth study (backend pending) | Open `?documentId=X` | Fallback canvas; notes save locally with sync notice |
| Save Word | Type character | Pinyin auto-fills; note queues; flashcard flushes on Save All |
| Study Notes | Type + reload | Draft restored from localStorage |
| Zoom/fullscreen | Click controls | Viewer scales; fullscreen toggles |
| Scroll progress | Scroll + reload | Progress % restored |
| Admin gating | Toggle `mando.userRole` | Upload/Export/Manage appear only for admins |
| Mobile drawer | Resize < 768 px | Hamburger opens/closes sidebar |

### Automated checks

- `npm run check` passes.
- Node smoke tests (mocked DOM/fetch): library demo render, auth 404 fallback, Save Word queue + batch payload shape, local-only switch on note 404, admin gating.
- No console errors in demo mode.

---

## 9. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Documents API contract changes before backend ships | Calls fail or payload mismatch | Client isolated in `js/api/documents.js`; contract copied verbatim from the backend low-level plan; 404 tolerance everywhere |
| Backend implements documents mid-MVP | Page silently stays in fallback | `backendDeployed` re-probed on each page load; fallback is cosmetic, not destructive |
| Presigned URL CORS blocks the iframe | PDF won't render | iframes don't need CORS for display (only for DOM access, which we don't use); add error listener + download fallback link |
| Users lose local-only notes | Trust | Queue backed up to `localStorage` immediately on change; clear sync notice |
| Free-text notes never migrate | Local data stranded | Documented decision; export is trivial (plain text in localStorage) |
| iframe PDF UX varies across browsers | Inconsistent viewer chrome | Acceptable for MVP; pdf.js is the P2 answer |

---

## 10. Definition of Done

The Documents experience is at 100% MVP when:

1. Library mode renders the document grid (demo fixtures + live API when deployed), empty state, and admin-gated upload.
2. Study mode renders a real PDF in the iframe when the backend provides a presigned URL, and the styled HTML canvas otherwise.
3. Zoom, fullscreen, and scroll-based section progress work and persist locally.
4. Study Notes save to and restore from localStorage (debounced + explicit save).
5. Save Word queues document notes (+ optional flashcards), flushes via `/batch`, and degrades to local-only mode with a clear notice on 404.
6. Related Topics chips link into the flashcards experience.
7. AI Tutor markup is absent; Export PDF / Manage Files are hidden for learners.
8. Mobile sidebar drawer works on both modes.
9. `npm run check` passes; smoke tests cover the degradation paths.
10. README and this plan reflect the final state.

---

## 11. Suggested Implementation Order

1. Create `js/api/documents.js` and extend `js/api/notes.js` (document scope).
2. Scaffold `pages/document-study.html`: shared shell, both view containers, AI Tutor removed, admin-gated buttons.
3. Implement library mode in `js/pages/document-study.js` (grid, fixtures, 404 fallback, admin upload flow).
4. Implement study mode: document load + iframe/canvas, zoom, fullscreen, scroll progress.
5. Study Notes panel (localStorage + toolbar).
6. Save Word modal + vocabulary panel + batch save + local-only fallback.
7. Related Topics chips, delete (admin), skeletons, error states.
8. Smoke tests + `npm run check` + README/status updates.
