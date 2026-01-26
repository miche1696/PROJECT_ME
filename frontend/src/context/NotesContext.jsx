import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { notesApi } from '../api/notes';
import { foldersApi } from '../api/folders';

const NotesContext = createContext(null);

export const useNotes = () => {
  const context = useContext(NotesContext);
  if (!context) {
    throw new Error('useNotes must be used within NotesProvider');
  }
  return context;
};

export const NotesProvider = ({ children }) => {
  const [notes, setNotes] = useState([]);
  const [folderTree, setFolderTree] = useState(null);
  const [currentNote, setCurrentNote] = useState(null);

  // Fetch folder tree on mount
  const refreshFolders = useCallback(async () => {
    try {
      const tree = await foldersApi.getFolderTree();
      setFolderTree(tree);
    } catch (error) {
      console.error('Error fetching folder tree:', error);
      throw error;
    }
  }, []);

  // Fetch all notes
  const refreshNotes = useCallback(async (folder = '') => {
    try {
      const response = await notesApi.listNotes(folder);
      setNotes(response.notes || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
      throw error;
    }
  }, []);

  // Create note
  const createNote = useCallback(async (name, folderPath = '', content = '', fileType = 'txt') => {
    try {
      const note = await notesApi.createNote(name, folderPath, content, fileType);
      await refreshFolders();
      await refreshNotes();
      return note;
    } catch (error) {
      console.error('Error creating note:', error);
      throw error;
    }
  }, [refreshFolders, refreshNotes]);

  // Update note content
  const updateNote = useCallback(async (notePath, content) => {
    try {
      const note = await notesApi.updateNote(notePath, content);
      if (currentNote && currentNote.path === notePath) {
        setCurrentNote(note);
      }
      await refreshNotes();
      return note;
    } catch (error) {
      console.error('Error updating note:', error);
      throw error;
    }
  }, [currentNote, refreshNotes]);

  // Delete note
  const deleteNote = useCallback(async (notePath) => {
    try {
      await notesApi.deleteNote(notePath);
      // Clear current note if it was the deleted one
      // Compare paths by stripping extensions since folder tree paths have extensions
      // but currentNote.path (from getNote) does not
      const stripExtension = (p) => p?.replace(/\.(txt|md)$/, '') || '';
      setCurrentNote(prev => {
        if (!prev) return null;
        return stripExtension(prev.path) === stripExtension(notePath) ? null : prev;
      });
      await refreshFolders();
      await refreshNotes();
    } catch (error) {
      console.error('Error deleting note:', error);
      throw error;
    }
  }, [refreshFolders, refreshNotes]);

  // Rename note
  const renameNote = useCallback(async (notePath, newName) => {
    try {
      const note = await notesApi.renameNote(notePath, newName);
      // Update currentNote if it's the one being renamed
      if (currentNote && currentNote.path === notePath) {
        setCurrentNote(note);
      }
      await refreshFolders();
      await refreshNotes();
      return note;
    } catch (error) {
      console.error('Error renaming note:', error);
      throw error;
    }
  }, [currentNote, refreshFolders, refreshNotes]);

  // Move note
  const moveNote = useCallback(async (notePath, targetFolder) => {
    try {
      const note = await notesApi.moveNote(notePath, targetFolder);
      // Update currentNote if it's the one being moved
      if (currentNote && currentNote.path === notePath) {
        setCurrentNote(note);
      }
      await refreshFolders();
      await refreshNotes();
      return note;
    } catch (error) {
      console.error('Error moving note:', error);
      throw error;
    }
  }, [currentNote, refreshFolders, refreshNotes]);

  // Get note
  const getNote = useCallback(async (notePath) => {
    try {
      const note = await notesApi.getNote(notePath);
      setCurrentNote(note);
      return note;
    } catch (error) {
      console.error('Error fetching note:', error);
      throw error;
    }
  }, []);

  // Create folder
  const createFolder = useCallback(async (name, parentPath = '') => {
    try {
      const result = await foldersApi.createFolder(name, parentPath);
      await refreshFolders();
      return result;
    } catch (error) {
      console.error('Error creating folder:', error);
      throw error;
    }
  }, [refreshFolders]);

  // Rename folder
  const renameFolder = useCallback(async (folderPath, newName) => {
    try {
      const result = await foldersApi.renameFolder(folderPath, newName);
      await refreshFolders();
      return result;
    } catch (error) {
      console.error('Error renaming folder:', error);
      throw error;
    }
  }, [refreshFolders]);

  // Delete folder
  const deleteFolder = useCallback(async (folderPath, recursive = false) => {
    try {
      await foldersApi.deleteFolder(folderPath, recursive);
      // Clear current note if it was inside the deleted folder
      setCurrentNote(prev => {
        if (prev && prev.path && prev.path.startsWith(folderPath + '/')) {
          return null;
        }
        return prev;
      });
      await refreshFolders();
      await refreshNotes();
    } catch (error) {
      console.error('Error deleting folder:', error);
      throw error;
    }
  }, [refreshFolders, refreshNotes]);

  // Move folder
  const moveFolder = useCallback(async (folderPath, targetFolder) => {
    try {
      const result = await foldersApi.moveFolder(folderPath, targetFolder);
      await refreshFolders();
      await refreshNotes();
      return result;
    } catch (error) {
      console.error('Error moving folder:', error);
      throw error;
    }
  }, [refreshFolders, refreshNotes]);

  // Initialize: load folder tree and notes
  useEffect(() => {
    refreshFolders();
    refreshNotes();
  }, [refreshFolders, refreshNotes]);

  const value = {
    notes,
    folderTree,
    currentNote,
    setCurrentNote,
    createNote,
    updateNote,
    deleteNote,
    renameNote,
    moveNote,
    getNote,
    createFolder,
    renameFolder,
    deleteFolder,
    moveFolder,
    refreshNotes,
    refreshFolders,
  };

  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
};
