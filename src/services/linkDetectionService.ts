// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

/**
 * Service de détection de liens intelligents entre notes
 * Utilise l'analyse de mots-clés pour suggérer des connexions pertinentes
 */

import type { Note } from '@/types';

export interface LinkSuggestion {
  targetNoteId: string;
  targetNoteTitle: string;
  reason: string;
  confidence: number; // 0-100
  keywords: string[];
}

class LinkDetectionService {
  /**
   * Extraire les mots-clés importants d'un texte
   */
  private extractKeywords(text: string): string[] {
    // Supprimer les mots courants (stop words français)
    const stopWords = new Set([
      'le',
      'la',
      'les',
      'un',
      'une',
      'des',
      'de',
      'du',
      'et',
      'ou',
      'mais',
      'donc',
      'car',
      'ni',
      'que',
      'qui',
      'quoi',
      'dont',
      'où',
      'pour',
      'par',
      'avec',
      'sans',
      'dans',
      'sur',
      'sous',
      'entre',
      'vers',
      'chez',
      'à',
      'ce',
      'cet',
      'cette',
      'ces',
      'mon',
      'ton',
      'son',
      'notre',
      'votre',
      'leur',
      'je',
      'tu',
      'il',
      'elle',
      'nous',
      'vous',
      'ils',
      'elles',
      'on',
      'être',
      'avoir',
      'faire',
      'dire',
      'pouvoir',
      'aller',
      'voir',
      'savoir',
      'est',
      'sont',
      'était',
      'a',
      'ai',
      'as',
      'ont',
      'avons',
      'avez',
    ]);

    // SECURITY FIX: Limit input size to prevent ReDoS attacks on regex processing
    // Maximum 100KB of text to process for keyword extraction
    const MAX_TEXT_LENGTH = 100000;
    const safeText = text.length > MAX_TEXT_LENGTH ? text.substring(0, MAX_TEXT_LENGTH) : text;

    // Nettoyer et extraire les mots
    // SECURITY FIX: Using a safer character class regex with length limits
    const words = safeText
      .toLowerCase()
      .replaceAll(/[^\w\sàâäéèêëïîôùûüÿæœç-]+/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.has(word));

    // Compter la fréquence des mots
    const wordFreq = new Map<string, number>();
    words.forEach(word => {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    });

    // Retourner les 15 mots les plus fréquents
    return Array.from(wordFreq.entries())
      .toSorted((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([word]) => word);
  }

  /**
   * Calculer la similarité entre deux ensembles de mots-clés
   */
  private calculateSimilarity(keywords1: string[], keywords2: string[]): number {
    if (keywords1.length === 0 || keywords2.length === 0) {
      return 0;
    }

    const set1 = new Set(keywords1);
    const set2 = new Set(keywords2);

    // Calculer l'intersection (mots communs)
    const intersection = new Set([...set1].filter(x => set2.has(x)));

    // Coefficient de Jaccard: |A ∩ B| / |A ∪ B|
    const union = new Set([...set1, ...set2]);
    const similarity = (intersection.size / union.size) * 100;

    return similarity;
  }

  /**
   * Détecter les liens potentiels pour une note donnée
   */
  detectLinks(currentNote: Note, allNotes: readonly Note[]): LinkSuggestion[] {
    if (!currentNote.content || currentNote.content.length < 50) {
      return [];
    }

    const currentKeywords = this.extractKeywords(currentNote.content);
    const suggestions: LinkSuggestion[] = [];

    // Analyser chaque note
    for (const note of allNotes) {
      // Ignorer la note courante
      if (note.id === currentNote.id) {
        continue;
      }

      // Ignorer les notes vides ou trop courtes
      if (!note.content || note.content.length < 50) {
        continue;
      }

      const noteKeywords = this.extractKeywords(note.content);
      const similarity = this.calculateSimilarity(currentKeywords, noteKeywords);

      // Si similarité > 20%, considérer comme lien potentiel
      if (similarity > 20) {
        const commonKeywords = currentKeywords.filter(kw => noteKeywords.includes(kw));

        suggestions.push({
          targetNoteId: note.id,
          targetNoteTitle: note.title,
          reason: `Mots-clés communs: ${commonKeywords.slice(0, 5).join(', ')}`,
          confidence: Math.min(similarity, 100),
          keywords: commonKeywords,
        });
      }
    }

    // Trier par confiance décroissante et retourner les 5 meilleures suggestions
    return suggestions.toSorted((a, b) => b.confidence - a.confidence).slice(0, 5);
  }
}

export const linkDetectionService = new LinkDetectionService();
