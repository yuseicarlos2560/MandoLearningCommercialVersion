# MandoLearning TextProcessing API — Front-End Integration Guide

> **Version:** 1.1.0  
> **Base URL:** `https://<host>/api/textprocessing`  
> **Content-Type:** `application/json`  
> **Last Updated:** 2026-07-13

---

## 1. What This Service Does (Business Context)

The **TextProcessing API** is the vocabulary & note-taking backbone of MandoLearning. It lets learners:

1. **Save vocabulary** discovered during a video session (session-linked notes).
2. **Build a personal flashcard deck** for long-term study — either tied to a session or created manually.
3. **Annotate parent notes with detailed explanations** (e.g., usage notes, example sentences).
4. **Review & manage** cards by HSK level, category, or mastery status.
5. **Batch operations** — save multiple changes (creates, updates, deletes) in a single request via the `/batch` endpoint.

From a **front-end perspective**, you will interact with four conceptual resource types:

| Resource | What it represents | Typical UI |
|----------|-------------------|------------|
| **Notes** | Vocabulary captured while watching a video | Session sidebar, note tree |
| **Flashcards** | Study cards in the user's global deck | Deck manager, study modes |
| **Note Details** | Long-form explanation + example sentence | "Expand note" panel, tooltip |
| **Batch Operations** | Bulk save of all pending changes | "Save All" button

---

## 2. Quick-Start Decision Tree

```
┌─────────────────────────────────────────────────────────────┐
│  Is the user clicking "Save All" after multiple edits?      │
│  → Use BATCH endpoint (create/update/delete in one call)    │
├─────────────────────────────────────────────────────────────┤
│  Is the user watching a video and saving vocabulary?          │
│  → Use NOTE endpoints (session-linked)                      │
├─────────────────────────────────────────────────────────────┤
│  Is the user in the global Deck / Study screen?             │
│  → Use FLASHCARD endpoints                                  │
├─────────────────────────────────────────────────────────────┤
│  Does the user want to add an explanation or example        │
│  sentence to a saved vocabulary item?                         │
│  → Use NOTE DETAIL endpoints (parent notes only)            │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Authentication & Headers

| Header | Value | Required |
|--------|-------|----------|
| `Content-Type` | `application/json` | Yes (for POST/PUT) |
| `Accept` | `application/json` | Recommended |

> **Note:** The API expects `userId` as a path variable on every request. The front end must obtain the authenticated user's ID from your auth/session layer and inject it into URLs.

---

## 4. Endpoint Reference

### 4.1 Batch Operations (Save All)

#### Execute Mixed Batch

```http
POST /api/textprocessing/{userId}/batch
```

**When to use:** The user has made multiple changes (added new notes, edited existing flashcards, deleted items) and clicks a **"Save All"** button. Instead of firing N individual HTTP requests, send one batch request with up to **25 items**.

**Path Parameters:**
| Parameter | Example | Description |
|-----------|---------|-------------|
| `userId` | `USR_000789` | Authenticated user ID |

**Request Body (`BatchOperationRequest`):**

| Field | Type | Description |
|-------|------|-------------|
| `sessionId` | `string` | Default session ID for note operations (can be overridden per-item) |
| `createNotes` | `BatchCreateNoteItem[]` | Notes to create |
| `updateNotes` | `BatchUpdateNoteItem[]` | Notes to update (only `character`/`pinyin` mutable) |
| `deleteNotes` | `BatchDeleteNoteItem[]` | Notes to delete |
| `createFlashCards` | `BatchCreateFlashCardItem[]` | Flashcards to create |
| `updateFlashCards` | `BatchUpdateFlashCardItem[]` | Flashcards to update |
| `deleteFlashCards` | `BatchDeleteFlashCardItem[]` | Flashcards to delete |
| `createDetails` | `BatchCreateNoteDetailItem[]` | Note details to create (future) |
| `updateDetails` | `BatchUpdateNoteDetailItem[]` | Note details to update (future) |
| `deleteDetails` | `BatchDeleteNoteDetailItem[]` | Note details to delete (future) |

**Item DTOs** inherit from the standard request DTOs plus identifier fields:

| Item Type | Extra Fields |
|-----------|-------------|
| `BatchCreateNoteItem` | `parentNoteId` (optional), `sessionId` (optional override) |
| `BatchUpdateNoteItem` | `sessionId` (required), `noteId` (required) |
| `BatchDeleteNoteItem` | `sessionId` (required), `noteId` (required) |
| `BatchCreateFlashCardItem` | `sessionId` (optional; defaults to `NO_SESSION`) |
| `BatchUpdateFlashCardItem` | `category` (required), `flashCardId` (required) |
| `BatchDeleteFlashCardItem` | `category` (required), `flashCardId` (required) |

**Request Example:**
```bash
curl -X POST "http://localhost:8080/api/textprocessing/USR_000789/batch" \
     -H "Content-Type: application/json" \
     -d '{
       "sessionId": "VID_AAA000",
       "createNotes": [
         { "character": "你好", "pinyin": "nǐ hǎo", "hsk": "HSK1" }
       ],
       "updateNotes": [
         { "sessionId": "VID_AAA000", "noteId": "NOTE_ABC123", "character": "明白", "pinyin": "míngbai" }
       ],
       "deleteNotes": [
         { "sessionId": "VID_AAA000", "noteId": "NOTE_OLD001" }
       ],
       "createFlashCards": [
         { "character": "学习", "pinyin": "xué xí", "meaning": "to study", "hsk": "HSK3", "category": "Verbs" }
       ],
       "updateFlashCards": [
         { "category": "TRAVEL", "flashCardId": "FLASHCARD_001", "masteryStatus": "MASTERED" }
       ],
       "deleteFlashCards": [
         { "category": "TRAVEL", "flashCardId": "FLASHCARD_OLD001" }
       ]
     }'
```

**Success Response `200 OK`:**
```json
{
  "userId": "USR_000789",
  "totalRequested": 6,
  "succeeded": 5,
  "failed": 1,
  "results": [
    {
      "operation": "CREATE_NOTE",
      "index": 0,
      "status": "SUCCESS",
      "entityType": "NoteEntity",
      "entityId": "NOTE_A1B2C3",
      "message": "Successfully saved '你好' to your vocabulary deck."
    },
    {
      "operation": "UPDATE_NOTE",
      "index": 0,
      "status": "FAILED",
      "errorCode": "TP_RES_002",
      "message": "Note 'NOTE_ABC123' not found for user 'USR_000789' in session 'VID_AAA000'.",
      "path": null
    }
  ],
  "statusMessage": "Batch operation completed: 5 succeeded, 1 failed."
}
```

> **Important:** The batch endpoint returns `200 OK` even when some items fail. Always check `failed` count and inspect `results[]` for per-item `status`. The front end should map failures back to UI items using `operation` + `index`.

> **Batch size limit:** Maximum 25 total items per request. Exceeding this returns `400 TP_VAL_018`.

---

### 4.2 Flashcards (Global Deck)

#### Create a Session-Linked Flashcard
```http
POST /api/textprocessing/{userId}/{sessionId}/flashcard/add
```

**When to use:** User is watching a video and wants to add a word directly to their global flashcard deck, tagged with this session.

| Path Param | Example | Description |
|------------|---------|-------------|
| `userId` | `USR_000789` | Authenticated user ID |
| `sessionId` | `VID_AAA000` | Current video/session ID |

**Request Body (`CreateFlashCardRequest`):**

| Field | Required | Max | Description |
|-------|----------|-----|-------------|
| `character` | ✅ | 25 | Chinese character(s) |
| `pinyin` | ❌ | 250 | Pinyin pronunciation |
| `meaning` | ❌ | 150 | English translation |
| `hsk` | ✅ | — | HSK level (`HSK1` … `HSK6`) — auto upper-cased |
| `category` | ❌ | — | Category name — defaults to `MISCELLANEOUS`, auto upper-cased |
| `tags` | ❌ | — | Comma-separated tags (e.g., `common,daily`) |
| `createdTime` | ❌ | — | ISO timestamp (auto-generated if omitted) |
| `masteryStatus` | ❌ | — | Defaults to `LEARNING` |

**Success `201 Created`:**
```json
{
  "flashCardEntity": {
    "userId": "USR_000789",
    "sessionId": "VID_AAA000",
    "flashCardId": "FLASHCARD_A1B2C3",
    "character": "白",
    "pinyin": "bái",
    "meaning": "white / clear",
    "masteryStatus": "LEARNING",
    "hsk": "HSK1",
    "category": "COMPONENTS",
    "tags": "characters",
    "createdTime": "2024-01-15T10:30:00Z",
    "compoundSortKey": "COMPONENTS#FLASHCARD_A1B2C3",
    "userStatusPartitionKey": "USR_000789#LEARNING"
  },
  "userId": "USR_000789",
  "statusMessage": "Successfully saved '白' to your vocabulary deck."
}
```

---

#### Create a Manual Standalone Flashcard
```http
POST /api/textprocessing/{userId}/flashcard/add
```

**When to use:** User is on the "Create Card" / deck management page and wants to add a card **not** tied to any video. The back end stores these under the magic session ID `NO_SESSION`.

> **Front-end tip:** You do **not** need to pass `NO_SESSION`. Simply omit the `{sessionId}` segment from the URL.

Request/response schema is identical to the session-linked endpoint above, except `sessionId` in the response will read `NO_SESSION`.

---

#### Get Flashcard Deck by HSK Level (Paginated)
```http
GET /api/textprocessing/{userId}/flashcard/deck/hsk/{hskLevel}
```

**When to use:** Deck browser filtered by HSK level, or study mode launcher.

| Query Param | Required | Default | Valid Values |
|-------------|----------|---------|--------------|
| `pageSize` | No | `20` | `1` – `50` |
| `nextToken` | No | — | Pagination cursor from previous response |
| `studyMode` | No | `MANAGE` | `MANAGE`, `NEW`, `DIFFICULTY`, `SPACED`, `RANDOM`, `CONFIDENCE` |

**Study Modes Explained:**

| Mode | Behaviour | Index Used |
|------|-----------|------------|
| `MANAGE` | Plain list filtered by HSK/category | Base table |
| `NEW` | Only `UNSTARTED` cards | `UserStatusIndex` |
| `DIFFICULTY` | Only `LEARNING` cards | `UserStatusIndex` |
| `SPACED` | Only `MASTERED` cards | `UserStatusIndex` |
| `RANDOM` | Shuffled results from base table | Base table |
| `CONFIDENCE` | Shuffled `MASTERED` cards | `UserStatusIndex` |

**Success `200 OK`:**
```json
{
  "notes": [ /* FlashCardEntity[] */ ],
  "userId": "USR_000789",
  "deckName": "HSK3",
  "nextPageStateToken": "eyJrZXkiOiAidmFsdWUifQ...",
  "statusMessage": "Retrieved 20 cards from your 'HSK3' deck. More pages are available."
}
```

> **Front-end tip:** If `nextPageStateToken` is `null` or missing, you have reached the last page.

---

#### Get Flashcard Deck by Category (Paginated)
```http
GET /api/textprocessing/{userId}/flashcard/deck/category/{categoryName}
```

Same query parameters and response shape as the HSK deck endpoint. Use this for category-based browsing (e.g., `Verbs`, `Travel`).

---

#### Update a Flashcard
```http
PUT /api/textprocessing/{userId}/flashcard/{category}/{flashCardId}
```

**When to use:** User edits a card's character, pinyin, meaning, HSK level, tags, or mastery status.

**Request Body (`UpdateFlashCardRequest`):**

| Field | Required | Max | Notes |
|-------|----------|-----|-------|
| `character` | ❌ | 25 | Replaces existing character |
| `pinyin` | ❌ | 250 | Replaces existing pinyin |
| `meaning` | ❌ | 150 | Replaces existing meaning |
| `masteryStatus` | ❌ | — | `UNSTARTED`, `LEARNING`, `MASTERED` |
| `hsk` | ❌ | — | Auto upper-cased |
| `tags` | ❌ | — | Replaces tag string entirely |

> **⚠️ Important:** `category` cannot be changed. If the user wants to move a card to a different category, you must **delete** the old card and **recreate** it.

**Success `200 OK`:** same `FlashCardResponse` shape as creation.

---

#### Delete a Flashcard
```http
DELETE /api/textprocessing/{userId}/flashcard/{category}/{flashCardId}
```

**Success `204 No Content`** — no response body.

---

### 4.2 Session Notes (Video-Linked Vocabulary)

#### Create a Session-Linked Note
```http
POST /api/textprocessing/{userId}/{sessionId}/notes/add
```

**When to use:** User clicks "Save word" while watching a video. Optionally supports **parent-child nesting** (e.g., saving a compound word as parent, then its component characters as children).

| Query Param | Required | Description |
|-------------|----------|-------------|
| `parentNoteId` | No | If provided, this note becomes a child/sub-character of the given parent |

**Request Body (`CreateNoteRequest`):**

| Field | Required | Max | Description |
|-------|----------|-----|-------------|
| `character` | ✅ | 25 | Chinese character(s) |
| `pinyin` | ❌ | 250 | Pinyin pronunciation |
| `hsk` | ✅ | — | HSK level label |
| `timestamp` | ❌ | — | ISO timestamp (auto-generated if omitted) |

**Success `201 Created`:**
```json
{
  "note": {
    "userId": "USR_000789",
    "sessionId": "VID_AAA000",
    "noteId": "NOTE_A1B2C3",
    "character": "白",
    "pinyin": "bái",
    "parentNoteId": "NOTE_3FD826",
    "timestamp": "2024-01-15T10:30:00Z",
    "compoundSortKey": "VID_AAA000#NOTE_A1B2C3"
  },
  "userId": "USR_000789",
  "statusMessage": "Successfully saved '白' to your vocabulary deck."
}
```

> **Front-end tip:** To build a tree UI, query the session notes list, then group by `parentNoteId`. Root notes have `parentNoteId: null`.

---

#### Update a Note
```http
PUT /api/textprocessing/{userId}/{sessionId}/{noteId}
```

**Only `character` and `pinyin` are mutable.** All other fields (including structural IDs) are preserved.

**Request Body (`UpdateNoteRequest`):**

| Field | Required | Max |
|-------|----------|-----|
| `character` | ❌ | 25 |
| `pinyin` | ❌ | 250 |

**Success `200 OK`:** `NotesResponse` with updated `note`.

---

#### Delete a Note
```http
DELETE /api/textprocessing/{userId}/{sessionId}/{noteId}
```

**Cascade behaviour:** If the deleted note is a **parent** (`parentNoteId == null`), its associated `NoteDetail` is also deleted automatically. Child notes delete only themselves.

**Success `204 No Content`**.

---

#### Get a Single Note
```http
GET /api/textprocessing/{userId}/{sessionId}/{noteId}
```

| Query Param | Required | Default | Description |
|-------------|----------|---------|-------------|
| `includeDetail` | No | `true` | Also fetch the `NoteDetail` if this is a parent note |

**Success `200 OK`:**
```json
{
  "note": { /* NoteEntity */ },
  "noteDetail": { /* NoteDetailEntity or null */ },
  "userId": "USR_000789",
  "statusMessage": "Successfully fetched 'NOTE_3FD826' with detail from your vocabulary deck."
}
```

---

#### Get All Notes for a Session
```http
GET /api/textprocessing/{userId}/{sessionId}
```

| Query Param | Required | Default | Description |
|-------------|----------|---------|-------------|
| `details` | No | `true` | Include `noteDetails` map inline |

**Success `200 OK`:**
```json
{
  "notes": [
    { "noteId": "NOTE_001", "character": "举办", "parentNoteId": null },
    { "noteId": "NOTE_002", "character": "校", "parentNoteId": "NOTE_001" }
  ],
  "noteDetails": {
    "NOTE_001": {
      "detailedNote": "举办 is usually used for important events...",
      "exampleSentence": "学校每年都会举办校园运动会"
    }
  },
  "userId": "USR_000789",
  "sessionName": "VID_AAA000",
  "statusMessage": "Successfully retrieved 2 vocabulary cards with 1 detail(s) during this session."
}
```

> **Front-end tip:** `noteDetails` is a map keyed by `noteId`. Only parent notes appear in this map. If `details=false`, the field is `null`.

---

### 4.3 Note Details (Annotations)

#### Create or Update a Detailed Note
```http
PUT /api/textprocessing/{userId}/{sessionId}/{noteId}/detail
```

**When to use:** User opens a parent note and wants to add a long explanation or example sentence. This is an **upsert** — if a detail already exists, it is overwritten and `updatedTime` is refreshed.

> **⚠️ Only parent notes can have details.** Child notes (those with a `parentNoteId`) will return `404 TP_RES_005`.

**Request Body (`CreateNoteDetailRequest`):**

| Field | Required | Max | Description |
|-------|----------|-----|-------------|
| `detailedNote` | ✅ | 1000 | Long-form explanation (plain text) |
| `exampleSentence` | ❌ | 100 | Example sentence using the word |

**Success `201 Created`:**
```json
{
  "noteDetail": {
    "userId": "USR_000789",
    "sessionId": "VID_AAA000",
    "noteId": "NOTE_3FD826",
    "compoundSortKey": "VID_AAA000#NOTE_3FD826#DETAIL",
    "detailedNote": "举办 is usually used for important events...",
    "exampleSentence": "学校每年都会举办校园运动会",
    "createdTime": "2024-01-15T10:30:00Z",
    "updatedTime": "2024-01-15T14:45:00Z"
  },
  "userId": "USR_000789",
  "statusMessage": "Detailed note saved for 'NOTE_3FD826'."
}
```

---

#### Get a Detailed Note
```http
GET /api/textprocessing/{userId}/{sessionId}/{noteId}/detail
```

**Success `200 OK`:** `NoteDetailResponse` (same shape as create).

---

#### Delete a Detailed Note
```http
DELETE /api/textprocessing/{userId}/{sessionId}/{noteId}/detail
```

**Success `204 No Content`**.

---

## 5. Data Models (JSON Shapes)

### Batch Operation Models

#### `BatchOperationRequest`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sessionId` | `string` | No | Default session ID for note/detail operations |
| `createNotes` | `BatchCreateNoteItem[]` | No | Notes to create |
| `updateNotes` | `BatchUpdateNoteItem[]` | No | Notes to update |
| `deleteNotes` | `BatchDeleteNoteItem[]` | No | Notes to delete |
| `createFlashCards` | `BatchCreateFlashCardItem[]` | No | Flashcards to create |
| `updateFlashCards` | `BatchUpdateFlashCardItem[]` | No | Flashcards to update |
| `deleteFlashCards` | `BatchDeleteFlashCardItem[]` | No | Flashcards to delete |

#### `BatchCreateNoteItem`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `character` | `string` | Yes | Chinese character(s) |
| `pinyin` | `string` | Yes | Pinyin with tone marks |
| `hsk` | `string` | Yes | HSK level (e.g. `HSK1`) |
| `parentNoteId` | `string` | No | Link to a parent note |
| `sessionId` | `string` | No | Override default `sessionId` |

#### `BatchUpdateNoteItem`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sessionId` | `string` | Yes | Session containing the note |
| `noteId` | `string` | Yes | Note ID to update |
| `character` | `string` | Yes | New character value |
| `pinyin` | `string` | Yes | New pinyin value |

#### `BatchDeleteNoteItem`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sessionId` | `string` | Yes | Session containing the note |
| `noteId` | `string` | Yes | Note ID to delete |

#### `BatchCreateFlashCardItem`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `character` | `string` | Yes | Chinese character(s) |
| `pinyin` | `string` | Yes | Pinyin with tone marks |
| `meaning` | `string` | Yes | English meaning |
| `hsk` | `string` | Yes | HSK level |
| `category` | `string` | Yes | Flashcard category |
| `sessionId` | `string` | No | Defaults to `NO_SESSION` |

#### `BatchUpdateFlashCardItem`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `category` | `string` | Yes | Category containing the flashcard |
| `flashCardId` | `string` | Yes | Flashcard ID to update |
| `character` | `string` | No | New character value |
| `pinyin` | `string` | No | New pinyin value |
| `meaning` | `string` | No | New meaning |
| `hsk` | `string` | No | New HSK level |
| `masteryStatus` | `string` | No | `UNSTARTED`, `LEARNING`, `MASTERED` |

#### `BatchDeleteFlashCardItem`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `category` | `string` | Yes | Category containing the flashcard |
| `flashCardId` | `string` | Yes | Flashcard ID to delete |

#### `BatchOperationResult`

| Field | Type | Description |
|-------|------|-------------|
| `operation` | `string` | `CREATE_NOTE`, `UPDATE_NOTE`, `DELETE_NOTE`, `CREATE_FLASHCARD`, `UPDATE_FLASHCARD`, `DELETE_FLASHCARD` |
| `index` | `integer` | Zero-based index within the operation array |
| `status` | `string` | `SUCCESS` or `FAILED` |
| `entityType` | `string` | `NoteEntity`, `FlashCardEntity`, etc. |
| `entityId` | `string` | ID of the created/updated entity (null on failure) |
| `message` | `string` | Human-readable result message |
| `errorCode` | `string` | Error code on failure (null on success) |
| `path` | `string` | Always null for batch operations |

#### `BatchOperationResponse`

| Field | Type | Description |
|-------|------|-------------|
| `userId` | `string` | User who initiated the batch |
| `totalRequested` | `integer` | Total items across all operation arrays |
| `succeeded` | `integer` | Number of successful items |
| `failed` | `integer` | Number of failed items |
| `results` | `BatchOperationResult[]` | Per-item results, ordered by operation then index |
| `statusMessage` | `string` | Summary message |

---

### `FlashCardEntity`

| Field | Type | Description |
|-------|------|-------------|
| `userId` | `string` | Partition key |
| `compoundSortKey` | `string` | DynamoDB sort key: `{CATEGORY}#{FLASHCARD_ID}` |
| `flashCardId` | `string` | Unique ID (e.g., `FLASHCARD_A1B2C3`) |
| `sessionId` | `string` | Video session or `NO_SESSION` |
| `character` | `string` | Chinese character(s) |
| `pinyin` | `string` | Pinyin |
| `meaning` | `string` | English meaning |
| `masteryStatus` | `string` | `UNSTARTED` / `LEARNING` / `MASTERED` |
| `hsk` | `string` | Upper-cased HSK level |
| `category` | `string` | Upper-cased category |
| `tags` | `string` | Comma-separated tags |
| `createdTime` | `string` | ISO timestamp |
| `userStatusPartitionKey` | `string` | GSI key: `{userId}#{masteryStatus}` |

### `NoteEntity`

| Field | Type | Description |
|-------|------|-------------|
| `userId` | `string` | Partition key |
| `compoundSortKey` | `string` | Sort key: `{sessionId}#{noteId}` |
| `sessionId` | `string` | Video session ID |
| `noteId` | `string` | Unique ID (e.g., `NOTE_A1B2C3`) |
| `character` | `string` | Chinese character(s) |
| `pinyin` | `string` | Pinyin |
| `parentNoteId` | `string` | `null` for root notes; child notes reference parent `noteId` |
| `timestamp` | `string` | ISO timestamp |

### `NoteDetailEntity`

| Field | Type | Description |
|-------|------|-------------|
| `userId` | `string` | Partition key |
| `compoundSortKey` | `string` | Sort key: `{sessionId}#{noteId}#DETAIL` |
| `noteId` | `string` | Parent note ID |
| `sessionId` | `string` | Session ID |
| `detailedNote` | `string` | Explanation (max 1000 chars) |
| `exampleSentence` | `string` | Example sentence (max 100 chars) |
| `createdTime` | `string` | ISO timestamp |
| `updatedTime` | `string` | ISO timestamp (refreshed on every update) |

---

## 6. Error Handling

All errors return a consistent JSON body:

```json
{
  "errorCode": "TP_VAL_004",
  "message": "Cannot create a blank vocabulary card. The 'character' field is strictly required.",
  "path": "/api/textprocessing/USR_000789/VID_AAA000/notes/add",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### HTTP Status Map

| Status | Meaning | Typical Cause |
|--------|---------|---------------|
| `201` | Created | Successful POST / PUT create |
| `200` | OK | Successful GET / PUT update |
| `204` | No Content | Successful DELETE |
| `400` | Bad Request | Validation error (malformed input, missing field, length exceeded) |
| `404` | Not Found | Resource does not exist, or illegal operation (e.g., detail on child note) |
| `500` | Internal Server Error | DynamoDB/AWS failure — retry with backoff |

### Common Error Codes

| Code | Message | When |
|------|---------|------|
| `TP_VAL_001` | `userId` cannot be null or empty | Missing user ID in URL |
| `TP_VAL_004` | `character` is strictly required | Empty or missing `character` |
| `TP_VAL_005` | Cannot create a card without an HSK label | Missing `hsk` |
| `TP_VAL_006` | `nextToken` is corrupted or invalid | Bad pagination cursor |
| `TP_VAL_007` | Invalid study mode | Not one of the six allowed modes |
| `TP_VAL_011` | Character exceeds max length | > 25 chars |
| `TP_VAL_012` | Pinyin exceeds max length | > 250 chars |
| `TP_VAL_013` | Meaning exceeds max length | > 150 chars |
| `TP_VAL_014` | Session reached max parent notes | > 100 parent notes per session |
| `TP_VAL_015` | Category cannot be changed on existing flashcard | Attempted category update |
| `TP_VAL_016` | Update request must contain at least one field | Empty PUT body |
| `TP_VAL_017` | Invalid mastery status | Not `UNSTARTED`/`LEARNING`/`MASTERED` |
| `TP_VAL_018` | Batch exceeds maximum 25 items | Too many items in one batch request |
| `TP_VAL_019` | Batch contains no operations | Empty `BatchOperationRequest` |
| `TP_VAL_020` | Batch item validation failure | Missing required field in a batch item |
| `TP_RES_001` | Parent note reference does not exist | Invalid `parentNoteId` |
| `TP_RES_002` | Note not found | Wrong `noteId` / `sessionId` |
| `TP_RES_003` | Flashcard not found | Wrong `flashCardId` |
| `TP_RES_005` | Child note cannot have a detailed annotation | Detail on child note |
| `TP_RES_006` | Detailed note not found | No detail exists for this parent |
| `TP_AWS_001` | DynamoDB write failed | AWS transient error — retry |
| `TP_AWS_007` | DynamoDB batch write failed | AWS transient error during batch — retry |
| `TP_AWS_008` | DynamoDB batch read failed | AWS transient error during batch read — retry |
| `TP_SRV_001` | Unexpected internal error | Server bug — contact back-end team |

---

## 7. Front-End FAQ

### Q1: Should I use Notes or Flashcards when the user saves a word during a video?

**A:** Use **Notes** (`POST /{userId}/{sessionId}/notes/add`) for the in-video sidebar / timeline. Notes are lightweight and session-scoped. If the user also wants the word in their **global study deck**, make a second call to **Flashcards** (`POST /{userId}/{sessionId}/flashcard/add`). The front end can offer a checkbox: "Also add to my deck".

---

### Q2: How do I build a tree / nested view of session notes?

**A:**
1. Call `GET /api/textprocessing/{userId}/{sessionId}?details=true`.
2. Iterate `notes`. Root nodes have `parentNoteId: null`. Child nodes reference their parent's `noteId`.
3. Build the tree client-side:
   ```js
   const roots = notes.filter(n => n.parentNoteId === null);
   const childrenOf = (parentId) => notes.filter(n => n.parentNoteId === parentId);
   ```
4. Use `noteDetails[noteId]` to render the annotation panel when a parent node is expanded.

---

### Q3: Why can't I change a flashcard's category?

**A:** The category is baked into the DynamoDB sort key (`compoundSortKey`). Changing it would require deleting and re-inserting the record. The API enforces this by rejecting category updates (`TP_VAL_015`).

**Front-end workaround:** If the user edits the category, prompt: "Changing category requires recreating this card. Proceed?" Then:
1. `DELETE` the old card.
2. `POST` a new card with the new category, preserving other fields.

---

### Q4: How does pagination work for deck queries?

**A:** Deck endpoints use **cursor pagination** (not offset/limit).

1. First request: omit `nextToken`.
2. If response contains `nextPageStateToken`, pass it as the `nextToken` query param on the next request.
3. When `nextPageStateToken` is `null` or missing, you have loaded the full deck.

> **Do not** cache tokens across filter changes. If the user switches from `HSK1` to `HSK3`, start fresh with no token.

---

### Q5: What is the difference between `studyMode=RANDOM` and `CONFIDENCE`?

**A:** Both shuffle results, but they query different indexes:
- `RANDOM` — shuffles **all** cards in the deck (base table query).
- `CONFIDENCE` — shuffles only `MASTERED` cards (`UserStatusIndex` query).

Use `RANDOM` for a general mixed review. Use `CONFIDENCE` for a "mastered words refresher" feature.

---

### Q6: Can I batch-create multiple notes or flashcards in one request?

**A:** **Yes!** Use the `POST /{userId}/batch` endpoint. You can mix creates, updates, and deletes for both notes and flashcards in a single request, up to **25 total items**. This is ideal for a "Save All" button.

**Example workflow:**
1. User edits 3 notes, adds 2 new flashcards, and deletes 1 note.
2. Build a `BatchOperationRequest` with `updateNotes[3]`, `createFlashCards[2]`, `deleteNotes[1]`.
3. Send one POST to `/{userId}/batch`.
4. Check `response.failed` — if > 0, map failures back to UI items using `operation` + `index` and show retry options.

> **Limit:** 25 items per batch. If the user has more pending changes, split into multiple batches.

---

### Q7: How should I handle `TP_VAL_014` (max 100 parent notes per session)?

**A:** This is a hard back-end limit to prevent partition hot-spots. If the user hits it:
- Show a friendly message: "This session has reached the maximum number of saved words. Consider creating standalone flashcards in your deck instead."
- Offer a "Save to Deck" alternative that uses the flashcard endpoint (no session parent-note limit).

---

### Q8: Why do some notes have `meaning` and others don't?

**A:** `NoteEntity` (session notes) does **not** store `meaning`. Only `FlashCardEntity` stores `meaning`, `category`, `tags`, and `masteryStatus`. If you need an English translation inside a session note, store it in the `NoteDetailEntity.detailedNote` field.

**Design rationale:** Notes are quick captures during a video. Flashcards are the enriched, study-ready version.

---

### Q9: What should I do when I receive a `500` error?

**A:** `500` errors indicate DynamoDB or AWS SDK failures (codes `TP_AWS_*` or `TP_SRV_001`). Recommended front-end strategy:
1. Show a non-blocking toast: "Something went wrong. Retrying…"
2. Retry the request with exponential backoff (`1s`, `2s`, `4s`).
3. After 3 failures, show a persistent error state and suggest the user refreshes the page.
4. **Do not** blindly retry `400` or `404` errors — these are client-side mistakes.

---

### Q10: How do I know if a note is a parent or a child?

**A:** Check `parentNoteId`:
- `null` → **parent** (can have a detail, can have children).
- Any string value → **child** (cannot have a detail, cannot have children).

Disable the "Add explanation" button when `parentNoteId !== null` to avoid `404 TP_RES_005`.

---

### Q11: Can I update a note's `parentNoteId` to re-parent it?

**A:** **No.** The update endpoint only allows `character` and `pinyin`. If you need to re-parent, delete the child and recreate it with the new `parentNoteId`.

---

### Q12: How do I implement a "Study Session" feature with mastery tracking?

**A:**
1. Let the user pick a deck filter (HSK level or category).
2. Choose a `studyMode`:
   - **New words:** `studyMode=NEW`
   - **Difficult words:** `studyMode=DIFFICULTY`
   - **Spaced review:** `studyMode=SPACED`
   - **Mixed review:** `studyMode=RANDOM`
3. Render cards one at a time.
4. When the user marks a card as "mastered" or "needs practice", call:
   ```http
   PUT /api/textprocessing/{userId}/flashcard/{category}/{flashCardId}
   ```
   with `{ "masteryStatus": "MASTERED" }` or `"LEARNING"`.
5. The next deck query will automatically reflect the new status because the GSI (`UserStatusIndex`) is updated in real time.

---

### Q13: Are `hsk` and `category` case-sensitive?

**A:** They are **normalized to uppercase** on the server. You can send `hsk3`, `hsk3`, or `HSK3` — all are stored as `HSK3`. For display purposes, the front end may wish to title-case categories (`VERBS` → `Verbs`).

---

### Q14: What is the `compoundSortKey` field? Do I need to use it?

**A:** It is an internal DynamoDB construct. You can **ignore it** for most front-end operations. The only time you need to think about it is if you are building admin/debug tools that query DynamoDB directly. For normal API usage, rely on `flashCardId`, `noteId`, and `category`.

---

### Q15: Can I attach a detail to a flashcard?

**A:** **No.** The `NoteDetail` subsystem is only for **session notes** (`NoteEntity`). Flashcards are self-contained (`character`, `pinyin`, `meaning`, `tags`). If users need long-form explanations on flashcards, consider storing them in the `meaning` field (max 150 chars) or request a future feature extension.

---

## 8. UI / UX Recommendations

| Feature | Suggested API Flow |
|---------|-------------------|
| **In-video "Save Word"** | `POST …/notes/add` → optional `POST …/flashcard/add` |
| **Session sidebar tree** | `GET …/{sessionId}?details=true` → group by `parentNoteId` |
| **Deck browser grid** | `GET …/deck/hsk/{level}` or `…/deck/category/{cat}` with `studyMode=MANAGE` |
| **Study mode launcher** | Same deck endpoints with `studyMode=NEW/DIFFICULTY/SPACED/RANDOM/CONFIDENCE` |
| **Card mastery toggle** | `PUT …/flashcard/{category}/{id}` → `{ "masteryStatus": "MASTERED" }` |
| **Note explanation panel** | `PUT …/{noteId}/detail` (upsert) or `GET …/{noteId}/detail` (read) |
| **Delete confirmation** | `DELETE` note → cascade deletes detail automatically; `DELETE` flashcard → standalone |
| **"Save All" / batch edit** | `POST …/{userId}/batch` with mixed create/update/delete arrays |

---

## 9. Change Log

| Date | Version | Change |
|------|---------|--------|
| 2026-07-13 | 1.1.0 | Added batch operations endpoint (`POST /{userId}/batch`) with support for mixed create/update/delete of notes and flashcards up to 25 items per request. Updated FAQ Q6 and error codes. |
| 2026-07-12 | 1.0.0 | Initial front-end integration guide |
