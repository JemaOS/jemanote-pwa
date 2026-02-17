// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

import { X, Loader2, Sparkles, FileText, List, AlignLeft, Copy, CheckCircle2, FilePlus, History } from 'lucide-react'
import React, { useState, useEffect } from 'react'

import { aiService, type SummaryHistoryEntry } from '@/services/ai/mistralService'

interface AISummaryModalProps {
  readonly content: string
  readonly noteId?: string
  readonly noteTitle?: string
  readonly onClose: () => void
  readonly onApply: (summary: string, mode: 'replace' | 'prepend' | 'append') => void
  readonly onCreateNote?: (title: string, content: string) => void
}

type SummaryType = 'short' | 'detailed' | 'bullets'
type ApplyMode = 'replace' | 'prepend' | 'append'
type Tab = 'generate' | 'history'

export default function AISummaryModal({ content, noteId, noteTitle, onClose, onApply, onCreateNote }: AISummaryModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('generate')
  const [summaryType, setSummaryType] = useState<SummaryType>('detailed')
  const [applyMode, setApplyMode] = useState<ApplyMode>('prepend')
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [history, setHistory] = useState<SummaryHistoryEntry[]>([])

  // Charger l'historique
  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    const historyData = await aiService.getSummaryHistory(20)
    setHistory(historyData)
  }

  const generateSummary = async () => {
    if (!aiService.isConfigured()) {
      setError('Service IA non disponible')
      return
    }

    try {
      setLoading(true)
      setError('')
      setProgress(0)
      
      const result = await aiService.summarize(content, summaryType, (p) => { setProgress(p); })
      setSummary(result)
      
      // Sauvegarder dans l'historique
      await aiService.saveSummaryToHistory(noteId, noteTitle, content, result, summaryType)
      await loadHistory()
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === 'Génération annulée') {
          setError('Génération annulée par l\'utilisateur.')
        } else {
          // Afficher le message d'erreur spécifique du service
          setError(err.message)
        }
      } else {
        setError('Une erreur inattendue s\'est produite lors de la génération du résumé.')
      }
      setProgress(0)
    } finally {
      setLoading(false)
    }
  }

  const cancelGeneration = () => {
    aiService.cancelRequest()
    setLoading(false)
    setProgress(0)
  }

  const handleApply = () => {
    if (summary) {
      onApply(summary, applyMode)
      onClose()
    }
  }

  const handleCopy = async () => {
    if (summary) {
      await navigator.clipboard.writeText(summary)
      setCopied(true)
      setTimeout(() => { setCopied(false); }, 2000)
    }
  }

  const handleCreateNewNote = () => {
    if (summary && onCreateNote) {
      const newTitle = `Résumé - ${noteTitle || 'Sans titre'}`
      onCreateNote(newTitle, summary)
      onClose()
    }
  }

  const handleApplyHistoryItem = (item: SummaryHistoryEntry) => {
    setSummary(item.summary)
    setSummaryType(item.summaryType)
    setActiveTab('generate')
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) {return 'À l\'instant'}
    if (diffMins < 60) {return `Il y a ${diffMins} min`}
    if (diffHours < 24) {return `Il y a ${diffHours}h`}
    if (diffDays < 7) {return `Il y a ${diffDays}j`}
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  const summaryTypeLabels = {
    short: 'Court (2-3 phrases)',
    detailed: 'Détaillé (paragraphe)',
    bullets: 'Points clés (bullets)',
  }

  const applyModeLabels = {
    replace: 'Remplacer le contenu',
    prepend: 'Ajouter au début',
    append: 'Ajouter à la fin',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-3">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary-500" />
            <h2 className="text-base sm:text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Résumé Automatique IA
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded transition-colors"
          >
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-neutral-200 dark:border-neutral-700">
          <button
            onClick={() => { setActiveTab('generate'); }}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'generate'
                ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">Générer</span>
          </button>
          <button
            onClick={() => { setActiveTab('history'); }}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'history'
                ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">Historique</span>
            {history.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full">
                {history.length}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
          {activeTab === 'generate' && (
            <>
              {/* Type de résumé */}
              <div>
                <p className="block text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Type de résumé
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(summaryTypeLabels) as SummaryType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => { setSummaryType(type); }}
                      disabled={loading}
                      className={(() => {
                        const baseClasses = 'flex flex-col items-center gap-1 sm:gap-2 p-2 sm:p-3 rounded-lg border-2 transition-all'
                        const selectedClasses = 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                        const unselectedClasses = 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 text-neutral-700 dark:text-neutral-300'
                        const disabledClasses = loading ? 'opacity-50 cursor-not-allowed' : ''
                        const stateClasses = summaryType === type ? selectedClasses : unselectedClasses
                        return `${baseClasses} ${stateClasses} ${disabledClasses}`
                      })()}
                    >
                      {type === 'short' && <FileText className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />}
                      {type === 'detailed' && <AlignLeft className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />}
                      {type === 'bullets' && <List className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />}
                      <span className="text-[10px] sm:text-xs font-medium text-center">{summaryTypeLabels[type]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Barre de progression */}
              {loading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
                    <span>Génération en cours...</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-500 transition-all duration-300 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Mode d'application */}
              {summary && !loading && (
                <div>
                  <label htmlFor="apply-mode-group" className="block text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Mode d'application
                  </label>
                  <div className="space-y-2">
                    {(Object.keys(applyModeLabels) as ApplyMode[]).map((mode) => (
                      <label
                        key={mode}
                        className={(() => {
                          const baseClasses = 'flex items-center gap-3 p-2 sm:p-3 rounded-lg border-2 cursor-pointer transition-all'
                          const selectedClasses = 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          const unselectedClasses = 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300'
                          return `${baseClasses} ${applyMode === mode ? selectedClasses : unselectedClasses}`
                        })()}
                      >
                        <input
                          type="radio"
                          name="applyMode"
                          value={mode}
                          checked={applyMode === mode}
                          onChange={(e) => { setApplyMode(e.target.value as ApplyMode); }}
                          className="text-primary-500"
                        />
                        <span className="text-xs sm:text-sm text-neutral-700 dark:text-neutral-300">
                          {applyModeLabels[mode]}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Résultat */}
              {summary && !loading && (
                <div>
                  <p className="block text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Résumé généré
                  </p>
                  <div className="p-3 sm:p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700">
                    <p className="text-xs sm:text-sm text-neutral-700 dark:text-white whitespace-pre-wrap">
                      {summary}
                    </p>
                  </div>
                </div>
              )}

              {/* Erreur */}
              {error && (
                <div className="flex items-start gap-2 p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs sm:text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}
            </>
          )}
          {activeTab === 'history' && (
            <>
              {/* Historique */}
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <History className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mb-3" />
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Aucun résumé dans l'historique
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">
                    Les résumés générés apparaîtront ici
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 sm:p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:border-primary-300 dark:hover:border-primary-700 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                            {item.noteTitle || 'Sans titre'}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs px-2 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded">
                              {summaryTypeLabels[item.summaryType]}
                            </span>
                            <span className="text-xs text-neutral-500 dark:text-neutral-400">
                              {formatDate(item.timestamp)}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => { handleApplyHistoryItem(item); }}
                          className="px-2 py-1 text-xs bg-primary-500 text-white hover:bg-primary-600 rounded transition-colors opacity-0 group-hover:opacity-100"
                        >
                          Utiliser
                        </button>
                      </div>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-3">
                        {item.summary}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 sm:gap-3 p-3 sm:p-4 border-t border-neutral-200 dark:border-neutral-700">
          <button
            onClick={onClose}
            className="px-3 sm:px-4 py-2 text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
          >
            Fermer
          </button>
          
          {activeTab === 'generate' && (
            <div className="flex items-center gap-2">
              {summary && !loading && (
                <>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                    title="Copier le résumé"
                  >
                    {copied ? (
                      <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />
                    ) : (
                      <Copy className="w-3 h-3 sm:w-4 sm:h-4" />
                    )}
                    <span className="hidden sm:inline">{copied ? 'Copié !' : 'Copier'}</span>
                  </button>

                  {onCreateNote && (
                    <button
                      onClick={handleCreateNewNote}
                      className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                      title="Créer une nouvelle note avec ce résumé"
                    >
                      <FilePlus className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">Nouvelle note</span>
                    </button>
                  )}

                  <button
                    onClick={handleApply}
                    className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs sm:text-sm bg-primary-500 text-white hover:bg-primary-600 rounded-lg transition-colors font-medium"
                  >
                    <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>Appliquer</span>
                  </button>
                </>
              )}
              
              {loading ? (
                <button
                  onClick={cancelGeneration}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm bg-red-500 text-white hover:bg-red-600 rounded-lg transition-colors font-medium"
                >
                  <XCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>Annuler</span>
                </button>
              ) : (
                <button
                  onClick={generateSummary}
                  disabled={!content.trim()}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm bg-primary-500 text-white hover:bg-primary-600 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>{summary && !loading ? 'Régénérer' : 'Générer'}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
