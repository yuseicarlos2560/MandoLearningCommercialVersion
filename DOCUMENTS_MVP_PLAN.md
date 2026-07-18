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
| `pages/document-study.html` | ✅ Library + study view scaffolded |
| `js/pages/document-study.js` | ✅ Library + study mode implemented |
| `js/api/documents.js` | ✅ Path-based `userId`, `contentType` field |
| `js/api/notes.js` | ✅ Script-scoped + document-scoped methods |
| `js/api/batch.js` | ✅ Generic flush (payload built by callers) |
| `js/shell.js`, `js/utils.js`, `js/ui-components.js`, `js/pinyin-helper.js` | ✅ Shared infrastructure in place |
| Library/catalog template | ❌ Does not exist — must be designed within the design system |

### 2.2 Backend reality

The Documents API is now documented in `~/IdeaProjects/MandoLearning/MandoLearningDocuments_api_documentation.md`. Compared with the earlier draft contract, a few important conventions have changed:

- The base path is `/api/documents/{userId}`, **not** `/api/documents?userId=...`.
- Upload requests use `contentType` (`application/pdf` or `text/plain`), **not** `mimeType`.
- Document notes are **not** submitted through custom `createDocumentNotes` batch arrays. They use the single document-scoped TextProcessing endpoints (`/api/textprocessing/{userId}/documents/{documentId}/...`). Only flashcards continue to use the live `/batch` endpoint.
- The batch endpoint's note arrays remain session-scoped and do not accept a `documentId` override.

If the backend module is not yet deployed, calls return `404`. The frontend degrades to demo/local mode — never as a hard failure.

---

## 3. Backend API Coverage (planned contract)

Source: `SCRIPTS_DOCUMENTS_LOW_LEVEL_PLAN.md` §4.2–4.4.

### 3.1 Documents API (`/api/documents/{userId}`)

| Endpoint | Method | Used For | Status |
|---|---|---|---|
| `POST /api/documents/{userId}` | POST | Initiate upload; returns `documentId` + presigned S3 PUT URL | ✅ Documented, path-based userId |
| `POST /api/documents/{userId}/{documentId}/complete` | POST | Verify S3 object; flip status `PENDING_UPLOAD` → `READY` | ✅ Documented |
| `GET /api/documents/{userId}?pageSize&nextToken` | GET | List my documents (newest first); response uses `nextPageStateToken` | ✅ Documented |
| `GET /api/documents/{userId}/{documentId}` | GET | Metadata + presigned download URL | ✅ Documented |
| `DELETE /api/documents/{userId}/{documentId}` | DELETE | Delete metadata + S3 object | ✅ Documented |

`DocumentEntity` fields: `documentId`, `userId`, `compoundSortKey`, `fileName`, `contentType` (`application/pdf` or `text/plain`), `fileSizeBytes`, `status` (`PENDING_UPLOAD|READY|ERROR`), `s3Bucket`, `s3Key`, `uploadExpiresAt`, `createdAt`, `updatedAt`.

### 3.2 Document notes (`/api/textprocessing/{userId}/documents/{documentId}/...`)

Mirrors the session/script note endpoints exactly. Document-scoped notes use single-endpoint calls, not the batch endpoint.

| Endpoint | Method | Used For |
|---|---|---|
| `POST .../documents/{documentId}/notes/add` | POST | Create note (optional `parentNoteId`) |
| `GET .../documents/{documentId}?details=true` | GET | List notes + details map |
| `PUT .../documents/{documentId}/{noteId}` | PUT | Update `character`/`pinyin` |
| `DELETE .../documents/{documentId}/{noteId}` | DELETE | Delete note |
| `PUT .../documents/{documentId}/{noteId}/detail` | PUT | Upsert explanation + example sentence |
| `GET/DELETE .../documents/{documentId}/{noteId}/detail` | GET/DELETE | Detail read/delete |

### 3.3 Batch usage for documents

The `/batch` endpoint only supports session-scoped note arrays (`createNotes`/`updateNotes`/`deleteNotes`) and flashcard arrays. Document-scoped note creates/updates/deletes therefore use the single TextProcessing document-note endpoints directly. Flashcards created from **Save Word** still go through the live `createFlashCards` batch array.

### 3.4 Degradation strategy

| Call | On 404 (module not deployed) |
|---|---|
| `GET /api/documents/{userId}` | Render demo library fixtures; show a subtle "documents backend not deployed" banner in authenticated mode. |
| `GET /api/documents/{userId}/{documentId}` | Use the demo document fixture (HTML reading canvas). |
| Document note endpoints | Switch the page to **local-only notes mode**: keep the queue in memory, back it up to `localStorage` (`mando.docqueue.{documentId}`), show an info notice that notes will sync once the backend ships. |
| `createFlashCards` batch | Live — flashcards are persisted for authenticated users. |

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
4. Save All / `Ctrl+S` flushes flashcards via `POST /batch` (`createFlashCards`) and document notes via the single TextProcessing document-note endpoints, with the degradation strategy of §3.4.

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
- Upload flow (admin): `POST /api/documents/{userId}` → `PUT` file to the presigned S3 URL → `POST /api/documents/{userId}/{documentId}/complete`, then refresh the library. Until the backend ships, the admin upload shows the same "not deployed" notice.

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
| L3 | Document grid (name, size, date, status) | API ✅ | ✅ | ✅ | Live API when deployed; demo fixtures + graceful 404 fallback + banner |
| L4 | Empty state | N/A | ✅ | ✅ | "No documents yet" |
| L5 | Upload Document (admin-only) | API ✅ | ✅ | ✅ | `isAdmin()` gate; presigned PUT flow; 404 notice |
| L6 | Document card → study view | N/A | ✅ | ✅ | Persists `mando.lastDocumentId` |
| L7 | Delete document (admin-only) | API ✅ | ✅ | ✅ | Confirm modal → DELETE; P1 |

### 5.2 Study mode

| # | Feature | Backend API | Implemented | Working | Notes |
|---|---|---|---|---|---|
| S1 | Shared sidebar, Documents active | N/A | ✅ | ✅ | |
| S2 | Document metadata header (title, breadcrumb) | API ✅ | ✅ | ✅ | |
| S3 | PDF viewer (iframe, presigned URL) | API ✅ | ✅ | ✅ | Demo/fallback: HTML reading canvas |
| S4 | Zoom in/out (CSS scale) | N/A | ✅ | ✅ | 50–200%, persisted per document |
| S5 | Fullscreen toggle | N/A | ✅ | ✅ | `requestFullscreen` |
| S6 | Study Notes textarea + save | N/A (local) | ✅ | ✅ | `localStorage`, debounced autosave |
| S7 | Formatting toolbar (bold/italic/list) | N/A | ✅ | ✅ | Markdown marker insertion |
| S8 | Save Word → note + optional flashcard | API ✅ (notes single endpoints + flashcards batch) | ✅ | ✅ | Manual input + pinyin auto-fill |
| S9 | Vocabulary notes panel | API ✅ | ✅ | ✅ | |
| S10 | Save All | API ✅ (flashcards batch) / API ✅ (notes single endpoints) | ✅ | ✅ | Flashcards flush via `/batch`; notes flush via single endpoints |
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

`CREATE_FLASHCARD` items are flushed via the `/batch` endpoint's `createFlashCards` array, chunked at 25, with per-item failure mapping.

`CREATE_DOCUMENT_NOTE`, `UPDATE_DOCUMENT_NOTE`, and `DELETE_DOCUMENT_NOTE` items are flushed through the single document-scoped TextProcessing endpoints (the batch endpoint does not support document-scoped note arrays).

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
   - `initiateUpload(userId, { fileName, contentType, fileSizeBytes })` → `POST /api/documents/{userId}`
   - `completeUpload(userId, documentId)` → `POST /api/documents/{userId}/{documentId}/complete`
   - `list(userId, { pageSize, nextToken })` → `GET /api/documents/{userId}`; response cursor is `nextPageStateToken`
   - `get(userId, documentId)` → `GET /api/documents/{userId}/{documentId}`; returns `document` + `downloadUrl`
   - `remove(userId, documentId)` → `DELETE /api/documents/{userId}/{documentId}`
2. JSDoc noting callers must tolerate 404 when the module is not deployed.

**Acceptance criteria:** `node --check` passes; methods return normalized results.

#### 1.2 Extend `js/api/notes.js` with document scope ✅

**Changes:** add `listDocument`, `createDocumentNote`, `updateDocumentNote`, `deleteDocumentNote`, `getDocumentDetail`, `saveDocumentDetail`, `deleteDocumentDetail` — exact mirrors of the script-scoped methods under `.../documents/{documentId}/...`. Document notes are flushed through these single endpoints, not through `/batch`.

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
2. Load `MandoApi.documents.list(userId, { pageSize: 20 })`; on 404 set `backendDeployed = false` and use demo fixtures (3 documents with realistic names/sizes/dates). Response cursor is `nextPageStateToken`.
3. Render document cards (file icon by `contentType`, name, size formatted, date, status badge); click → `?documentId=X`.
4. Empty state when zero documents.
5. Admin upload button → file picker → `POST /api/documents/{userId}` → presigned `PUT` → `POST /api/documents/{userId}/{documentId}/complete` → reload; surfaces the not-deployed notice on 404.
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
3. Save All / `Ctrl+S`:
   - Flush `CREATE_FLASHCARD` items via `POST /api/textprocessing/{userId}/batch` (`createFlashCards` array), chunked at 25.
   - Flush document-note items (`CREATE_DOCUMENT_NOTE`, `UPDATE_DOCUMENT_NOTE`, `DELETE_DOCUMENT_NOTE`) via the single TextProcessing document-note endpoints.
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
| Save Word | Type character | Pinyin auto-fills; note queued; flashcard flushes via `/batch` on Save All |
| Save All | Add word + check "Also add to deck" | Document note created via single endpoint; flashcard created via `/batch` |
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
| Documents API contract changes | Calls fail or payload mismatch | Client isolated in `js/api/documents.js`; contract aligned with `MandoLearningDocuments_api_documentation.md`; 404 tolerance everywhere |
| Backend implements documents | Page silently stays in fallback | `backendDeployed` re-probed on each page load; fallback is cosmetic, not destructive |
| Document notes batched incorrectly | Mixed scope or 400 validation errors | Document notes use single TextProcessing endpoints; only flashcards use `/batch` |
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
5. Save Word queues document notes (+ optional flashcards); flashcards flush via `/batch`, document notes flush via single TextProcessing endpoints; degrades to local-only mode with a clear notice on 404.
6. Related Topics chips link into the flashcards experience.
7. AI Tutor markup is absent; Export PDF / Manage Files are hidden for learners.
8. Mobile sidebar drawer works on both modes.
9. `npm run check` passes; smoke tests cover the degradation paths.
10. README and this plan reflect the final state.

---

## 11. Suggested Implementation Order

1. Create `js/api/documents.js` (path-based `userId`, `contentType` field) and extend `js/api/notes.js` (document scope).
2. Scaffold `pages/document-study.html`: shared shell, both view containers, AI Tutor removed, admin-gated buttons.
3. Implement library mode in `js/pages/document-study.js` (grid, fixtures, 404 fallback, admin upload flow).
4. Implement study mode: document load + iframe/canvas, zoom, fullscreen, scroll progress.
5. Study Notes panel (localStorage + toolbar).
6. Save Word modal + vocabulary panel + single-endpoint note save + flashcard batch save + local-only fallback.
7. Related Topics chips, delete (admin), skeletons, error states.
8. Smoke tests + `npm run check` + README/status updates.
