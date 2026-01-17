import React from 'react';
import { AppProvider } from './context/AppContext';
import { NotesProvider } from './context/NotesContext';
import { SelectionProvider } from './context/SelectionContext';
import Layout from './components/layout/Layout';

function App() {
  return (
    <AppProvider>
      <SelectionProvider>
        <NotesProvider>
          <Layout />
        </NotesProvider>
      </SelectionProvider>
    </AppProvider>
  );
}

export default App;
