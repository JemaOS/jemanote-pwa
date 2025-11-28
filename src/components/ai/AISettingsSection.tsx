import { useState, useEffect } from 'react'
import { aiService } from '@/services/ai/mistralService'
import { Sparkles, Check, Server, Loader2, AlertTriangle } from 'lucide-react'

export default function AISettingsSection() {
  const [cacheStats, setCacheStats] = useState({
    cacheSize: 0,
    maxCacheSize: 100,
    historySize: 0,
    maxHistorySize: 50,
    cacheDuration: 0,
  })
  const [clearing, setClearing] = useState(false)
  const [apiStatus, setApiStatus] = useState<'checking' | 'available' | 'unavailable'>('checking')
  const [apiError, setApiError] = useState<string>('')

  // Charger les statistiques
  useEffect(() => {
    loadStats()
    checkApiStatus()
  }, [])

  const loadStats = async () => {
    const stats = await aiService.getCacheStats()
    setCacheStats(stats)
  }

  const checkApiStatus = async () => {
    try {
      // Tester avec un petit prompt
      await aiService.summarize('Test de connectivité API', 'short')
      setApiStatus('available')
      setApiError('')
    } catch (error) {
      setApiStatus('unavailable')
      if (error instanceof Error) {
        if (error.message.includes('401')) {
          setApiError('La clé API Mistral est invalide ou expirée. Le service IA est temporairement indisponible.')
        } else if (error.message.includes('Network')) {
          setApiError('Impossible de contacter l\'API Mistral. Vérifiez votre connexion internet.')
        } else {
          setApiError(`Service IA indisponible : ${error.message}`)
        }
      } else {
        setApiError('Le service IA rencontre un problème de configuration.')
      }
    }
  }

  const handleClearCache = async () => {
    setClearing(true)
    try {
      await aiService.clearCache()
      await loadStats()
    } catch (error) {
      console.error('Erreur lors du vidage du cache:', error)
    } finally {
      setClearing(false)
    }
  }

  const handleClearHistory = async () => {
    setClearing(true)
    try {
      await aiService.clearHistory()
      await loadStats()
    } catch (error) {
      console.error('Erreur lors du vidage de l\'historique:', error)
    } finally {
      setClearing(false)
    }
  }

  const handleRetryConnection = () => {
    setApiStatus('checking')
    checkApiStatus()
  }

  return (
    <div className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-4">
        <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-primary-500" />
        <h3 className="text-sm sm:text-subtitle font-semibold text-neutral-900 dark:text-neutral-100">
          Assistant IA (Mistral)
        </h3>
      </div>

      <div className="space-y-4">
        {/* Statut de l'API */}
        {apiStatus === 'checking' && (
          <div className="p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
            <div className="flex items-start gap-3">
              <Loader2 className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5 animate-spin" />
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300">
                  Vérification de la connexion à l'API Mistral...
                </p>
              </div>
            </div>
          </div>
        )}

        {apiStatus === 'available' && (
          <div className="p-3 sm:p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
            <div className="flex items-start gap-3">
              <Server className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-300">
                    Service IA opérationnel
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-green-600 dark:text-green-400">
                  L'assistant IA est configuré et connecté. Toutes les fonctionnalités sont disponibles.
                </p>
              </div>
            </div>
          </div>
        )}

        {apiStatus === 'unavailable' && (
          <div className="p-3 sm:p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-md">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                    Service IA temporairement indisponible
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-orange-600 dark:text-orange-400 mb-3">
                  {apiError}
                </p>
                <button
                  onClick={handleRetryConnection}
                  className="px-3 py-1.5 text-xs bg-orange-600 text-white hover:bg-orange-700 rounded transition-colors"
                >
                  Réessayer la connexion
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cache */}
        <div className="p-3 bg-neutral-100 dark:bg-neutral-900 rounded-md space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-700 dark:text-neutral-300">
              Réponses en cache
            </span>
            <span className="font-medium text-neutral-900 dark:text-neutral-100">
              {cacheStats.cacheSize} / {cacheStats.maxCacheSize}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-700 dark:text-neutral-300">
              Historique des résumés
            </span>
            <span className="font-medium text-neutral-900 dark:text-neutral-100">
              {cacheStats.historySize} / {cacheStats.maxHistorySize}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleClearCache}
              disabled={clearing}
              className="flex-1 px-3 py-2 text-xs sm:text-sm border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
            >
              {clearing && <Loader2 className="w-3 h-3 animate-spin" />}
              Vider le cache
            </button>
            <button
              onClick={handleClearHistory}
              disabled={clearing}
              className="flex-1 px-3 py-2 text-xs sm:text-sm border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
            >
              {clearing && <Loader2 className="w-3 h-3 animate-spin" />}
              Vider l'historique
            </button>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Les réponses sont mises en cache 24h pour améliorer les performances
          </p>
        </div>

        {/* Fonctionnalités disponibles */}
        <div className="p-3 sm:p-4 bg-primary-50 dark:bg-primary-900/20 rounded-md">
          <p className="text-xs sm:text-sm font-medium text-primary-900 dark:text-neutral-100 mb-2">
            Fonctionnalités IA disponibles:
          </p>
          <ul className="text-xs sm:text-sm text-primary-800 dark:text-neutral-200 space-y-1">
            <li className="flex items-start gap-2">
              <span className="text-primary-500 dark:text-primary-400">•</span>
              <span>Résumés automatiques (court, détaillé, bullets)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-500 dark:text-primary-400">•</span>
              <span>Historique des résumés avec réutilisation</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-500 dark:text-primary-400">•</span>
              <span>Auto-suggestion pour notes longues ({'>'}500 caractères)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-500 dark:text-primary-400">•</span>
              <span>Génération de tags intelligents</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-500 dark:text-primary-400">•</span>
              <span>Rédaction assistée (continuer, améliorer, traduire)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-500 dark:text-primary-400">•</span>
              <span>Brainstorming et génération d'idées</span>
            </li>
          </ul>
        </div>

        {/* Note de confidentialité */}
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
          <p className="text-xs text-blue-700 dark:text-blue-300">
            <strong>Confidentialité:</strong> Vos notes sont envoyées à Mistral AI uniquement lors de l'utilisation des fonctionnalités IA. 
            Elles ne sont pas stockées par Mistral et sont traitées de manière confidentielle.
          </p>
        </div>
      </div>
    </div>
  )
}
