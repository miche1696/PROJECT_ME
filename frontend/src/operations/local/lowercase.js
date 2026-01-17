export const lowercaseOperation = {
  id: 'lowercase',
  label: 'lowercase',
  description: 'Convert selected text to lowercase',
  icon: 'a',
  category: 'format',
  isAsync: false,
  requiresBackend: false,
  keyboardShortcut: null,
  handler: (text) => {
    return text.toLowerCase();
  },
  isAvailable: (text) => text.length > 0,
};
