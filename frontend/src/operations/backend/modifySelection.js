import { textProcessingApi } from '../../api/textProcessing';
import { traceEvent } from '../../api/trace';

export const modifySelectionOperation = {
  id: 'modify',
  label: 'Modify',
  description: 'Modify selected text with an LLM instruction',
  icon: '✎',
  category: 'ai',
  isAsync: true,
  requiresBackend: true,
  requiresPrompt: true,
  promptLabel: 'How should this text be modified?',
  promptPlaceholder: 'e.g. make this markdown ready, add headings and bullets',
  submitLabel: 'Apply',
  handler: async (text, options = {}) => {
    const instruction = (options.instruction || '').trim();
    const before = options.before || '';
    const after = options.after || '';

    if (!instruction) {
      throw new Error('Modify instruction is required');
    }

    traceEvent('text.modify.request', {
      instruction_length: instruction.length,
      selection_length: text.length,
      before_length: before.length,
      after_length: after.length,
    });

    const result = await textProcessingApi.processText('modify', text, {
      instruction,
      before,
      after,
    });

    traceEvent('text.modify.response', {
      result_length: result?.processed_text?.length || 0,
    });

    return result.processed_text;
  },
  isAvailable: (text) => text.length > 0,
};
