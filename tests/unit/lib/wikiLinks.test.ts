// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

import { describe, it, expect, vi } from 'vitest'

import { extractWikiLinks, renderWikiLinksToHTML } from '@/lib/wikiLinks'

// Mock CodeMirror modules
vi.mock('@codemirror/view', () => ({
  Decoration: {
    mark: vi.fn().mockReturnValue({}),
  },
  DecorationSet: {},
  EditorView: {},
  ViewPlugin: {
    fromClass: vi.fn().mockReturnValue({}),
  },
}))

vi.mock('@codemirror/state', () => ({
  RangeSetBuilder: vi.fn().mockImplementation(() => ({
    add: vi.fn(),
    finish: vi.fn().mockReturnValue([]),
  })),
}))

describe('wikiLinks', () => {
  describe('extractWikiLinks', () => {
    it('should extract simple wiki links', () => {
      const content = 'This is a note with [[Link Target]] in it.'
      const result = extractWikiLinks(content)
      
      expect(result).toEqual(['Link Target'])
    })

    it('should extract multiple wiki links', () => {
      const content = 'See [[First Link]] and [[Second Link]] for more info.'
      const result = extractWikiLinks(content)
      
      expect(result).toEqual(['First Link', 'Second Link'])
    })

    it('should return empty array when no wiki links exist', () => {
      const content = 'This is just plain text without any links.'
      const result = extractWikiLinks(content)
      
      expect(result).toEqual([])
    })

    it('should handle wiki links with special characters', () => {
      const content = '[[Link with spaces]] and [[Link-with-dashes]] and [[Link_with_underscores]]'
      const result = extractWikiLinks(content)
      
      expect(result).toEqual([
        'Link with spaces',
        'Link-with-dashes',
        'Link_with_underscores',
      ])
    })

    it('should handle wiki links with numbers', () => {
      const content = '[[Note 1]] [[Note 2]] [[2024-01-15 Daily Note]]'
      const result = extractWikiLinks(content)
      
      expect(result).toEqual(['Note 1', 'Note 2', '2024-01-15 Daily Note'])
    })

    it('should not extract malformed wiki links', () => {
      const content = '[Single bracket] [[Unclosed link] [[Another unclosed'
      const result = extractWikiLinks(content)
      
      expect(result).toEqual([])
    })

    it('should handle empty wiki links', () => {
      const content = '[[ ]] [[Valid Link]] [[]]'
      const result = extractWikiLinks(content)
      
      // The regex extracts content between brackets, empty brackets result in empty string
      expect(result).toEqual([' ', 'Valid Link'])
    })

    it('should handle wiki links with unicode characters', () => {
      const content = '[[Note avec accents éèà]] [[日本語ノート]] [[Заметка]]'
      const result = extractWikiLinks(content)
      
      expect(result).toEqual([
        'Note avec accents éèà',
        '日本語ノート',
        'Заметка',
      ])
    })

    it('should extract wiki links from multiline content', () => {
      const content = `First line with [[Link 1]]
      Second line with [[Link 2]]
      Third line with [[Link 3]]`
      const result = extractWikiLinks(content)
      
      expect(result).toEqual(['Link 1', 'Link 2', 'Link 3'])
    })

    it('should handle wiki links with aliases', () => {
      const content = '[[Target Note|Display Text]] [[Another Note|Another Display]]'
      const result = extractWikiLinks(content)
      
      // Should extract the full content including alias
      expect(result).toEqual(['Target Note|Display Text', 'Another Note|Another Display'])
    })

    it('should handle wiki links with headings', () => {
      const content = '[[Note Title#Heading]] [[Another Note#Sub Heading]]'
      const result = extractWikiLinks(content)
      
      expect(result).toEqual(['Note Title#Heading', 'Another Note#Sub Heading'])
    })

    it('should handle nested brackets correctly', () => {
      const content = '[[Note with [brackets]]] [[Normal Note]]'
      const result = extractWikiLinks(content)
      
      // Should stop at first closing brackets
      expect(result).toContain('Normal Note')
    })

    it('should handle large number of wiki links', () => {
      const links = Array.from({ length: 100 }, (_, i) => `[[Link ${i}]]`)
      const content = links.join(' ')
      const result = extractWikiLinks(content)
      
      expect(result).toHaveLength(100)
      expect(result[0]).toBe('Link 0')
      expect(result[99]).toBe('Link 99')
    })
  })

  describe('renderWikiLinksToHTML', () => {
    it('should convert wiki links to HTML anchor tags', () => {
      const content = 'See [[Target Note]] for more info.'
      const result = renderWikiLinksToHTML(content)
      
      expect(result).toContain('<a href="#"')
      expect(result).toContain('class="wiki-link"')
      expect(result).toContain('data-note-title="Target Note"')
      expect(result).toContain('>Target Note</a>')
    })

    it('should convert multiple wiki links', () => {
      const content = '[[First]] and [[Second]] and [[Third]]'
      const result = renderWikiLinksToHTML(content)
      
      expect(result.match(/<a href/g)).toHaveLength(3)
    })

    it('should preserve non-link text', () => {
      const content = 'Start [[Link]] End'
      const result = renderWikiLinksToHTML(content)
      
      expect(result).toContain('Start')
      expect(result).toContain('End')
      expect(result).toContain('Link')
    })

    it('should handle content without wiki links', () => {
      const content = 'Plain text without links.'
      const result = renderWikiLinksToHTML(content)
      
      expect(result).toBe(content)
    })

    it('should escape quotes in link text', () => {
      const content = '[[Note with "quotes"]]'
      const result = renderWikiLinksToHTML(content)
      
      // Quotes are escaped as &quot; in the HTML attribute
      expect(result).toContain('data-note-title="Note with &quot;quotes&quot;"')
    })

    it('should apply correct styling to links', () => {
      const content = '[[Styled Link]]'
      const result = renderWikiLinksToHTML(content)
      
      expect(result).toContain('color: #5a63e9')
      expect(result).toContain('text-decoration: underline')
      expect(result).toContain('font-weight: 500')
    })

    it('should handle wiki links with aliases in HTML rendering', () => {
      const content = '[[Target|Display]]'
      const result = renderWikiLinksToHTML(content)
      
      expect(result).toContain('data-note-title="Target|Display"')
      expect(result).toContain('>Target|Display</a>')
    })

    it('should handle empty content', () => {
      const content = ''
      const result = renderWikiLinksToHTML(content)
      
      expect(result).toBe('')
    })

    it('should handle multiline content with wiki links', () => {
      const content = `Line 1 [[Link 1]]
      Line 2 [[Link 2]]
      Line 3`
      const result = renderWikiLinksToHTML(content)
      
      expect(result).toContain('Link 1')
      expect(result).toContain('Link 2')
      expect(result).toContain('Line 1')
      expect(result).toContain('Line 2')
      expect(result).toContain('Line 3')
    })

    it('should not convert regular markdown links', () => {
      const content = '[Regular link](http://example.com) and [[Wiki Link]]'
      const result = renderWikiLinksToHTML(content)
      
      // Regular markdown link should remain unchanged
      expect(result).toContain('[Regular link](http://example.com)')
      // Wiki link should be converted
      expect(result).toContain('<a href="#"')
      expect(result).toContain('>Wiki Link</a>')
    })

    it('should handle special HTML characters in link text', () => {
      const content = '[[Note with <script>alert("xss")</script>]]'
      const result = renderWikiLinksToHTML(content)
      
      // The link text in the anchor should be preserved
      expect(result).toContain('>Note with <script>alert("xss")</script></a>')
    })
  })

  describe('edge cases', () => {
    it('should handle consecutive wiki links without spaces', () => {
      const content = '[[Link1]][[Link2]][[Link3]]'
      const result = extractWikiLinks(content)
      
      expect(result).toEqual(['Link1', 'Link2', 'Link3'])
    })

    it('should handle wiki links at start and end of content', () => {
      const content = '[[Start]] middle text [[End]]'
      const result = extractWikiLinks(content)
      
      expect(result).toEqual(['Start', 'End'])
    })

    it('should handle deeply nested content', () => {
      const content = '[[Level 1 [[Level 2]]]]'
      const result = extractWikiLinks(content)
      
      // Should extract up to first closing brackets
      expect(result.length).toBeGreaterThan(0)
    })

    it('should handle wiki links with pipe characters', () => {
      const content = '[[A|B|C]] [[Simple|Alias]]'
      const result = extractWikiLinks(content)
      
      expect(result).toEqual(['A|B|C', 'Simple|Alias'])
    })

    it('should handle very long link text', () => {
      const longText = 'A'.repeat(1000)
      const content = `[[${longText}]]`
      const result = extractWikiLinks(content)
      
      expect(result).toEqual([longText])
    })

    it('should handle wiki links with only whitespace', () => {
      const content = '[[   ]] [[\t\n]]'
      const result = extractWikiLinks(content)
      
      expect(result).toEqual(['   ', '\t\n'])
    })
  })
})
