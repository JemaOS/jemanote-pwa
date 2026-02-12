// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

/**
 * Extension CodeMirror pour menu contextuel IA
 * Gère le clic droit sur texte sélectionné pour ouvrir le menu IA
 */

import { EditorView } from '@codemirror/view'

interface AIContextMenuPosition {
  x: number
  y: number
  selectedText: string
}

export function aiContextMenuExtension(onShowMenu: (position: AIContextMenuPosition) => void) {
  return EditorView.domEventHandlers({
    contextmenu(event, view) {
      // Empêcher le menu contextuel par défaut
      event.preventDefault()

      // Récupérer le texte sélectionné
      const selection = view.state.selection.main
      const selectedText = view.state.sliceDoc(selection.from, selection.to)

      // N'afficher le menu que si du texte est sélectionné
      if (selectedText.trim().length > 0) {
        onShowMenu({
          x: event.clientX,
          y: event.clientY,
          selectedText,
        })
      }

      return true
    },
  })
}
