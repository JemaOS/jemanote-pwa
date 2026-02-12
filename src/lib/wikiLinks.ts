// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

import { RangeSetBuilder } from '@codemirror/state'
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view'

// Parse wiki links in the document and add decorations
function parseWikiLinks(view: EditorView) {
  const builder = new RangeSetBuilder<Decoration>()
  const regex = /\[\[([^\]]+)\]\]/g
  
  for (const { from, to } of view.visibleRanges) {
    const text = view.state.doc.sliceString(from, to)
    let match: RegExpExecArray | null
    
    while ((match = regex.exec(text)) !== null) {
      const start = from + match.index
      const end = start + match[0].length
      
      // Add mark decoration (styling only, no replacement)
      builder.add(
        start,
        end,
        Decoration.mark({
          class: 'wiki-link',
          attributes: {
            'data-note-title': match[1],
          },
        })
      )
    }
  }
  
  return builder.finish()
}

// CodeMirror plugin for wiki links
export const wikiLinksPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = parseWikiLinks(view)
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = parseWikiLinks(update.view)
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  }
)

// Utility to extract wiki links from markdown content
export function extractWikiLinks(content: string): string[] {
  const regex = /\[\[([^\]]+)\]\]/g
  const links: string[] = []
  let match: RegExpExecArray | null
  
  while ((match = regex.exec(content)) !== null) {
    links.push(match[1])
  }
  
  return links
}

// Convert wiki links to HTML for preview
export function renderWikiLinksToHTML(content: string, onLinkClick?: (title: string) => void): string {
  return content.replace(/\[\[([^\]]+)\]\]/g, (match, linkText) => {
    const escapedText = linkText.replace(/"/g, '&quot;')
    return `<a href="#" class="wiki-link" data-note-title="${escapedText}" style="color: #5a63e9; text-decoration: underline; font-weight: 500;">${linkText}</a>`
  })
}
