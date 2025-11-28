import { useState, useEffect } from 'react'
import { Note, Folder } from '@/types'
import { File, Folder as FolderIcon, Plus, ChevronDown, ChevronRight, Edit2, Trash2, Check, X, FolderPlus, FolderInput, RotateCcw, Trash } from 'lucide-react'
import { LocalStorage } from '@/lib/localStorage'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'

interface SidebarProps {
  side: 'left' | 'right'
  userId?: string | null
  activeNoteId?: string | null
  onNoteSelect?: (noteId: string) => void
  notes?: Note[]
  trashNotes?: Note[]
  createNote?: (title: string, content?: string, folderId?: string) => Promise<any>
  updateNote?: (noteId: string, updates: Partial<Note>) => Promise<any>
  deleteNote?: (noteId: string) => Promise<any>
  restoreNote?: (noteId: string) => Promise<any>
  permanentlyDeleteNote?: (noteId: string) => Promise<any>
}

export default function Sidebar({ 
  side, 
  userId, 
  activeNoteId, 
  onNoteSelect,
  notes = [],
  trashNotes = [],
  createNote,
  updateNote,
  deleteNote,
  restoreNote,
  permanentlyDeleteNote
}: SidebarProps) {
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [folders, setFolders] = useState<Folder[]>([])
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['root']))
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null)
  const [editingFolderName, setEditingFolderName] = useState('')
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null)
  const [dropTargetFolderId, setDropTargetFolderId] = useState<string | null>(null)
  const [trashOpen, setTrashOpen] = useState(false)

  // Charger les dossiers au montage
  useEffect(() => {
    loadFolders()
  }, [])

  const loadFolders = async () => {
    const foldersData = await LocalStorage.getFolders()
    setFolders(foldersData)
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return

    try {
      const folder: Folder = {
        id: crypto.randomUUID(),
        user_id: userId || 'local',
        name: newFolderName.trim(),
        path: `/${newFolderName.trim()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      await LocalStorage.saveFolder(folder)
      await loadFolders()
      setNewFolderName('')
      setCreatingFolder(false)
      setExpandedFolders(prev => new Set(prev).add(folder.id))
    } catch (error) {
      console.error('Erreur lors de la création du dossier:', error)
    }
  }

  const handleDeleteFolder = async (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    
    const confirmed = window.confirm('Supprimer ce dossier ? Les notes seront déplacées vers "Sans dossier".')
    if (!confirmed) return

    try {
      // Déplacer les notes du dossier vers "root"
      const notesToUpdate = notes.filter(n => n.folder_id === folderId)
      for (const note of notesToUpdate) {
        if (updateNote) {
          await updateNote(note.id, { folder_id: undefined })
        }
      }

      await LocalStorage.deleteFolder(folderId)
      await loadFolders()
    } catch (error) {
      console.error('Erreur lors de la suppression du dossier:', error)
    }
  }

  const handleRenameFolder = async (folderId: string) => {
    if (!editingFolderName.trim()) {
      setEditingFolderId(null)
      return
    }

    try {
      const folder = folders.find(f => f.id === folderId)
      if (folder) {
        const updated: Folder = {
          ...folder,
          name: editingFolderName.trim(),
          path: `/${editingFolderName.trim()}`,
          updated_at: new Date().toISOString(),
        }
        await LocalStorage.saveFolder(updated)
        await loadFolders()
      }
      setEditingFolderId(null)
      setEditingFolderName('')
    } catch (error) {
      console.error('Erreur lors du renommage du dossier:', error)
    }
  }

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev)
      if (next.has(folderId)) {
        next.delete(folderId)
      } else {
        next.add(folderId)
      }
      return next
    })
  }

  const moveNoteToFolder = async (noteId: string, folderId: string | undefined) => {
    if (!updateNote) return
    try {
      await updateNote(noteId, { folder_id: folderId })
    } catch (error) {
      console.error('Erreur lors du déplacement de la note:', error)
    }
  }

  const handleCreateNoteInFolder = async (folderId: string | undefined) => {
    if (!createNote) return
    const title = `Note ${new Date().toLocaleDateString('fr-FR')}`
    const { data } = await createNote(title, '', folderId)
    if (data && onNoteSelect) {
      onNoteSelect(data.id)
    }
  }

  const handleDragStart = (noteId: string, e: React.DragEvent) => {
    setDraggedNoteId(noteId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', noteId)
  }

  const handleDragEnd = () => {
    setDraggedNoteId(null)
    setDropTargetFolderId(null)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (folderId: string | undefined, e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (draggedNoteId) {
      await moveNoteToFolder(draggedNoteId, folderId)
    }
    
    setDraggedNoteId(null)
    setDropTargetFolderId(null)
  }

  const handleDragEnter = (folderId: string | undefined, e: React.DragEvent) => {
    e.preventDefault()
    setDropTargetFolderId(folderId || 'root')
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    // Only clear if we're actually leaving the folder (not entering a child)
    if (e.currentTarget === e.target) {
      setDropTargetFolderId(null)
    }
  }

  const handleCreateNote = async () => {
    if (!createNote) return
    const title = `Note ${new Date().toLocaleDateString('fr-FR')}`
    const { data } = await createNote(title, '')
    if (data && onNoteSelect) {
      onNoteSelect(data.id)
    }
  }

  const startEditing = (note: Note, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingNoteId(note.id)
    setEditingTitle(note.title)
  }

  const cancelEditing = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingNoteId(null)
    setEditingTitle('')
  }

  const saveEditing = async (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!updateNote || !editingTitle.trim()) {
      setEditingNoteId(null)
      return
    }

    try {
      await updateNote(noteId, { title: editingTitle.trim() })
      setEditingNoteId(null)
      setEditingTitle('')
    } catch (error) {
      console.error('Erreur lors du renommage:', error)
    }
  }

  const handleKeyDown = async (e: React.KeyboardEvent, noteId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (!updateNote || !editingTitle.trim()) {
        setEditingNoteId(null)
        return
      }

      try {
        await updateNote(noteId, { title: editingTitle.trim() })
        setEditingNoteId(null)
        setEditingTitle('')
      } catch (error) {
        console.error('Erreur lors du renommage:', error)
      }
    } else if (e.key === 'Escape') {
      setEditingNoteId(null)
      setEditingTitle('')
    }
  }

  const handleDeleteNote = async (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!deleteNote) return

    const confirmed = window.confirm('Êtes-vous sûr de vouloir supprimer cette note ?')
    if (confirmed) {
      try {
        await deleteNote(noteId)
      } catch (error) {
        console.error('Erreur lors de la suppression:', error)
      }
    }
  }

  const handleRestoreNote = async (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!restoreNote) return
    try {
      await restoreNote(noteId)
    } catch (error) {
      console.error('Erreur lors de la restauration:', error)
    }
  }

  const handlePermanentlyDeleteNote = async (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!permanentlyDeleteNote) return
    
    const confirmed = window.confirm('Cette action est irréversible. Supprimer définitivement ?')
    if (confirmed) {
      try {
        await permanentlyDeleteNote(noteId)
      } catch (error) {
        console.error('Erreur lors de la suppression définitive:', error)
      }
    }
  }

  // Helper function to render a note
  const renderNote = (note: Note) => (
    <div
      key={note.id}
      draggable
      onDragStart={(e) => handleDragStart(note.id, e)}
      onDragEnd={handleDragEnd}
      className={`group relative flex items-center rounded-lg transition-all ${
        draggedNoteId === note.id 
          ? 'opacity-50' 
          : ''
      } ${
        activeNoteId === note.id
          ? 'bg-primary-100 dark:bg-primary-900/30 border-l-4 border-primary-500'
          : 'hover:bg-neutral-200 dark:hover:bg-neutral-800'
      } cursor-move`}
    >
      {editingNoteId === note.id ? (
        // Edit mode
        <div className="flex items-center gap-1 xs:gap-1.5 w-full px-1.5 xs:px-2 sm:px-2 laptop:px-3 py-1.5 xs:py-2 sm:py-2 laptop:py-2.5 min-h-[44px]" onClick={(e) => e.stopPropagation()}>
          <File className="h-3.5 w-3.5 xs:h-4 xs:w-4 sm:h-4 sm:w-4 laptop:h-4.5 laptop:w-4.5 flex-shrink-0 text-neutral-500 dark:text-neutral-400" />
          <input
            type="text"
            value={editingTitle}
            onChange={(e) => setEditingTitle(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, note.id)}
            className="flex-1 min-w-0 text-xs xs:text-sm sm:text-sm laptop:text-base bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border border-primary-500 rounded px-1.5 xs:px-2 sm:px-2 laptop:px-2.5 py-1 xs:py-1.5 outline-none focus:ring-2 focus:ring-primary-500"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={(e) => saveEditing(note.id, e)}
            className="flex-shrink-0 p-1 xs:p-1.5 sm:p-1.5 laptop:p-2 hover:bg-green-100 dark:hover:bg-green-900/30 rounded text-green-600 dark:text-green-400 min-w-[36px] min-h-[36px] xs:min-w-[40px] xs:min-h-[40px] flex items-center justify-center"
            title="Sauvegarder"
          >
            <Check className="h-3.5 w-3.5 xs:h-4 xs:w-4 sm:h-4 sm:w-4 laptop:h-4.5 laptop:w-4.5" />
          </button>
          <button
            onClick={cancelEditing}
            className="flex-shrink-0 p-1 xs:p-1.5 sm:p-1.5 laptop:p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-600 dark:text-red-400 min-w-[36px] min-h-[36px] xs:min-w-[40px] xs:min-h-[40px] flex items-center justify-center"
            title="Annuler"
          >
            <X className="h-3.5 w-3.5 xs:h-4 xs:w-4 sm:h-4 sm:w-4 laptop:h-4.5 laptop:w-4.5" />
          </button>
        </div>
      ) : (
        // Normal mode - Tout dans un seul conteneur flex
        <div className="flex items-center w-full min-h-[44px] gap-1">
          <button
            onClick={() => onNoteSelect?.(note.id)}
            className="flex-1 min-w-0 flex items-center gap-1.5 xs:gap-2 sm:gap-2 laptop:gap-2.5 px-2 xs:px-2.5 sm:px-3 laptop:px-3 py-2 xs:py-2.5 sm:py-2.5 laptop:py-2.5 text-left"
          >
            <File className="h-3.5 w-3.5 xs:h-4 xs:w-4 sm:h-4 sm:w-4 laptop:h-4.5 laptop:w-4.5 flex-shrink-0" />
            <span className={`text-xs xs:text-sm sm:text-sm laptop:text-sm truncate ${
              activeNoteId === note.id
                ? 'text-primary-600 dark:text-primary-400 font-medium'
                : 'text-neutral-900 dark:text-neutral-100'
            }`}>
              {note.title}
            </span>
          </button>
          
          {/* Action buttons */}
          <div className="flex items-center gap-0.5 pr-1 xs:pr-1.5 laptop:pr-2 flex-shrink-0">
            <div className="relative">
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button
                    className="p-1 laptop:p-1.5 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded text-purple-600 dark:text-purple-400 min-w-[32px] min-h-[32px] laptop:min-w-[36px] laptop:min-h-[36px] flex items-center justify-center transition-colors outline-none"
                    title="Déplacer vers..."
                    onClick={(e) => e.stopPropagation()}
                  >
                    <FolderInput className="h-3.5 w-3.5 laptop:h-4 laptop:w-4" />
                  </button>
                </DropdownMenu.Trigger>

                <DropdownMenu.Portal>
                  <DropdownMenu.Content 
                    className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg z-50 min-w-[160px] xs:min-w-[180px] py-1"
                    sideOffset={5}
                    align="end"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DropdownMenu.Item 
                      className="w-full px-2.5 xs:px-3 py-1.5 xs:py-2 text-left text-xs xs:text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center gap-1.5 xs:gap-2 outline-none cursor-pointer text-neutral-700 dark:text-neutral-300"
                      onSelect={() => moveNoteToFolder(note.id, undefined)}
                    >
                      <FolderIcon className="h-3.5 w-3.5 xs:h-4 xs:w-4" />
                      <span>Sans dossier</span>
                    </DropdownMenu.Item>
                    
                    {folders.map((folder) => (
                      <DropdownMenu.Item
                        key={folder.id}
                        className="w-full px-2.5 xs:px-3 py-1.5 xs:py-2 text-left text-xs xs:text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center gap-1.5 xs:gap-2 outline-none cursor-pointer text-neutral-700 dark:text-neutral-300"
                        onSelect={() => moveNoteToFolder(note.id, folder.id)}
                      >
                        <FolderIcon className="h-3.5 w-3.5 xs:h-4 xs:w-4" />
                        <span>{folder.name}</span>
                      </DropdownMenu.Item>
                    ))}
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </div>
            
            <button
              onClick={(e) => startEditing(note, e)}
              className="p-1 laptop:p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded text-blue-600 dark:text-blue-400 min-w-[32px] min-h-[32px] laptop:min-w-[36px] laptop:min-h-[36px] flex items-center justify-center transition-colors"
              title="Renommer"
            >
              <Edit2 className="h-3.5 w-3.5 laptop:h-4 laptop:w-4" />
            </button>
            <button
              onClick={(e) => handleDeleteNote(note.id, e)}
              className="p-1 laptop:p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-600 dark:text-red-400 min-w-[32px] min-h-[32px] laptop:min-w-[36px] laptop:min-h-[36px] flex items-center justify-center transition-colors"
              title="Supprimer"
            >
              <Trash2 className="h-3.5 w-3.5 laptop:h-4 laptop:w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )

  if (side === 'left') {
    return (
      <div className="w-full h-full bg-neutral-100 dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 flex flex-col overflow-hidden">
        {/* Header with "New Note" button */}
        <div className="p-2 xs:p-2.5 sm:p-3 md:p-4 laptop-sm:p-4 laptop:p-5 laptop-lg:p-6 border-b border-neutral-200 dark:border-neutral-800 flex-shrink-0">
          <button
            onClick={handleCreateNote}
            className="w-full min-h-[44px] bg-primary-500 text-white rounded-lg hover:bg-primary-600 active:bg-primary-700 transition-colors flex items-center justify-center gap-1.5 xs:gap-2 font-semibold text-sm xs:text-sm sm:text-base py-2 xs:py-2.5 sm:py-2.5 laptop:py-3 laptop-lg:py-3.5"
          >
            <Plus className="h-4 w-4 xs:h-4 xs:w-4 sm:h-4.5 sm:w-4.5 laptop:h-5 laptop:w-5" />
            <span>Nouvelle note</span>
          </button>
        </div>

        {/* Notes list with folders */}
        <div className="flex-1 overflow-y-auto p-1.5 xs:p-2 sm:p-2.5 md:p-3 laptop-sm:p-3 laptop:p-4">
          {/* Bouton créer un dossier */}
          <div className="mb-2 xs:mb-2.5 sm:mb-3">
            {!creatingFolder ? (
              <button
                onClick={() => setCreatingFolder(true)}
                className="w-full flex items-center gap-1.5 xs:gap-2 px-1.5 xs:px-2 sm:px-2 laptop:px-3 py-1 xs:py-1.5 sm:py-1.5 laptop:py-2 text-xs sm:text-xs laptop:text-sm text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-md transition-colors"
              >
                <FolderPlus className="h-3.5 w-3.5 xs:h-4 xs:w-4 sm:h-4 sm:w-4 laptop:h-4.5 laptop:w-4.5" />
                <span>Nouveau dossier</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 xs:gap-2 px-1.5 xs:px-2 py-1 xs:py-1.5">
                <FolderIcon className="h-3.5 w-3.5 xs:h-4 xs:w-4 flex-shrink-0 text-neutral-500" />
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateFolder()
                    if (e.key === 'Escape') {
                      setCreatingFolder(false)
                      setNewFolderName('')
                    }
                  }}
                  placeholder="Nom du dossier..."
                  className="flex-1 text-xs xs:text-sm bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border border-primary-500 rounded px-1.5 xs:px-2 py-0.5 xs:py-1 outline-none focus:ring-2 focus:ring-primary-500"
                  autoFocus
                />
                <button
                  onClick={handleCreateFolder}
                  className="p-1 xs:p-1.5 hover:bg-green-100 dark:hover:bg-green-900/30 rounded text-green-600"
                >
                  <Check className="h-3.5 w-3.5 xs:h-4 xs:w-4" />
                </button>
                <button
                  onClick={() => {
                    setCreatingFolder(false)
                    setNewFolderName('')
                  }}
                  className="p-1 xs:p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-600"
                >
                  <X className="h-3.5 w-3.5 xs:h-4 xs:w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Liste des dossiers */}
          {folders.map((folder) => {
            const folderNotes = notes.filter(n => n.folder_id === folder.id)
            const isExpanded = expandedFolders.has(folder.id)
            const isDropTarget = dropTargetFolderId === folder.id
            
            return (
              <div key={folder.id} className="mb-1.5 xs:mb-2">
                <div
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(folder.id, e)}
                  onDragEnter={(e) => handleDragEnter(folder.id, e)}
                  onDragLeave={handleDragLeave}
                  className={`rounded-md transition-colors ${
                    isDropTarget ? 'bg-primary-100 dark:bg-primary-900/30 ring-2 ring-primary-500' : ''
                  }`}
                >
                  <button
                    onClick={() => toggleFolder(folder.id)}
                    className="w-full flex items-center gap-1.5 xs:gap-2 px-1.5 xs:px-2 sm:px-2 laptop:px-3 py-1 xs:py-1.5 sm:py-1.5 laptop:py-2 text-xs sm:text-xs laptop:text-sm font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-md transition-colors group"
                  >
                  <ChevronRight
                    className={`h-3.5 w-3.5 xs:h-4 xs:w-4 flex-shrink-0 transition-transform ${
                      isExpanded ? 'rotate-90' : ''
                    }`}
                  />
                  <FolderIcon className="h-3.5 w-3.5 xs:h-4 xs:w-4 sm:h-4 sm:w-4 laptop:h-4.5 laptop:w-4.5 flex-shrink-0" />
                  
                  {editingFolderId === folder.id ? (
                    <input
                      type="text"
                      value={editingFolderName}
                      onChange={(e) => setEditingFolderName(e.target.value)}
                      onKeyDown={(e) => {
                        e.stopPropagation()
                        if (e.key === 'Enter') handleRenameFolder(folder.id)
                        if (e.key === 'Escape') {
                          setEditingFolderId(null)
                          setEditingFolderName('')
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 text-xs xs:text-sm bg-white dark:bg-neutral-800 border border-primary-500 rounded px-1.5 xs:px-2 py-0.5 outline-none"
                      autoFocus
                    />
                  ) : (
                    <span className="flex-1 text-left truncate">{folder.name}</span>
                  )}
                  
                  <span className="text-neutral-500 dark:text-neutral-400 ml-auto text-xs">
                    {folderNotes.length}
                  </span>

                  {editingFolderId !== folder.id && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCreateNoteInFolder(folder.id)
                        }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 xs:p-1 hover:bg-green-100 dark:hover:bg-green-900/30 rounded text-green-600"
                        title="Créer une note dans ce dossier"
                      >
                        <Plus className="h-3 w-3 xs:h-3.5 xs:w-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingFolderId(folder.id)
                          setEditingFolderName(folder.name)
                        }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 xs:p-1 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded text-blue-600"
                      >
                        <Edit2 className="h-3 w-3 xs:h-3.5 xs:w-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteFolder(folder.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 xs:p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-600"
                      >
                        <Trash2 className="h-3 w-3 xs:h-3.5 xs:w-3.5" />
                      </button>
                    </>
                  )}
                </button>

                {isExpanded && (
                  <div className="ml-3 xs:ml-4 space-y-0.5 xs:space-y-1 mt-0.5 xs:mt-1">
                    {folderNotes.map((note) => renderNote(note))}
                  </div>
                )}
              </div>
            </div>
            )
          })}

          {/* Notes sans dossier */}
          <div className="mb-1.5 xs:mb-2">
            <div
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(undefined, e)}
              onDragEnter={(e) => handleDragEnter(undefined, e)}
              onDragLeave={handleDragLeave}
              className={`rounded-md transition-colors ${
                dropTargetFolderId === 'root' ? 'bg-primary-100 dark:bg-primary-900/30 ring-2 ring-primary-500' : ''
              }`}
            >
              <button
                onClick={() => toggleFolder('root')}
                className="w-full flex items-center gap-1.5 xs:gap-2 px-1.5 xs:px-2 sm:px-2 laptop:px-3 py-1 xs:py-1.5 sm:py-1.5 laptop:py-2 text-xs sm:text-xs laptop:text-sm font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-md transition-colors group"
              >
                <ChevronRight
                  className={`h-3.5 w-3.5 xs:h-4 xs:w-4 flex-shrink-0 transition-transform ${
                    expandedFolders.has('root') ? 'rotate-90' : ''
                  }`}
                />
                <FolderIcon className="h-3.5 w-3.5 xs:h-4 xs:w-4 sm:h-4 sm:w-4 laptop:h-4.5 laptop:w-4.5 flex-shrink-0" />
                <span>Sans dossier</span>
                <span className="ml-auto text-neutral-500 dark:text-neutral-400 text-xs">
                  {notes.filter(n => !n.folder_id).length}
                </span>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCreateNoteInFolder(undefined)
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 xs:p-1 hover:bg-green-100 dark:hover:bg-green-900/30 rounded text-green-600"
                  title="Créer une note sans dossier"
                >
                  <Plus className="h-3 w-3 xs:h-3.5 xs:w-3.5" />
                </button>
              </button>
            </div>
          </div>

          {expandedFolders.has('root') && (
            <div className="ml-3 xs:ml-4 space-y-0.5 xs:space-y-1">
              {notes.filter(n => !n.folder_id).map((note) => renderNote(note))}
            </div>
          )}

          {notes.length === 0 && (
            <div className="text-center py-6 xs:py-8 sm:py-10 px-3 xs:px-4 sm:px-6">
              <p className="text-xs xs:text-sm sm:text-base text-neutral-500 dark:text-neutral-400">
                Aucune note.
              </p>
              <p className="text-xs sm:text-sm text-neutral-400 dark:text-neutral-500 mt-1">
                Créez-en une pour commencer.
              </p>
            </div>
          )}

          {/* Corbeille */}
          <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
            <button
              onClick={() => setTrashOpen(!trashOpen)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-md transition-colors"
            >
              <ChevronRight
                className={`h-4 w-4 flex-shrink-0 transition-transform ${
                  trashOpen ? 'rotate-90' : ''
                }`}
              />
              <Trash2 className="h-4 w-4 flex-shrink-0" />
              <span>Corbeille</span>
              <span className="ml-auto text-neutral-500 dark:text-neutral-400 text-xs">
                {trashNotes.length}
              </span>
            </button>

            {trashOpen && (
              <div className="ml-4 mt-1 space-y-1">
                {trashNotes.length === 0 ? (
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 px-3 py-2">
                    Corbeille vide
                  </p>
                ) : (
                  trashNotes.map((note) => (
                    <div
                      key={note.id}
                      className="flex items-center w-full min-h-[40px] gap-1 group px-2 py-1.5 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800"
                    >
                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        <File className="h-4 w-4 flex-shrink-0 text-neutral-400" />
                        <span className="text-sm text-neutral-500 dark:text-neutral-400 truncate line-through">
                          {note.title}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleRestoreNote(note.id, e)}
                          className="p-1.5 hover:bg-green-100 dark:hover:bg-green-900/30 rounded text-green-600 dark:text-green-400"
                          title="Restaurer"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => handlePermanentlyDeleteNote(note.id, e)}
                          className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-600 dark:text-red-400"
                          title="Supprimer définitivement"
                        >
                          <Trash className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Right sidebar (metadata inspector)
  return (
    <div className="hidden laptop-sm:block w-64 laptop:w-72 laptop-lg:w-80 desktop:w-96 bg-neutral-100 dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 p-4 laptop:p-5 laptop-lg:p-6 overflow-y-auto">
      <h3 className="text-base laptop:text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4 laptop:mb-5">Métadonnées</h3>
      {activeNoteId ? (
        <div className="space-y-3 laptop:space-y-4 text-sm laptop:text-base text-neutral-700 dark:text-neutral-300">
          <div>
            <div className="font-semibold mb-1 laptop:mb-1.5">ID de la note</div>
            <div className="text-neutral-500 dark:text-neutral-400 font-mono text-xs laptop:text-sm break-all">{activeNoteId}</div>
          </div>
        </div>
      ) : (
        <p className="text-sm laptop:text-base text-neutral-500 dark:text-neutral-400">Sélectionnez une note pour voir les détails</p>
      )}
    </div>
  )
}
