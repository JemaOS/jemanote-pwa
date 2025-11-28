import React, { useMemo, useState } from 'react'
import { Note } from '@/types'
import { format, isSameDay, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { File, Clock, Plus } from 'lucide-react'
import DateFilter from './DateFilter'

interface TimelineViewProps {
  notes: Note[]
  onOpenNote: (noteId: string) => void
}

export default function TimelineView({ notes, onOpenNote }: TimelineViewProps) {
  const [sortBy, setSortBy] = useState<'updated' | 'created'>('updated')
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)

  // Filter notes by date if selected
  const filteredNotes = useMemo(() => {
    if (!selectedDate) return notes
    
    return notes.filter(note => {
      const dateStr = sortBy === 'updated' ? note.updated_at : note.created_at
      return isSameDay(parseISO(dateStr), selectedDate)
    })
  }, [notes, selectedDate, sortBy])

  // Group notes by date
  const groupedNotes = useMemo(() => {
    const groups: { date: Date; notes: Note[] }[] = []
    
    // Sort notes by selected date field desc
    const sortedNotes = [...filteredNotes].sort((a, b) => {
      const dateA = sortBy === 'updated' ? a.updated_at : a.created_at
      const dateB = sortBy === 'updated' ? b.updated_at : b.created_at
      return new Date(dateB).getTime() - new Date(dateA).getTime()
    })

    sortedNotes.forEach(note => {
      const dateStr = sortBy === 'updated' ? note.updated_at : note.created_at
      const noteDate = parseISO(dateStr)
      const existingGroup = groups.find(g => isSameDay(g.date, noteDate))
      
      if (existingGroup) {
        existingGroup.notes.push(note)
      } else {
        groups.push({ date: noteDate, notes: [note] })
      }
    })

    return groups
  }, [filteredNotes, sortBy])

  return (
    <div className="h-full w-full overflow-y-auto bg-neutral-50 dark:bg-neutral-900 p-4 sm:p-6 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-3">
            <DateFilter selectedDate={selectedDate} onSelectDate={setSelectedDate} />
            {!selectedDate && "Chronologie des notes"}
          </h2>

          <div className="flex items-center bg-white dark:bg-neutral-800 rounded-lg p-1 border border-neutral-200 dark:border-neutral-700 shadow-sm">
            <button
              onClick={() => setSortBy('updated')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
                sortBy === 'updated'
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'
              }`}
            >
              <Clock className="h-4 w-4" />
              Modifié
            </button>
            <button
              onClick={() => setSortBy('created')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
                sortBy === 'created'
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'
              }`}
            >
              <Plus className="h-4 w-4" />
              Créé
            </button>
          </div>
        </div>

        <div className="relative border-l-2 border-neutral-200 dark:border-neutral-800 ml-3.5 space-y-8">
          {groupedNotes.map((group, groupIndex) => (
            <div key={group.date.toISOString()} className="relative pl-8">
              {/* Date marker */}
              <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-primary-500 border-4 border-white dark:border-neutral-900" />
              
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4 capitalize">
                {format(group.date, 'EEEE d MMMM yyyy', { locale: fr })}
              </h3>

              <div className="space-y-3">
                {group.notes.map(note => (
                  <div
                    key={note.id}
                    onClick={() => onOpenNote(note.id)}
                    className="bg-white dark:bg-neutral-800 p-4 rounded-lg border border-neutral-200 dark:border-neutral-700 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg text-primary-600 dark:text-primary-400 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/40 transition-colors">
                        <File className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-base font-medium text-neutral-900 dark:text-neutral-100 mb-1 truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                          {note.title}
                        </h4>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-2">
                          {note.content || 'Aucun contenu'}
                        </p>
                        <div className="mt-2 text-xs text-neutral-400 dark:text-neutral-500 flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Modifié: {format(parseISO(note.updated_at), 'HH:mm')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Plus className="h-3 w-3" />
                            Créé: {format(parseISO(note.created_at), 'dd/MM/yyyy')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {filteredNotes.length === 0 && (
            <div className="pl-8 text-neutral-500 dark:text-neutral-400 italic">
              {selectedDate 
                ? "Aucune note trouvée pour cette date."
                : "Aucune note dans l'historique."
              }
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
