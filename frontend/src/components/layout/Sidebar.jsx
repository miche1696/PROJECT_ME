import React, { useState, useEffect } from 'react';
import { useNotes } from '../../context/NotesContext';
import { useApp } from '../../context/AppContext';
import FolderTree from '../folders/FolderTree';
import './Sidebar.css';

const Sidebar = () => {
  const { folderTree, moveNote, moveFolder } = useNotes();
  const { setError } = useApp();
  const [isDragOverRoot, setIsDragOverRoot] = useState(false);

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

  return (
    <div className="layout-sidebar">
      <div 
        className={`sidebar-content ${isDragOverRoot ? 'drag-over-root' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {folderTree ? (
          <FolderTree folder={folderTree} onClearRootDragOver={clearRootDragOver} />
        ) : (
          <div className="loading">Loading folders...</div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
