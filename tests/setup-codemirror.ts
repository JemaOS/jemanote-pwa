import { vi } from 'vitest';

vi.mock('@codemirror/view', () => ({
  EditorView: {
    theme: vi.fn(() => []),
    updateListener: vi.fn(() => []),
    domEventHandlers: vi.fn(() => []),
    lineWrapping: [],
  },
  keymap: vi.fn(() => []),
  highlightSpecialChars: vi.fn(() => []),
  drawSelection: vi.fn(() => []),
  highlightActiveLine: vi.fn(() => []),
  dropCursor: vi.fn(() => []),
  rectangularSelection: vi.fn(() => []),
  crosshairCursor: vi.fn(() => []),
  lineNumbers: vi.fn(() => []),
  highlightActiveLineGutter: vi.fn(() => []),
  Compartment: vi.fn(() => ({
    of: vi.fn(() => []),
    reconfigure: vi.fn(() => []),
  })),
}));

vi.mock('@codemirror/state', () => ({
  EditorState: {
    create: vi.fn(() => ({
      doc: { toString: () => '' },
      selection: { main: { from: 0, to: 0 } },
    })),
  },
  Compartment: vi.fn(() => ({
    of: vi.fn(() => []),
    reconfigure: vi.fn(() => []),
  })),
}));

vi.mock('@codemirror/language', () => ({
  defaultHighlightStyle: {},
  syntaxHighlighting: vi.fn(() => []),
  indentOnInput: vi.fn(() => []),
  bracketMatching: vi.fn(() => []),
  foldGutter: vi.fn(() => []),
  foldKeymap: [],
}));

vi.mock('@codemirror/commands', () => ({
  defaultKeymap: [],
  history: vi.fn(() => []),
  historyKeymap: [],
}));

vi.mock('@codemirror/search', () => ({
  searchKeymap: [],
  highlightSelectionMatches: vi.fn(() => []),
}));

vi.mock('@codemirror/autocomplete', () => ({
  autocompletion: vi.fn(() => []),
  completionKeymap: [],
  closeCompletion: vi.fn(),
  startCompletion: vi.fn(),
  closeBrackets: vi.fn(() => []),
  closeBracketsKeymap: [],
}));

vi.mock('@codemirror/lint', () => ({
  lintKeymap: [],
  linter: vi.fn(() => []),
}));
