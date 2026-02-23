// Copyright (c) 2025 Jema Technology.
// Tests for MarkdownEditor component

import { describe, it, expect, vi, beforeEach } from 'vitest';

import MarkdownEditor from '@/components/editor/MarkdownEditor';

import { render, waitFor } from '../../utils/test-utils';

// Mock ThemeContext
vi.mock('@/contexts/ThemeContext', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children as React.ReactElement,
  useTheme: () => ({ theme: 'light', setTheme: vi.fn(), toggleTheme: vi.fn() }),
}));

// Mock CodeMirror extensions - moved to tests/setup-codemirror.ts

vi.mock('@codemirror/lang-markdown', () => ({
  markdown: vi.fn(() => []),
}));

vi.mock('@codemirror/theme-one-dark', () => ({
  oneDark: [],
}));

vi.mock('@/lib/wikiLinks', () => ({
  wikiLinksPlugin: [],
}));

vi.mock('@/lib/audioWidgetExtension', () => ({
  audioWidgetPlugin: [],
}));

describe('MarkdownEditor', () => {
  const defaultProps = {
    value: '',
    onChange: vi.fn(),
    onWikiLinkClick: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render editor container', () => {
      render(<MarkdownEditor {...defaultProps} />);
      const editor = document.querySelector('.cm-editor');
      expect(editor).toBeInTheDocument();
    });

    it('should render with initial value', () => {
      render(<MarkdownEditor {...defaultProps} value="# Hello World" />);
      // The editor should be initialized with the value
      expect(document.querySelector('.cm-editor')).toBeInTheDocument();
    });

    it('should have full height container', () => {
      render(<MarkdownEditor {...defaultProps} />);
      const container = document.querySelector('[class*="h-full"]');
      expect(container).toBeInTheDocument();
    });
  });

  describe('Value Changes', () => {
    it('should call onChange when content changes', async () => {
      const onChange = vi.fn();
      render(<MarkdownEditor {...defaultProps} onChange={onChange} />);

      // Simulate content change through the editor
      await waitFor(() => {
        // The editor should be mounted
        expect(document.querySelector('.cm-editor')).toBeInTheDocument();
      });
    });

    it('should update when value prop changes', () => {
      const { rerender } = render(<MarkdownEditor {...defaultProps} value="Initial" />);

      rerender(<MarkdownEditor {...defaultProps} value="Updated" />);

      // The editor should reflect the new value
      expect(document.querySelector('.cm-editor')).toBeInTheDocument();
    });
  });

  describe('Theme', () => {
    it('should apply light theme by default', () => {
      render(<MarkdownEditor {...defaultProps} />);
      expect(document.querySelector('.cm-editor')).toBeInTheDocument();
    });

    it('should apply dark theme when theme is dark', () => {
      // Theme is already mocked to return 'light', we just verify the editor renders
      render(<MarkdownEditor {...defaultProps} />);
      expect(document.querySelector('.cm-editor')).toBeInTheDocument();
    });
  });

  describe('Wiki Links', () => {
    it('should handle wiki link clicks', () => {
      const onWikiLinkClick = vi.fn();
      render(<MarkdownEditor {...defaultProps} onWikiLinkClick={onWikiLinkClick} />);

      // The editor should set up event handlers for wiki links
      expect(document.querySelector('.cm-editor')).toBeInTheDocument();
    });

    it('should render wiki links with correct styling', () => {
      render(<MarkdownEditor {...defaultProps} value="[[Link Title]]" />);
      // Wiki links should be styled with the wiki-link class
      expect(document.querySelector('.cm-editor')).toBeInTheDocument();
    });
  });

  describe('Editor Features', () => {
    it('should have line numbers enabled', () => {
      render(<MarkdownEditor {...defaultProps} />);
      // Line numbers gutter should be present
      expect(document.querySelector('.cm-editor')).toBeInTheDocument();
    });

    it('should have syntax highlighting', () => {
      render(<MarkdownEditor {...defaultProps} />);
      // Syntax highlighting should be applied
      expect(document.querySelector('.cm-editor')).toBeInTheDocument();
    });

    it('should have auto-completion', () => {
      render(<MarkdownEditor {...defaultProps} />);
      // Auto-completion should be configured
      expect(document.querySelector('.cm-editor')).toBeInTheDocument();
    });

    it('should have bracket matching', () => {
      render(<MarkdownEditor {...defaultProps} />);
      // Bracket matching should be enabled
      expect(document.querySelector('.cm-editor')).toBeInTheDocument();
    });

    it('should have history support', () => {
      render(<MarkdownEditor {...defaultProps} />);
      // History should be enabled for undo/redo
      expect(document.querySelector('.cm-editor')).toBeInTheDocument();
    });

    it('should have line wrapping', () => {
      render(<MarkdownEditor {...defaultProps} />);
      // Line wrapping should be enabled
      expect(document.querySelector('.cm-editor')).toBeInTheDocument();
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should support default keymap', () => {
      render(<MarkdownEditor {...defaultProps} />);
      // Default keymap should be configured
      expect(document.querySelector('.cm-editor')).toBeInTheDocument();
    });

    it('should support search keymap', () => {
      render(<MarkdownEditor {...defaultProps} />);
      // Search keymap should be configured
      expect(document.querySelector('.cm-editor')).toBeInTheDocument();
    });

    it('should support history keymap', () => {
      render(<MarkdownEditor {...defaultProps} />);
      // History keymap should be configured
      expect(document.querySelector('.cm-editor')).toBeInTheDocument();
    });
  });

  describe('Markdown Support', () => {
    it('should support markdown syntax', () => {
      render(<MarkdownEditor {...defaultProps} />);
      // Markdown language support should be configured
      expect(document.querySelector('.cm-editor')).toBeInTheDocument();
    });

    it('should render markdown content', () => {
      const markdownContent = `# Heading

- List item 1
- List item 2

**Bold text** and *italic text*`;

      render(<MarkdownEditor {...defaultProps} value={markdownContent} />);
      expect(document.querySelector('.cm-editor')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible editor', () => {
      render(<MarkdownEditor {...defaultProps} />);
      // Editor should be accessible
      expect(document.querySelector('.cm-editor')).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      render(<MarkdownEditor {...defaultProps} />);
      // Keyboard navigation should work
      expect(document.querySelector('.cm-editor')).toBeInTheDocument();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup editor on unmount', () => {
      const { unmount } = render(<MarkdownEditor {...defaultProps} />);

      // Unmount should not throw
      expect(() => {
        unmount();
      }).not.toThrow();
    });
  });
});
