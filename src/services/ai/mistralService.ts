// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

/**
 * Service client pour l'API Mistral AI
 * Gestion des appels API, cache IndexedDB, et gestion d'erreurs
 */

import localforage from 'localforage'

interface AIConfig {
  apiKey: string
  baseURL: string
  model: string
  maxTokens: number
  temperature: number
}

interface AIResponse {
  content: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  cached?: boolean
}

interface CacheEntry {
  prompt: string
  response: string
  timestamp: number
  expiresIn: number
}

type SummaryHistoryEntry = {
  id: string
  noteId?: string
  noteTitle?: string
  content: string
  summary: string
  summaryType: 'short' | 'detailed' | 'bullets'
  timestamp: number
}

// Configure IndexedDB pour le cache IA
const aiCache = localforage.createInstance({
  name: 'ObsidianPWA',
  storeName: 'ai_cache',
  description: 'Cache pour les réponses IA',
})

const summaryHistory = localforage.createInstance({
  name: 'ObsidianPWA',
  storeName: 'summary_history',
  description: 'Historique des résumés IA',
})

class MistralAIService {
  private readonly config: AIConfig
  private readonly CACHE_DURATION = 86_400_000 // 24 hours in milliseconds
  private readonly MAX_CACHE_SIZE = 100
  private readonly MAX_HISTORY_SIZE = 50
  private abortController: AbortController | null = null

  constructor() {
    // Configuration utilisant l'Edge Function proxy sécurisée
    this.config = {
      apiKey: '', // Non utilisée, la clé est côté serveur dans l'Edge Function
      baseURL: 'https://yadtnmgyrmigqbndnmho.supabase.co/functions/v1/mistral-proxy',
      model: 'mistral-small-latest', // Modèle par défaut accessible
      maxTokens: 2048,
      temperature: 0.7,
    }
  }

  /**
   * Configure la clé API (non utilisée, la clé est sécurisée dans l'Edge Function)
   */
  setApiKey(apiKey: string) {
    // La clé est gérée côté serveur dans l'Edge Function proxy
    console.log('Note: La clé API est sécurisée dans l\'Edge Function Supabase')
  }

  /**
   * Vérifie si l'API est configurée
   */
  isConfigured(): boolean {
    return true // Toujours configurée avec la clé maître
  }

  /**
   * Annuler la requête en cours
   */
  cancelRequest() {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
  }

  /**
   * Génère une clé de cache
   */
  private getCacheKey(prompt: string, options?: Partial<AIConfig>): string {
    const key = `${prompt}_${options?.model || this.config.model}_${options?.temperature || this.config.temperature}`
    // Utiliser encodeURIComponent au lieu de btoa pour supporter Unicode
    try {
      return btoa(encodeURIComponent(key)).substring(0, 64)
    } catch (cacheKeyError) {
      // Fallback: utiliser un hash simple si btoa échoue
      console.warn('Cache key generation failed:', cacheKeyError)
      let hash = 0
      for (let i = 0; i < key.length; i++) {
        const char = key.codePointAt(i) ?? 0
        hash = ((hash << 5) - hash) + char
        hash = hash & hash // Convert to 32bit integer
      }
      return Math.abs(hash).toString(36).substring(0, 64)
    }
  }

  /**
   * Récupère une réponse du cache IndexedDB
   */
  private async getFromCache(cacheKey: string): Promise<string | null> {
    try {
      const entry = await aiCache.getItem<CacheEntry>(cacheKey)
      if (!entry) {return null}

      const now = Date.now()
      if (now - entry.timestamp > entry.expiresIn) {
        await aiCache.removeItem(cacheKey)
        return null
      }

      return entry.response
    } catch (error) {
      console.error('Erreur lors de la récupération du cache:', error)
      return null
    }
  }

  /**
   * Ajoute une réponse au cache IndexedDB
   */
  private async addToCache(cacheKey: string, prompt: string, response: string) {
    try {
      await aiCache.setItem(cacheKey, {
        prompt,
        response,
        timestamp: Date.now(),
        expiresIn: this.CACHE_DURATION,
      })
      
      // Limiter la taille du cache
      const keys = await aiCache.keys()
      if (keys.length > this.MAX_CACHE_SIZE) {
        // Récupérer toutes les entrées
        const entries: Array<[string, CacheEntry]> = []
        for (const key of keys) {
          const entry = await aiCache.getItem<CacheEntry>(key)
          if (entry) {entries.push([key, entry])}
        }
        
        // Trier par timestamp (les plus récents en premier)
        entries.sort((a, b) => b[1].timestamp - a[1].timestamp)
        
        // Supprimer les plus anciens
        const toDelete = entries.slice(this.MAX_CACHE_SIZE)
        for (const [key] of toDelete) {
          await aiCache.removeItem(key)
        }
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du cache:', error)
    }
  }

  /**
   * Appel API générique avec retry et gestion d'erreurs
   */
  private async callAPI(
    prompt: string,
    systemPrompt?: string,
    options?: Partial<AIConfig>,
    onProgress?: (progress: number) => void,
    skipCache?: boolean
  ): Promise<AIResponse> {
    if (!this.isConfigured()) {
      throw new Error('Clé API Mistral non configurée. Veuillez configurer la clé dans les paramètres.')
    }

    const cacheKey = this.getCacheKey(prompt, options)
    
    if (!skipCache) {
      const cached = await this.getFromCache(cacheKey)
      
      if (cached) {
        onProgress?.(100)
        return {
          content: cached,
          cached: true,
        }
      }
    }

    try {
      // Créer un nouveau AbortController pour cette requête
      this.abortController = new AbortController()
      
      onProgress?.(20)
      
      console.log('[MISTRAL] Appel API - URL:', this.config.baseURL)
      console.log('[MISTRAL] Modèle:', options?.model || this.config.model)
      console.log('[MISTRAL] Prompt (100 premiers caractères):', prompt.substring(0, 100))
      
      // Appeler l'Edge Function proxy Supabase (nécessite apikey ET Authorization)
      const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhZHRubWd5cm1pZ3FibmRubWhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NTEzMzMsImV4cCI6MjA3OTIyNzMzM30.0gGlLbXOBSvHEDY0RDApSGWELc5sAEJ4C_hwbPb7FOQ'
      
      const response = await fetch(this.config.baseURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({
          model: options?.model || this.config.model,
          messages: [
            ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
            { role: 'user', content: prompt },
          ],
          max_tokens: options?.maxTokens || this.config.maxTokens,
          temperature: options?.temperature ?? this.config.temperature,
        }),
        signal: this.abortController.signal,
      })

      console.log('[MISTRAL] Réponse HTTP status:', response.status)
      
      onProgress?.(60)

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        console.error('[MISTRAL] Erreur réponse:', response.status, error)
        
        // Messages d'erreur spécifiques selon le code HTTP
        let errorMessage = ''
        switch (response.status) {
          case 401:
            errorMessage = 'Clé API Mistral invalide ou expirée. Veuillez vérifier votre configuration ou contacter le support.'
            break
          case 429:
            errorMessage = 'Quota API dépassé. Veuillez réessayer plus tard ou mettre à niveau votre plan Mistral.'
            break
          case 500:
          case 502:
          case 503:
            errorMessage = 'Serveur Mistral temporairement indisponible. Veuillez réessayer dans quelques instants.'
            break
          case 400:
            errorMessage = `Requête invalide: ${error.error?.message || 'Paramètres incorrects'}`
            break
          default:
            errorMessage = error.error?.message || `Erreur API (code ${response.status})`
        }
        
        throw new Error(errorMessage)
      }

      const data = await response.json()
      // L'Edge Function retourne { data: responseData }
      const content = data.data?.choices[0]?.message?.content || ''

      console.log('[MISTRAL] Réponse réussie - Longueur contenu:', content.length)
      console.log('[MISTRAL] Contenu (100 premiers caractères):', content.substring(0, 100))
      
      onProgress?.(80)

      // Mettre en cache
      await this.addToCache(cacheKey, prompt, content)

      onProgress?.(100)

      return {
        content,
        usage: data.data?.usage,
        cached: false,
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Génération annulée')
      }
      console.error('Erreur API Mistral:', error)
      throw error
    } finally {
      this.abortController = null
    }
  }

  /**
   * Générer un résumé de texte
   */
  async summarize(
    text: string,
    type: 'short' | 'detailed' | 'bullets' = 'detailed',
    onProgress?: (progress: number) => void
  ): Promise<string> {
    const systemPrompts = {
      short: 'Tu es un assistant qui génère des résumés courts et concis (2-3 phrases maximum).',
      detailed: 'Tu es un assistant qui génère des résumés détaillés et structurés.',
      bullets: 'Tu es un assistant qui génère des résumés sous forme de points clés (bullet points).',
    }

    const userPrompts = {
      short: `Résume ce texte en 2-3 phrases maximum:\n\n${text}`,
      detailed: `Génère un résumé détaillé et structuré de ce texte:\n\n${text}`,
      bullets: `Génère un résumé sous forme de points clés de ce texte:\n\n${text}`,
    }

    const response = await this.callAPI(userPrompts[type], systemPrompts[type], undefined, onProgress)
    return response.content
  }

  /**
   * Continuer un texte
   */
  async continueText(text: string, context?: string): Promise<string> {
    const systemPrompt = 'Tu es un assistant de rédaction qui aide à continuer et développer des idées de manière cohérente et naturelle.'
    
    const prompt = context
      ? `Contexte: ${context}\n\nTexte à continuer: ${text}\n\nContinue ce texte de manière naturelle et cohérente.`
      : `Continue ce texte de manière naturelle et cohérente:\n\n${text}`

    const response = await this.callAPI(prompt, systemPrompt, undefined, undefined, true)
    return response.content
  }

  /**
   * Améliorer un texte
   */
  async improveText(text: string): Promise<string> {
    const systemPrompt = 'Tu es un assistant de rédaction qui améliore la clarté, la structure et le style des textes.'
    const prompt = `Améliore ce texte pour le rendre plus clair, mieux structuré et professionnel:\n\n${text}`

    const response = await this.callAPI(prompt, systemPrompt, undefined, undefined, true)
    return response.content
  }

  /**
   * Changer le ton d'un texte
   */
  async changeTone(
    text: string,
    tone: 'formal' | 'informal' | 'professional' | 'persuasive'
  ): Promise<string> {
    const toneDescriptions = {
      formal: 'formel et académique',
      informal: 'décontracté et accessible',
      professional: 'professionnel et technique',
      persuasive: 'persuasif et convaincant',
    }

    const systemPrompt = `Tu es un assistant de rédaction qui adapte le ton des textes.`
    const prompt = `Réécris ce texte avec un ton ${toneDescriptions[tone]}:\n\n${text}`

    const response = await this.callAPI(prompt, systemPrompt, undefined, undefined, true)
    return response.content
  }

  /**
   * Traduire un texte
   */
  async translate(text: string, targetLanguage: string): Promise<string> {
    const systemPrompt = 'Tu es un traducteur professionnel qui traduit les textes avec précision.'
    const prompt = `Traduis ce texte en ${targetLanguage}:\n\n${text}`

    const response = await this.callAPI(prompt, systemPrompt, undefined, undefined, true)
    return response.content
  }

  /**
   * Générer des tags pour un texte
   */
  async generateTags(text: string, maxTags: number = 5): Promise<string[]> {
    const systemPrompt = 'Tu es un assistant qui génère des tags pertinents pour classer et organiser des notes.'
    const prompt = `Génère ${maxTags} tags pertinents pour ce texte. Réponds uniquement avec les tags séparés par des virgules:\n\n${text}`

    const response = await this.callAPI(prompt, systemPrompt, { temperature: 0.5 })
    
    // Parser les tags
    const tags = response.content
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)
      .slice(0, maxTags)

    return tags
  }

  /**
   * Générer des idées de brainstorming
   */
  async generateIdeas(topic: string, context?: string): Promise<string[]> {
    const systemPrompt = 'Tu es un assistant créatif qui génère des idées innovantes et pertinentes pour le brainstorming.'
    
    const prompt = context
      ? `Contexte: ${context}\n\nSujet: ${topic}\n\nGénère 10 idées créatives et pertinentes liées à ce sujet. Réponds avec une idée par ligne.`
      : `Génère 10 idées créatives et pertinentes sur le sujet suivant: ${topic}\n\nRéponds avec une idée par ligne.`

    const response = await this.callAPI(prompt, systemPrompt, { temperature: 0.9 })
    
    // Parser les idées
    const ideas = response.content
      .split('\n')
      .map(idea => {
        const trimmed = idea.trim()
        // Remove leading bullets like *, 1., - etc.
        return trimmed.replace(/^[*\d.-]+\s*/, '')
      })
      .filter(idea => idea.length > 0)

    return ideas
  }

  /**
   * Synthétiser plusieurs notes
   */
  async synthesizeNotes(notes: Array<{ title: string; content: string }>): Promise<string> {
    const systemPrompt = 'Tu es un assistant qui synthétise plusieurs notes en un document cohérent et structuré.'
    
    const notesText = notes
      .map((note, i) => `Note ${i + 1}: ${note.title}\n${note.content}`)
      .join('\n\n---\n\n')

    const prompt = `Synthétise ces notes en un document cohérent et bien structuré:\n\n${notesText}`

    const response = await this.callAPI(prompt, systemPrompt, { maxTokens: 4096 })
    return response.content
  }

  /**
   * Sauvegarder un résumé dans l'historique
   */
  async saveSummaryToHistory(
    noteId: string | undefined,
    noteTitle: string | undefined,
    content: string,
    summary: string,
    summaryType: 'short' | 'detailed' | 'bullets'
  ) {
    try {
      const id = crypto.randomUUID()
      const entry: SummaryHistoryEntry = {
        id,
        noteId,
        noteTitle,
        content: content.substring(0, 500), // Limiter la taille
        summary,
        summaryType,
        timestamp: Date.now(),
      }
      
      await summaryHistory.setItem(id, entry)
      
      // Limiter la taille de l'historique
      const keys = await summaryHistory.keys()
      if (keys.length > this.MAX_HISTORY_SIZE) {
        const entries: Array<[string, SummaryHistoryEntry]> = []
        for (const key of keys) {
          const item = await summaryHistory.getItem<SummaryHistoryEntry>(key)
          if (item) {entries.push([key, item])}
        }
        
        entries.sort((a, b) => b[1].timestamp - a[1].timestamp)
        
        const toDelete = entries.slice(this.MAX_HISTORY_SIZE)
        for (const [key] of toDelete) {
          await summaryHistory.removeItem(key)
        }
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de l\'historique:', error)
    }
  }

  /**
   * Récupérer l'historique des résumés
   */
  async getSummaryHistory(limit: number = 10): Promise<SummaryHistoryEntry[]> {
    try {
      const keys = await summaryHistory.keys()
      const entries: SummaryHistoryEntry[] = []
      
      for (const key of keys) {
        const entry = await summaryHistory.getItem<SummaryHistoryEntry>(key)
        if (entry) {entries.push(entry)}
      }
      
      entries.sort((a, b) => b.timestamp - a.timestamp)
      return entries.slice(0, limit)
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'historique:', error)
      return []
    }
  }

  /**
   * Nettoyer le cache
   */
  async clearCache() {
    try {
      await aiCache.clear()
    } catch (error) {
      console.error('Erreur lors du nettoyage du cache:', error)
    }
  }

  /**
   * Nettoyer l'historique
   */
  async clearHistory() {
    try {
      await summaryHistory.clear()
    } catch (error) {
      console.error('Erreur lors du nettoyage de l\'historique:', error)
    }
  }

  /**
   * Obtenir les statistiques du cache
   */
  async getCacheStats() {
    try {
      const cacheKeys = await aiCache.keys()
      const historyKeys = await summaryHistory.keys()
      
      return {
        cacheSize: cacheKeys.length,
        maxCacheSize: this.MAX_CACHE_SIZE,
        historySize: historyKeys.length,
        maxHistorySize: this.MAX_HISTORY_SIZE,
        cacheDuration: this.CACHE_DURATION,
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error)
      return {
        cacheSize: 0,
        maxCacheSize: this.MAX_CACHE_SIZE,
        historySize: 0,
        maxHistorySize: this.MAX_HISTORY_SIZE,
        cacheDuration: this.CACHE_DURATION,
      }
    }
  }
}

// Instance singleton
export const aiService = new MistralAIService()
export type { AIResponse, AIConfig, SummaryHistoryEntry }
