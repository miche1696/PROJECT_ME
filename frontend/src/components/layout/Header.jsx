import React, { useState, useRef, useEffect } from 'react';
import { useNotes } from '../../context/NotesContext';
import { useApp } from '../../context/AppContext';
import './Header.css';

const Header = () => {
  const { createNote, createFolder } = useNotes();
  const { currentFolder, setError } = useApp();
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNoteDropdown, setShowNoteDropdown] = useState(false);
  const dropdownRef = useRef(null);

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
    <div className="header">
      <div className="header-title">
        <h1>Notes</h1>
      </div>
      <div className="header-actions">
        <div className="new-note-dropdown" ref={dropdownRef}>
          <button
            className="btn-primary dropdown-trigger"
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
        <button className="btn-secondary" onClick={() => setShowNewFolderModal(true)}>
          + New Folder
        </button>
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

export default Header;
