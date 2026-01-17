export const uppercaseOperation = {
  id: 'uppercase',
  label: 'UPPERCASE',
  description: 'Convert selected text to uppercase',
  icon: 'A',
  category: 'format',
  isAsync: false,
  requiresBackend: false,
  keyboardShortcut: null,
  handler: (text) => {
    return text.toUpperCase();
  },
  isAvailable: (text) => text.length > 0,
};
