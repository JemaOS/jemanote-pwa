// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

import { Download, X } from 'lucide-react'
import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Vérifier si déjà installé
    if (globalThis.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // Vérifier si l'utilisateur a déjà refusé
    const hasDeclined = localStorage.getItem('pwa-install-declined')
    if (hasDeclined) {
      const declinedDate = new Date(hasDeclined)
      const now = new Date()
      const daysSinceDeclined = (now.getTime() - declinedDate.getTime()) / (1000 * 60 * 60 * 24)
      
      // Ne pas redemander avant 7 jours
      if (daysSinceDeclined < 7) {
        return
      }
    }

    // Écouter l'événement beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      
      // Attendre 30 secondes avant de montrer le prompt
      setTimeout(() => {
        setShowPrompt(true)
      }, 30000)
    }

    globalThis.addEventListener('beforeinstallprompt', handler)

    // Détecter si l'app a été installée
    globalThis.addEventListener('appinstalled', () => {
      setIsInstalled(true)
      setShowPrompt(false)
    })

    return () => {
      globalThis.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) {return}

    // Afficher le prompt d'installation natif
    deferredPrompt.prompt()

    // Attendre le choix de l'utilisateur
    const { outcome } = await deferredPrompt.userChoice
    
    if (outcome === 'accepted') {
      console.log('PWA installée')
    } else {
      console.log('Installation refusée')
      localStorage.setItem('pwa-install-declined', new Date().toISOString())
    }

    // Réinitialiser
    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem('pwa-install-declined', new Date().toISOString())
  }

  if (isInstalled || !showPrompt || !deferredPrompt) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-slide-up">
      <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-2xl p-4 laptop:p-5">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 laptop:w-12 laptop:h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
            <Download className="w-5 h-5 laptop:w-6 laptop:h-6 text-primary-600 dark:text-primary-400" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm laptop:text-base text-neutral-900 dark:text-neutral-100 mb-1">
              Installer Jemanote
            </h3>
            <p className="text-xs laptop:text-sm text-neutral-600 dark:text-neutral-400 mb-3">
              Installez l'application pour un accès rapide et une expérience optimale, même hors ligne.
            </p>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleInstall}
                className="flex-1 px-3 laptop:px-4 py-2 bg-primary-500 text-white text-sm laptop:text-base font-semibold rounded-md hover:bg-primary-600 transition-colors"
              >
                Installer
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 laptop:px-4 py-2 text-sm laptop:text-base text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
              >
                Plus tard
              </button>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded transition-colors"
            aria-label="Fermer"
          >
            <X className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
          </button>
        </div>
      </div>
    </div>
  )
}
