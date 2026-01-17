import React from 'react';
import FolderItem from './FolderItem';
import NoteItem from './NoteItem';
import './FolderTree.css';

const sortByName = (items) => {
  if (!items) return [];
  return [...items].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
};

const FolderTree = ({ folder, level = 0, onClearRootDragOver }) => {
  if (!folder) return null;

  const sortedNotes = sortByName(folder.notes);
  const sortedChildren = sortByName(folder.children);

  return (
    <div className="folder-tree">
      {/* Render notes at this level */}
      {sortedNotes.map((note) => (
        <NoteItem key={note.path} note={note} level={level} onClearRootDragOver={onClearRootDragOver} />
      ))}

      {/* Render subfolders */}
      {sortedChildren.map((child) => (
        <FolderItem key={child.path} folder={child} level={level} onClearRootDragOver={onClearRootDragOver} />
      ))}
    </div>
  );
};

export default FolderTree;
