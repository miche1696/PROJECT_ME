import React, { useEffect, useRef, useState } from 'react';
import OperationButton from './OperationButton';
import './SelectionToolbar.css';

/**
 * Floating toolbar that appears when text is selected
 *
 * @param {Object} props
 * @param {{x: number, y: number}} props.position - Screen position for toolbar
 * @param {Object[]} props.operations - Available operations to show
 * @param {Function} props.onOperationSelect - Callback when operation is clicked
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

  // Handle click outside to dismiss
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target)) {
        // Don't dismiss if clicking in the textarea (selection change)
        if (e.target.tagName !== 'TEXTAREA') {
          onDismiss?.();
        }
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


  return (
    <div
      ref={toolbarRef}
      className={`selection-toolbar ${isProcessing ? 'processing' : ''}`}
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
      }}
    >
      {sortedCategories.map((category, catIndex) => (
        <React.Fragment key={category}>
          {catIndex > 0 && <div className="toolbar-separator" />}
          <div className="toolbar-group">
            {groupedOperations[category].map((operation) => (
              <OperationButton
                key={operation.id}
                operation={operation}
                onClick={() => onOperationSelect(operation.id)}
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
  );
};

export default SelectionToolbar;
