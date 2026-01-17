import { useCallback } from 'react';
import { useSelection } from '../context/SelectionContext';
import { operationRegistry } from '../operations';

/**
 * Hook for executing text operations on selected text
 *
 * @param {string} content - Current editor content
 * @param {Function} setContent - State setter for content
 * @param {React.RefObject} textareaRef - Ref to textarea element
 * @param {Function} onContentChange - Callback after content changes (for auto-save)
 */
export function useTextOperations(content, setContent, textareaRef, onContentChange) {
  const {
    selectionStart,
    selectionEnd,
    startOperation,
    completeOperation,
    failOperation,
    clearSelection,
  } = useSelection();

  /**
   * Execute an operation on the currently selected text
   * @param {string} operationId - ID of the operation to execute
   * @param {Object} options - Optional parameters for the operation
   */
  const executeOperation = useCallback(
    async (operationId, options = {}) => {
      const operation = operationRegistry.get(operationId);
      if (!operation) {
        console.error(`Unknown operation: ${operationId}`);
        failOperation(`Unknown operation: ${operationId}`);
        return;
      }

      // Get the currently selected text
      const selectedText = content.substring(selectionStart, selectionEnd);
      if (!selectedText) {
        console.warn('No text selected');
        return;
      }

      try {
        startOperation(operationId);

        // Execute the operation handler
        let result;
        if (operation.isAsync) {
          result = await operation.handler(selectedText, options);
        } else {
          result = operation.handler(selectedText, options);
        }

        // Replace selected text with result
        const newContent =
          content.substring(0, selectionStart) +
          result +
          content.substring(selectionEnd);

        setContent(newContent);

        // Update textarea selection to cover the new text
        const textarea = textareaRef.current;
        if (textarea) {
          const newEnd = selectionStart + result.length;
          // Use setTimeout to ensure state has updated
          setTimeout(() => {
            textarea.selectionStart = selectionStart;
            textarea.selectionEnd = newEnd;
            textarea.focus();
          }, 0);
        }

        completeOperation();

        // Trigger save callback
        if (onContentChange) {
          onContentChange(newContent);
        }
      } catch (error) {
        console.error(`Operation ${operationId} failed:`, error);
        failOperation(error.message || 'Operation failed');
      }
    },
    [
      content,
      selectionStart,
      selectionEnd,
      setContent,
      textareaRef,
      onContentChange,
      startOperation,
      completeOperation,
      failOperation,
    ]
  );

  /**
   * Get operations available for the current selection
   * @returns {Object[]} List of available operations
   */
  const getAvailableOperations = useCallback(() => {
    const selectedText = content.substring(selectionStart, selectionEnd);
    return operationRegistry.getAvailable(selectedText);
  }, [content, selectionStart, selectionEnd]);

  return {
    executeOperation,
    getAvailableOperations,
  };
}
