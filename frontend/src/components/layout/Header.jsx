import React, { useState } from 'react';
import { useNotes } from '../../context/NotesContext';
import { useApp } from '../../context/AppContext';
import './Header.css';

const Header = () => {
  const { createNote, createFolder } = useNotes();
  const { currentFolder, setError } = useApp();
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const handleNewNote = async () => {
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const noteName = `note-${timestamp}`;
      await createNote(noteName, currentFolder, '');
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
        <h1>📝 Notes</h1>
      </div>
      <div className="header-actions">
        <button className="btn-primary" onClick={handleNewNote}>
          + New Note
        </button>
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
