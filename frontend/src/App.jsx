import React from 'react';
import { AppProvider } from './context/AppContext';
import { NotesProvider } from './context/NotesContext';
import Layout from './components/layout/Layout';

function App() {
  return (
    <AppProvider>
      <NotesProvider>
        <Layout />
      </NotesProvider>
    </AppProvider>
  );
}

export default App;
