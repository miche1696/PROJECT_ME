import React, { useEffect } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import NoteEditor from '../notes/NoteEditor';
import './Layout.css';

const Layout = () => {
  // Prevent browser default drag/drop behavior globally
  useEffect(() => {
    const preventDefaults = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };

    // Add listeners to prevent browser from opening dropped files
    document.addEventListener('dragover', preventDefaults);
    document.addEventListener('drop', preventDefaults);

    // Cleanup on unmount
    return () => {
      document.removeEventListener('dragover', preventDefaults);
      document.removeEventListener('drop', preventDefaults);
    };
  }, []);

  return (
    <div className="layout">
      <Header />
      <div className="layout-content">
        <Sidebar />
        <div className="layout-editor">
          <NoteEditor />
        </div>
      </div>
    </div>
  );
};

export default Layout;
