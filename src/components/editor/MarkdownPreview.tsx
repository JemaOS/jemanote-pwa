// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

import mermaid from 'mermaid'
import React, { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'

import WaveformPlayer from '@/components/ui/WaveformPlayer'
import { LocalStorage } from '@/lib/localStorage'
import 'katex/dist/katex.min.css'

interface MarkdownPreviewProps {
  content: string
  onWikiLinkClick?: (noteTitle: string) => void
}

// Composant lecteur audio autonome
const AudioPlayer = ({ attachmentId }: { attachmentId: string }) => {
  const [blob, setBlob] = useState<Blob | null>(null)

  useEffect(() => {
    const loadAudio = async () => {
      try {
        const file = await LocalStorage.getAttachmentFile(attachmentId)
        if (file) {
          setBlob(file)
        }
      } catch (error) {
        console.error('Erreur chargement audio:', error)
      }
    }
    loadAudio()
  }, [attachmentId])

  if (!blob) {return <div className="text-xs text-gray-500 italic my-2">Chargement du mémo vocal...</div>}

  return <WaveformPlayer blob={blob} />
}

// Initialiser Mermaid avec le thème sombre
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'Inter, system-ui, sans-serif',
})

export default function MarkdownPreview({ content, onWikiLinkClick }: MarkdownPreviewProps) {
  const previewRef = useRef<HTMLDivElement>(null)

  // Rendu des diagrammes Mermaid après le rendu du Markdown
  useEffect(() => {
    if (!previewRef.current) {return}

    const renderMermaid = async () => {
      const mermaidElements = previewRef.current?.querySelectorAll('.language-mermaid')
      if (!mermaidElements || mermaidElements.length === 0) {return}

      // Nettoyer les anciens SVG
      mermaidElements.forEach((element) => {
        const parent = element.parentElement
        if (parent && parent.querySelector('svg')) {
          parent.querySelector('svg')?.remove()
        }
      })

      // Rendre les nouveaux diagrammes
      for (let i = 0; i < mermaidElements.length; i++) {
        const element = mermaidElements[i] as HTMLElement
        const code = element.textContent || ''
        const parent = element.parentElement

        if (parent && code.trim()) {
          try {
            const { svg } = await mermaid.render(`mermaid-${i}-${Date.now()}`, code)
            element.style.display = 'none'
            parent.insertAdjacentHTML('beforeend', svg)
          } catch (error) {
            console.error('Erreur rendu Mermaid:', error)
            element.textContent = `Erreur de rendu du diagramme: ${error}`
          }
        }
      }
    }

    renderMermaid()
  }, [content])

  // Traiter les wiki links [[Note Title]]
  const processWikiLinks = (text: string) => {
    return text.replace(/\[\[([^\]]+)\]\]/g, (match, noteTitle) => {
      return `<span class="wiki-link" data-note="${noteTitle}">${noteTitle}</span>`
    })
  }

  // Gérer les clics sur les wiki links
  useEffect(() => {
    if (!previewRef.current || !onWikiLinkClick) {return}

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.classList.contains('wiki-link')) {
        e.preventDefault()
        const noteTitle = target.getAttribute('data-note')
        if (noteTitle) {
          onWikiLinkClick(noteTitle)
        }
      }
    }

    previewRef.current.addEventListener('click', handleClick)
    return () => {
      previewRef.current?.removeEventListener('click', handleClick)
    }
  }, [onWikiLinkClick])

  // Prétraiter le contenu pour remplacer les wiki links par du HTML
  const processedContent = processWikiLinks(content)

  return (
    <div 
      ref={previewRef}
      className="h-full w-full overflow-auto p-12 prose prose-slate dark:prose-invert max-w-none"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeRaw]}
        urlTransform={(url) => url} // Autoriser tous les protocoles (dont attachment:)
        components={{
          // Gérer les images spéciales (comme les mémos vocaux)
          img: ({ src, alt, ...props }) => {
            if (src?.startsWith('attachment:')) {
              const attachmentId = src.replace('attachment:', '')
              return <AudioPlayer attachmentId={attachmentId} />
            }
            return <img src={src} alt={alt} {...props} />
          },
          // Gérer les balises audio HTML existantes
          audio: ({ node, ...props }) => {
            // @ts-ignore - data-attachment-id peut être dans props
            const attachmentId = props['data-attachment-id']
            if (attachmentId) {
              return <AudioPlayer attachmentId={attachmentId as string} />
            }
            return <audio {...props} />
          },
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '')
            const language = match ? match[1] : ''
            const isInline = !className

            // Pour Mermaid, retourner un code block simple qui sera traité par useEffect
            if (language === 'mermaid') {
              return (
                <pre className="mermaid-container">
                  <code className={className} {...props}>
                    {children}
                  </code>
                </pre>
              )
            }

            // Code inline
            if (isInline) {
              return (
                <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                  {children}
                </code>
              )
            }

            // Code block normal
            return (
              <pre className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 overflow-x-auto">
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            )
          },
          // Personnaliser les autres éléments si nécessaire
          h1: ({ children }) => (
            <h1 className="text-4xl font-bold mb-4 mt-8 text-gray-900 dark:text-gray-100">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-3xl font-semibold mb-3 mt-6 text-gray-900 dark:text-gray-100">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-2xl font-semibold mb-2 mt-4 text-gray-900 dark:text-gray-100">{children}</h3>
          ),
          p: ({ children }) => (
            <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">{children}</p>
          ),
          a: ({ href, children }) => (
            <a 
              href={href}
              className="text-primary hover:text-primary/80 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside mb-4 space-y-2 text-gray-700 dark:text-gray-300">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside mb-4 space-y-2 text-gray-700 dark:text-gray-300">{children}</ol>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary pl-4 italic my-4 text-gray-600 dark:text-gray-400">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-700">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 px-4 py-2 text-left font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">
              {children}
            </td>
          ),
        }}
      >
        {processedContent}
      </ReactMarkdown>

      <style>{`
        .wiki-link {
          color: #5a63e9;
          cursor: pointer;
          text-decoration: underline;
          font-weight: 500;
        }
        .wiki-link:hover {
          color: #4a53d9;
        }
        .mermaid-container {
          background: transparent;
          padding: 0;
          margin: 1rem 0;
        }
        .dark .mermaid-container svg {
          background: transparent;
        }
      `}</style>
    </div>
  )
}
