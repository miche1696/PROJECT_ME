export const trimWhitespaceOperation = {
  id: 'trim-whitespace',
  label: 'Trim',
  description: 'Remove extra whitespace (leading, trailing, and collapse multiple spaces)',
  icon: '[ ]',
  category: 'format',
  isAsync: false,
  requiresBackend: false,
  keyboardShortcut: null,
  handler: (text) => {
    // Trim leading/trailing whitespace and collapse multiple spaces to single space
    return text
      .split('\n')
      .map((line) => line.trim().replace(/\s+/g, ' '))
      .join('\n')
      .replace(/\n{3,}/g, '\n\n'); // Collapse multiple blank lines to max 2
  },
  isAvailable: (text) => text.length > 0,
};
