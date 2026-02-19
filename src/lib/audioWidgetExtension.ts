// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

import { RangeSetBuilder } from '@codemirror/state';
import {
  EditorView,
  WidgetType,
  Decoration,
  ViewPlugin,
  ViewUpdate,
  DecorationSet,
} from '@codemirror/view';
import React from 'react';
import { createRoot, Root } from 'react-dom/client';

import WaveformPlayer from '@/components/ui/WaveformPlayer';
import { LocalStorage } from '@/lib/localStorage';

interface AudioWidgetDOM extends HTMLElement {
  _reactRoot?: Root;
}

class AudioWidget extends WidgetType {
  constructor(readonly attachmentId: string) {
    super();
  }

  toDOM(view: EditorView): HTMLElement {
    const container = document.createElement('div') as AudioWidgetDOM;
    container.className = 'cm-audio-widget';
    container.style.display = 'block';
    container.style.margin = '0.5rem 0';
    container.style.minHeight = '50px'; // Éviter le saut de page au chargement
    container.style.userSelect = 'none';
    container.contentEditable = 'false';

    // Load audio async
    LocalStorage.getAttachmentFile(this.attachmentId)
      .then(blob => {
        if (blob) {
          const root = createRoot(container);
          container._reactRoot = root;
          root.render(React.createElement(WaveformPlayer, { blob }));
        } else {
          container.textContent = 'Audio introuvable';
          container.style.color = '#ef4444';
          container.style.fontSize = '0.875rem';
        }
      })
      .catch(err => {
        console.error(err);
        container.textContent = 'Erreur chargement';
        container.style.color = '#ef4444';
      });

    return container;
  }

  override destroy(dom: HTMLElement) {
    const container = dom as AudioWidgetDOM;
    if (container._reactRoot) {
      container._reactRoot.unmount();
    }
  }

  override eq(other: AudioWidget) {
    return other.attachmentId === this.attachmentId;
  }

  override ignoreEvent() {
    return true;
  }
}

function audioWidgets(view: EditorView) {
  const builder = new RangeSetBuilder<Decoration>();

  for (const { from, to } of view.visibleRanges) {
    const text = view.state.doc.sliceString(from, to);
    // Regex plus permissive pour les espaces
    const regex = /!\[([^\]]*)\]\s*\(\s*attachment:([a-f0-9-]+)\s*\)/g; // NOSONAR
    let match;

    while ((match = regex.exec(text))) {
      const start = from + match.index;
      const end = start + match[0].length;
      const attachmentId = match[2];

      const deco = Decoration.replace({
        widget: new AudioWidget(attachmentId),
        block: false,
        inclusive: false,
      });
      builder.add(start, end, deco);
    }
  }
  return builder.finish();
}

export const audioWidgetPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = audioWidgets(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = audioWidgets(update.view);
      }
    }
  },
  {
    decorations: v => v.decorations,
  }
);
