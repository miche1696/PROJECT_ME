import React, { createContext, useContext, useState, useCallback } from 'react';

const SelectionContext = createContext(null);

export const useSelection = () => {
  const context = useContext(SelectionContext);
  if (!context) {
    throw new Error('useSelection must be used within SelectionProvider');
  }
  return context;
};

export const SelectionProvider = ({ children }) => {
  // Core selection data
  const [selectedText, setSelectedText] = useState('');
  const [selectionStart, setSelectionStart] = useState(0);
  const [selectionEnd, setSelectionEnd] = useState(0);

  // UI state
  const [isToolbarVisible, setIsToolbarVisible] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 });

  // Operation state
  const [activeOperation, setActiveOperation] = useState(null);
  const [operationStatus, setOperationStatus] = useState('idle'); // 'idle' | 'pending' | 'success' | 'error'
  const [operationError, setOperationError] = useState(null);

  // Derived state
  const hasSelection = selectedText.length > 0;

  // Update selection from textarea
  const updateSelection = useCallback((start, end, text, position = null) => {
    setSelectionStart(start);
    setSelectionEnd(end);
    setSelectedText(text);

    if (position) {
      setToolbarPosition(position);
    }

    // Show toolbar if there's a selection
    if (start !== end && text.length > 0) {
      setIsToolbarVisible(true);
    } else {
      setIsToolbarVisible(false);
    }
  }, []);

  // Clear selection state
  const clearSelection = useCallback(() => {
    setSelectedText('');
    setSelectionStart(0);
    setSelectionEnd(0);
    setIsToolbarVisible(false);
    setActiveOperation(null);
    setOperationStatus('idle');
    setOperationError(null);
  }, []);

  // Toolbar visibility
  const showToolbar = useCallback((position) => {
    if (position) {
      setToolbarPosition(position);
    }
    setIsToolbarVisible(true);
  }, []);

  const hideToolbar = useCallback(() => {
    setIsToolbarVisible(false);
  }, []);

  // Operation lifecycle
  const startOperation = useCallback((operationId) => {
    setActiveOperation(operationId);
    setOperationStatus('pending');
    setOperationError(null);
  }, []);

  const completeOperation = useCallback(() => {
    setActiveOperation(null);
    setOperationStatus('success');
    // Auto-hide toolbar after successful operation
    setTimeout(() => {
      setIsToolbarVisible(false);
      setOperationStatus('idle');
    }, 300);
  }, []);

  const failOperation = useCallback((error) => {
    setOperationStatus('error');
    setOperationError(error);
    // Keep activeOperation set so UI can show retry option
  }, []);

  const dismissError = useCallback(() => {
    setOperationError(null);
    setOperationStatus('idle');
    setActiveOperation(null);
  }, []);

  const value = {
    // Selection data
    selectedText,
    selectionStart,
    selectionEnd,
    hasSelection,

    // Toolbar state
    isToolbarVisible,
    toolbarPosition,

    // Operation state
    activeOperation,
    operationStatus,
    operationError,

    // Methods
    updateSelection,
    clearSelection,
    showToolbar,
    hideToolbar,
    startOperation,
    completeOperation,
    failOperation,
    dismissError,
  };

  return (
    <SelectionContext.Provider value={value}>
      {children}
    </SelectionContext.Provider>
  );
};
