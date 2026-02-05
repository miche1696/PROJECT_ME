import React, { useState, useEffect, useRef } from 'react';
import { useNotes } from '../../context/NotesContext';
import { useApp } from '../../context/AppContext';
import FolderTree from '../folders/FolderTree';
import './Sidebar.css';

const Sidebar = () => {
  const {
    createNote,
    createFolder,
    folderTree,
    moveNote,
    moveFolder,
    bootstrapStatus,
    bootstrapAttempt,
    bootstrapRetryInMs,
    retryBootstrap,
  } = useNotes();
  const { currentFolder, setError } = useApp();
  const [isDragOverRoot, setIsDragOverRoot] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNoteDropdown, setShowNoteDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Clear drag-over state when any drag operation ends
  useEffect(() => {
    const handleDragEnd = () => {
      setIsDragOverRoot(false);
    };

    document.addEventListener('dragend', handleDragEnd);
    return () => {
      document.removeEventListener('dragend', handleDragEnd);
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNoteDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Callback for children to clear root highlight
  const clearRootDragOver = () => {
    setIsDragOverRoot(false);
  };

  const handleDragOver = (e) => {
    // Only handle if dragging internal items (not external files)
    const noteData = e.dataTransfer.types.includes('application/note');
    const folderData = e.dataTransfer.types.includes('application/folder');
    
    if (noteData || folderData) {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOverRoot(true);
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if actually leaving the sidebar bounds
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragOverRoot(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverRoot(false);

    // Check for internal drag-and-drop (notes or folders)
    const noteData = e.dataTransfer.getData('application/note');
    const folderData = e.dataTransfer.getData('application/folder');

    if (noteData) {
      try {
        const draggedNote = JSON.parse(noteData);
        // Check if note is already at root
        const currentFolder = draggedNote.path.split('/').slice(0, -1).join('/') || '';
        if (currentFolder !== '') {
          await moveNote(draggedNote.path, '');
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
        // Check if folder is already at root
        const currentParent = draggedFolder.path.split('/').slice(0, -1).join('/') || '';
        if (currentParent !== '') {
          await moveFolder(draggedFolder.path, '');
        }
        return;
      } catch (error) {
        setError('Failed to move folder: ' + error.message);
        return;
      }
    }
  };

  const handleNewNote = async (fileType = 'txt') => {
    try {
      const now = new Date();
      const date = now.toISOString().slice(0, 10).replace(/-/g, '');
      const time = now.toTimeString().slice(0, 8).replace(/:/g, '');
      const noteName = `${date}-${time} - New note`;
      await createNote(noteName, currentFolder, '', fileType);
      setShowNoteDropdown(false);
    } catch (error) {
      setError('Failed to create note: ' + error.message);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      await createFolder(newFolderName.trim(), currentFolder);
      setNewFolderName('');
      setShowNewFolderModal(false);
    } catch (error) {
      setError('Failed to create folder: ' + error.message);
    }
  };

  return (
    <div className="layout-sidebar">
      <div className="sidebar-actions">
        <div className="new-note-dropdown" ref={dropdownRef}>
          <button
            className="btn-primary dropdown-trigger sidebar-action-button"
            onClick={() => setShowNoteDropdown(!showNoteDropdown)}
          >
            + New Note
            <span className="dropdown-arrow">{showNoteDropdown ? '▲' : '▼'}</span>
          </button>
          {showNoteDropdown && (
            <div className="dropdown-menu">
              <button className="dropdown-item" onClick={() => handleNewNote('txt')}>
                <span className="dropdown-icon">📄</span>
                Text Note (.txt)
              </button>
              <button className="dropdown-item" onClick={() => handleNewNote('md')}>
                <span className="dropdown-icon">📝</span>
                Markdown Note (.md)
              </button>
            </div>
          )}
        </div>
        <button
          className="btn-secondary sidebar-action-button"
          onClick={() => setShowNewFolderModal(true)}
        >
          + New Folder
        </button>
      </div>
      <div 
        className={`sidebar-content ${isDragOverRoot ? 'drag-over-root' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {folderTree ? (
          <FolderTree folder={folderTree} onClearRootDragOver={clearRootDragOver} />
        ) : (
          <div className="sidebar-loading">
            <div className="sidebar-loading-spinner" />
            <div className="sidebar-loading-title">
              {bootstrapStatus === 'error' ? 'Waiting for the server...' : 'Loading folders...'}
            </div>
            <div className="sidebar-loading-subtitle">
              {bootstrapStatus === 'error'
                ? `Retrying automatically${bootstrapAttempt ? ` (attempt ${bootstrapAttempt})` : ''}.`
                : 'This can take a few seconds on first start.'}
            </div>
            {bootstrapStatus === 'error' && bootstrapRetryInMs && (
              <div className="sidebar-loading-subtitle">
                {`Next retry in ~${Math.ceil(bootstrapRetryInMs / 1000)}s.`}
              </div>
            )}
            {bootstrapStatus === 'error' && (
              <div className="sidebar-loading-actions">
                <button type="button" className="sidebar-retry-button" onClick={retryBootstrap}>
                  Retry now
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {showNewFolderModal && (
        <div className="modal-overlay" onClick={() => setShowNewFolderModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Create New Folder</h3>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFolder();
                if (e.key === 'Escape') setShowNewFolderModal(false);
              }}
            />
            <div className="modal-actions">
              <button onClick={() => setShowNewFolderModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleCreateFolder}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
