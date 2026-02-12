// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { File, Folder as FolderIcon, Plus, ChevronDown, ChevronRight, Edit2, Trash2, Check, X, FolderPlus, FolderInput, RotateCcw, Trash, Square, CheckSquare, MinusSquare } from 'lucide-react'
import { useState, useEffect } from 'react'

import { LocalStorage } from '@/lib/localStorage'
import { Note, Folder } from '@/types'


interface SidebarProps {
  side: 'left' | 'right'
  userId?: string | null
  activeNoteId?: string | null
  onNoteSelect?: (noteId: string) => void
  notes?: Note[]
  folders?: Folder[]
  trashNotes?: Note[]
  trashFolders?: Folder[]
  createNote?: (title: string, content?: string, folderId?: string) => Promise<any>
  updateNote?: (noteId: string, updates: Partial<Note>) => Promise<any>
  deleteNote?: (noteId: string) => Promise<any>
  restoreNote?: (noteId: string) => Promise<any>
  permanentlyDeleteNote?: (noteId: string) => Promise<any>
  deleteFolder?: (folderId: string) => Promise<any>
  restoreFolder?: (folderId: string) => Promise<any>
  permanentlyDeleteFolder?: (folderId: string) => Promise<any>
  reloadFolders?: () => Promise<void>
}

export default function Sidebar({
  side,
  userId,
  activeNoteId,
  onNoteSelect,
  notes = [],
  folders: propFolders = [],
  trashNotes = [],
  trashFolders = [],
  createNote,
  updateNote,
  deleteNote,
  restoreNote,
  permanentlyDeleteNote,
  deleteFolder,
  restoreFolder,
  permanentlyDeleteFolder,
  reloadFolders
}: SidebarProps) {
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [localFolders, setLocalFolders] = useState<Folder[]>([])
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['root']))
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null)
  const [editingFolderName, setEditingFolderName] = useState('')
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null)
  const [dropTargetFolderId, setDropTargetFolderId] = useState<string | null>(null)
  const [trashOpen, setTrashOpen] = useState(false)
  const [selectedTrashItems, setSelectedTrashItems] = useState<Set<string>>(new Set())
  const [selectionMode, setSelectionMode] = useState(false)
  
  // Multi-select state for folder/unfiled notes
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set())
  const [folderSelectionMode, setFolderSelectionMode] = useState(false)
  const [noteMultiSelectMode, setNoteMultiSelectMode] = useState(false)
  
  // Multi-select state for folders themselves
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set())
  const [folderMultiSelectMode, setFolderMultiSelectMode] = useState(false)

  // Use prop folders if provided, otherwise load from local storage
  const folders = propFolders.length > 0 ? propFolders : localFolders

  // Charger les dossiers au montage (fallback if not provided via props)
  useEffect(() => {
    if (propFolders.length === 0) {
      loadFolders()
    }
  }, [propFolders.length])

  const loadFolders = async () => {
    const foldersData = await LocalStorage.getFolders()
    // Filter out deleted folders when loading locally
    setLocalFolders(foldersData.filter(f => !f.deleted_at))
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {return}

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
    
    const notesInFolder = notes.filter(n => n.folder_id === folderId)
    const message = notesInFolder.length > 0
      ? `Supprimer ce dossier ? Les ${notesInFolder.length} note(s) seront déplacées vers la corbeille.`
      : 'Supprimer ce dossier vide ?'
    
    if (!window.confirm(message)) {return}

    try {
      await deleteFolderById(folderId)
      if (reloadFolders) {await reloadFolders()} else {await loadFolders()}
    } catch (error) {
      console.error('Erreur lors de la suppression du dossier:', error)
    }
  }

  const handleRestoreFolder = async (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!restoreFolder) {return}
    try {
      await restoreFolder(folderId)
    } catch (error) {
      console.error('Erreur lors de la restauration du dossier:', error)
    }
  }

  const handlePermanentlyDeleteFolder = async (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!permanentlyDeleteFolder) {return}
    
    const folder = trashFolders.find(f => f.id === folderId)
    const notesInFolder = trashNotes.filter(n => n.folder_id === folderId)
    const message = notesInFolder.length > 0
      ? `Cette action est irréversible. Le dossier "${folder?.name}" et ses ${notesInFolder.length} note(s) seront supprimés définitivement.`
      : `Cette action est irréversible. Supprimer définitivement le dossier "${folder?.name}" ?`
    
    const confirmed = window.confirm(message)
    if (confirmed) {
      try {
        await permanentlyDeleteFolder(folderId)
      } catch (error) {
        console.error('Erreur lors de la suppression définitive du dossier:', error)
      }
    }
  }

  // Clear folder note selection when folder changes
  useEffect(() => {
    setSelectedNoteIds(new Set())
    setFolderSelectionMode(false)
  }, [expandedFolders])

  // Folder multi-select handlers
  const toggleFolderSelection = (folderId: string) => {
    setSelectedFolderIds(prev => {
      const next = new Set(prev)
      if (next.has(folderId)) {
        next.delete(folderId)
      } else {
        next.add(folderId)
      }
      return next
    })
  }

  const selectAllFolders = () => {
    setSelectedFolderIds(new Set(folders.map(f => f.id)))
  }

  const deselectAllFolders = () => {
    setSelectedFolderIds(new Set())
  }

  const isAllFoldersSelected = (): boolean => {
    return folders.length > 0 && folders.every(f => selectedFolderIds.has(f.id))
  }

  const isSomeFoldersSelected = (): boolean => {
    const selectedCount = folders.filter(f => selectedFolderIds.has(f.id)).length
    return selectedCount > 0 && selectedCount < folders.length
  }

  const deleteFolderById = async (folderId: string) => {
    if (deleteFolder) {
      const result = await deleteFolder(folderId)
      if (result?.error) {console.error('Erreur lors de la suppression du dossier:', result.error)}
      return
    }
    // Fallback: soft delete notes and permanently delete folder
    const notesInFolder = notes.filter(n => n.folder_id === folderId)
    for (const note of notesInFolder) {
      if (deleteNote) {await deleteNote(note.id)}
    }
    await LocalStorage.deleteFolder(folderId)
  }

  const handleDeleteSelectedFolders = async () => {
    if (selectedFolderIds.size === 0) {return}
    
    const totalNotes = folders
      .filter(f => selectedFolderIds.has(f.id))
      .reduce((count, folder) => count + notes.filter(n => n.folder_id === folder.id).length, 0)
    
    const message = totalNotes > 0
      ? `Supprimer ${selectedFolderIds.size} dossier(s) sélectionné(s) ? Les ${totalNotes} note(s) seront déplacées vers la corbeille.`
      : `Supprimer ${selectedFolderIds.size} dossier(s) vide(s) sélectionné(s) ?`
    
    if (!window.confirm(message)) {return}

    try {
      for (const folderId of selectedFolderIds) {
        await deleteFolderById(folderId)
      }
      if (reloadFolders) {await reloadFolders()} else {await loadFolders()}
      setSelectedFolderIds(new Set())
      setFolderMultiSelectMode(false)
    } catch (error) {
      console.error('Erreur lors de la suppression des dossiers sélectionnés:', error)
    }
  }

  const toggleFolderMultiSelectMode = () => {
    if (folderMultiSelectMode) {
      // Exiting selection mode - clear selection
      setSelectedFolderIds(new Set())
    }
    setFolderMultiSelectMode(!folderMultiSelectMode)
  }

  // Folder/unfiled notes multi-select handlers
  const toggleNoteSelection = (noteId: string) => {
    setSelectedNoteIds(prev => {
      const next = new Set(prev)
      if (next.has(noteId)) {
        next.delete(noteId)
      } else {
        next.add(noteId)
      }
      return next
    })
    setFolderSelectionMode(true)
  }

  const getNotesInView = (folderId: string | undefined): Note[] => {
    if (folderId === 'root' || folderId === undefined) {
      return notes.filter(n => !n.folder_id)
    }
    return notes.filter(n => n.folder_id === folderId)
  }

  const selectAllNotesInFolder = (folderId: string | undefined) => {
    const notesInView = getNotesInView(folderId)
    setSelectedNoteIds(new Set(notesInView.map(n => n.id)))
    setFolderSelectionMode(true)
  }

  const deselectAllNotesInFolder = () => {
    setSelectedNoteIds(new Set())
  }

  const isAllNotesSelectedInFolder = (folderId: string | undefined): boolean => {
    const notesInView = getNotesInView(folderId)
    return notesInView.length > 0 && notesInView.every(n => selectedNoteIds.has(n.id))
  }

  const isSomeNotesSelectedInFolder = (folderId: string | undefined): boolean => {
    const notesInView = getNotesInView(folderId)
    const selectedInView = notesInView.filter(n => selectedNoteIds.has(n.id))
    return selectedInView.length > 0 && selectedInView.length < notesInView.length
  }

  const handleDeleteSelectedNotes = async () => {
    if (selectedNoteIds.size === 0) {return}
    
    const confirmed = window.confirm(
      `Supprimer ${selectedNoteIds.size} note(s) sélectionnée(s) ?`
    )
    if (!confirmed) {return}

    try {
      for (const noteId of selectedNoteIds) {
        if (deleteNote) {
          await deleteNote(noteId)
        }
      }
      setSelectedNoteIds(new Set())
      setFolderSelectionMode(false)
      setNoteMultiSelectMode(false)
    } catch (error) {
      console.error('Erreur lors de la suppression des notes sélectionnées:', error)
    }
  }

  const toggleNoteMultiSelectMode = () => {
    if (noteMultiSelectMode) {
      // Exiting selection mode - clear selection
      setSelectedNoteIds(new Set())
      setFolderSelectionMode(false)
    }
    setNoteMultiSelectMode(!noteMultiSelectMode)
  }

  // Trash multi-select handlers
  const toggleTrashItemSelection = (itemId: string) => {
    setSelectedTrashItems(prev => {
      const next = new Set(prev)
      if (next.has(itemId)) {
        next.delete(itemId)
      } else {
        next.add(itemId)
      }
      return next
    })
  }

  const getAllTrashItemIds = () => {
    const noteIds = trashNotes
      .filter(note => !trashFolders.some(f => f.id === note.folder_id))
      .map(n => `note-${n.id}`)
    const folderIds = trashFolders.map(f => `folder-${f.id}`)
    return [...noteIds, ...folderIds]
  }

  const selectAllTrashItems = () => {
    setSelectedTrashItems(new Set(getAllTrashItemIds()))
  }

  const deselectAllTrashItems = () => {
    setSelectedTrashItems(new Set())
  }

  const isAllSelected = () => {
    const allIds = getAllTrashItemIds()
    return allIds.length > 0 && allIds.every(id => selectedTrashItems.has(id))
  }

  const isSomeSelected = () => {
    return selectedTrashItems.size > 0 && !isAllSelected()
  }

  const handleEmptyTrash = async () => {
    const totalItems = trashNotes.length + trashFolders.length
    if (!window.confirm(`Cette action est irréversible. Supprimer définitivement ${totalItems} élément(s) de la corbeille ?`)) {return}

    try {
      for (const folder of trashFolders) {
        if (permanentlyDeleteFolder) {await permanentlyDeleteFolder(folder.id)}
      }
      const orphanNotes = trashNotes.filter(n => !trashFolders.some(f => f.id === n.folder_id))
      for (const note of orphanNotes) {
        if (permanentlyDeleteNote) {await permanentlyDeleteNote(note.id)}
      }
      setSelectedTrashItems(new Set())
      setSelectionMode(false)
    } catch (error) {
      console.error('Erreur lors du vidage de la corbeille:', error)
    }
  }

  const permanentlyDeleteTrashItem = async (itemId: string) => {
    if (itemId.startsWith('folder-') && permanentlyDeleteFolder) {
      await permanentlyDeleteFolder(itemId.replace('folder-', ''))
    } else if (itemId.startsWith('note-') && permanentlyDeleteNote) {
      await permanentlyDeleteNote(itemId.replace('note-', ''))
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedTrashItems.size === 0) {return}
    if (!window.confirm(`Cette action est irréversible. Supprimer définitivement ${selectedTrashItems.size} élément(s) sélectionné(s) ?`)) {return}

    try {
      for (const itemId of selectedTrashItems) {
        await permanentlyDeleteTrashItem(itemId)
      }
      setSelectedTrashItems(new Set())
      setSelectionMode(false)
    } catch (error) {
      console.error('Erreur lors de la suppression des éléments sélectionnés:', error)
    }
  }

  const restoreTrashItem = async (itemId: string) => {
    if (itemId.startsWith('folder-') && restoreFolder) {
      await restoreFolder(itemId.replace('folder-', ''))
    } else if (itemId.startsWith('note-') && restoreNote) {
      await restoreNote(itemId.replace('note-', ''))
    }
  }

  const handleRestoreSelected = async () => {
    if (selectedTrashItems.size === 0) {return}
    try {
      for (const itemId of selectedTrashItems) {
        await restoreTrashItem(itemId)
      }
      setSelectedTrashItems(new Set())
      setSelectionMode(false)
    } catch (error) {
      console.error('Erreur lors de la restauration des éléments sélectionnés:', error)
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
    if (!updateNote) {return}
    try {
      await updateNote(noteId, { folder_id: folderId })
    } catch (error) {
      console.error('Erreur lors du déplacement de la note:', error)
    }
  }

  const handleCreateNoteInFolder = async (folderId: string | undefined) => {
    if (!createNote) {return}
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
    if (!createNote) {return}
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
    if (!deleteNote) {return}

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
    if (!restoreNote) {return}
    try {
      await restoreNote(noteId)
    } catch (error) {
      console.error('Erreur lors de la restauration:', error)
    }
  }

  const handlePermanentlyDeleteNote = async (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!permanentlyDeleteNote) {return}
    
    const confirmed = window.confirm('Cette action est irréversible. Supprimer définitivement ?')
    if (confirmed) {
      try {
        await permanentlyDeleteNote(noteId)
      } catch (error) {
        console.error('Erreur lors de la suppression définitive:', error)
      }
    }
  }

  // Helper function to render a note with optional checkbox for multi-select
  const renderNote = (note: Note, showCheckbox: boolean = false, isInSelectionMode: boolean = false) => (
    <div
      key={note.id}
      draggable
      onDragStart={(e) => { handleDragStart(note.id, e); }}
      onDragEnd={handleDragEnd}
      className={`group relative flex items-center rounded-lg transition-all ${
        draggedNoteId === note.id
          ? 'opacity-50'
          : ''
      } ${
        selectedNoteIds.has(note.id)
          ? 'bg-primary-50 dark:bg-primary-900/20'
          : activeNoteId === note.id
            ? 'bg-primary-100 dark:bg-primary-900/30 border-l-4 border-primary-500'
            : 'hover:bg-neutral-200 dark:hover:bg-neutral-800'
      } cursor-move`}
    >
      {editingNoteId === note.id ? (
        // Edit mode
        <div className="flex items-center gap-1 xs:gap-1.5 w-full px-1.5 xs:px-2 sm:px-2 laptop:px-3 py-1.5 xs:py-2 sm:py-2 laptop:py-2.5 min-h-[44px]" onClick={(e) => { e.stopPropagation(); }}>
          <File className="h-3.5 w-3.5 xs:h-4 xs:w-4 sm:h-4 sm:w-4 laptop:h-4.5 laptop:w-4.5 flex-shrink-0 text-neutral-500 dark:text-neutral-400" />
          <input
            type="text"
            value={editingTitle}
            onChange={(e) => { setEditingTitle(e.target.value); }}
            onKeyDown={(e) => handleKeyDown(e, note.id)}
            className="flex-1 min-w-0 text-xs xs:text-sm sm:text-sm laptop:text-base bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border border-primary-500 rounded px-1.5 xs:px-2 sm:px-2 laptop:px-2.5 py-1 xs:py-1.5 outline-none focus:ring-2 focus:ring-primary-500"
            autoFocus
            onClick={(e) => { e.stopPropagation(); }}
          />
          <button
            onClick={(e) => saveEditing(note.id, e)}
            className="flex-shrink-0 p-1 xs:p-1.5 sm:p-1.5 laptop:p-2 hover:bg-green-100 dark:hover:bg-green-900/30 rounded text-green-600 dark:text-green-400 min-w-[36px] min-h-[36px] xs:min-w-[40px] xs:min-h-[40px] flex items-center justify-center"
            title="Sauvegarder" aria-label="Sauvegarder"
          >
            <Check className="h-3.5 w-3.5 xs:h-4 xs:w-4 sm:h-4 sm:w-4 laptop:h-4.5 laptop:w-4.5" />
          </button>
          <button
            onClick={cancelEditing}
            className="flex-shrink-0 p-1 xs:p-1.5 sm:p-1.5 laptop:p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-600 dark:text-red-400 min-w-[36px] min-h-[36px] xs:min-w-[40px] xs:min-h-[40px] flex items-center justify-center"
            title="Annuler" aria-label="Annuler"
          >
            <X className="h-3.5 w-3.5 xs:h-4 xs:w-4 sm:h-4 sm:w-4 laptop:h-4.5 laptop:w-4.5" />
          </button>
        </div>
      ) : (
        // Normal mode - Tout dans un seul conteneur flex
        <div className="flex items-center w-full min-h-[44px] gap-1">
          {/* Checkbox for multi-select - only visible in selection mode */}
          {showCheckbox && isInSelectionMode && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleNoteSelection(note.id)
              }}
              className="p-0.5 ml-1 hover:bg-neutral-300 dark:hover:bg-neutral-600 rounded flex-shrink-0"
            >
              {selectedNoteIds.has(note.id) ? (
                <CheckSquare className="h-4 w-4 text-primary-600 dark:text-primary-400" />
              ) : (
                <Square className="h-4 w-4 text-neutral-400" />
              )}
            </button>
          )}
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
                    title="Déplacer vers..." aria-label="Déplacer vers..."
                    onClick={(e) => { e.stopPropagation(); }}
                  >
                    <FolderInput className="h-3.5 w-3.5 laptop:h-4 laptop:w-4" />
                  </button>
                </DropdownMenu.Trigger>

                <DropdownMenu.Portal>
                  <DropdownMenu.Content 
                    className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg z-50 min-w-[160px] xs:min-w-[180px] py-1"
                    sideOffset={5}
                    align="end"
                    onClick={(e) => { e.stopPropagation(); }}
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
              onClick={(e) => { startEditing(note, e); }}
              className="p-1 laptop:p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded text-blue-600 dark:text-blue-400 min-w-[32px] min-h-[32px] laptop:min-w-[36px] laptop:min-h-[36px] flex items-center justify-center transition-colors"
              title="Renommer" aria-label="Renommer"
            >
              <Edit2 className="h-3.5 w-3.5 laptop:h-4 laptop:w-4" />
            </button>
            <button
              onClick={(e) => handleDeleteNote(note.id, e)}
              className="p-1 laptop:p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-600 dark:text-red-400 min-w-[32px] min-h-[32px] laptop:min-w-[36px] laptop:min-h-[36px] flex items-center justify-center transition-colors"
              title="Supprimer" aria-label="Supprimer"
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
                onClick={() => { setCreatingFolder(true); }}
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
                  onChange={(e) => { setNewFolderName(e.target.value); }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {handleCreateFolder()}
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
          {folders.length > 0 && (
            <div className="flex items-center gap-1 px-2 py-1.5 border-b border-neutral-200 dark:border-neutral-700 mb-2">
              {/* Toggle selection mode button */}
              <button
                onClick={toggleFolderMultiSelectMode}
                className={`p-1 rounded transition-colors ${
                  folderMultiSelectMode
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                    : 'hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-400'
                }`}
                title={folderMultiSelectMode ? "Quitter le mode sélection" : "Mode sélection"} aria-label={folderMultiSelectMode ? "Quitter le mode sélection" : "Mode sélection"}
              >
                {folderMultiSelectMode ? (
                  <CheckSquare className="h-4 w-4" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
              </button>
              
              {/* Select all folders checkbox - only visible in selection mode */}
              {folderMultiSelectMode && (
                <button
                  onClick={() => {
                    if (isAllFoldersSelected()) {
                      deselectAllFolders()
                    } else {
                      selectAllFolders()
                    }
                  }}
                  className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded text-neutral-600 dark:text-neutral-400"
                  title={isAllFoldersSelected() ? "Tout désélectionner" : "Tout sélectionner"} aria-label={isAllFoldersSelected() ? "Tout désélectionner" : "Tout sélectionner"}
                >
                  {isAllFoldersSelected() ? (
                    <CheckSquare className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                  ) : isSomeFoldersSelected() ? (
                    <MinusSquare className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </button>
              )}
              
              <span className="text-xs text-neutral-600 dark:text-neutral-400 font-medium">
                Dossiers
              </span>
              
              {selectedFolderIds.size > 0 && (
                <button
                  onClick={handleDeleteSelectedFolders}
                  className="ml-auto px-2 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 rounded transition-colors"
                  title="Supprimer les dossiers sélectionnés" aria-label="Supprimer les dossiers sélectionnés"
                >
                  Supprimer ({selectedFolderIds.size})
                </button>
              )}
            </div>
          )}
          
          {folders.map((folder) => {
            const folderNotes = notes.filter(n => n.folder_id === folder.id)
            const isExpanded = expandedFolders.has(folder.id)
            const isDropTarget = dropTargetFolderId === folder.id
            
            return (
              <div key={folder.id} className="mb-1.5 xs:mb-2">
                <div
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(folder.id, e)}
                  onDragEnter={(e) => { handleDragEnter(folder.id, e); }}
                  onDragLeave={handleDragLeave}
                  className={`rounded-md transition-colors ${
                    isDropTarget ? 'bg-primary-100 dark:bg-primary-900/30 ring-2 ring-primary-500' : ''
                  }`}
                >
                  <div
                    className={`w-full flex items-center gap-1.5 xs:gap-2 px-1.5 xs:px-2 sm:px-2 laptop:px-3 py-1 xs:py-1.5 sm:py-1.5 laptop:py-2 text-xs sm:text-xs laptop:text-sm font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-md transition-colors group cursor-pointer ${
                      selectedFolderIds.has(folder.id) ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                    }`}
                  >
                  {/* Folder checkbox - only visible in selection mode */}
                  {folderMultiSelectMode && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleFolderSelection(folder.id)
                      }}
                      className="p-0.5 hover:bg-neutral-300 dark:hover:bg-neutral-600 rounded flex-shrink-0"
                    >
                      {selectedFolderIds.has(folder.id) ? (
                        <CheckSquare className="h-3.5 w-3.5 xs:h-4 xs:w-4 text-primary-600 dark:text-primary-400" />
                      ) : (
                        <Square className="h-3.5 w-3.5 xs:h-4 xs:w-4 text-neutral-400" />
                      )}
                    </button>
                  )}
                  
                  <div
                    onClick={() => { toggleFolder(folder.id); }}
                    className="flex-1 flex items-center gap-1.5 xs:gap-2 min-w-0"
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
                      onChange={(e) => { setEditingFolderName(e.target.value); }}
                      onKeyDown={(e) => {
                        e.stopPropagation()
                        if (e.key === 'Enter') {handleRenameFolder(folder.id)}
                        if (e.key === 'Escape') {
                          setEditingFolderId(null)
                          setEditingFolderName('')
                        }
                      }}
                      onClick={(e) => { e.stopPropagation(); }}
                      className="flex-1 text-xs xs:text-sm bg-white dark:bg-neutral-800 border border-primary-500 rounded px-1.5 xs:px-2 py-0.5 outline-none"
                      autoFocus
                    />
                  ) : (
                    <span className="flex-1 text-left truncate">{folder.name}</span>
                  )}
                  
                </div>
                
                  <span className="text-neutral-500 dark:text-neutral-400 text-xs flex-shrink-0">
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
                        title="Créer une note dans ce dossier" aria-label="Créer une note dans ce dossier"
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
                </div>

                {isExpanded && (
                  <div className="ml-3 xs:ml-4 space-y-0.5 xs:space-y-1 mt-0.5 xs:mt-1">
                    {/* Multi-select header for folder notes */}
                    {folderNotes.length > 0 && (
                      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-neutral-200 dark:border-neutral-700 mb-1">
                        {/* Toggle selection mode button */}
                        <button
                          onClick={toggleNoteMultiSelectMode}
                          className={`p-1 rounded transition-colors ${
                            noteMultiSelectMode
                              ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                              : 'hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-400'
                          }`}
                          title={noteMultiSelectMode ? "Quitter le mode sélection" : "Mode sélection"} aria-label={noteMultiSelectMode ? "Quitter le mode sélection" : "Mode sélection"}
                        >
                          {noteMultiSelectMode ? (
                            <CheckSquare className="h-4 w-4" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>
                        
                        {/* Select all checkbox - only visible in selection mode */}
                        {noteMultiSelectMode && (
                          <button
                            onClick={() => {
                              if (isAllNotesSelectedInFolder(folder.id)) {
                                deselectAllNotesInFolder()
                              } else {
                                selectAllNotesInFolder(folder.id)
                              }
                            }}
                            className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded text-neutral-600 dark:text-neutral-400"
                            title={isAllNotesSelectedInFolder(folder.id) ? "Tout désélectionner" : "Tout sélectionner"} aria-label={isAllNotesSelectedInFolder(folder.id) ? "Tout désélectionner" : "Tout sélectionner"}
                          >
                            {isAllNotesSelectedInFolder(folder.id) ? (
                              <CheckSquare className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                            ) : isSomeNotesSelectedInFolder(folder.id) ? (
                              <MinusSquare className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                            ) : (
                              <Square className="h-4 w-4" />
                            )}
                          </button>
                        )}
                        
                        <span className="text-xs text-neutral-600 dark:text-neutral-400 font-medium">
                          Notes
                        </span>
                        
                        {selectedNoteIds.size > 0 && folderNotes.some(n => selectedNoteIds.has(n.id)) && (
                          <button
                            onClick={handleDeleteSelectedNotes}
                            className="ml-auto px-2 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 rounded transition-colors"
                            title="Supprimer la sélection" aria-label="Supprimer la sélection"
                          >
                            Supprimer ({selectedNoteIds.size})
                          </button>
                        )}
                      </div>
                    )}
                    {folderNotes.map((note) => renderNote(note, true, noteMultiSelectMode))}
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
              onDragEnter={(e) => { handleDragEnter(undefined, e); }}
              onDragLeave={handleDragLeave}
              className={`rounded-md transition-colors ${
                dropTargetFolderId === 'root' ? 'bg-primary-100 dark:bg-primary-900/30 ring-2 ring-primary-500' : ''
              }`}
            >
              <div
                onClick={() => { toggleFolder('root'); }}
                className="w-full flex items-center gap-1.5 xs:gap-2 px-1.5 xs:px-2 sm:px-2 laptop:px-3 py-1 xs:py-1.5 sm:py-1.5 laptop:py-2 text-xs sm:text-xs laptop:text-sm font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-md transition-colors group cursor-pointer"
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
                  title="Créer une note sans dossier" aria-label="Créer une note sans dossier"
                >
                  <Plus className="h-3 w-3 xs:h-3.5 xs:w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {expandedFolders.has('root') && (
            <div className="ml-3 xs:ml-4 space-y-0.5 xs:space-y-1">
              {/* Multi-select header for unfiled notes */}
              {notes.filter(n => !n.folder_id).length > 0 && (
                <div className="flex items-center gap-1 px-2 py-1.5 border-b border-neutral-200 dark:border-neutral-700 mb-1">
                  {/* Toggle selection mode button */}
                  <button
                    onClick={toggleNoteMultiSelectMode}
                    className={`p-1 rounded transition-colors ${
                      noteMultiSelectMode
                        ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                        : 'hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-400'
                    }`}
                    title={noteMultiSelectMode ? "Quitter le mode sélection" : "Mode sélection"} aria-label={noteMultiSelectMode ? "Quitter le mode sélection" : "Mode sélection"}
                  >
                    {noteMultiSelectMode ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>
                  
                  {/* Select all checkbox - only visible in selection mode */}
                  {noteMultiSelectMode && (
                    <button
                      onClick={() => {
                        if (isAllNotesSelectedInFolder('root')) {
                          deselectAllNotesInFolder()
                        } else {
                          selectAllNotesInFolder('root')
                        }
                      }}
                      className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded text-neutral-600 dark:text-neutral-400"
                      title={isAllNotesSelectedInFolder('root') ? "Tout désélectionner" : "Tout sélectionner"} aria-label={isAllNotesSelectedInFolder('root') ? "Tout désélectionner" : "Tout sélectionner"}
                    >
                      {isAllNotesSelectedInFolder('root') ? (
                        <CheckSquare className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                      ) : isSomeNotesSelectedInFolder('root') ? (
                        <MinusSquare className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  )}
                  
                  <span className="text-xs text-neutral-600 dark:text-neutral-400 font-medium">
                    Notes
                  </span>
                  
                  {selectedNoteIds.size > 0 && notes.filter(n => !n.folder_id).some(n => selectedNoteIds.has(n.id)) && (
                    <button
                      onClick={handleDeleteSelectedNotes}
                      className="ml-auto px-2 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 rounded transition-colors"
                      title="Supprimer la sélection" aria-label="Supprimer la sélection"
                    >
                      Supprimer ({selectedNoteIds.size})
                    </button>
                  )}
                </div>
              )}
              {notes.filter(n => !n.folder_id).map((note) => renderNote(note, true, noteMultiSelectMode))}
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
              onClick={() => { setTrashOpen(!trashOpen); }}
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
                {trashNotes.length + trashFolders.length}
              </span>
            </button>

            {trashOpen && (
              <div className="ml-4 mt-1 space-y-1">
                {trashNotes.length === 0 && trashFolders.length === 0 ? (
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 px-3 py-2">
                    Corbeille vide
                  </p>
                ) : (
                  <>
                    {/* Trash action buttons */}
                    <div className="flex items-center gap-1 px-2 py-1.5 border-b border-neutral-200 dark:border-neutral-700 mb-1">
                      {/* Select all checkbox */}
                      <button
                        onClick={() => {
                          if (isAllSelected()) {
                            deselectAllTrashItems()
                          } else {
                            selectAllTrashItems()
                          }
                          setSelectionMode(true)
                        }}
                        className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded text-neutral-600 dark:text-neutral-400"
                        title={isAllSelected() ? "Tout désélectionner" : "Tout sélectionner"} aria-label={isAllSelected() ? "Tout désélectionner" : "Tout sélectionner"}
                      >
                        {isAllSelected() ? (
                          <CheckSquare className="h-4 w-4" />
                        ) : isSomeSelected() ? (
                          <MinusSquare className="h-4 w-4" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                      
                      {selectedTrashItems.size > 0 && (
                        <>
                          <button
                            onClick={handleRestoreSelected}
                            className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 rounded transition-colors"
                            title="Restaurer la sélection" aria-label="Restaurer la sélection"
                          >
                            Restaurer ({selectedTrashItems.size})
                          </button>
                          <button
                            onClick={handleDeleteSelected}
                            className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 rounded transition-colors"
                            title="Supprimer la sélection" aria-label="Supprimer la sélection"
                          >
                            Supprimer ({selectedTrashItems.size})
                          </button>
                        </>
                      )}
                      
                      <button
                        onClick={handleEmptyTrash}
                        className="ml-auto px-2 py-1 text-xs text-white rounded transition-colors"
                        style={{ backgroundColor: '#4850d9' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3a41b0'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4850d9'}
                        title="Vider la corbeille" aria-label="Vider la corbeille"
                      >
                        Vider tout
                      </button>
                    </div>

                    {/* Deleted Folders */}
                    {trashFolders.map((folder) => {
                      const notesInFolder = trashNotes.filter(n => n.folder_id === folder.id)
                      const itemId = `folder-${folder.id}`
                      const isSelected = selectedTrashItems.has(itemId)
                      return (
                        <div
                          key={folder.id}
                          className={`flex items-center w-full min-h-[40px] gap-1 group px-2 py-1.5 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 ${
                            isSelected ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                          }`}
                        >
                          {/* Checkbox */}
                          <button
                            onClick={() => {
                              toggleTrashItemSelection(itemId)
                              setSelectionMode(true)
                            }}
                            className="p-0.5 hover:bg-neutral-300 dark:hover:bg-neutral-600 rounded"
                          >
                            {isSelected ? (
                              <CheckSquare className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                            ) : (
                              <Square className="h-4 w-4 text-neutral-400" />
                            )}
                          </button>
                          
                          <div className="flex-1 min-w-0 flex items-center gap-2">
                            <FolderIcon className="h-4 w-4 flex-shrink-0 text-neutral-400" />
                            <span className="text-sm text-neutral-500 dark:text-neutral-400 truncate line-through">
                              {folder.name}
                            </span>
                            {notesInFolder.length > 0 && (
                              <span className="text-xs text-neutral-400 dark:text-neutral-500">
                                ({notesInFolder.length} note{notesInFolder.length > 1 ? 's' : ''})
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => handleRestoreFolder(folder.id, e)}
                              className="p-1.5 hover:bg-green-100 dark:hover:bg-green-900/30 rounded text-green-600 dark:text-green-400"
                              title="Restaurer le dossier et ses notes" aria-label="Restaurer le dossier et ses notes"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={(e) => handlePermanentlyDeleteFolder(folder.id, e)}
                              className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-600 dark:text-red-400"
                              title="Supprimer définitivement" aria-label="Supprimer définitivement"
                            >
                              <Trash className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                    
                    {/* Deleted Notes (not in deleted folders) */}
                    {trashNotes
                      .filter(note => !trashFolders.some(f => f.id === note.folder_id))
                      .map((note) => {
                        const itemId = `note-${note.id}`
                        const isSelected = selectedTrashItems.has(itemId)
                        return (
                          <div
                            key={note.id}
                            className={`flex items-center w-full min-h-[40px] gap-1 group px-2 py-1.5 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 ${
                              isSelected ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                            }`}
                          >
                            {/* Checkbox */}
                            <button
                              onClick={() => {
                                toggleTrashItemSelection(itemId)
                                setSelectionMode(true)
                              }}
                              className="p-0.5 hover:bg-neutral-300 dark:hover:bg-neutral-600 rounded"
                            >
                              {isSelected ? (
                                <CheckSquare className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                              ) : (
                                <Square className="h-4 w-4 text-neutral-400" />
                              )}
                            </button>
                            
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
                                title="Restaurer" aria-label="Restaurer"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={(e) => handlePermanentlyDeleteNote(note.id, e)}
                                className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-600 dark:text-red-400"
                                title="Supprimer définitivement" aria-label="Supprimer définitivement"
                              >
                                <Trash className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                  </>
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
