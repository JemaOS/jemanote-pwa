// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

import { Mail, Lock } from 'lucide-react'
import { useState } from 'react'

import { useAuth } from '@/hooks/useAuth'

// Helper function to get button text based on state
function getButtonText(loading: boolean, isLogin: boolean): string {
  if (loading) {return 'Chargement...';}
  return isLogin ? 'Se connecter' : "S'inscrire";
}

export default function AuthView() {
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
      }
    } catch {
      setError('Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-900 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-title font-bold text-neutral-900 dark:text-neutral-100 mb-2">
            Obsidian PWA
          </h1>
          <p className="text-body text-neutral-700 dark:text-neutral-300">
            Application de prise de notes professionnelle
          </p>
        </div>

        <div className="bg-surface-bg dark:bg-neutral-800 rounded-lg shadow-card p-8">
          <div className="mb-6 flex gap-2">
            <button
              onClick={() => { setIsLogin(true); }}
              className={(() => {
                const baseClasses = 'flex-1 py-2 px-4 rounded-md font-semibold transition-colors'
                const activeClasses = 'bg-primary-500 text-white'
                const inactiveClasses = 'bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600'
                return `${baseClasses} ${isLogin ? activeClasses : inactiveClasses}`
              })()}
            >
              Connexion
            </button>
            <button
              onClick={() => { setIsLogin(false); }}
              className={(() => {
                const baseClasses = 'flex-1 py-2 px-4 rounded-md font-semibold transition-colors'
                const activeClasses = 'bg-primary-500 text-white'
                const inactiveClasses = 'bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600'
                return `${baseClasses} ${isLogin ? inactiveClasses : activeClasses}`
              })()}
            >
              Inscription
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-body-small font-medium text-neutral-700 dark:text-neutral-300 mb-1">
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
                  className="w-full h-12 pl-10 pr-4 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 rounded-md text-body focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-neutral-500 dark:placeholder:text-neutral-400"
                  placeholder="votre@email.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-body-small font-medium text-neutral-700 dark:text-neutral-300 mb-1">
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
                  className="w-full h-12 pl-10 pr-4 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 rounded-md text-body focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-neutral-500 dark:placeholder:text-neutral-400"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="bg-error/10 border border-error text-error px-4 py-3 rounded-md text-body-small">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-primary-500 text-white font-semibold rounded-md hover:bg-primary-600 active:bg-primary-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {getButtonText(loading, isLogin)}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
