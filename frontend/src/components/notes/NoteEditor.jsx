import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNotes } from '../../context/NotesContext';
import { useApp } from '../../context/AppContext';
import { useSelection } from '../../context/SelectionContext';
import { transcriptionApi } from '../../api/transcription';
import { useTextOperations } from '../../hooks/useTextOperations';
import NoteToolbar from './NoteToolbar';
import VoiceRecorder from './VoiceRecorder';
import MarkdownEditor from './MarkdownEditor';
import { SelectionToolbar } from '../selection';
import './NoteEditor.css';

const NoteEditor = () => {
  const { currentNote, updateNote } = useNotes();
  const { setError } = useApp();
  const {
    hasSelection,
    isToolbarVisible,
    toolbarPosition,
    activeOperation,
    operationStatus,
    updateSelection,
    clearSelection,
    hideToolbar,
  } = useSelection();

  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [editorMode, setEditorMode] = useState('render'); // 'render' (WYSIWYG) or 'source' (raw markdown)
  const textareaRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const lastMousePositionRef = useRef({ x: 0, y: 0 });

  // Check if current note is markdown
  const isMarkdown = currentNote?.file_type === 'md';

  // Trigger save callback for useTextOperations
  const triggerSave = useCallback(
    (newContent) => {
      if (currentNote) {
        saveNote(newContent);
      }
    },
    [currentNote]
  );

  // Text operations hook
  const { executeOperation, getAvailableOperations } = useTextOperations(
    content,
    setContent,
    textareaRef,
    triggerSave
  );

  // Load note content when current note changes
  useEffect(() => {
    if (currentNote) {
      setContent(currentNote.content || '');
    } else {
      setContent('');
    }
    // Clear selection when note changes
    clearSelection();
  }, [currentNote, clearSelection]);

  // Auto-save functionality (debounced)
  const handleContentChange = (e) => {
    const newContent = e.target.value;
    setContent(newContent);

    // Store cursor position
    setCursorPosition(e.target.selectionStart);

    // Clear selection when content changes (typing)
    if (hasSelection) {
      clearSelection();
    }

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

  // Handle markdown editor changes
  const handleMarkdownChange = useCallback((newContent) => {
    setContent(newContent);

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
  }, [currentNote]);

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

  // Get caret coordinates using mirror div technique
  const getCaretCoordinates = useCallback((textarea, position) => {
    // Create a mirror div with identical styling
    const mirror = document.createElement('div');
    const style = window.getComputedStyle(textarea);

    // Copy all relevant styles that affect text layout
    const styleProps = [
      'font', 'fontSize', 'fontFamily', 'fontWeight', 'fontStyle',
      'lineHeight', 'paddingTop', 'paddingLeft', 'paddingRight', 'paddingBottom',
      'borderLeftWidth', 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth',
      'boxSizing', 'width', 'wordWrap', 'whiteSpace', 'letterSpacing',
      'textIndent', 'textTransform', 'wordSpacing', 'textAlign'
    ];

    styleProps.forEach(prop => {
      mirror.style[prop] = style[prop];
    });

    // Additional positioning styles
    mirror.style.position = 'absolute';
    mirror.style.visibility = 'hidden';
    mirror.style.whiteSpace = 'pre-wrap';
    mirror.style.wordWrap = 'break-word';
    mirror.style.overflow = 'hidden';
    mirror.style.height = 'auto';
    mirror.style.top = '0';
    mirror.style.left = '0';

    // Get textarea dimensions and scroll
    const textareaRect = textarea.getBoundingClientRect();
    const scrollTop = textarea.scrollTop;
    const scrollLeft = textarea.scrollLeft;

    // Set mirror width to match textarea content width
    const paddingLeft = parseFloat(style.paddingLeft) || 0;
    const paddingRight = parseFloat(style.paddingRight) || 0;
    mirror.style.width = `${textareaRect.width - paddingLeft - paddingRight}px`;

    // Insert text up to caret position
    const textBeforeCaret = content.substring(0, position);
    mirror.textContent = textBeforeCaret;

    // Create a marker span to measure caret position
    const marker = document.createElement('span');
    marker.textContent = '|';
    mirror.appendChild(marker);

    // Append to body temporarily
    document.body.appendChild(mirror);

    // Get marker position relative to mirror
    const markerRect = marker.getBoundingClientRect();
    const mirrorRect = mirror.getBoundingClientRect();

    // Calculate position relative to textarea
    const x = textareaRect.left + paddingLeft + (markerRect.left - mirrorRect.left) - scrollLeft;
    const y = textareaRect.top + (markerRect.top - mirrorRect.top) - scrollTop;

    // Clean up
    document.body.removeChild(mirror);

    return { x, y };
  }, [content]);

  // Handle text selection with position
  const handleSelectionChange = useCallback((position) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd, selectionDirection } = textarea;

    if (selectionStart !== selectionEnd) {
      const selectedText = content.substring(selectionStart, selectionEnd);

      // Use provided position (from mouse) or calculate from caret (keyboard)
      let toolbarPos;
      if (position) {
        // Mouse selection - use mouse coordinates (already the focus position)
        toolbarPos = position;
      } else {
        // Keyboard selection - use FOCUS position (the moving cursor)
        // If backward selection, focus is at selectionStart
        // If forward selection, focus is at selectionEnd
        const focusPosition = selectionDirection === 'backward' 
          ? selectionStart 
          : selectionEnd;
        toolbarPos = getCaretCoordinates(textarea, focusPosition);
      }

      updateSelection(selectionStart, selectionEnd, selectedText, toolbarPos);
    } else {
      clearSelection();
    }
  }, [content, updateSelection, clearSelection, getCaretCoordinates]);

  // Track mouse position
  const handleMouseMove = useCallback((e) => {
    lastMousePositionRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  // Handle mouse up to finalize selection
  const handleMouseUp = useCallback((e) => {
    // Store mouse position
    lastMousePositionRef.current = { x: e.clientX, y: e.clientY };
    
    // Small delay to ensure selection is complete
    setTimeout(() => {
      // Add small offset to move toolbar higher (further from click point to avoid overlapping with text)
      // ~0.5cm = ~15-20px depending on screen DPI
      handleSelectionChange({ 
        x: e.clientX, 
        y: e.clientY - 15 
      });
    }, 10);
  }, [handleSelectionChange]);

  // Handle keyboard-based selection (Shift+arrows)
  const handleKeyUp = useCallback(
    (e) => {
      if (e.shiftKey || e.key === 'Shift') {
        // Keyboard selection - use caret position
        handleSelectionChange(null);
      }
    },
    [handleSelectionChange]
  );

  // Manual save on Ctrl+S
  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (currentNote) {
        saveNote(content);
      }
    }
  };

  // Handle operation selection from toolbar
  const handleOperationSelect = useCallback(
    async (operationId) => {
      try {
        await executeOperation(operationId);
      } catch (error) {
        setError(`Operation failed: ${error.message}`);
      }
    },
    [executeOperation, setError]
  );

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

  // Handle voice recording start - insert placeholder
  const handleVoiceRecordingStart = (placeholder) => {
    insertTextAtCursor(placeholder);
  };

  // Handle transcription complete - replace placeholder with text
  const handleTranscriptionComplete = (transcribedText, placeholder) => {
    if (placeholder) {
      // Replace placeholder with transcribed text
      setContent((prevContent) => {
        const newContent = prevContent.replace(placeholder, transcribedText);
        if (currentNote) {
          saveNote(newContent);
        }
        return newContent;
      });
    } else {
      // No placeholder, just insert at cursor
      insertTextAtCursor(transcribedText);
    }
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

  // Get available operations for current selection
  const availableOperations = hasSelection ? getAvailableOperations() : [];

  return (
    <div className="note-editor">
      <NoteToolbar
        note={currentNote}
        isSaving={isSaving}
        isTranscribing={isTranscribing}
        isMarkdown={isMarkdown}
        editorMode={editorMode}
        onEditorModeChange={setEditorMode}
      />
      <div className="editor-content-container">
        {isMarkdown ? (
          <MarkdownEditor
            content={content}
            onChange={handleMarkdownChange}
            mode={editorMode}
          />
        ) : (
          <textarea
            ref={textareaRef}
            className="editor-textarea"
            value={content}
            onChange={handleContentChange}
            onKeyDown={handleKeyDown}
            onKeyUp={handleKeyUp}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            placeholder="Start typing or drop a file here..."
            spellCheck="true"
          />
        )}

        {/* Selection Toolbar - only for text files */}
        {!isMarkdown && hasSelection && isToolbarVisible && availableOperations.length > 0 && (
          <SelectionToolbar
            position={toolbarPosition}
            operations={availableOperations}
            onOperationSelect={handleOperationSelect}
            isProcessing={operationStatus === 'pending'}
            activeOperation={activeOperation}
            onDismiss={hideToolbar}
          />
        )}

        <VoiceRecorder
          onRecordingStart={handleVoiceRecordingStart}
          onTranscriptionComplete={handleTranscriptionComplete}
          onTranscriptionStart={() => setIsTranscribing(true)}
          onTranscriptionEnd={() => setIsTranscribing(false)}
          onError={setError}
          disabled={!currentNote}
        />
      </div>
    </div>
  );
};

export default NoteEditor;
