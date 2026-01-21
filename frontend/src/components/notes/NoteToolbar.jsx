import React, { useState, useRef, useEffect } from 'react';
import { useNotes } from '../../context/NotesContext';
import { useApp } from '../../context/AppContext';
import './NoteToolbar.css';

const NoteToolbar = ({ note, isSaving, isTranscribing, isMarkdown, editorMode, onEditorModeChange }) => {
  const { renameNote } = useNotes();
  const { setError } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(note.name);
  const inputRef = useRef(null);

  // Update edit value when note changes
  useEffect(() => {
    setEditValue(note.name);
    setIsEditing(false);
  }, [note.name]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleTitleClick = () => {
    setIsEditing(true);
  };

  const handleInputChange = (e) => {
    setEditValue(e.target.value);
  };

  const handleInputBlur = async () => {
    await saveTitle();
  };

  const handleInputKeyDown = async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      await saveTitle();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditValue(note.name);
      setIsEditing(false);
    }
  };

  const saveTitle = async () => {
    const trimmedValue = editValue.trim();
    
    // If unchanged or empty, cancel edit
    if (trimmedValue === note.name || !trimmedValue) {
      setEditValue(note.name);
      setIsEditing(false);
      return;
    }

    try {
      await renameNote(note.path, trimmedValue);
      setIsEditing(false);
    } catch (error) {
      setError('Failed to rename note: ' + error.message);
      setEditValue(note.name);
      setIsEditing(false);
    }
  };

  return (
    <div className="note-toolbar">
      <div className="toolbar-left">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            className="note-title-input"
            value={editValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
          />
        ) : (
          <h2 className="note-title" onClick={handleTitleClick} title="Click to rename">
            {note.name}
          </h2>
        )}
        <span className={`file-type-badge ${isMarkdown ? 'markdown' : 'text'}`}>
          {isMarkdown ? 'MD' : 'TXT'}
        </span>
      </div>
      <div className="toolbar-right">
        {isMarkdown && (
          <div className="editor-mode-toggle">
            <button
              className={`mode-btn ${editorMode === 'render' ? 'active' : ''}`}
              onClick={() => onEditorModeChange('render')}
              title="WYSIWYG mode"
            >
              Render
            </button>
            <button
              className={`mode-btn ${editorMode === 'source' ? 'active' : ''}`}
              onClick={() => onEditorModeChange('source')}
              title="Source mode"
            >
              Source
            </button>
          </div>
        )}
        {isTranscribing && (
          <span className="status-indicator transcribing">🎙️ Transcribing...</span>
        )}
        {isSaving && (
          <span className="status-indicator saving">Saving...</span>
        )}
        {!isSaving && !isTranscribing && (
          <span className="status-indicator saved">Saved</span>
        )}
      </div>
    </div>
  );
};

export default NoteToolbar;
