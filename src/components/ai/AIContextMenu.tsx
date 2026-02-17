// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

/**
 * Menu contextuel IA pour l'éditeur CodeMirror
 * Fonctions: Continuer, Améliorer, Changer ton, Traduire
 */

import { X, Sparkles, ArrowRight, Wand2, Languages } from 'lucide-react'
import React, { useState, useEffect } from 'react'

import { aiService } from '@/services/ai/mistralService'

interface AIContextMenuProps {
  position: { x: number; y: number }
  selectedText: string
  onClose: () => void
  onInsert: (text: string) => void
}

export default function AIContextMenu({ position, selectedText, onClose, onInsert }: AIContextMenuProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showToneMenu, setShowToneMenu] = useState(false)
  const [showTranslateMenu, setShowTranslateMenu] = useState(false)

  // Réinitialiser l'état quand le texte sélectionné change
  // Cela évite d'afficher l'ancien résultat quand l'utilisateur sélectionne un nouveau texte
  useEffect(() => {
    setResult(null)
    setError(null)
    setShowToneMenu(false)
    setShowTranslateMenu(false)
    setLoading(false)
  }, [selectedText])

  const handleAction = async (action: string, param?: string) => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      let response: string

      switch (action) {
        case 'continue':
          response = await aiService.continueText(selectedText)
          break
        case 'improve':
          response = await aiService.improveText(selectedText)
          break
        case 'tone':
          response = await aiService.changeTone(selectedText, param as any)
          break
        case 'translate':
          response = await aiService.translate(selectedText, param || 'anglais')
          break
        default:
          throw new Error('Action non reconnue')
      }

      setResult(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du traitement IA')
    } finally {
      setLoading(false)
    }
  }

  const handleInsertAction = () => {
    if (result) {
      // La logique de remplacement sera gérée par le parent
      onInsert(result)
      onClose()
    }
  }

  const getSecondaryMenu = () => {
    if (showToneMenu) {
      return (
        <>
          <button
            onClick={() => { setShowToneMenu(false); }}
            className="w-full text-left px-3 py-2 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            ← Retour
          </button>
          <button
            onClick={() => handleAction('tone', 'formal')}
            disabled={loading}
            className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            Formel
          </button>
          <button
            onClick={() => handleAction('tone', 'informal')}
            disabled={loading}
            className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            Décontracté
          </button>
          <button
            onClick={() => handleAction('tone', 'professional')}
            disabled={loading}
            className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            Professionnel
          </button>
          <button
            onClick={() => handleAction('tone', 'persuasive')}
            disabled={loading}
            className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            Persuasif
          </button>
        </>
      )
    }
    return (
      <>
        <button
          onClick={() => { setShowTranslateMenu(false); }}
          className="w-full text-left px-3 py-2 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          ← Retour
        </button>
        <button
          onClick={() => handleAction('translate', 'anglais')}
          disabled={loading}
          className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          Anglais
        </button>
        <button
          onClick={() => handleAction('translate', 'espagnol')}
          disabled={loading}
          className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          Espagnol
        </button>
        <button
          onClick={() => handleAction('translate', 'allemand')}
          disabled={loading}
          className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          Allemand
        </button>
        <button
          onClick={() => handleAction('translate', 'italien')}
          disabled={loading}
          className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          Italien
        </button>
      </>
    )
  }

  return (
    <div
      className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 min-w-[280px] max-w-[400px]"
      style={{ top: `${position.y}px`, left: `${position.x}px` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary-600" />
          <span className="font-medium text-sm">Assistant IA</span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Actions principales ou Résultat */}
      {!result ? (
        <div className="p-2">
          {!showToneMenu && !showTranslateMenu ? (
            <>
              <button
                onClick={() => handleAction('continue')}
                disabled={loading}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-left rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                <ArrowRight className="w-4 h-4 text-blue-600" />
                <span>Continuer le texte</span>
              </button>

              <button
                onClick={() => handleAction('improve')}
                disabled={loading}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-left rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                <Wand2 className="w-4 h-4 text-purple-600" />
                <span>Améliorer le style</span>
              </button>

              <button
                onClick={() => { setShowToneMenu(true); }}
                disabled={loading}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-left rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 text-green-600" />
                <span>Changer le ton</span>
              </button>

              <button
                onClick={() => { setShowTranslateMenu(true); }}
                disabled={loading}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-left rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                <Languages className="w-4 h-4 text-orange-600" />
                <span>Traduire</span>
              </button>
            </>
          ) : getSecondaryMenu()}

          {loading && (
            <div className="px-3 py-2 text-sm text-gray-500 flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-600 border-t-transparent"></div>
              <span>Traitement en cours...</span>
            </div>
          )}

          {error && (
            <div className="px-3 py-2 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
        </div>
      ) : (
        <div className="p-3">
          <div className="max-h-[300px] overflow-y-auto mb-3">
            <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-gray-50 dark:bg-gray-900 p-3 rounded-md">
              {result}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleInsertAction}
              className="flex-1 px-3 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
            >
              Insérer après
            </button>
            <button
              onClick={handleInsertAction}
              className="flex-1 px-3 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Remplacer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
