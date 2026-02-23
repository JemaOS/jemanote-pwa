// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

import {
  autocompletion,
  completionKeymap,
  closeBrackets,
  closeBracketsKeymap,
} from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import {
  defaultHighlightStyle,
  syntaxHighlighting,
  indentOnInput,
  bracketMatching,
  foldGutter,
  foldKeymap,
} from '@codemirror/language';
import { lintKeymap } from '@codemirror/lint';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { EditorState, Compartment } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import {
  EditorView,
  keymap,
  highlightSpecialChars,
  drawSelection,
  highlightActiveLine,
  dropCursor,
  rectangularSelection,
  crosshairCursor,
  lineNumbers,
  highlightActiveLineGutter,
} from '@codemirror/view';
import { useRef, useEffect } from 'react';

import { useTheme } from '@/contexts/ThemeContext';
import { audioWidgetPlugin } from '@/lib/audioWidgetExtension';
import { wikiLinksPlugin } from '@/lib/wikiLinks';

interface MarkdownEditorProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly onWikiLinkClick?: (noteTitle: string) => void;
}

export default function MarkdownEditor({ value, onChange, onWikiLinkClick }: MarkdownEditorProps) {
  const { theme } = useTheme();
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const themeCompartment = useRef(new Compartment());
  const onChangeRef = useRef(onChange);
  const onWikiLinkClickRef = useRef(onWikiLinkClick);

  // Keep refs up to date with latest callbacks
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onWikiLinkClickRef.current = onWikiLinkClick;
  }, [onWikiLinkClick]);

  // Create editor once on mount
  useEffect(() => {
    if (!editorRef.current) {
      return;
    }

    const startState = EditorState.create({
      doc: '',
      extensions: [
        themeCompartment.current.of(theme === 'dark' ? oneDark : []),
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        foldGutter(),
        drawSelection(),
        dropCursor(),
        EditorState.allowMultipleSelections.of(true),
        indentOnInput(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        bracketMatching(),
        closeBrackets(),
        autocompletion(),
        rectangularSelection(),
        crosshairCursor(),
        highlightActiveLine(),
        highlightSelectionMatches(),
        EditorView.lineWrapping, // Retour à la ligne automatique
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...searchKeymap,
          ...historyKeymap,
          ...foldKeymap,
          ...completionKeymap,
          ...lintKeymap,
        ]),
        markdown(),
        wikiLinksPlugin,
        audioWidgetPlugin,
        EditorView.updateListener.of(update => {
          if (update.docChanged) {
            const newValue = update.state.doc.toString();
            onChangeRef.current(newValue);
          }
        }),
        EditorView.theme({
          '&': {
            height: '100%',
            fontSize: 'clamp(15px, 1vw, 17px)',
            fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
            backgroundColor: 'transparent',
          },
          '.cm-scroller': {
            overflow: 'auto',
            fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
          },
          '.cm-content': {
            padding: 'clamp(24px, 3vw, 64px)',
            minHeight: '100%',
            caretColor: '#5a63e9',
            maxWidth: '850px',
            margin: '0 auto',
          },
          '.cm-line': {
            lineHeight: '1.7',
            padding: '0 clamp(8px, 0.5vw, 16px)',
          },
          '.cm-cursor': {
            borderLeftColor: '#5a63e9',
            borderLeftWidth: '2px',
          },
          '.cm-gutters': {
            fontSize: 'clamp(12px, 0.85vw, 14px)',
            paddingRight: 'clamp(8px, 0.5vw, 12px)',
          },
          '.wiki-link': {
            color: '#5a63e9',
            cursor: 'pointer',
            textDecoration: 'underline',
            fontWeight: '500',
          },
          '.wiki-link:hover': {
            color: '#4a53d9',
          },
        }),
        EditorView.domEventHandlers({
          click: (event, _view) => {
            const target = event.target as HTMLElement;
            if (target.classList.contains('wiki-link') && onWikiLinkClickRef.current) {
              event.preventDefault();
              const noteTitle = target.textContent ?? '';
              onWikiLinkClickRef.current(noteTitle);
              return true;
            }
            return false;
          },
        }),
      ],
    });

    const view = new EditorView({
      state: startState,
      parent: editorRef.current,
    });

    viewRef.current = view;
    
    // Make editor view accessible for e2e tests
    (window as any).editorView = view;

    return () => {
      view.destroy();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: themeCompartment.current.reconfigure(theme === 'dark' ? oneDark : []),
      });
    }
  }, [theme]);

  useEffect(() => {
    if (viewRef.current) {
      const currentValue = viewRef.current.state.doc.toString();
      if (currentValue !== value) {
        viewRef.current.dispatch({
          changes: {
            from: 0,
            to: currentValue.length,
            insert: value,
          },
        });
      }
    }
  }, [value]);

  return (
    <>
      <div ref={editorRef} className="h-full w-full" />
    </>
  );
}
