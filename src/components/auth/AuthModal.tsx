// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

import { Mail, Lock, X } from 'lucide-react'
import { useState } from 'react'

import { useAuth } from '@/hooks/useAuth'

// Helper function to get button text based on state
function getButtonText(loading: boolean, isLogin: boolean): string {
  if (loading) return 'Chargement...';
  return isLogin ? 'Se connecter' : "S'inscrire";
}

interface AuthModalProps {
  readonly onClose: () => void
}

export default function AuthModal({ onClose }: AuthModalProps) {
  const { signIn, signUp } = useAuth()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error: authError } = isLogin
        ? await signIn(email, password)
        : await signUp(email, password)

      if (authError) {
        setError(authError.message)
      } else {
        onClose()
      }
    } catch (err) {
      setError('Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          onClose()
        }
      }}
      tabIndex={-1}
    >
      <div className="relative w-full max-w-md">
        <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-modal p-4 sm:p-6 md:p-8">
          <button
            onClick={onClose}
            type="button"
            className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors min-w-touch min-h-touch flex items-center justify-center"
            aria-label="Fermer"
          >
            <X className="h-5 w-5 text-neutral-700 dark:text-neutral-300" />
          </button>

          <div className="mb-4 sm:mb-6">
            <h2 id="auth-modal-title" className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
              Synchronisation Cloud
            </h2>
            <p className="text-sm sm:text-base text-neutral-700 dark:text-neutral-300">
              Connectez-vous pour synchroniser vos notes sur tous vos appareils
            </p>
          </div>

          <div className="mb-4 sm:mb-6 flex gap-2">
            <button
              onClick={() => { setIsLogin(true); }}
              type="button"
              className={(() => {
                const baseClasses = 'flex-1 py-2.5 sm:py-3 px-4 rounded-lg font-semibold transition-colors text-sm sm:text-base min-h-touch'
                const activeClasses = 'bg-primary-500 text-white'
                const inactiveClasses = 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                return `${baseClasses} ${isLogin ? activeClasses : inactiveClasses}`
              })()}
            >
              Connexion
            </button>
            <button
              onClick={() => { setIsLogin(false); }}
              type="button"
              className={(() => {
                const baseClasses = 'flex-1 py-2.5 sm:py-3 px-4 rounded-lg font-semibold transition-colors text-sm sm:text-base min-h-touch'
                const activeClasses = 'bg-primary-500 text-white'
                const inactiveClasses = 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                return `${baseClasses} ${!isLogin ? activeClasses : inactiveClasses}`
              })()}
            >
              Inscription
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-500 dark:text-neutral-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); }}
                  required
                  className="w-full h-11 sm:h-12 pl-10 pr-4 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 rounded-lg text-sm sm:text-base text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="votre@email.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-500 dark:text-neutral-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); }}
                  required
                  minLength={6}
                  className="w-full h-11 sm:h-12 pl-10 pr-4 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 rounded-lg text-sm sm:text-base text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="bg-error/10 border border-error text-error px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 sm:h-12 bg-primary-500 text-white font-semibold rounded-lg hover:bg-primary-600 active:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base min-h-touch"
            >
              {getButtonText(loading, isLogin)}
            </button>

            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 text-center px-2">
              Vos notes locales seront automatiquement synchronisées après connexion
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
