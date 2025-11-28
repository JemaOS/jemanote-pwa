import { useState } from 'react'
import { Note } from '@/types'
import { Search, X } from 'lucide-react'
import Fuse from 'fuse.js'

interface SearchViewProps {
  userId?: string | null
  notes: Note[]
  onSelectNote?: (noteId: string) => void
}

export default function SearchView({ userId, notes, onSelectNote }: SearchViewProps) {
  const [query, setQuery] = useState('')

  const fuse = new Fuse(notes, {
    keys: ['title', 'content'],
    threshold: 0.3,
    includeScore: true,
  })

  const results = query ? fuse.search(query) : []

  return (
    <div className="h-full bg-surface-bg dark:bg-neutral-900 p-8 overflow-auto">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h2 className="text-title font-bold text-neutral-900 dark:text-neutral-100 mb-4">Recherche</h2>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-neutral-500 dark:text-neutral-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher dans toutes vos notes..."
              className="w-full h-16 pl-14 pr-12 text-body-large border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-neutral-500 dark:placeholder:text-neutral-400"
              autoFocus
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-md"
              >
                <X className="h-5 w-5 text-neutral-500 dark:text-neutral-400" />
              </button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {results.length > 0 ? (
            <>
              <div className="text-body-small text-neutral-700 dark:text-neutral-300 mb-4">
                {results.length} résultat{results.length > 1 ? 's' : ''} trouvé{results.length > 1 ? 's' : ''}
              </div>
              {results.map(({ item }) => (
                <div
                  key={item.id}
                  onClick={() => onSelectNote?.(item.id)}
                  className="p-6 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:shadow-card hover:border-primary-500 dark:hover:border-primary-500 transition-all cursor-pointer"
                >
                  <h3 className="text-body-large font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                    {item.title}
                  </h3>
                  <p className="text-body text-neutral-700 dark:text-neutral-300 line-clamp-3">
                    {item.content || 'Aucun contenu'}
                  </p>
                  <div className="mt-3 text-body-small text-neutral-500 dark:text-neutral-400">
                    Modifié le {new Date(item.updated_at).toLocaleDateString('fr-FR')}
                  </div>
                </div>
              ))}
            </>
          ) : query ? (
            <div className="text-center py-12">
              <p className="text-body text-neutral-500 dark:text-neutral-400">Aucun résultat trouvé pour "{query}"</p>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-body text-neutral-500 dark:text-neutral-400">
                Commencez à taper pour rechercher dans vos notes
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
