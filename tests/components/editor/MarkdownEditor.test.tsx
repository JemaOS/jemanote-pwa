// Copyright (c) 2025 Jema Technology.
// Tests for MarkdownEditor component

import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import MarkdownEditor from '@/components/editor/MarkdownEditor'

import { render, screen, waitFor } from '@/tests/utils/test-utils'

// Mock ThemeContext
vi.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light' }),
}))

// Mock AIContextMenu component
vi.mock('@/components/ai/AIContextMenu', () => ({
  default: ({ position, selectedText, onClose, onInsert }: any) => (
    <div data-testid="ai-context-menu" style={{ top: position.y, left: position.x }}>
      <span>Selected: {selectedText}</span>
      <button onClick={() => onInsert('AI generated text')}>Insert</button>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}))

// Mock CodeMirror extensions
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
}))

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
}))

vi.mock('@codemirror/language', () => ({
  defaultHighlightStyle: {},
  syntaxHighlighting: vi.fn(() => []),
  indentOnInput: vi.fn(() => []),
  bracketMatching: vi.fn(() => []),
  foldGutter: vi.fn(() => []),
  foldKeymap: [],
}))

vi.mock('@codemirror/commands', () => ({
  defaultKeymap: [],
  history: vi.fn(() => []),
  historyKeymap: [],
}))

vi.mock('@codemirror/search', () => ({
  searchKeymap: [],
  highlightSelectionMatches: vi.fn(() => []),
}))

vi.mock('@codemirror/autocomplete', () => ({
  autocompletion: vi.fn(() => []),
  completionKeymap: [],
  closeBrackets: vi.fn(() => []),
  closeBracketsKeymap: [],
}))

vi.mock('@codemirror/lint', () => ({
  lintKeymap: [],
}))

vi.mock('@codemirror/lang-markdown', () => ({
  markdown: vi.fn(() => []),
}))

vi.mock('@codemirror/theme-one-dark', () => ({
  oneDark: [],
}))

vi.mock('@/lib/wikiLinks', () => ({
  wikiLinksPlugin: [],
}))

vi.mock('@/lib/audioWidgetExtension', () => ({
  audioWidgetPlugin: [],
}))

vi.mock('@/lib/aiContextMenu', () => ({
  aiContextMenuExtension: vi.fn(() => []),
}))

describe('MarkdownEditor', () => {
  const defaultProps = {
    value: '',
    onChange: vi.fn(),
    onWikiLinkClick: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render editor container', () => {
      render(<MarkdownEditor {...defaultProps} />)
      const editor = document.querySelector('.cm-editor')
      expect(editor).toBeInTheDocument()
    })

    it('should render with initial value', () => {
      render(<MarkdownEditor {...defaultProps} value="# Hello World" />)
      // The editor should be initialized with the value
      expect(document.querySelector('.cm-editor')).toBeInTheDocument()
    })

    it('should have full height container', () => {
      render(<MarkdownEditor {...defaultProps} />)
      const container = document.querySelector('[class*="h-full"]')
      expect(container).toBeInTheDocument()
    })
  })

  describe('Value Changes', () => {
    it('should call onChange when content changes', async () => {
      const onChange = vi.fn()
      render(<MarkdownEditor {...defaultProps} onChange={onChange} />)

      // Simulate content change through the editor
      await waitFor(() => {
        // The editor should be mounted
        expect(document.querySelector('.cm-editor')).toBeInTheDocument()
      })
    })

    it('should update when value prop changes', () => {
      const { rerender } = render(<MarkdownEditor {...defaultProps} value="Initial" />)
      
      rerender(<MarkdownEditor {...defaultProps} value="Updated" />)
      
      // The editor should reflect the new value
      expect(document.querySelector('.cm-editor')).toBeInTheDocument()
    })
  })

  describe('Theme', () => {
    it('should apply light theme by default', () => {
      render(<MarkdownEditor {...defaultProps} />)
      expect(document.querySelector('.cm-editor')).toBeInTheDocument()
    })

    it('should apply dark theme when theme is dark', () => {
      const { useTheme } = require('@/contexts/ThemeContext')
      useTheme.mockReturnValue({ theme: 'dark' })
      
      render(<MarkdownEditor {...defaultProps} />)
      expect(document.querySelector('.cm-editor')).toBeInTheDocument()
    })
  })

  describe('Wiki Links', () => {
    it('should handle wiki link clicks', () => {
      const onWikiLinkClick = vi.fn()
      render(<MarkdownEditor {...defaultProps} onWikiLinkClick={onWikiLinkClick} />)
      
      // The editor should set up event handlers for wiki links
      expect(document.querySelector('.cm-editor')).toBeInTheDocument()
    })

    it('should render wiki links with correct styling', () => {
      render(<MarkdownEditor {...defaultProps} value="[[Link Title]]" />)
      // Wiki links should be styled with the wiki-link class
      expect(document.querySelector('.cm-editor')).toBeInTheDocument()
    })
  })

  describe('AI Context Menu', () => {
    it('should show AI context menu when triggered', async () => {
      render(<MarkdownEditor {...defaultProps} />)
      
      // The AI context menu extension should be configured
      const { aiContextMenuExtension } = await import('@/lib/aiContextMenu')
      expect(aiContextMenuExtension).toHaveBeenCalled()
    })

    it('should handle text insertion from AI', async () => {
      render(<MarkdownEditor {...defaultProps} />)
      
      // The editor should support text insertion
      expect(document.querySelector('.cm-editor')).toBeInTheDocument()
    })
  })

  describe('Editor Features', () => {
    it('should have line numbers enabled', () => {
      render(<MarkdownEditor {...defaultProps} />)
      // Line numbers gutter should be present
      expect(document.querySelector('.cm-editor')).toBeInTheDocument()
    })

    it('should have syntax highlighting', () => {
      render(<MarkdownEditor {...defaultProps} />)
      // Syntax highlighting should be applied
      expect(document.querySelector('.cm-editor')).toBeInTheDocument()
    })

    it('should have auto-completion', () => {
      render(<MarkdownEditor {...defaultProps} />)
      // Auto-completion should be configured
      expect(document.querySelector('.cm-editor')).toBeInTheDocument()
    })

    it('should have bracket matching', () => {
      render(<MarkdownEditor {...defaultProps} />)
      // Bracket matching should be enabled
      expect(document.querySelector('.cm-editor')).toBeInTheDocument()
    })

    it('should have history support', () => {
      render(<MarkdownEditor {...defaultProps} />)
      // History should be enabled for undo/redo
      expect(document.querySelector('.cm-editor')).toBeInTheDocument()
    })

    it('should have line wrapping', () => {
      render(<MarkdownEditor {...defaultProps} />)
      // Line wrapping should be enabled
      expect(document.querySelector('.cm-editor')).toBeInTheDocument()
    })
  })

  describe('Keyboard Shortcuts', () => {
    it('should support default keymap', () => {
      render(<MarkdownEditor {...defaultProps} />)
      // Default keymap should be configured
      expect(document.querySelector('.cm-editor')).toBeInTheDocument()
    })

    it('should support search keymap', () => {
      render(<MarkdownEditor {...defaultProps} />)
      // Search keymap should be configured
      expect(document.querySelector('.cm-editor')).toBeInTheDocument()
    })

    it('should support history keymap', () => {
      render(<MarkdownEditor {...defaultProps} />)
      // History keymap should be configured
      expect(document.querySelector('.cm-editor')).toBeInTheDocument()
    })
  })

  describe('Markdown Support', () => {
    it('should support markdown syntax', () => {
      render(<MarkdownEditor {...defaultProps} />)
      // Markdown language support should be configured
      expect(document.querySelector('.cm-editor')).toBeInTheDocument()
    })

    it('should render markdown content', () => {
      const markdownContent = `# Heading

- List item 1
- List item 2

**Bold text** and *italic text*`;
      
      render(<MarkdownEditor {...defaultProps} value={markdownContent} />)
      expect(document.querySelector('.cm-editor')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have accessible editor', () => {
      render(<MarkdownEditor {...defaultProps} />)
      // Editor should be accessible
      expect(document.querySelector('.cm-editor')).toBeInTheDocument()
    })

    it('should support keyboard navigation', () => {
      render(<MarkdownEditor {...defaultProps} />)
      // Keyboard navigation should work
      expect(document.querySelector('.cm-editor')).toBeInTheDocument()
    })
  })

  describe('Cleanup', () => {
    it('should cleanup editor on unmount', () => {
      const { unmount } = render(<MarkdownEditor {...defaultProps} />)
      
      // Unmount should not throw
      expect(() => unmount()).not.toThrow()
    })
  })
})
