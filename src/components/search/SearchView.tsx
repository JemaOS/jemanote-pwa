// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

import { Search, X } from 'lucide-react'
import { useState } from 'react'

import { Note } from '@/types'

interface SearchViewProps {
  readonly userId?: string | null
  readonly notes: readonly Note[]
  readonly searchQuery?: string
  readonly onSearchQueryChange?: (query: string) => void
  readonly onSelectNote?: (noteId: string) => void
}

// Helper function to get result count text
function getResultCountText(count: number): string {
  const suffix = count > 1 ? 's' : '';
  return `${count} résultat${suffix} trouvé${suffix}`;
}

export default function SearchView({ userId, notes, searchQuery = '', onSearchQueryChange, onSelectNote }: SearchViewProps) {
  // Use controlled query from props if provided, otherwise use local state
  const [localQuery, setLocalQuery] = useState('')
  const query = searchQuery !== undefined && onSearchQueryChange ? searchQuery : localQuery
  const setQuery = onSearchQueryChange || setLocalQuery

  // Simple case-insensitive partial word matching
  const filteredNotes = query
    ? notes.filter(note => {
        const searchTerm = query.toLowerCase()
        const titleMatch = note.title.toLowerCase().includes(searchTerm)
        const contentMatch = note.content.toLowerCase().includes(searchTerm)
        return titleMatch || contentMatch
      })
    : []

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
              onChange={(e) => { setQuery(e.target.value); }}
              placeholder="Rechercher dans toutes vos notes..."
              className="w-full h-16 pl-14 pr-12 text-body-large border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-neutral-500 dark:placeholder:text-neutral-400"
              autoFocus
            />
            {query && (
              <button
                onClick={() => { setQuery(''); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-md"
              >
                <X className="h-5 w-5 text-neutral-500 dark:text-neutral-400" />
              </button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {(() => {
            if (filteredNotes.length > 0) {
              return (
                <>
                  <div className="text-body-small text-neutral-700 dark:text-neutral-300 mb-4">
                    {getResultCountText(filteredNotes.length)}
                  </div>
                  {filteredNotes.map((note) => (
                    <button
                      key={note.id}
                      type="button"
                      onClick={() => onSelectNote?.(note.id)}
                      className="w-full text-left p-6 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:shadow-card hover:border-primary-500 dark:hover:border-primary-500 transition-all cursor-pointer"
                    >
                      <h3 className="text-body-large font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                        {note.title}
                      </h3>
                      <p className="text-body text-neutral-700 dark:text-neutral-300 line-clamp-3">
                        {note.content || 'Aucun contenu'}
                      </p>
                      <div className="mt-3 text-body-small text-neutral-500 dark:text-neutral-400">
                        Modifié le {new Date(note.updated_at).toLocaleDateString('fr-FR')}
                      </div>
                    </button>
                  ))}
                </>
              )
            }
            if (query) {
              return (
                <div className="text-center py-12">
                  <p className="text-body text-neutral-500 dark:text-neutral-400">Aucun résultat trouvé pour "{query}"</p>
                </div>
              )
            }
            return (
              <div className="text-center py-12">
                <p className="text-body text-neutral-500 dark:text-neutral-400">
                  Commencez à taper pour rechercher dans vos notes
                </p>
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}
