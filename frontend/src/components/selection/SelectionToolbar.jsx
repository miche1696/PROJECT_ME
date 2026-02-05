import React, { useEffect, useRef, useState } from 'react';
import OperationButton from './OperationButton';
import './SelectionToolbar.css';

/**
 * Floating toolbar that appears when text is selected
 *
 * @param {Object} props
 * @param {{x: number, y: number}} props.position - Screen position for toolbar
 * @param {Object[]} props.operations - Available operations to show
 * @param {Function} props.onOperationSelect - Callback when operation is clicked (operationId, options)
 * @param {boolean} props.isProcessing - Whether an operation is in progress
 * @param {string|null} props.activeOperation - ID of the active operation
 * @param {Function} props.onDismiss - Callback to dismiss the toolbar
 */
const SelectionToolbar = ({
  position,
  operations,
  onOperationSelect,
  isProcessing,
  activeOperation,
  onDismiss,
}) => {
  const toolbarRef = useRef(null);
  const promptInputRef = useRef(null);
  const [adjustedPosition, setAdjustedPosition] = useState(() => {
    // Initial calculation with estimates
    const padding = 10;
    const toolbarWidth = 200;
    const toolbarHeight = 40;
    let x = position.x - (toolbarWidth / 2);
    let y = position.y - toolbarHeight - 10;
    
    // Clamp to viewport
    if (x < padding) x = padding;
    if (x + toolbarWidth > window.innerWidth - padding) {
      x = window.innerWidth - toolbarWidth - padding;
    }
    if (y < padding) {
      y = position.y + 20;
    }
    if (y + toolbarHeight > window.innerHeight - padding) {
      y = padding;
    }
    
    return { x, y };
  });
  const [promptOperationId, setPromptOperationId] = useState(null);
  const [promptValue, setPromptValue] = useState('');

  // Recalculate position once toolbar is rendered with actual dimensions
  useEffect(() => {
    if (toolbarRef.current) {
      const padding = 10;
      const toolbarWidth = toolbarRef.current.offsetWidth;
      const toolbarHeight = toolbarRef.current.offsetHeight;
      
      let x = position.x - (toolbarWidth / 2);
      let y = position.y - toolbarHeight - 10;
      
      // Clamp to viewport
      if (x < padding) x = padding;
      if (x + toolbarWidth > window.innerWidth - padding) {
        x = window.innerWidth - toolbarWidth - padding;
      }
      if (y < padding) {
        y = position.y + 20;
      }
      if (y + toolbarHeight > window.innerHeight - padding) {
        y = padding;
      }
      
      setAdjustedPosition({ x, y });
    }
  }, [position, operations]); // Recalculate when position or operations change

  useEffect(() => {
    if (!promptOperationId) {
      return;
    }
    const stillAvailable = operations.some((op) => op.id === promptOperationId);
    if (!stillAvailable) {
      setPromptOperationId(null);
      setPromptValue('');
    }
  }, [operations, promptOperationId]);

  useEffect(() => {
    if (promptOperationId) {
      promptInputRef.current?.focus();
    }
  }, [promptOperationId]);

  // Handle click outside to dismiss
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target)) {
        // Don't dismiss if clicking in the textarea (selection change)
        if (e.target.tagName === 'TEXTAREA') {
          return;
        }
        // Don't dismiss if clicking in a contenteditable element (WYSIWYG editor)
        if (e.target.isContentEditable || e.target.closest('[contenteditable="true"]')) {
          return;
        }
        onDismiss?.();
      }
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onDismiss?.();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onDismiss]);

  // Group operations by category
  const groupedOperations = operations.reduce((groups, op) => {
    const category = op.category || 'other';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(op);
    return groups;
  }, {});

  // Order categories
  const categoryOrder = ['format', 'transform', 'ai', 'other'];
  const sortedCategories = Object.keys(groupedOperations).sort(
    (a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b)
  );


  // Prevent mousedown from stealing focus, which would clear contenteditable selection
  const handleMouseDown = (e) => {
    if (e.target.closest('.toolbar-prompt')) {
      return;
    }
    e.preventDefault();
  };

  const handleOperationClick = (operation) => {
    if (operation.requiresPrompt) {
      setPromptOperationId(operation.id);
      setPromptValue('');
      return;
    }
    setPromptOperationId(null);
    setPromptValue('');
    onOperationSelect(operation.id);
  };

  const handlePromptSubmit = () => {
    const trimmed = promptValue.trim();
    if (!promptOperationId || !trimmed) {
      return;
    }
    onOperationSelect(promptOperationId, { instruction: trimmed });
    setPromptOperationId(null);
    setPromptValue('');
  };

  const handlePromptCancel = () => {
    setPromptOperationId(null);
    setPromptValue('');
  };

  const handlePromptKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handlePromptSubmit();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      handlePromptCancel();
    }
  };

  return (
    <div
      ref={toolbarRef}
      className={`selection-toolbar ${isProcessing ? 'processing' : ''} ${promptOperationId ? 'has-prompt' : ''}`}
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="toolbar-operations">
        {sortedCategories.map((category, catIndex) => (
          <React.Fragment key={category}>
            {catIndex > 0 && <div className="toolbar-separator" />}
            <div className="toolbar-group">
              {groupedOperations[category].map((operation) => (
                <OperationButton
                  key={operation.id}
                  operation={operation}
                  onClick={() => handleOperationClick(operation)}
                  isActive={activeOperation === operation.id}
                  disabled={isProcessing}
                />
              ))}
            </div>
          </React.Fragment>
        ))}

        {isProcessing && (
          <div className="toolbar-loading">
            <span className="loading-spinner" />
          </div>
        )}
      </div>

      {promptOperationId && (
        <div className="toolbar-prompt">
          <label className="toolbar-prompt-label">
            {operations.find((op) => op.id === promptOperationId)?.promptLabel || 'Modify selection'}
          </label>
          <textarea
            className="toolbar-prompt-input"
            value={promptValue}
            onChange={(e) => setPromptValue(e.target.value)}
            onKeyDown={handlePromptKeyDown}
            placeholder={
              operations.find((op) => op.id === promptOperationId)?.promptPlaceholder || ''
            }
            rows={3}
            spellCheck="true"
            disabled={isProcessing}
            ref={promptInputRef}
          />
          <div className="toolbar-prompt-actions">
            <button
              type="button"
              className="toolbar-prompt-button secondary"
              onClick={handlePromptCancel}
              disabled={isProcessing}
            >
              Cancel
            </button>
            <button
              type="button"
              className="toolbar-prompt-button primary"
              onClick={handlePromptSubmit}
              disabled={!promptValue.trim() || isProcessing}
            >
              {operations.find((op) => op.id === promptOperationId)?.submitLabel || 'Apply'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SelectionToolbar;
