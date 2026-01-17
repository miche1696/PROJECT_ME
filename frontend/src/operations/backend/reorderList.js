import { textProcessingApi } from '../../api/textProcessing';

export const reorderListOperation = {
  id: 'reorder-list',
  label: 'Sort',
  description: 'Sort list items alphabetically',
  icon: '↕',
  category: 'transform',
  isAsync: true,
  requiresBackend: true,
  keyboardShortcut: null,
  handler: async (text, options = {}) => {
    const result = await textProcessingApi.processText('reorder-list', text, {
      order: options.order || 'asc',
    });
    return result.processed_text;
  },
  // Available if text contains multiple lines (likely a list)
  isAvailable: (text) => text.includes('\n') && text.split('\n').length >= 2,
};
