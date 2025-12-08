// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

import { useState, useEffect, useRef, useCallback } from 'react'
import { Note, Attachment } from '@/types'
import { LocalStorage } from '@/lib/localStorage'
import MarkdownEditor from '@/components/editor/MarkdownEditor'
import MarkdownPreview from '@/components/editor/MarkdownPreview'
import VoiceRecorder from '@/components/editor/VoiceRecorder'
import AISummaryModal from '@/components/ai/AISummaryModal'
import AIPanel from '@/components/ai/AIPanel'
import { Eye, Edit3, Columns2, Sparkles, Lightbulb, X, Bot, Mic } from 'lucide-react'

interface WorkspaceViewProps {
  userId?: string | null
  activeNoteId: string | null
  onNoteChange: (noteId: string | null) => void
  rightSidebarOpen: boolean
  notes: Note[]
  updateNote: (noteId: string, updates: Partial<Note>) => Promise<{ data: Note | null; error: Error | null }>
  createNote?: (title: string, content: string, folderId?: string) => Promise<Note | null>
}

type ViewMode = 'edit' | 'split' | 'preview'
type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error'

export default function WorkspaceView({
  userId,
  activeNoteId,
  onNoteChange,
  rightSidebarOpen,
  notes,
  updateNote,
  createNote,
}: WorkspaceViewProps) {
  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('edit')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [showAISummary, setShowAISummary] = useState(false)
  const [showAutoSuggest, setShowAutoSuggest] = useState(false)
  const [autoSuggestDismissed, setAutoSuggestDismissed] = useState(false)
  const [showAIPanel, setShowAIPanel] = useState(false)
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false)
  
  // Refs pour le tracking des valeurs sauvegardées et timers
  const lastSavedContent = useRef('')
  const lastSavedTitle = useRef('')
  const autoSuggestTimerRef = useRef<NodeJS.Timeout | null>(null)

  const activeNote = notes.find((note) => note.id === activeNoteId)

  // Réinitialiser l'enregistreur vocal lors du changement de note
  useEffect(() => {
    setShowVoiceRecorder(false)
  }, [activeNoteId])

  // Charger la note active
  useEffect(() => {
    if (activeNote) {
      setContent(activeNote.content || '')
      setTitle(activeNote.title || '')
      lastSavedContent.current = activeNote.content || ''
      lastSavedTitle.current = activeNote.title || ''
      setSaveStatus('saved')
      setAutoSuggestDismissed(false)
      setShowAutoSuggest(false)
    } else {
      setContent('')
      setTitle('')
      lastSavedContent.current = ''
      lastSavedTitle.current = ''
      setSaveStatus('saved')
      setAutoSuggestDismissed(false)
      setShowAutoSuggest(false)
    }
  }, [activeNote])

  // Fonction de sauvegarde - fire-and-forget pour garder l'UX fluide
  const saveNote = useCallback(async (updates: Partial<Note>) => {
    if (!activeNoteId) return

    // updateNote() met à jour l'état React de façon SYNCHRONE en interne
    // La persistance localStorage se fait en arrière-plan (fire-and-forget)
    const result = await updateNote(activeNoteId, updates)
    
    if (result.error) {
      console.error('Erreur de sauvegarde:', result.error)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('unsaved'), 2000)
    } else {
      // Mise à jour des dernières valeurs sauvegardées
      if (updates.content !== undefined) {
        lastSavedContent.current = updates.content
      }
      if (updates.title !== undefined) {
        lastSavedTitle.current = updates.title
      }
      // Status "saved" immédiatement car l'état React est déjà mis à jour
      setSaveStatus('saved')
    }
  }, [activeNoteId, updateNote])

  // Gestion du changement de contenu - INSTANT pour synchronisation canvas
  const handleContentChange = (newContent: string) => {
    setContent(newContent)
    
    if (!activeNoteId) return

    // Sauvegarder IMMÉDIATEMENT pour synchronisation instantanée avec le canvas
    // updateNote() met à jour l'état React de façon synchrone, puis persiste en async
    if (newContent !== lastSavedContent.current) {
      saveNote({ content: newContent })
    }

    // Auto-suggestion pour les notes >500 caractères (avec debounce)
    if (autoSuggestTimerRef.current) {
      clearTimeout(autoSuggestTimerRef.current)
    }

    autoSuggestTimerRef.current = setTimeout(() => {
      const charCount = newContent.trim().length
      if (charCount > 500 && !autoSuggestDismissed && !showAISummary) {
        setShowAutoSuggest(true)
      } else if (charCount <= 500) {
        setShowAutoSuggest(false)
      }
    }, 2000)
  }

  // Gestion du changement de titre - INSTANT pour synchronisation canvas
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value
    setTitle(newTitle)
    
    if (!activeNoteId) return

    // Sauvegarder IMMÉDIATEMENT pour synchronisation instantanée avec le canvas
    if (newTitle !== lastSavedTitle.current) {
      saveNote({ title: newTitle })
    }
  }

  // Sauvegarde manuelle forcée
  const handleForceSave = () => {
    const updates: Partial<Note> = {}
    let hasChanges = false

    if (content !== lastSavedContent.current) {
      updates.content = content
      hasChanges = true
    }

    if (title !== lastSavedTitle.current) {
      updates.title = title
      hasChanges = true
    }

    if (hasChanges) {
      saveNote(updates)
    }
  }

  // Cleanup des timers avant navigation
  useEffect(() => {
    return () => {
      if (autoSuggestTimerRef.current) {
        clearTimeout(autoSuggestTimerRef.current)
      }
    }
  }, [])

  // Navigation par wiki link
  const handleWikiLinkClick = (noteTitle: string) => {
    // Sauvegarder avant navigation si nécessaire
    if (saveStatus === 'unsaved') {
      handleForceSave()
    }

    // Trouver la note par titre
    const targetNote = notes.find((note) => note.title === noteTitle)
    if (targetNote) {
      onNoteChange(targetNote.id)
    }
  }

  // Appliquer le résumé IA
  const handleApplySummary = (summary: string, mode: 'replace' | 'prepend' | 'append') => {
    let newContent = content
    
    if (mode === 'replace') {
      newContent = summary
    } else if (mode === 'prepend') {
      newContent = `${summary}\n\n${content}`
    } else if (mode === 'append') {
      newContent = `${content}\n\n${summary}`
    }
    
    setContent(newContent)
    
    // Sauvegarder immédiatement
    if (activeNoteId) {
      saveNote({ content: newContent })
    }
  }

  // Créer une nouvelle note depuis le résumé
  const handleCreateNoteFromSummary = async (newTitle: string, newContent: string) => {
    if (createNote) {
      const newNote = await createNote(newTitle, newContent, activeNote?.folder_id)
      if (newNote) {
        onNoteChange(newNote.id)
      }
    }
  }

  // Sauvegarder le mémo vocal
  const handleSaveVoiceMemo = async (blob: Blob, duration: number) => {
    if (!activeNoteId) return

    try {
      const attachmentId = crypto.randomUUID()
      const fileName = `recording-${new Date().toISOString().replace(/[:.]/g, '-')}.webm`
      
      const attachment: Attachment = {
        id: attachmentId,
        user_id: userId || 'local-user',
        note_id: activeNoteId,
        file_name: fileName,
        file_path: attachmentId,
        file_type: blob.type,
        file_size: blob.size,
        created_at: new Date().toISOString()
      }

      await LocalStorage.saveAttachment(attachment, blob)
      
      // Ajouter le lien vers l'audio dans la note (format Markdown image avec protocole attachment:)
      const audioTag = `\n\n![Mémo vocal](attachment:${attachmentId})\n\n`
      const newContent = content + audioTag
      
      setContent(newContent)
      saveNote({ content: newContent })
      
      setShowVoiceRecorder(false)
    } catch (error) {
      console.error('Erreur sauvegarde mémo vocal:', error)
      alert('Erreur lors de la sauvegarde du mémo vocal')
    }
  }

  // Fermer l'auto-suggestion
  const handleDismissAutoSuggest = () => {
    setShowAutoSuggest(false)
    setAutoSuggestDismissed(true)
  }

  // Ouvrir le modal IA depuis l'auto-suggestion
  const handleOpenAIFromSuggest = () => {
    setShowAutoSuggest(false)
    setShowAISummary(true)
  }

  if (!activeNote) {
    return (
      <div className="flex h-full items-center justify-center bg-white dark:bg-neutral-900">
        <div className="text-center">
          <p className="text-body-large text-neutral-700 dark:text-neutral-300 mb-2">Aucune note sélectionnée</p>
          <p className="text-body text-neutral-500 dark:text-neutral-400">
            Sélectionnez une note dans la barre latérale ou créez-en une nouvelle
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-neutral-900">
      <div className="border-b border-neutral-200 dark:border-neutral-800 p-2 laptop-sm:p-3 laptop:p-4 laptop-lg:p-5 space-y-2 laptop:space-y-2.5">
        {/* Suggestion automatique */}
        {showAutoSuggest && (
          <div className="flex items-start gap-2 laptop:gap-2.5 p-2 laptop:p-3 laptop-lg:p-3.5 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg">
            <Lightbulb className="w-4 h-4 laptop:w-5 laptop:h-5 laptop-lg:w-5.5 laptop-lg:h-5.5 text-primary-600 dark:text-primary-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs laptop:text-sm laptop-lg:text-base text-primary-900 dark:text-primary-100 font-medium mb-0.5">
                Votre note est assez longue !
              </p>
              <p className="text-xs laptop:text-sm text-primary-700 dark:text-primary-300">
                Générez un résumé automatique avec l'IA.
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleOpenAIFromSuggest}
                className="px-2 laptop:px-3 laptop-lg:px-4 py-1 laptop:py-1.5 text-xs laptop:text-sm laptop-lg:text-base bg-primary-500 text-white hover:bg-primary-600 rounded transition-colors font-medium whitespace-nowrap min-h-[32px] laptop:min-h-[36px]"
              >
                Générer
              </button>
              <button
                onClick={handleDismissAutoSuggest}
                className="p-1 laptop:p-1.5 hover:bg-primary-100 dark:hover:bg-primary-900/40 rounded transition-colors min-w-[32px] laptop:min-w-[36px] min-h-[32px] laptop:min-h-[36px] flex items-center justify-center"
                aria-label="Fermer"
              >
                <X className="w-4 h-4 laptop:w-4.5 laptop:h-4.5 text-primary-600 dark:text-primary-400" />
              </button>
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-between gap-2 laptop:gap-3 laptop-lg:gap-4 flex-wrap laptop:flex-nowrap">
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            className="flex-1 text-base laptop:text-xl laptop-lg:text-2xl desktop:text-3xl font-semibold text-neutral-900 dark:text-neutral-100 bg-transparent border-none outline-none focus:outline-none placeholder:text-neutral-400 dark:placeholder:text-neutral-500 min-w-0 order-1"
            placeholder="Titre de la note"
          />
          
          {/* Groupe de droite avec tous les contrôles */}
          <div className="flex items-center gap-1 laptop:gap-1.5 laptop-lg:gap-2 order-3 laptop:order-2 flex-shrink-0">
            {/* Bouton Note Vocale */}
            <button
              onClick={() => setShowVoiceRecorder(!showVoiceRecorder)}
              className={`flex items-center justify-center gap-1 px-2 laptop:px-2.5 laptop-lg:px-3 py-1.5 laptop:py-2 rounded-lg transition-colors text-xs laptop:text-sm font-medium min-h-touch flex-shrink-0 ${
                showVoiceRecorder
                  ? 'bg-primary-600 text-white'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
              title="Enregistrer une note vocale avec transcription"
            >
              <Mic className="w-4 h-4" />
            </button>
            
            {/* Boutons IA - Compacts */}
            <button
              onClick={() => setShowAISummary(true)}
              disabled={!content.trim()}
              className="flex items-center justify-center gap-1 px-2 laptop:px-2.5 laptop-lg:px-3 py-1.5 laptop:py-2 bg-primary-500 text-white hover:bg-primary-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs laptop:text-sm font-medium min-h-touch flex-shrink-0"
              title="Générer un résumé avec l'IA"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden laptop-lg:inline">Résumé</span>
            </button>
            
            <button
              onClick={() => setShowAIPanel(!showAIPanel)}
              className={`flex items-center justify-center gap-1 px-2 laptop:px-2.5 laptop-lg:px-3 py-1.5 laptop:py-2 rounded-lg transition-colors text-xs laptop:text-sm font-medium min-h-touch flex-shrink-0 ${
                showAIPanel
                  ? 'bg-primary-600 text-white'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
              title="Ouvrir l'Assistant IA"
            >
              <Bot className="w-4 h-4" />
              <span className="hidden laptop-lg:inline">Assistant</span>
            </button>
          
            {/* Boutons de mode de visualisation - Toujours visibles */}
            <div className="flex items-center gap-0.5 laptop-lg:gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg p-0.5 laptop-lg:p-1 flex-shrink-0">
              <button
                onClick={() => setViewMode('edit')}
                className={`p-1.5 laptop:p-2 rounded transition-colors ${
                  viewMode === 'edit'
                    ? 'bg-white dark:bg-neutral-700 text-primary shadow-sm'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                }`}
                title="Mode édition"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('split')}
                className={`p-1.5 laptop:p-2 rounded transition-colors ${
                  viewMode === 'split'
                    ? 'bg-white dark:bg-neutral-700 text-primary shadow-sm'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                }`}
                title="Mode split"
              >
                <Columns2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('preview')}
                className={`p-1.5 laptop:p-2 rounded transition-colors ${
                  viewMode === 'preview'
                    ? 'bg-white dark:bg-neutral-700 text-primary shadow-sm'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                }`}
                title="Mode prévisualisation"
              >
                <Eye className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Panel Note Vocale */}
      {showVoiceRecorder && (
        <div className="border-b border-neutral-200 dark:border-neutral-800 p-3 laptop:p-4 bg-neutral-50 dark:bg-neutral-900">
          <VoiceRecorder
            initialTranscript={content}
            onTranscriptChange={(newTranscript) => {
              setContent(newTranscript)
              handleContentChange(newTranscript)
            }}
            onSave={handleSaveVoiceMemo}
          />
        </div>
      )}

      <div className="flex-1 overflow-hidden flex">
        {/* Éditeur */}
        {(viewMode === 'edit' || viewMode === 'split') && (
          <div className={`${viewMode === 'split' ? 'w-1/2 border-r border-neutral-200 dark:border-neutral-800' : 'w-full'}`}>
            <MarkdownEditor 
              value={content} 
              onChange={handleContentChange}
              onWikiLinkClick={handleWikiLinkClick}
            />
          </div>
        )}

        {/* Prévisualisation */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div className={`${viewMode === 'split' ? 'w-1/2' : 'w-full'}`}>
            <MarkdownPreview
              content={content}
              onWikiLinkClick={handleWikiLinkClick}
            />
          </div>
        )}
      </div>

      {/* Modal de résumé IA */}
      {showAISummary && (
        <AISummaryModal
          content={content}
          noteId={activeNoteId || undefined}
          noteTitle={title || undefined}
          onClose={() => setShowAISummary(false)}
          onApply={handleApplySummary}
          onCreateNote={createNote ? handleCreateNoteFromSummary : undefined}
        />
      )}

      {/* Panel IA - Sidebar dédiée */}
      {showAIPanel && (
        <AIPanel
          currentNote={activeNote}
          notes={notes}
          onClose={() => setShowAIPanel(false)}
          onCreateNote={async (title, content) => {
            if (createNote) {
              await createNote(title, content, activeNote?.folder_id)
            }
          }}
          onUpdateNoteTags={(noteId, tags) => {
            // Ajouter les tags au contenu de la note
            const note = notes.find(n => n.id === noteId)
            if (note) {
              const newContent = note.content + '\n\n' + tags.map(t => `#${t}`).join(' ')
              updateNote(noteId, { content: newContent })
            }
          }}
          onUpdateNoteContent={(noteId, newContent) => {
            updateNote(noteId, { content: newContent })
            setContent(newContent) // Mettre à jour l'état local pour refléter le changement immédiatement
          }}
          onNavigateToNote={(noteId) => {
            onNoteChange(noteId)
          }}
        />
      )}
    </div>
  )
}
