import React from 'react';
import FolderItem from './FolderItem';
import NoteItem from './NoteItem';
import './FolderTree.css';

const FolderTree = ({ folder, level = 0, onClearRootDragOver }) => {
  if (!folder) return null;

  return (
    <div className="folder-tree">
      {/* Render notes at this level */}
      {folder.notes && folder.notes.map((note) => (
        <NoteItem key={note.path} note={note} level={level} onClearRootDragOver={onClearRootDragOver} />
      ))}

      {/* Render subfolders */}
      {folder.children && folder.children.map((child) => (
        <FolderItem key={child.path} folder={child} level={level} onClearRootDragOver={onClearRootDragOver} />
      ))}
    </div>
  );
};

export default FolderTree;
