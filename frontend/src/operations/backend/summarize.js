import { textProcessingApi } from '../../api/textProcessing';

export const summarizeOperation = {
  id: 'summarize',
  label: 'Summarize',
  description: 'Summarize the selected text (requires LLM integration)',
  icon: '📝',
  category: 'ai',
  isAsync: true,
  requiresBackend: true,
  keyboardShortcut: null,
  handler: async (text) => {
    const result = await textProcessingApi.processText('summarize', text);
    return result.processed_text;
  },
  // Disabled until LLM is configured - will show in UI but not be clickable
  isAvailable: () => false,
};
