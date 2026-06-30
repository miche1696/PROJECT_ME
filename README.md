# PROJECT_ME

Current-state functional README for the application implemented in this repository.

This document is intentionally written as a product and system inventory. It describes what the app does today, what is wired into the current UI, what only exists at API/service level, and which behaviors are important to preserve or explicitly change during a rewrite.

Reviewed against the codebase and current tests on 2026-03-14.

## What the app is

`PROJECT_ME` is a local-first notes application with:

- filesystem-backed text and markdown notes
- nested folders
- drag-and-drop organization
- audio transcription with OpenAI Whisper running locally on the backend
- durable background transcription jobs anchored to specific insertion markers inside notes
- a markdown editor with both render and source modes
- text-selection operations, including local transforms and optional OpenAI-powered modification
- JSONL tracing for backend activity, frontend activity, and transcription jobs

The active runtime is:

- `backend/`: Flask API
- `frontend/`: React + Vite app

## High-level architecture

### Backend

- Flask app with REST APIs under `/api`
- File-based persistence in `notes/`
- Extra durable state in `backend/state/`
- Local Whisper model for transcription
- Optional OpenAI client for LLM-powered selection edits
- JSONL trace logs for observability

### Frontend

- React 18
- Context-based state management
- Plain text editor for `.txt` notes
- MDXEditor-based markdown editor for `.md` notes
- Transcription jobs context with polling and local editor reconciliation

## Current implemented functionality

## 1. Notes model and persistence

### Storage model

- Notes are stored as real files under `notes/`.
- Supported note types are `.txt` and `.md`.
- Notes can exist at the root or in nested folders.
- The backend resolves note paths with or without extension.
- Paths are validated to prevent directory traversal and unsafe absolute-path access.

### Stable note identity

The app does not treat the file path as the only identifier.

- Every note gets a stable `note_id`.
- A note keeps the same `note_id` across rename and move operations.
- Revisions are tracked separately from file paths.
- The note index is stored in `backend/state/notes_index.json`.

This is important because transcription jobs target notes by stable ID, not just by filename.

### Note metadata

For each note, the app exposes:

- path
- name
- content
- created timestamp
- modified timestamp
- file size
- file type (`txt` or `md`)
- stable `id`
- current `revision`

### Note lifecycle

Implemented note operations:

- create note
- read note
- update note content
- rename note
- move note to another folder
- delete note
- fetch note by stable ID

### Revision conflict handling

Note updates use optimistic concurrency.

- `PUT /api/notes/<path>` requires `expected_revision`.
- If the revision is stale, the backend returns `409 Revision conflict`.
- The frontend attempts to recover automatically by refetching the note by `note_id`.
- If the local change can be safely replayed, it retries the save against the newest revision.
- If not, it falls back to the latest backend content.

This is especially relevant because transcription jobs may update notes while the user is editing them.

## 2. Folder system

### Folder structure

- Folders are real directories inside `notes/`.
- Folders can be nested arbitrarily.
- The sidebar renders a recursive folder tree containing both folders and notes.
- The root folder is represented as `path: ""` and `name: "root"` in backend responses.

### Implemented folder operations

Backend supports:

- get full folder tree
- create folder
- rename folder
- move folder
- delete folder, optionally recursively

Current UI supports:

- create root folder from the sidebar
- create subfolder from a folder context menu
- rename folder by double-clicking a folder name
- move folders by drag and drop
- expand and collapse folders

Current UI does not expose:

- folder deletion

That capability exists in the backend and in the `NotesContext`, but there is no folder delete control in the active UI.

### Folder drag and drop rules

- Notes can be dragged into folders.
- Folders can be dragged into other folders.
- Moving a folder into itself is blocked.
- Moving a folder into its own descendant is blocked.
- Notes and folders can also be dragged back to the root area.

### Important current behavior

The app has a `currentFolder` state in `AppContext`, but it is not wired to folder selection in the active UI.

Practical result:

- the top-level `+ New Note` button creates notes at the root
- the top-level `+ New Folder` button creates folders at the root
- creating content inside a specific folder is currently done from that folder's context menu or by drag/drop, not by selecting the folder first

This is current implemented behavior, not a README assumption.

## 3. Editor experience

## Plain text notes (`.txt`)

Text notes use a textarea-based editor with:

- native typing
- native copy/paste/undo behavior
- manual save on `Ctrl+S` / `Cmd+S`
- auto-save after 500 ms of inactivity
- drag-and-drop insertion of text files
- drag-and-drop insertion of audio transcription markers
- selection-aware text operations

## Markdown notes (`.md`)

Markdown notes use a dual-mode editor.

### Render mode

Render mode is a WYSIWYG markdown editor built on `@mdxeditor/editor`.

Implemented editing capabilities include:

- headings
- bold / italic / underline
- highlight
- ordered and unordered lists
- block quotes
- links with dialog support
- tables
- thematic breaks
- code blocks
- CodeMirror-powered code block language support
- undo / redo
- markdown shortcuts

### Source mode

Source mode is a raw markdown textarea with:

- direct markdown editing
- line numbers
- synchronized content with render mode
- selection-aware text operations

### Selection handling in markdown

The markdown editor contains extra logic to preserve or restore selection when:

- using toolbar actions in render mode
- inserting transcription output at the current cursor
- reconciling content refreshed from the backend after a transcription job completes

### External sync behavior

The editor explicitly decides when backend content should replace render-mode content:

- yes when content changed externally
- yes when switching from source mode back to render mode
- no during normal render-mode typing when the content is already in sync

This exists to avoid wiping user cursor state while still accepting backend-applied transcription results.

## 4. Note toolbar and note-level UX

For the currently open note, the UI supports:

- inline note rename by clicking the title
- visible file-type badge (`TXT` or `MD`)
- save state indicator
- transcription-in-progress indicator
- markdown mode switcher for markdown notes

If no note is open, the editor shows a placeholder asking the user to select or create one.

## 5. Selection-based text operations

When the user selects text, the app can show a floating toolbar near the selection.

### Current user-facing operations

Local operations:

- `UPPERCASE`
- `lowercase`
- `Trim` whitespace

Backend-backed operation:

- `Sort` list items alphabetically via `/api/text/process` using `reorder-list`

Optional LLM-backed operation:

- `Modify`

### Modify operation

`Modify` is intended to rewrite the selected text using an OpenAI model.

It sends:

- the user instruction
- the selected text
- up to 200 characters of surrounding context before and after the selection

Backend behavior:

- if `OPENAI_API_KEY` and `OPENAI_MODEL` are configured, it calls the OpenAI Responses API
- the model is instructed to return only replacement markdown
- usage and estimated cost are traced

Frontend behavior:

- selecting `Modify` opens a prompt textarea in the floating toolbar
- submit sends the request and replaces the selected text with the model output
- the `Modify` button is shown for any non-empty selection, but it only succeeds when the backend has valid OpenAI configuration

### Backend text operations that exist but are not fully productized

The backend also exposes:

- `clean-transcription`
- `summarize`
- `custom-prompt`

Current status:

- `clean-transcription` is implemented as a rule-based backend transform but is not exposed in the active UI
- `summarize` exists in the backend API, but the frontend hides it and the backend method is still placeholder-level
- `custom-prompt` exists in the backend service but is not wired into the active frontend

For refactoring purposes, these should be treated as partial capabilities, not completed product features.

## 6. Audio transcription

Audio transcription is one of the main implemented subsystems.

### Supported formats

The backend accepts:

- `.mp3`
- `.wav`
- `.m4a`
- `.ogg`
- `.opus`
- `.flac`
- `.webm`

This includes browser recordings and WhatsApp-style `.opus` exports.

### Validation

Before queueing or transcribing, the backend validates:

- file extension
- file existence
- maximum file size

The maximum size is controlled by `MAX_AUDIO_SIZE_MB` in config and defaults to `100 MB`.

### Whisper model behavior

- Whisper is loaded once when the backend starts.
- The configured model comes from `WHISPER_MODEL` and defaults to `base`.
- If the requested model is unavailable, the backend falls back to `base`.
- Access to the shared model instance is serialized with a lock.

That last point is important: the backend intentionally prevents concurrent model access because the shared Whisper model is treated as non-thread-safe in this app.

## 7. Background transcription job system

The current UI does not rely on a simple upload-and-wait flow. It uses durable background jobs.

### Launch flow

When audio is added from the editor or microphone:

1. the frontend generates a marker token like `[[tx:<uuid>:Transcription ongoing...]]`
2. the marker is inserted into the note immediately
3. the note is saved
4. the audio file is uploaded to `/api/transcription/jobs`
5. the backend queues a durable job linked to `note_id` and `marker_token`

This lets the user continue editing or switch notes while transcription runs.

### Ways to start transcription

Current UI supports transcription from:

- dragging an audio file into a plain text note
- dragging an audio file onto a markdown note
- dragging an audio file onto a folder to create a new note and queue transcription
- recording audio from the browser microphone and stopping the recording

### Job statuses

Implemented job states include:

- `queued`
- `running`
- `cancel_requested`
- `interrupted`
- `completed`
- `failed`
- `orphaned`
- `cancelled`

### Durable state

Transcription jobs are persisted in:

- `backend/state/transcription_jobs.snapshot.json`
- `backend/state/transcription_jobs.events.jsonl`

This means job history survives backend restarts.

### Restart recovery

On backend startup:

- jobs that were `running` or `cancel_requested` are converted to `interrupted`
- if `auto_requeue_interrupted` is enabled, eligible interrupted jobs can be automatically requeued once

The jobs panel also includes a manual `Resume Interrupted` action.

### Concurrency and queue controls

Transcription behavior is configurable through persistent settings:

- maximum concurrent jobs
- maximum queued jobs
- history retention entry count
- history retention TTL in days
- retry max
- retry base delay
- auto requeue interrupted jobs

The backend enforces these values while scheduling work.

### Retry behavior

Transient failures are retried with exponential backoff.

Examples of retry-triggering error patterns:

- timeout
- connection reset
- temporary network failures
- 502 / 503 / 504 style errors

### Terminal failure behavior

If transcription fails permanently:

- the backend attempts to replace the marker token with a short failure placeholder
- the placeholder format is `[Transcription failed: ...]`
- the job ends in `failed`

This prevents stale transcription tokens from remaining in notes forever.

### Marker reconciliation behavior

When a job completes, the frontend tries to update the current open note in place.

Current logic:

- first try local marker replacement in the open editor
- if that fails but the backend reports that the marker was applied, refetch the note by `note_id`
- for markdown notes, push the fresh backend content into the markdown editor without clobbering active typing more than necessary

### Orphaned jobs

Jobs can become `orphaned` if:

- transcription completes
- but the marker token no longer exists in the target note

This protects the note from blind text injection when the user has removed or changed the marker area.

### Cancel and resume

Current job controls exposed in the UI:

- open target note
- copy transcript text
- insert transcript at cursor
- cancel queued/running/interrupted jobs
- resume interrupted jobs
- resume all interrupted jobs

## 8. Transcription jobs panel

The jobs panel is opened from the `↺` button near the editor controls.

It shows:

- job status
- creation time
- note path
- source filename
- duration in milliseconds when available
- error message when present

Actions in the panel:

- `Open`
- `Copy`
- `Insert`
- `Cancel`
- `Resume`
- `Resume Interrupted`

The panel polls the backend while there are active jobs.

## 9. Voice recorder

The voice recorder is a browser-side microphone input flow.

Implemented behavior:

- checks for browser support (`getUserMedia` + `MediaRecorder`)
- asks for microphone access
- records audio until the user stops
- shows a live timer
- shows simple animated audio-level bars
- negotiates a supported MIME type
- produces `.webm` or `.ogg` recordings depending on browser support
- immediately queues the recording into the transcription system

Handled error cases include:

- microphone permission denied
- no microphone available
- recording failure
- queueing failure after recording ends

## 10. Drag and drop behavior

### Dropping on the editor

Supported:

- `.txt` file: insert file contents at the current cursor
- supported audio file: insert transcription marker and queue background transcription

Unsupported files are rejected by the app's error handling path.

### Dropping on a folder

Supported:

- `.txt` file: create a new note in that folder using the file contents
- supported audio file: create a new note containing a transcription marker, then queue a job tied to that note
- dragged note: move note into that folder
- dragged folder: move folder into that folder, unless invalid

### Global drag/drop handling

The layout prevents the browser default behavior of opening dropped files directly in the tab.

## 11. Settings and durable app state

### Persistent app settings

The backend stores settings in:

- `backend/state/settings.json`

Currently persisted settings are only for the transcription subsystem.

### Current frontend usage

The frontend reads settings through `TranscriptionJobsContext`, but there is no settings screen in the current UI.

So:

- settings API exists
- settings persistence exists
- settings editing UI does not exist

## 12. Tracing and observability

The app includes a real tracing/logging system based on JSONL files.

### Backend trace log

- path: `backend/trace.jsonl`
- written by `TraceLogger`

Events include:

- API request/response traces
- file reads/writes/moves/deletes
- folder operations
- note index creation/path changes/deletions
- Whisper model and transcription events
- transcription job queue events
- LLM request/response traces
- settings updates

### Frontend trace log

- path: `frontend/trace.jsonl`
- frontend sends events to `/api/trace/client`

Events include:

- API requests/responses
- text modify requests/responses
- transcription panel interactions
- transcription editor-apply events
- client-created transcription job events

### Retention

Trace JSONL logs keep roughly the last 7 days of data.

This retention is implemented and covered by tests.

## 13. API surface

The current backend exposes these main endpoints:

### Core

- `GET /api/health`
- `GET /`

### Notes

- `GET /api/notes`
- `GET /api/notes/<note_path>`
- `GET /api/notes/id/<note_id>`
- `POST /api/notes`
- `PUT /api/notes/<note_path>`
- `PATCH /api/notes/id/<note_id>/replace-marker`
- `PATCH /api/notes/<note_path>/rename`
- `PATCH /api/notes/<note_path>/move`
- `DELETE /api/notes/<note_path>`

### Folders

- `GET /api/folders`
- `POST /api/folders`
- `PATCH /api/folders/<folder_path>/rename`
- `PATCH /api/folders/<folder_path>/move`
- `DELETE /api/folders/<folder_path>`

### Transcription

- `POST /api/transcription/audio`
- `GET /api/transcription/formats`
- `POST /api/transcription/jobs`
- `GET /api/transcription/jobs`
- `GET /api/transcription/jobs/<job_id>`
- `POST /api/transcription/jobs/<job_id>/cancel`
- `POST /api/transcription/jobs/<job_id>/resume`
- `POST /api/transcription/jobs/resume-interrupted`

### Text processing

- `POST /api/text/process`
- `GET /api/text/operations`
- `GET /api/text/operations/info`

### Settings

- `GET /api/settings`
- `PUT /api/settings`

### Trace ingestion

- `POST /api/trace/client`

## 14. What is covered by current automated tests

Backend tests currently verify:

- safe file path handling
- note read/write/move behavior
- note lifecycle through the notes API
- stable-ID marker replacement
- transcription job retry behavior
- transcription terminal-failure placeholder replacement
- cleanup of uploaded temp files on failed job creation
- Whisper access serialization
- trace retention
- transcription event-log retention

Frontend tests currently verify:

- marker replacement candidates and replacement logic
- editor apply flow for completed and failed transcription jobs
- markdown external sync behavior

The combined repo verification command is:

```bash
python3 tools/test_suite.py --skip-smoke
```

The smoke test that also exercises the running backend is:

```bash
python3 tools/smoke.py --base http://localhost:5001
```

## 15. How to run the current app

### Recommended

```bash
./start.sh
```

What this does:

- creates a timestamped backup of `notes/` into `notes_backup/`
- starts the Flask backend
- starts the Vite frontend
- writes logs to `backend.log` and `frontend.log`

### Stop

```bash
./stop.sh
```

### Runtime URLs

- frontend: `http://localhost:5173`
- backend: `http://localhost:5001` by default

`FLASK_PORT` can be overridden from the repo root `.env`.

## 16. Important current limitations and refactor notes

These are important because they affect what should be preserved, redesigned, or intentionally removed.

- There is no authentication, user model, or multi-user collaboration.
- Persistence is filesystem-based, not database-based.
- The sidebar's root `+ New Note` and `+ New Folder` actions are effectively root-only because folder selection state is not wired.
- Folder deletion exists in backend/API code but not in the active UI.
- The settings API exists, but there is no settings screen.
- `Modify` depends on OpenAI config and is not guaranteed available in every environment.
- `Summarize` and `custom-prompt` exist in backend code but are not finished product features.
- The backend includes a direct `/api/transcription/audio` endpoint, but the active UI primarily uses the durable jobs flow.
- The frontend build currently emits a large-chunk warning because the markdown editor stack pulls in substantial client-side code.

## 17. Summary for a rewrite

If the app is rebuilt from scratch, the current product scope to account for is:

- local note and folder management on disk
- stable note identity independent of file path
- optimistic note revisions
- text and markdown editing
- selection-based transforms
- local Whisper transcription
- durable background transcription jobs with marker anchoring
- microphone recording
- drag/drop file ingestion
- trace logging and retained operational history

The main distinction to preserve is that transcription is not just "upload audio and paste text". It is a durable, marker-anchored, background job system integrated with ongoing note editing.
