import React, { useState } from 'react';
import { useNotes } from '../../context/NotesContext';
import { useApp } from '../../context/AppContext';
import { transcriptionApi } from '../../api/transcription';
import NoteItem from './NoteItem';
import './FolderItem.css';

const sortByName = (items) => {
  if (!items) return [];
  return [...items].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
};

// Invalid characters for folder names
const INVALID_CHARS = /[/\\:*?"<>|]/;

const FolderItem = ({ folder, level = 0, onClearRootDragOver }) => {
  const [isExpanded, setIsExpanded] = useState(level === 0); // Root folder expanded by default
  const [isDragOver, setIsDragOver] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const { createNote, refreshFolders, moveNote, moveFolder, renameFolder } = useNotes();
  const { setError } = useApp();

  const isRootFolder = level === 0 && folder.path === '';

  const handleToggle = (e) => {
    // Don't toggle if clicking during drag, on drag handle, or while editing
    if (isDragging || e.target.closest('.folder-drag-handle') || isEditing) {
      return;
    }
    setIsExpanded(!isExpanded);
  };

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    // Don't allow renaming root folder
    if (isRootFolder) return;
    setEditName(folder.name);
    setIsEditing(true);
  };

  const isValidFolderName = (name) => {
    const trimmed = name.trim();
    // Empty or whitespace-only
    if (!trimmed) return false;
    // Contains invalid characters
    if (INVALID_CHARS.test(trimmed)) return false;
    // Reserved names on Windows
    const reserved = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
    if (reserved.test(trimmed)) return false;
    // Starts or ends with a dot or space
    if (trimmed.startsWith('.') || trimmed.endsWith('.')) return false;
    return true;
  };

  const handleRenameSubmit = async () => {
    const newName = editName.trim();

    // Silently cancel if name is invalid or unchanged
    if (!isValidFolderName(newName) || newName === folder.name) {
      setIsEditing(false);
      return;
    }

    try {
      await renameFolder(folder.path, newName);
    } catch (error) {
      // Silently ignore errors (e.g., name already exists)
      console.log('Rename cancelled:', error.message);
    }
    setIsEditing(false);
  };

  const handleRenameKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  const handleRenameBlur = () => {
    handleRenameSubmit();
  };

  // Check if target folder is a descendant of source folder
  const isDescendant = (sourcePath, targetPath) => {
    if (!sourcePath || !targetPath) return false;
    return targetPath.startsWith(sourcePath + '/') || targetPath === sourcePath;
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Clear root drag-over highlight since we're now over a folder
    if (onClearRootDragOver) {
      onClearRootDragOver();
    }
    
    // Check if we're dragging internal items (notes or folders)
    const hasNoteData = e.dataTransfer.types.includes('application/note');
    const hasFolderData = e.dataTransfer.types.includes('application/folder');
    
    if (hasNoteData || hasFolderData) {
      setIsDragOver(true);
      e.dataTransfer.dropEffect = 'move';
    } else {
      // External files - allow drop
      setIsDragOver(true);
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only clear drag-over if we're actually leaving the element
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragOver(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    // Check for internal drag-and-drop first (notes or folders)
    const noteData = e.dataTransfer.getData('application/note');
    const folderData = e.dataTransfer.getData('application/folder');

    if (noteData) {
      try {
        const draggedNote = JSON.parse(noteData);
        // Don't move if already in this folder
        const currentFolder = draggedNote.path.split('/').slice(0, -1).join('/') || '';
        if (currentFolder !== folder.path) {
          await moveNote(draggedNote.path, folder.path);
        }
        return;
      } catch (error) {
        setError('Failed to move note: ' + error.message);
        return;
      }
    }

    if (folderData) {
      try {
        const draggedFolder = JSON.parse(folderData);
        // Prevent moving folder into itself or descendant
        if (isDescendant(draggedFolder.path, folder.path)) {
          setError('Cannot move folder into itself or its descendant');
          return;
        }
        // Don't move if already in this folder
        const currentParent = draggedFolder.path.split('/').slice(0, -1).join('/') || '';
        if (currentParent !== folder.path) {
          await moveFolder(draggedFolder.path, folder.path);
        }
        return;
      } catch (error) {
        setError('Failed to move folder: ' + error.message);
        return;
      }
    }

    // Handle external files (existing behavior)
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    for (const file of files) {
      try {
        const fileName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension

        // Check if it's a text file
        if (file.name.endsWith('.txt')) {
          const content = await file.text();
          await createNote(fileName, folder.path, content);
        }
        // Check if it's an audio file
        else if (file.type.startsWith('audio/') || /\.(mp3|wav|m4a|ogg|flac|webm)$/i.test(file.name)) {
          // Transcribe audio
          const result = await transcriptionApi.transcribeAudio(file);
          await createNote(fileName, folder.path, result.text);
        } else {
          setError(`Unsupported file type: ${file.name}`);
        }
      } catch (error) {
        setError(`Failed to process file ${file.name}: ${error.message}`);
      }
    }

    await refreshFolders();
  };

  const handleDragStart = (e) => {
    // Don't allow dragging root folder
    if (level === 0 && folder.path === '') {
      e.preventDefault();
      return;
    }
    setIsDragging(true);
    // Set data transfer with folder information
    e.dataTransfer.setData('application/folder', JSON.stringify({
      path: folder.path,
      name: folder.name,
    }));
    e.dataTransfer.effectAllowed = 'move';
    // Set drag image to be the element itself
    e.dataTransfer.setDragImage(e.currentTarget, 0, 0);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const indentStyle = {
    paddingLeft: `${level * 16}px`,
  };

  return (
    <div className="folder-item-container">
      <div
        className={`folder-item ${isDragOver ? 'drag-over' : ''} ${isDragging ? 'dragging' : ''} ${isEditing ? 'editing' : ''}`}
        style={indentStyle}
        onClick={handleToggle}
        onDoubleClick={handleDoubleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        draggable={!isRootFolder && !isEditing}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <span className="folder-icon">{isExpanded ? '📂' : '📁'}</span>
        {isEditing ? (
          <input
            type="text"
            className="folder-name-input"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={handleRenameKeyDown}
            onBlur={handleRenameBlur}
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="folder-name">{folder.name}</span>
        )}
        {!isEditing && folder.notes && folder.notes.length > 0 && (
          <span className="folder-count">{folder.notes.length}</span>
        )}
      </div>

      {isExpanded && (
        <div className="folder-children">
          {/* Render notes in this folder */}
          {sortByName(folder.notes).map((note) => (
            <NoteItem key={note.path} note={note} level={level + 1} />
          ))}

          {/* Render subfolders */}
          {sortByName(folder.children).map((child) => (
            <FolderItem key={child.path} folder={child} level={level + 1} onClearRootDragOver={onClearRootDragOver} />
          ))}
        </div>
      )}
    </div>
  );
};

export default FolderItem;
