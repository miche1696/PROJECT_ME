/**
 * Operation Registry - manages text operations that can be applied to selections
 */

class OperationRegistry {
  constructor() {
    this.operations = new Map();
  }

  /**
   * Register a new operation
   * @param {Object} operation - Operation definition
   * @param {string} operation.id - Unique identifier
   * @param {string} operation.label - Display name
   * @param {string} operation.description - Help text
   * @param {string} operation.icon - Icon identifier or character
   * @param {string} operation.category - Category: 'format' | 'transform' | 'ai'
   * @param {boolean} operation.isAsync - Whether handler is async
   * @param {boolean} operation.requiresBackend - Whether backend API is needed
   * @param {string|null} operation.keyboardShortcut - Optional keyboard shortcut
   * @param {Function} operation.handler - The operation function (text, options) => result
   * @param {Function} [operation.isAvailable] - Optional filter (text) => boolean
   */
  register(operation) {
    if (!operation.id) {
      console.error('Operation must have an id');
      return this;
    }

    if (this.operations.has(operation.id)) {
      console.warn(`Operation ${operation.id} already registered, overwriting`);
    }

    // Set defaults
    const normalizedOperation = {
      isAsync: false,
      requiresBackend: false,
      keyboardShortcut: null,
      isAvailable: () => true,
      ...operation,
    };

    this.operations.set(operation.id, normalizedOperation);
    return this;
  }

  /**
   * Get operation by ID
   * @param {string} id
   * @returns {Object|undefined}
   */
  get(id) {
    return this.operations.get(id);
  }

  /**
   * Get all registered operations
   * @returns {Object[]}
   */
  getAll() {
    return Array.from(this.operations.values());
  }

  /**
   * Get operations filtered by category
   * @param {string} category
   * @returns {Object[]}
   */
  getByCategory(category) {
    return this.getAll().filter((op) => op.category === category);
  }

  /**
   * Get operations that are available for the given selected text
   * @param {string} selectedText
   * @returns {Object[]}
   */
  getAvailable(selectedText) {
    return this.getAll().filter((op) => {
      try {
        return op.isAvailable(selectedText);
      } catch (e) {
        console.error(`Error checking availability for ${op.id}:`, e);
        return false;
      }
    });
  }

  /**
   * Get unique categories from registered operations
   * @returns {string[]}
   */
  getCategories() {
    const categories = new Set();
    this.getAll().forEach((op) => categories.add(op.category));
    return Array.from(categories);
  }
}

// Singleton instance
export const operationRegistry = new OperationRegistry();
