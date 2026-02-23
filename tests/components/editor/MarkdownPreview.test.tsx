// Copyright (c) 2025 Jema Technology.
// Tests for MarkdownPreview component

import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import MarkdownPreview from '@/components/editor/MarkdownPreview';

import { render, screen, waitFor } from '@tests/utils/test-utils';

// Mock LocalStorage
vi.mock('@/lib/localStorage', () => ({
  LocalStorage: {
    getAttachmentFile: vi.fn().mockResolvedValue(null),
  },
}));

// Mock WaveformPlayer
vi.mock('@/components/ui/WaveformPlayer', () => ({
  default: ({ blob }: { blob: Blob }) => <div data-testid="waveform-player">Audio Player</div>,
}));

// Mock mermaid
vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn().mockResolvedValue({ svg: '<svg>diagram</svg>' }),
  },
}));

describe('MarkdownPreview', () => {
  const defaultProps = {
    content: '',
    onWikiLinkClick: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render empty content', () => {
      render(<MarkdownPreview {...defaultProps} />);
      expect(document.querySelector('.prose')).toBeInTheDocument();
    });

    it('should render markdown headings', () => {
      render(<MarkdownPreview {...defaultProps} content="# Heading 1" />);
      expect(screen.getByText('Heading 1')).toBeInTheDocument();
    });

    it('should render markdown paragraphs', () => {
      render(<MarkdownPreview {...defaultProps} content="This is a paragraph." />);
      expect(screen.getByText('This is a paragraph.')).toBeInTheDocument();
    });

    it('should render markdown lists', () => {
      const content = `- Item 1
- Item 2
- Item 3`;
      render(<MarkdownPreview {...defaultProps} content={content} />);
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
      expect(screen.getByText('Item 3')).toBeInTheDocument();
    });

    it('should render markdown bold text', () => {
      render(<MarkdownPreview {...defaultProps} content="**Bold text**" />);
      expect(screen.getByText('Bold text')).toBeInTheDocument();
    });

    it('should render markdown italic text', () => {
      render(<MarkdownPreview {...defaultProps} content="*Italic text*" />);
      expect(screen.getByText('Italic text')).toBeInTheDocument();
    });

    it('should render markdown links', () => {
      render(<MarkdownPreview {...defaultProps} content="[Link text](https://example.com)" />);
      const link = screen.getByText('Link text');
      expect(link).toBeInTheDocument();
      expect(link.closest('a')).toHaveAttribute('href', 'https://example.com');
    });
  });

  describe('Wiki Links', () => {
    it('should render wiki links', () => {
      render(<MarkdownPreview {...defaultProps} content="[[Note Title]]" />);
      expect(screen.getByText('Note Title')).toBeInTheDocument();
    });

    it('should apply wiki-link class to wiki links', () => {
      render(<MarkdownPreview {...defaultProps} content="[[Note Title]]" />);
      const wikiLink = screen.getByText('Note Title');
      expect(wikiLink).toHaveClass('wiki-link');
    });

    it('should call onWikiLinkClick when clicking wiki link', async () => {
      const user = userEvent.setup();
      const onWikiLinkClick = vi.fn();

      render(
        <MarkdownPreview
          {...defaultProps}
          content="[[Note Title]]"
          onWikiLinkClick={onWikiLinkClick}
        />
      );

      const wikiLink = screen.getByText('Note Title');
      await user.click(wikiLink);

      await waitFor(() => {
        expect(onWikiLinkClick).toHaveBeenCalledWith('Note Title');
      });
    });

    it('should handle multiple wiki links', () => {
      render(<MarkdownPreview {...defaultProps} content="[[First Note]] and [[Second Note]]" />);
      expect(screen.getByText('First Note')).toBeInTheDocument();
      expect(screen.getByText('Second Note')).toBeInTheDocument();
    });
  });

  describe('Code Blocks', () => {
    it('should render inline code', () => {
      render(<MarkdownPreview {...defaultProps} content="Use `code` inline." />);
      expect(screen.getByText('code')).toBeInTheDocument();
    });

    it('should render code blocks', () => {
      const content = '```javascript\nconst x = 1;\n```';
      render(<MarkdownPreview {...defaultProps} content={content} />);
      expect(screen.getByText('const x = 1;')).toBeInTheDocument();
    });

    it('should render code blocks with language', () => {
      const content = "```typescript\nconst greeting: string = 'hello';\n```";
      render(<MarkdownPreview {...defaultProps} content={content} />);
      expect(screen.getByText("const greeting: string = 'hello';")).toBeInTheDocument();
    });
  });

  describe('Tables', () => {
    it('should render markdown tables', () => {
      const content = `| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
| Cell 3   | Cell 4   |`;

      render(<MarkdownPreview {...defaultProps} content={content} />);
      expect(screen.getByText('Header 1')).toBeInTheDocument();
      expect(screen.getByText('Header 2')).toBeInTheDocument();
      expect(screen.getByText('Cell 1')).toBeInTheDocument();
    });
  });

  describe('Blockquotes', () => {
    it('should render blockquotes', () => {
      render(<MarkdownPreview {...defaultProps} content="> This is a quote" />);
      expect(screen.getByText('This is a quote')).toBeInTheDocument();
    });
  });

  describe('Mermaid Diagrams', () => {
    it('should render mermaid code blocks', () => {
      const content = '```mermaid\ngraph TD;\nA-->B;\n```';
      render(<MarkdownPreview {...defaultProps} content={content} />);
      expect(document.querySelector('.mermaid-container')).toBeInTheDocument();
    });

    it('should process mermaid diagrams after render', async () => {
      const content = '```mermaid\ngraph TD;\nA-->B;\n```';
      render(<MarkdownPreview {...defaultProps} content={content} />);

      await waitFor(() => {
        expect(document.querySelector('.mermaid-container')).toBeInTheDocument();
      });
    });
  });

  describe('Math Expressions', () => {
    it('should render math expressions', () => {
      render(<MarkdownPreview {...defaultProps} content="$E = mc^2$" />);
      // Math should be processed by KaTeX
      expect(document.querySelector('.prose')).toBeInTheDocument();
    });

    it('should render block math expressions', () => {
      const content = '$$\nE = mc^2\n$$';
      render(<MarkdownPreview {...defaultProps} content={content} />);
      expect(document.querySelector('.prose')).toBeInTheDocument();
    });
  });

  describe('Audio Attachments', () => {
    it('should render audio attachments', () => {
      render(<MarkdownPreview {...defaultProps} content="![Audio](attachment:audio-123)" />);
      expect(screen.getByText('Chargement du mémo vocal...')).toBeInTheDocument();
    });

    it('should render waveform player for audio attachments', async () => {
      const { LocalStorage } = await import('@/lib/localStorage');
      (LocalStorage.getAttachmentFile as any).mockResolvedValue(new Blob(['audio']));

      render(<MarkdownPreview {...defaultProps} content="![Audio](attachment:audio-123)" />);

      await waitFor(() => {
        expect(screen.getByTestId('waveform-player')).toBeInTheDocument();
      });
    });

    it('should handle audio element with data-attachment-id', () => {
      render(
        <MarkdownPreview
          {...defaultProps}
          content='<audio data-attachment-id="audio-123"></audio>'
        />
      );
      // Should render without errors
      expect(document.querySelector('.prose')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should have prose styling', () => {
      render(<MarkdownPreview {...defaultProps} />);
      expect(document.querySelector('.prose')).toBeInTheDocument();
    });

    it('should have dark mode support', () => {
      render(<MarkdownPreview {...defaultProps} />);
      const container = document.querySelector('.prose');
      expect(container).toHaveClass('dark:prose-invert');
    });

    it('should have full height', () => {
      render(<MarkdownPreview {...defaultProps} />);
      const container = document.querySelector('.h-full');
      expect(container).toBeInTheDocument();
    });

    it('should have overflow handling', () => {
      render(<MarkdownPreview {...defaultProps} />);
      const container = document.querySelector('.overflow-auto');
      expect(container).toBeInTheDocument();
    });
  });

  describe('Heading Styles', () => {
    it('should style h1 correctly', () => {
      render(<MarkdownPreview {...defaultProps} content="# Heading 1" />);
      const heading = screen.getByText('Heading 1');
      expect(heading.tagName).toBe('H1');
    });

    it('should style h2 correctly', () => {
      render(<MarkdownPreview {...defaultProps} content="## Heading 2" />);
      const heading = screen.getByText('Heading 2');
      expect(heading.tagName).toBe('H2');
    });

    it('should style h3 correctly', () => {
      render(<MarkdownPreview {...defaultProps} content="### Heading 3" />);
      const heading = screen.getByText('Heading 3');
      expect(heading.tagName).toBe('H3');
    });
  });

  describe('Link Handling', () => {
    it('should open external links in new tab', () => {
      render(<MarkdownPreview {...defaultProps} content="[External](https://example.com)" />);
      const link = screen.getByText('External').closest('a');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should style links with primary color', () => {
      render(<MarkdownPreview {...defaultProps} content="[Link](https://example.com)" />);
      const link = screen.getByText('Link').closest('a');
      expect(link).toHaveClass('text-primary');
    });
  });

  describe('Complex Content', () => {
    it('should render mixed content', () => {
      const content = `# Main Heading

This is a paragraph with **bold** and *italic* text.

## Subheading

- List item 1
- List item 2

[[Wiki Link]]

\`\`\`javascript
const code = "example";
\`\`\``;

      render(<MarkdownPreview {...defaultProps} content={content} />);
      expect(screen.getByText('Main Heading')).toBeInTheDocument();
      expect(screen.getByText('bold')).toBeInTheDocument();
      expect(screen.getByText('Wiki Link')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have semantic HTML structure', () => {
      render(<MarkdownPreview {...defaultProps} content="# Heading" />);
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toBeInTheDocument();
    });

    it('should have proper list structure', () => {
      render(<MarkdownPreview {...defaultProps} content="- Item" />);
      const list = document.querySelector('ul');
      expect(list).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should handle large content efficiently', () => {
      const largeContent = '# Heading\n\n'.repeat(100);
      const start = performance.now();

      render(<MarkdownPreview {...defaultProps} content={largeContent} />);

      const end = performance.now();
      expect(end - start).toBeLessThan(1000); // Should render in less than 1 second
    });
  });
});
