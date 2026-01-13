import React, { useState, useEffect, useRef } from 'react';
import { useNotes } from '../../context/NotesContext';
import { useApp } from '../../context/AppContext';
import { transcriptionApi } from '../../api/transcription';
import NoteToolbar from './NoteToolbar';
import './NoteEditor.css';

const NoteEditor = () => {
  const { currentNote, updateNote } = useNotes();
  const { setError } = useApp();
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef(null);
  const saveTimeoutRef = useRef(null);

  // Load note content when current note changes
  useEffect(() => {
    if (currentNote) {
      setContent(currentNote.content || '');
    } else {
      setContent('');
    }
  }, [currentNote]);

  // Auto-save functionality (debounced)
  const handleContentChange = (e) => {
    const newContent = e.target.value;
    setContent(newContent);

    // Store cursor position
    setCursorPosition(e.target.selectionStart);

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for auto-save
    saveTimeoutRef.current = setTimeout(() => {
      if (currentNote) {
        saveNote(newContent);
      }
    }, 500); // 500ms debounce
  };

  const saveNote = async (contentToSave) => {
    if (!currentNote) return;

    try {
      setIsSaving(true);
      await updateNote(currentNote.path, contentToSave);
    } catch (error) {
      setError('Failed to save note: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Manual save on Ctrl+S
  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (currentNote) {
        saveNote(content);
      }
    }
  };

  // Insert text at cursor position
  const insertTextAtCursor = (textToInsert) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const textBefore = content.substring(0, start);
    const textAfter = content.substring(end);

    const newContent = textBefore + textToInsert + textAfter;
    setContent(newContent);

    // Update cursor position
    const newCursorPos = start + textToInsert.length;
    setTimeout(() => {
      textarea.selectionStart = newCursorPos;
      textarea.selectionEnd = newCursorPos;
      textarea.focus();
    }, 0);

    // Save immediately after insertion
    if (currentNote) {
      saveNote(newContent);
    }

    return newCursorPos;
  };

  // Handle drop events
  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    // Get drop position (cursor position at drop)
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.focus();
      // Set cursor to drop position
      const pos = getCursorPositionFromEvent(e, textarea);
      textarea.selectionStart = pos;
      textarea.selectionEnd = pos;
      setCursorPosition(pos);
    }

    for (const file of files) {
      try {
        // Handle text files
        if (file.name.endsWith('.txt')) {
          const textContent = await file.text();
          insertTextAtCursor(textContent);
        }
        // Handle audio files
        else if (file.type.startsWith('audio/') || /\.(mp3|wav|m4a|ogg|flac|webm)$/i.test(file.name)) {
          // Insert placeholder
          const placeholder = `[🎙️ Transcribing...]`;
          const placeholderPos = insertTextAtCursor(placeholder);

          setIsTranscribing(true);

          try {
            // Transcribe audio
            const result = await transcriptionApi.transcribeAudio(file);

            // Replace placeholder with transcribed text
            setContent((prevContent) => {
              const newContent = prevContent.replace(placeholder, result.text);
              if (currentNote) {
                saveNote(newContent);
              }
              return newContent;
            });
          } catch (transcriptionError) {
            // Replace placeholder with error message
            setContent((prevContent) =>
              prevContent.replace(placeholder, `[Error transcribing audio]`)
            );
            setError('Transcription failed: ' + transcriptionError.message);
          } finally {
            setIsTranscribing(false);
          }
        } else {
          setError(`Unsupported file type: ${file.name}`);
        }
      } catch (error) {
        setError(`Failed to process file ${file.name}: ${error.message}`);
      }
    }
  };

  // Get cursor position from drop event
  const getCursorPositionFromEvent = (e, textarea) => {
    const rect = textarea.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Rough estimation: convert pixel position to character position
    // This is approximate and works best with monospace fonts
    const lineHeight = 20; // approximate line height
    const charWidth = 8; // approximate character width

    const line = Math.floor(y / lineHeight);
    const col = Math.floor(x / charWidth);

    const lines = content.split('\n');
    let pos = 0;
    for (let i = 0; i < line && i < lines.length; i++) {
      pos += lines[i].length + 1; // +1 for newline
    }
    pos += Math.min(col, lines[line]?.length || 0);

    return Math.min(pos, content.length);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  if (!currentNote) {
    return (
      <div className="note-editor">
        <div className="editor-placeholder">
          <p>Select a note from the sidebar or create a new one</p>
        </div>
      </div>
    );
  }

  return (
    <div className="note-editor">
      <NoteToolbar note={currentNote} isSaving={isSaving} isTranscribing={isTranscribing} />
      <textarea
        ref={textareaRef}
        className="editor-textarea"
        value={content}
        onChange={handleContentChange}
        onKeyDown={handleKeyDown}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        placeholder="Start typing or drop a file here..."
        spellCheck="true"
      />
    </div>
  );
};

export default NoteEditor;
