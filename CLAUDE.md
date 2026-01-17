# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A note-taking application with audio transcription capabilities, similar to Apple Notes. Features nested folder organization, drag-and-drop file handling, and local Whisper-based audio transcription.

## Development Commands

### First-Time Setup

**Backend:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -c "import whisper; whisper.load_model('base')"  # Download Whisper model
```

**Frontend:**
```bash
cd frontend
npm install
```

### Running the Application

**Recommended (both servers):**
```bash
./start.sh  # From project root
./stop.sh   # To stop servers
```

**Manual start:**
```bash
# Terminal 1 - Backend
cd backend
source venv/bin/activate
python app.py

# Terminal 2 - Frontend
cd frontend
npm run dev
```

**URLs:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:5001

### Build and Test

**Frontend:**
```bash
cd frontend
npm run build      # Production build
npm run preview    # Preview production build
```

**Backend:**
No build step required. Backend runs directly via `python app.py`.

## Architecture

### Backend (Python/Flask)

**Service Layer Pattern:**
- `api/` - Flask blueprints exposing REST endpoints
- `services/` - Business logic layer (NoteService, FolderService, WhisperService, FileService)
- `models/` - Data models (Note, Folder)
- `config.py` - Environment configuration

**Service initialization flow:**
1. `app.py` creates Flask app
2. Services instantiated in `create_app()` with dependency injection
3. Services stored in `app.config` for blueprint access
4. Blueprints registered with `/api` prefix

**Key services:**
- `FileService` - Low-level file operations (read/write/delete)
- `NoteService` - Note CRUD operations, uses FileService
- `FolderService` - Folder operations and tree building
- `WhisperService` - Audio transcription using local Whisper model

**Data storage:**
- File-based storage in `notes/` directory
- Notes stored as `.txt` files
- Folder structure mirrors filesystem hierarchy

### Frontend (React/Vite)

**Context-based architecture:**
- `AppContext` - Global app state and UI state
- `NotesContext` - Notes/folders data and operations (CRUD)

**Component organization:**
- `components/layout/` - Main layout components (Header, Sidebar, Editor)
- `components/notes/` - Note-related UI components
- `components/folders/` - Folder tree and folder-related UI
- `components/upload/` - Drag-and-drop file handling

**Data flow:**
1. `App.jsx` wraps app in AppProvider → NotesProvider
2. NotesContext manages all notes/folders state
3. Components consume context via `useNotes()` hook
4. API calls through `api/notes.js` and `api/folders.js`

**Key features:**
- Auto-save with 500ms debounce
- Drag-and-drop for text and audio files
- Real-time transcription status updates

### API Communication

Frontend uses Vite proxy (vite.config.js) to forward `/api/*` requests to backend:
```javascript
proxy: {
  '/api': {
    target: 'http://localhost:5001',
    changeOrigin: true,
  }
}
```

This avoids CORS issues during development. Frontend makes requests to `/api/notes`, Vite forwards to `http://localhost:5001/api/notes`.

## Configuration

**Backend (.env):**
```bash
FLASK_PORT=5001          # Backend port (5001 to avoid macOS AirPlay conflict)
WHISPER_MODEL=base       # Options: tiny, base, small, medium, large
NOTES_DIR=../notes       # Notes storage location
UPLOADS_DIR=../uploads   # Temporary audio uploads
```

**Frontend (.env):**
```bash
VITE_API_URL=http://localhost:5001  # Backend URL (used for absolute requests)
```

## Important Patterns

### Adding a new API endpoint

1. Create route in `backend/api/` blueprint
2. Use service layer from `current_app.config['SERVICE_NAME']`
3. Return JSON with appropriate status codes
4. Add corresponding API client method in `frontend/src/api/`
5. Add method to NotesContext if it involves state changes

### Whisper service usage

The Whisper model loads on application startup (can take 10-30 seconds). Service handles:
- Audio file validation and size limits
- Temporary file cleanup
- Transcription with error handling

### File paths

- Backend expects relative paths from NOTES_DIR (e.g., "folder/note.txt")
- Frontend sends paths without leading slashes
- All note files must have `.txt` extension
- Audio files are uploaded to UPLOADS_DIR, transcribed, then deleted
