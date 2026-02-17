// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

/**
 * Service de détection de liens intelligents entre notes
 * Utilise l'analyse de mots-clés et l'IA Mistral pour suggérer des connexions pertinentes
 */

import type { Note } from '@/types'

import { aiService } from './ai/mistralService'

export interface LinkSuggestion {
  targetNoteId: string
  targetNoteTitle: string
  reason: string
  confidence: number // 0-100
  keywords: string[]
}

class LinkDetectionService {
  /**
   * Extraire les mots-clés importants d'un texte
   */
  private extractKeywords(text: string): string[] {
    // Supprimer les mots courants (stop words français)
    const stopWords = new Set([
      'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'et', 'ou', 'mais',
      'donc', 'car', 'ni', 'que', 'qui', 'quoi', 'dont', 'où', 'pour', 'par',
      'avec', 'sans', 'dans', 'sur', 'sous', 'entre', 'vers', 'chez', 'à',
      'ce', 'cet', 'cette', 'ces', 'mon', 'ton', 'son', 'notre', 'votre', 'leur',
      'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles', 'on',
      'être', 'avoir', 'faire', 'dire', 'pouvoir', 'aller', 'voir', 'savoir',
      'est', 'sont', 'était', 'a', 'ai', 'as', 'ont', 'avons', 'avez',
    ])

    // SECURITY FIX: Limit input size to prevent ReDoS attacks on regex processing
    // Maximum 100KB of text to process for keyword extraction
    const MAX_TEXT_LENGTH = 100000
    const safeText = text.length > MAX_TEXT_LENGTH ? text.substring(0, MAX_TEXT_LENGTH) : text

    // Nettoyer et extraire les mots
    // SECURITY FIX: Using a safer character class regex with length limits
    const words = safeText
      .toLowerCase()
      .replace(/[^\w\sàâäéèêëïîôùûüÿæœç-]+/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.has(word))

    // Compter la fréquence des mots
    const wordFreq = new Map<string, number>()
    words.forEach(word => {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1)
    })

    // Retourner les 15 mots les plus fréquents
    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([word]) => word)
  }

  /**
   * Calculer la similarité entre deux ensembles de mots-clés
   */
  private calculateSimilarity(keywords1: string[], keywords2: string[]): number {
    if (keywords1.length === 0 || keywords2.length === 0) {return 0}

    const set1 = new Set(keywords1)
    const set2 = new Set(keywords2)

    // Calculer l'intersection (mots communs)
    const intersection = new Set([...set1].filter(x => set2.has(x)))

    // Coefficient de Jaccard: |A ∩ B| / |A ∪ B|
    const union = new Set([...set1, ...set2])
    const similarity = (intersection.size / union.size) * 100

    return similarity
  }

  /**
   * Détecter les liens potentiels pour une note donnée
   */
  detectLinks(currentNote: Note, allNotes: Note[]): LinkSuggestion[] {
    if (!currentNote.content || currentNote.content.length < 50) {
      return []
    }

    const currentKeywords = this.extractKeywords(currentNote.content)
    const suggestions: LinkSuggestion[] = []

    // Analyser chaque note
    for (const note of allNotes) {
      // Ignorer la note courante
      if (note.id === currentNote.id) {continue}

      // Ignorer les notes vides ou trop courtes
      if (!note.content || note.content.length < 50) {continue}

      const noteKeywords = this.extractKeywords(note.content)
      const similarity = this.calculateSimilarity(currentKeywords, noteKeywords)

      // Si similarité > 20%, considérer comme lien potentiel
      if (similarity > 20) {
        const commonKeywords = currentKeywords.filter(kw => noteKeywords.includes(kw))

        suggestions.push({
          targetNoteId: note.id,
          targetNoteTitle: note.title,
          reason: `Mots-clés communs: ${commonKeywords.slice(0, 5).join(', ')}`,
          confidence: Math.min(similarity, 100),
          keywords: commonKeywords,
        })
      }
    }

    // Trier par confiance décroissante et retourner les 5 meilleures suggestions
    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5)
  }

  /**
   * Détecter les liens avec l'aide de l'IA Mistral (optionnel, plus avancé)
   */
  async detectLinksWithAI(currentNote: Note, allNotes: Note[]): Promise<LinkSuggestion[]> {
    try {
      // Préparer un résumé des notes disponibles
      const noteSummaries = allNotes
        .filter(note => note.id !== currentNote.id && note.content.length > 50)
        .slice(0, 20) // Limiter à 20 notes pour ne pas dépasser la limite de tokens
        .map((note, idx) => `${idx + 1}. "${note.title}" - ${note.content.substring(0, 150)}...`)
        .join('\n')

      // Demander à l'IA de suggérer des liens
      const prompt = `Note actuelle: "${currentNote.title}"
Contenu: ${currentNote.content.substring(0, 500)}...

Notes disponibles:
${noteSummaries}

Analyse ces notes et identifie les 3 notes les plus pertinentes à lier avec la note actuelle. Pour chaque suggestion, donne:
- Le numéro de la note
- La raison du lien (1 phrase courte)

Format de réponse:
1. [Numéro]: [Raison]
2. [Numéro]: [Raison]
3. [Numéro]: [Raison]`

      const response = await aiService.continueText(prompt)

      // Parser la réponse de l'IA
      const suggestions: LinkSuggestion[] = []
      // SECURITY FIX: Limit line length to prevent ReDoS on regex matching
      const lines = response.split('\n').filter(line => line.length <= 500 && /^\d+\./.test(line))

      for (const line of lines) {
        // SECURITY FIX: Use safer regex with length limits for AI response parsing
        const match = line.match(/^\d{1,3}\.\s*\[?(\d{1,5})\]?:\s*(.{1,500})$/)
        if (match) {
          const noteIndex = parseInt(match[1], 10) - 1
          const reason = match[2].trim()

          if (noteIndex >= 0 && noteIndex < allNotes.length) {
            const targetNote = allNotes[noteIndex]
            suggestions.push({
              targetNoteId: targetNote.id,
              targetNoteTitle: targetNote.title,
              reason,
              confidence: 85, // Confiance IA élevée
              keywords: [],
            })
          }
        }
      }

      return suggestions
    } catch (error) {
      console.error('Erreur détection liens IA:', error)
      // Fallback sur la détection par mots-clés
      return this.detectLinks(currentNote, allNotes)
    }
  }
}

export const linkDetectionService = new LinkDetectionService()
