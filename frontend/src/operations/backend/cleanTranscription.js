import { textProcessingApi } from '../../api/textProcessing';

export const cleanTranscriptionOperation = {
  id: 'clean-transcription',
  label: 'Clean',
  description: 'Clean up transcribed text (remove filler words, fix punctuation)',
  icon: '✨',
  category: 'ai',
  isAsync: true,
  requiresBackend: true,
  keyboardShortcut: null,
  handler: async (text) => {
    const result = await textProcessingApi.processText('clean-transcription', text);
    return result.processed_text;
  },
  isAvailable: (text) => text.length >= 10, // Minimum length for meaningful cleanup
};
