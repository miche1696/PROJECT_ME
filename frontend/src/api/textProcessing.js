import apiClient from './client';

/**
 * API client for text processing operations
 */
export const textProcessingApi = {
  /**
   * Process text with specified operation
   * @param {string} operation - Operation ID (e.g., 'clean-transcription')
   * @param {string} text - Text to process
   * @param {Object} options - Optional operation-specific parameters
   * @returns {Promise<{processed_text: string, operation: string, original_length: number, result_length: number}>}
   */
  processText: async (operation, text, options = {}) => {
    const response = await apiClient.post('/text/process', {
      operation,
      text,
      options,
    });
    return response.data;
  },

  /**
   * Convenience method: Clean transcription text
   * @param {string} text - Raw transcription to clean
   * @returns {Promise<{processed_text: string, ...}>}
   */
  cleanTranscription: async (text) => {
    return textProcessingApi.processText('clean-transcription', text);
  },

  /**
   * Convenience method: Reorder list items
   * @param {string} text - List text to reorder
   * @param {'asc'|'desc'|'reverse'} order - Sort order
   * @returns {Promise<{processed_text: string, ...}>}
   */
  reorderList: async (text, order = 'asc') => {
    return textProcessingApi.processText('reorder-list', text, { order });
  },

  /**
   * Get list of available operations from backend
   * @returns {Promise<{operations: string[]}>}
   */
  getAvailableOperations: async () => {
    const response = await apiClient.get('/text/operations');
    return response.data;
  },

  /**
   * Get detailed info about available operations
   * @returns {Promise<{operations: Array<{id: string, requires_llm: boolean, available: boolean}>}>}
   */
  getOperationsInfo: async () => {
    const response = await apiClient.get('/text/operations/info');
    return response.data;
  },
};
