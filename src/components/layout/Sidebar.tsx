// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

import { File, Folder as FolderIcon, Plus, ChevronRight, Edit2, Trash2, Check, X, FolderPlus, RotateCcw, Trash, Square, CheckSquare, MinusSquare, FolderInput } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import React, { useState, useEffect } from 'react'

import { LocalStorage } from '@/lib/localStorage'
import { Note, Folder } from '@/types'

// Helper function to get selection icon based on state
function getSelectionIcon(isAllSelected: boolean, isSomeSelected: boolean) {
  if (isAllSelected) {
    return <CheckSquare className="h-4 w-4 text-primary-600 dark:text-primary-400" />
  }
  if (isSomeSelected) {
    return <MinusSquare className="h-4 w-4 text-primary-600 dark:text-primary-400" />
  }
  return <Square className="h-4 w-4" />
}

// Helper function to get note background class
function getNoteBackgroundClass(selectedNoteIds: Set<string>, noteId: string | undefined, activeNoteId: string | null | undefined): string {
  if (!noteId) return 'hover:bg-neutral-200 dark:hover:bg-neutral-800'
  if (selectedNoteIds.has(noteId)) {
    return 'bg-primary-50 dark:bg-primary-900/20'
  }
  if (activeNoteId === noteId) {
    return 'bg-primary-100 dark:bg-primary-900/30 border-l-4 border-primary-500'
  }
  return 'hover:bg-neutral-200 dark:hover:bg-neutral-800'
}

// --- Sub-components extracted to reduce cognitive complexity ---

/** Trash folder item in the trash section */
function TrashFolderItem({ folder, notesInFolder, isSelected, onToggleSelection, onRestore, onPermanentlyDelete }: {
  readonly folder: Folder; readonly notesInFolder: readonly Note[]; readonly isSelected: boolean;
  readonly onToggleSelection: () => void; readonly onRestore: (e: React.MouseEvent) => void; readonly onPermanentlyDelete: (e: React.MouseEvent) => void;
}) {
  return (
    <div className={`flex items-center w-full min-h-[40px] gap-1 group px-2 py-1.5 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 ${isSelected ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}>
      <button onClick={onToggleSelection} className="p-0.5 hover:bg-neutral-300 dark:hover:bg-neutral-600 rounded">
        {isSelected ? <CheckSquare className="h-4 w-4 text-primary-600 dark:text-primary-400" /> : <Square className="h-4 w-4 text-neutral-400" />}
      </button>
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <FolderIcon className="h-4 w-4 flex-shrink-0 text-neutral-400" />
        <span className="text-sm text-neutral-500 dark:text-neutral-400 truncate line-through">{folder.name}</span>
        {notesInFolder.length > 0 && (
          <span className="text-xs text-neutral-400 dark:text-neutral-500">({notesInFolder.length} note{notesInFolder.length > 1 ? 's' : ''})</span>
        )}
      </div>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onRestore} className="p-1.5 hover:bg-green-100 dark:hover:bg-green-900/30 rounded text-green-600 dark:text-green-400" title="Restaurer le dossier et ses notes" aria-label="Restaurer le dossier et ses notes">
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
        <button onClick={onPermanentlyDelete} className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-600 dark:text-red-400" title="Supprimer définitivement" aria-label="Supprimer définitivement">
          <Trash className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

/** Trash note item in the trash section */
function TrashNoteItem({ note, isSelected, onToggleSelection, onRestore, onPermanentlyDelete }: {
  readonly note: Note; readonly isSelected: boolean;
  readonly onToggleSelection: () => void; readonly onRestore: (e: React.MouseEvent) => void; readonly onPermanentlyDelete: (e: React.MouseEvent) => void;
}) {
  return (
    <div className={`flex items-center w-full min-h-[40px] gap-1 group px-2 py-1.5 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 ${isSelected ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}>
      <button onClick={onToggleSelection} className="p-0.5 hover:bg-neutral-300 dark:hover:bg-neutral-600 rounded">
        {isSelected ? <CheckSquare className="h-4 w-4 text-primary-600 dark:text-primary-400" /> : <Square className="h-4 w-4 text-neutral-400" />}
      </button>
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <File className="h-4 w-4 flex-shrink-0 text-neutral-400" />
        <span className="text-sm text-neutral-500 dark:text-neutral-400 truncate line-through">{note.title}</span>
      </div>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onRestore} className="p-1.5 hover:bg-green-100 dark:hover:bg-green-900/30 rounded text-green-600 dark:text-green-400" title="Restaurer" aria-label="Restaurer">
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
        <button onClick={onPermanentlyDelete} className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-600 dark:text-red-400" title="Supprimer définitivement" aria-label="Supprimer définitivement">
          <Trash className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

/** Multi-select header bar for notes within a folder or unfiled */
function NoteMultiSelectHeader({ folderId, noteMultiSelectMode, toggleNoteMultiSelectMode, isAllSelected, isSomeSelected, onSelectAll, onDeselectAll, selectedCount, hasSelectedInView, onDeleteSelected }: {
  readonly folderId: string | undefined; readonly noteMultiSelectMode: boolean; readonly toggleNoteMultiSelectMode: () => void;
  readonly isAllSelected: boolean; readonly isSomeSelected: boolean; readonly onSelectAll: () => void; readonly onDeselectAll: () => void;
  readonly selectedCount: number; readonly hasSelectedInView: boolean; readonly onDeleteSelected: () => void;
}) {
  return (
    <div className="flex items-center gap-1 px-2 py-1.5 border-b border-neutral-200 dark:border-neutral-700 mb-1">
      <button onClick={toggleNoteMultiSelectMode}
        className={`p-1 rounded transition-colors ${noteMultiSelectMode ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400' : 'hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-400'}`}
        title={noteMultiSelectMode ? "Quitter le mode sélection" : "Mode sélection"} aria-label={noteMultiSelectMode ? "Quitter le mode sélection" : "Mode sélection"}
      >
        {noteMultiSelectMode ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
      </button>
      {noteMultiSelectMode && (
        <button onClick={isAllSelected ? onDeselectAll : onSelectAll}
          className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded text-neutral-600 dark:text-neutral-400"
          title={isAllSelected ? "Tout désélectionner" : "Tout sélectionner"} aria-label={isAllSelected ? "Tout désélectionner" : "Tout sélectionner"}
        >
          {getSelectionIcon(isAllSelected, isSomeSelected)}
        </button>
      )}
      <span className="text-xs text-neutral-600 dark:text-neutral-400 font-medium">Notes</span>
      {selectedCount > 0 && hasSelectedInView && (
        <button onClick={onDeleteSelected}
          className="ml-auto px-2 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 rounded transition-colors"
          title="Supprimer la sélection" aria-label="Supprimer la sélection"
        >
          Supprimer ({selectedCount})
        </button>
      )}
    </div>
  )
}

/** Three-state checkbox icon helper */
function ThreeStateCheckbox({ allSelected, someSelected }: { readonly allSelected: boolean; readonly someSelected: boolean }) {
  if (allSelected) {return <CheckSquare className="h-4 w-4 text-primary-600 dark:text-primary-400" />}
  if (someSelected) {return <MinusSquare className="h-4 w-4 text-primary-600 dark:text-primary-400" />}
  return <Square className="h-4 w-4" />
}

/** Trash section in the left sidebar */
function TrashSection({ trashOpen, setTrashOpen, trashNotes, trashFolders, isAllSelected, isSomeSelected,
  deselectAllTrashItems, selectAllTrashItems, selectedTrashItems,
  handleRestoreSelected, handleDeleteSelected, handleEmptyTrash, toggleTrashItemSelection,
  handleRestoreFolder, handlePermanentlyDeleteFolder, handleRestoreNote, handlePermanentlyDeleteNote,
}: {
  readonly trashOpen: boolean; readonly setTrashOpen: (v: boolean) => void;
  readonly trashNotes: readonly Note[]; readonly trashFolders: readonly Folder[];
  readonly isAllSelected: () => boolean; readonly isSomeSelected: () => boolean;
  readonly deselectAllTrashItems: () => void; readonly selectAllTrashItems: () => void;
  readonly selectedTrashItems: Set<string>;
  readonly handleRestoreSelected: () => void; readonly handleDeleteSelected: () => void; readonly handleEmptyTrash: () => void;
  readonly toggleTrashItemSelection: (id: string) => void;
  readonly handleRestoreFolder: (id: string, e: React.MouseEvent) => void;
  readonly handlePermanentlyDeleteFolder: (id: string, e: React.MouseEvent) => void;
  readonly handleRestoreNote: (id: string, e: React.MouseEvent) => void;
  readonly handlePermanentlyDeleteNote: (id: string, e: React.MouseEvent) => void;
}) {
  const totalTrashItems = trashNotes.length + trashFolders.length

  return (
    <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
      <button
        onClick={() => { setTrashOpen(!trashOpen); }}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-md transition-colors"
      >
        <ChevronRight
          className={`h-4 w-4 flex-shrink-0 transition-transform ${trashOpen ? 'rotate-90' : ''}`}
        />
        <Trash2 className="h-4 w-4 flex-shrink-0" />
        <span>Corbeille</span>
        <span className="ml-auto text-neutral-500 dark:text-neutral-400 text-xs">
          {totalTrashItems}
        </span>
      </button>

      {trashOpen && (
        <div className="ml-4 mt-1 space-y-1">
          {totalTrashItems === 0 ? (
            <p className="text-xs text-neutral-500 dark:text-neutral-400 px-3 py-2">
              Corbeille vide
            </p>
          ) : (
            <>
              {/* Trash action buttons */}
              <div className="flex items-center gap-1 px-2 py-1.5 border-b border-neutral-200 dark:border-neutral-700 mb-1">
                <button
                  onClick={() => {
                    if (isAllSelected()) { deselectAllTrashItems() } else { selectAllTrashItems() }
                  }}
                  className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded text-neutral-600 dark:text-neutral-400"
                  title={isAllSelected() ? "Tout désélectionner" : "Tout sélectionner"} aria-label={isAllSelected() ? "Tout désélectionner" : "Tout sélectionner"}
                >
                  <ThreeStateCheckbox allSelected={isAllSelected()} someSelected={isSomeSelected()} />
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
                return (
                  <TrashFolderItem key={folder.id} folder={folder} notesInFolder={notesInFolder}
                    isSelected={selectedTrashItems.has(itemId)}
                    onToggleSelection={() => { toggleTrashItemSelection(itemId) }}
                    onRestore={(e) => { handleRestoreFolder(folder.id, e); }}
                    onPermanentlyDelete={(e) => { handlePermanentlyDeleteFolder(folder.id, e); }}
                  />
                )
              })}
              
              {/* Deleted Notes (not in deleted folders) */}
              {trashNotes
                .filter(note => !trashFolders.some(f => f.id === note.folder_id))
                .map((note) => {
                  const itemId = `note-${note.id}`
                  return (
                    <TrashNoteItem key={note.id} note={note}
                      isSelected={selectedTrashItems.has(itemId)}
                      onToggleSelection={() => { toggleTrashItemSelection(itemId) }}
                      onRestore={(e) => { handleRestoreNote(note.id, e); }}
                      onPermanentlyDelete={(e) => { handlePermanentlyDeleteNote(note.id, e); }}
                    />
                  )
                })}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// --- End sub-components ---

interface SidebarProps {
  readonly side: 'left' | 'right'
  readonly userId?: string | null
  readonly activeNoteId?: string | null
  readonly onNoteSelect?: (noteId: string) => void
  readonly notes?: readonly Note[]
  readonly folders?: readonly Folder[]
  readonly trashNotes?: readonly Note[]
  readonly trashFolders?: readonly Folder[]
  readonly createNote?: (title: string, content?: string, folderId?: string) => Promise<any>
  readonly updateNote?: (noteId: string, updates: Partial<Note>) => Promise<any>
  readonly deleteNote?: (noteId: string) => Promise<any>
  readonly restoreNote?: (noteId: string) => Promise<any>
  readonly permanentlyDeleteNote?: (noteId: string) => Promise<any>
  readonly deleteFolder?: (folderId: string) => Promise<any>
  readonly restoreFolder?: (folderId: string) => Promise<any>
  readonly permanentlyDeleteFolder?: (folderId: string) => Promise<any>
  readonly reloadFolders?: () => Promise<void>
}

/** Props passed to LeftSidebarContent */
interface LeftSidebarContentProps {
  readonly handleCreateNote: () => void
  readonly creatingFolder: boolean
  readonly setCreatingFolder: (v: boolean) => void
  readonly newFolderName: string
  readonly setNewFolderName: (v: string) => void
  readonly handleCreateFolder: () => void
  readonly folders: readonly Folder[]
  readonly notes: readonly Note[]
  readonly folderMultiSelectMode: boolean
  readonly toggleFolderMultiSelectMode: () => void
  readonly isAllFoldersSelected: () => boolean
  readonly isSomeFoldersSelected: () => boolean
  readonly selectAllFolders: () => void
  readonly deselectAllFolders: () => void
  readonly selectedFolderIds: Set<string>
  readonly handleDeleteSelectedFolders: () => void
  readonly toggleFolderSelection: (id: string) => void
  readonly expandedFolders: Set<string>
  readonly dropTargetFolderId: string | null
  readonly handleDragOver: (e: React.DragEvent) => void
  readonly handleDrop: (folderId: string | undefined, e: React.DragEvent) => void
  readonly handleDragEnter: (folderId: string | undefined, e: React.DragEvent) => void
  readonly handleDragLeave: (e: React.DragEvent) => void
  readonly toggleFolder: (id: string) => void
  readonly editingFolderId: string | null
  readonly editingFolderName: string
  readonly setEditingFolderName: (v: string) => void
  readonly setEditingFolderId: (v: string | null) => void
  readonly handleRenameFolder: (id: string) => void
  readonly handleCreateNoteInFolder: (folderId: string | undefined) => void
  readonly handleDeleteFolder: (id: string, e: React.MouseEvent) => void
  readonly noteMultiSelectMode: boolean
  readonly toggleNoteMultiSelectMode: () => void
  readonly isAllNotesSelectedInFolder: (folderId: string | undefined) => boolean
  readonly isSomeNotesSelectedInFolder: (folderId: string | undefined) => boolean
  readonly selectAllNotesInFolder: (folderId: string | undefined) => void
  readonly deselectAllNotesInFolder: () => void
  readonly selectedNoteIds: Set<string>
  readonly handleDeleteSelectedNotes: () => void
  readonly renderNote: (note: Note, showCheckbox?: boolean, isInSelectionMode?: boolean) => React.ReactNode
  readonly trashOpen: boolean
  readonly setTrashOpen: (v: boolean) => void
  readonly trashNotes: readonly Note[]
  readonly trashFolders: readonly Folder[]
  readonly isAllSelected: () => boolean
  readonly isSomeSelected: () => boolean
  readonly deselectAllTrashItems: () => void
  readonly selectAllTrashItems: () => void
  readonly selectedTrashItems: Set<string>
  readonly handleRestoreSelected: () => void
  readonly handleDeleteSelected: () => void
  readonly handleEmptyTrash: () => void
  readonly toggleTrashItemSelection: (id: string) => void
  readonly handleRestoreFolder: (id: string, e: React.MouseEvent) => void
  readonly handlePermanentlyDeleteFolder: (id: string, e: React.MouseEvent) => void
  readonly handleRestoreNote: (id: string, e: React.MouseEvent) => void
  readonly handlePermanentlyDeleteNote: (id: string, e: React.MouseEvent) => void
}

/** Left sidebar content — notes list, folders, create note button, trash */
function LeftSidebarContent(props: LeftSidebarContentProps) {
  const {
    handleCreateNote, creatingFolder, setCreatingFolder, newFolderName, setNewFolderName,
    handleCreateFolder, folders, notes, folderMultiSelectMode, toggleFolderMultiSelectMode,
    isAllFoldersSelected, isSomeFoldersSelected, selectAllFolders, deselectAllFolders,
    selectedFolderIds, handleDeleteSelectedFolders, toggleFolderSelection,
    expandedFolders, dropTargetFolderId, handleDragOver, handleDrop, handleDragEnter, handleDragLeave,
    toggleFolder, editingFolderId, editingFolderName, setEditingFolderName, setEditingFolderId,
    handleRenameFolder, handleCreateNoteInFolder, handleDeleteFolder,
    noteMultiSelectMode, toggleNoteMultiSelectMode, isAllNotesSelectedInFolder, isSomeNotesSelectedInFolder,
    selectAllNotesInFolder, deselectAllNotesInFolder, selectedNoteIds, handleDeleteSelectedNotes,
    renderNote, trashOpen, setTrashOpen, trashNotes, trashFolders,
    isAllSelected, isSomeSelected, deselectAllTrashItems, selectAllTrashItems,
    selectedTrashItems, handleRestoreSelected, handleDeleteSelected,
    handleEmptyTrash, toggleTrashItemSelection, handleRestoreFolder, handlePermanentlyDeleteFolder,
    handleRestoreNote, handlePermanentlyDeleteNote,
  } = props

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
          {creatingFolder ? (
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
          ) : (
            <button
              onClick={() => { setCreatingFolder(true); }}
              className="w-full flex items-center gap-1.5 xs:gap-2 px-1.5 xs:px-2 sm:px-2 laptop:px-3 py-1 xs:py-1.5 sm:py-1.5 laptop:py-2 text-xs sm:text-xs laptop:text-sm text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-md transition-colors"
            >
              <FolderPlus className="h-3.5 w-3.5 xs:h-4 xs:w-4 sm:h-4 sm:w-4 laptop:h-4.5 laptop:w-4.5" />
              <span>Nouveau dossier</span>
            </button>
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
                onClick={() => { isAllFoldersSelected() ? deselectAllFolders() : selectAllFolders() }}
                className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded text-neutral-600 dark:text-neutral-400"
                title={isAllFoldersSelected() ? "Tout désélectionner" : "Tout sélectionner"} aria-label={isAllFoldersSelected() ? "Tout désélectionner" : "Tout sélectionner"}
              >
                <ThreeStateCheckbox allSelected={isAllFoldersSelected()} someSelected={isSomeFoldersSelected()} />
              </button>
            )}
            
            <h3 className="text-xs text-neutral-600 dark:text-neutral-400 font-medium">
              Dossiers
            </h3>
            
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
                onDrop={(e) => { handleDrop(folder.id, e); }}
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
                      title="Renommer le dossier" aria-label="Renommer le dossier"
                    >
                      <Edit2 className="h-3 w-3 xs:h-3.5 xs:w-3.5" />
                    </button>
                    <button
                      onClick={(e) => { handleDeleteFolder(folder.id, e); }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 xs:p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-600"
                      title="Supprimer le dossier" aria-label="Supprimer le dossier"
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
                    <NoteMultiSelectHeader folderId={folder.id} noteMultiSelectMode={noteMultiSelectMode}
                      toggleNoteMultiSelectMode={toggleNoteMultiSelectMode}
                      isAllSelected={isAllNotesSelectedInFolder(folder.id)} isSomeSelected={isSomeNotesSelectedInFolder(folder.id)}
                      onSelectAll={() => { selectAllNotesInFolder(folder.id); }} onDeselectAll={deselectAllNotesInFolder}
                      selectedCount={selectedNoteIds.size} hasSelectedInView={folderNotes.some(n => selectedNoteIds.has(n.id))}
                      onDeleteSelected={handleDeleteSelectedNotes}
                    />
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
            onDrop={(e) => { handleDrop(undefined, e); }}
            onDragEnter={(e) => { handleDragEnter(undefined, e); }}
            onDragLeave={handleDragLeave}
            className={`rounded-md transition-colors ${
              dropTargetFolderId === 'root' ? 'bg-primary-100 dark:bg-primary-900/30 ring-2 ring-primary-500' : ''
            }`}
          >
            <button
              type="button"
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
            </button>
          </div>
        </div>

        {expandedFolders.has('root') && (
          <div className="ml-3 xs:ml-4 space-y-0.5 xs:space-y-1">
            {/* Multi-select header for unfiled notes */}
            {notes.filter(n => !n.folder_id).length > 0 && (
              <NoteMultiSelectHeader folderId="root" noteMultiSelectMode={noteMultiSelectMode}
                toggleNoteMultiSelectMode={toggleNoteMultiSelectMode}
                isAllSelected={isAllNotesSelectedInFolder('root')} isSomeSelected={isSomeNotesSelectedInFolder('root')}
                onSelectAll={() => { selectAllNotesInFolder('root'); }} onDeselectAll={deselectAllNotesInFolder}
                selectedCount={selectedNoteIds.size} hasSelectedInView={notes.filter(n => !n.folder_id).some(n => selectedNoteIds.has(n.id))}
                onDeleteSelected={handleDeleteSelectedNotes}
              />
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
        <TrashSection
          trashOpen={trashOpen} setTrashOpen={setTrashOpen}
          trashNotes={trashNotes} trashFolders={trashFolders}
          isAllSelected={isAllSelected} isSomeSelected={isSomeSelected}
          deselectAllTrashItems={deselectAllTrashItems} selectAllTrashItems={selectAllTrashItems}
          selectedTrashItems={selectedTrashItems}
          handleRestoreSelected={handleRestoreSelected} handleDeleteSelected={handleDeleteSelected}
          handleEmptyTrash={handleEmptyTrash} toggleTrashItemSelection={toggleTrashItemSelection}
          handleRestoreFolder={handleRestoreFolder} handlePermanentlyDeleteFolder={handlePermanentlyDeleteFolder}
          handleRestoreNote={handleRestoreNote} handlePermanentlyDeleteNote={handlePermanentlyDeleteNote}
        />
      </div>
    </div>
  )
}

/** Right sidebar content — metadata inspector */
function RightSidebarContent({ activeNoteId }: { readonly activeNoteId?: string | null }) {
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
    
    if (globalThis.confirm(message)) {
      try {
        await deleteFolderById(folderId)
        if (reloadFolders) {await reloadFolders()} else {await loadFolders()}
      } catch (error) {
        console.error('Erreur lors de la suppression du dossier:', error)
      }
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
    
    if (globalThis.confirm(message)) {
      try {
        await permanentlyDeleteFolder(folderId)
      } catch (err) {
        console.error('Erreur lors de la suppression définitive du dossier:', err)
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
    
    if (globalThis.confirm(message)) {
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
    
    const confirmed = globalThis.confirm(
      `Supprimer ${selectedNoteIds.size} note(s) sélectionnée(s) ?`
    )
    if (confirmed) {
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
    if (globalThis.confirm(`Cette action est irréversible. Supprimer définitivement ${totalItems} élément(s) de la corbeille ?`)) {
      try {
        for (const folder of trashFolders) {
          if (permanentlyDeleteFolder) {await permanentlyDeleteFolder(folder.id)}
        }
        const orphanNotes = trashNotes.filter(n => !trashFolders.some(f => f.id === n.folder_id))
        for (const note of orphanNotes) {
          if (permanentlyDeleteNote) {await permanentlyDeleteNote(note.id)}
        }
        setSelectedTrashItems(new Set())
      } catch (error) {
        console.error('Erreur lors du vidage de la corbeille:', error)
      }
    }
  }

  const permanentlyDeleteTrashItem = async (itemId: string) => {
    const isFolder = itemId.startsWith('folder-')
    // SECURITY FIX: Validate itemId format to prevent ReDoS on string operations
    if (!/^folder-[a-zA-Z0-9-_]{1,100}$/.test(itemId) && !/^note-[a-zA-Z0-9-_]{1,100}$/.test(itemId)) {
      console.error('Invalid itemId format:', itemId)
      return
    }
    const id = isFolder ? itemId.replace('folder-', '') : itemId.replace('note-', '')
    if (isFolder && permanentlyDeleteFolder) {return permanentlyDeleteFolder(id)}
    if (!isFolder && permanentlyDeleteNote) {return permanentlyDeleteNote(id)}
  }

  const handleDeleteSelected = async () => {
    if (selectedTrashItems.size === 0) {return}
    if (globalThis.confirm(`Cette action est irréversible. Supprimer définitivement ${selectedTrashItems.size} élément(s) sélectionné(s) ?`)) {
      try {
        for (const itemId of selectedTrashItems) {
          await permanentlyDeleteTrashItem(itemId)
        }
        setSelectedTrashItems(new Set())
      } catch (error) {
        console.error('Erreur lors de la suppression des éléments sélectionnés:', error)
      }
    }
  }

  const restoreTrashItem = async (itemId: string) => {
    const isFolder = itemId.startsWith('folder-')
    // SECURITY FIX: Validate itemId format to prevent ReDoS on string operations
    if (!/^folder-[a-zA-Z0-9-_]{1,100}$/.test(itemId) && !/^note-[a-zA-Z0-9-_]{1,100}$/.test(itemId)) {
      console.error('Invalid itemId format:', itemId)
      return
    }
    const id = isFolder ? itemId.replace('folder-', '') : itemId.replace('note-', '')
    if (isFolder && restoreFolder) {return restoreFolder(id)}
    if (!isFolder && restoreNote) {return restoreNote(id)}
  }

  const handleRestoreSelected = async () => {
    if (selectedTrashItems.size === 0) {return}
    try {
      for (const itemId of selectedTrashItems) {
        await restoreTrashItem(itemId)
      }
      setSelectedTrashItems(new Set())
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
    if (e.key === 'Escape') {
      setEditingNoteId(null)
      setEditingTitle('')
      return
    }
    if (e.key !== 'Enter') {return}
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
  }

  const handleDeleteNote = async (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!deleteNote) {return}

    if (globalThis.confirm('Êtes-vous sûr de vouloir supprimer cette note ?')) {
      try {
        await deleteNote(noteId)
      } catch (err) {
        console.error('Erreur lors de la suppression:', err)
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
    
    if (globalThis.confirm('Cette action est irréversible. Supprimer définitivement ?')) {
      try {
        await permanentlyDeleteNote(noteId)
      } catch (err) {
        console.error('Erreur lors de la suppression définitive:', err)
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
      } ${getNoteBackgroundClass(selectedNoteIds, note.id, activeNoteId)} ${isInSelectionMode ? 'cursor-default' : 'cursor-move'}`}
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
                    onClick={(e: React.MouseEvent) => { e.stopPropagation(); }}
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
      <LeftSidebarContent
        handleCreateNote={handleCreateNote}
        creatingFolder={creatingFolder} setCreatingFolder={setCreatingFolder}
        newFolderName={newFolderName} setNewFolderName={setNewFolderName}
        handleCreateFolder={handleCreateFolder}
        folders={folders} notes={notes}
        folderMultiSelectMode={folderMultiSelectMode} toggleFolderMultiSelectMode={toggleFolderMultiSelectMode}
        isAllFoldersSelected={isAllFoldersSelected} isSomeFoldersSelected={isSomeFoldersSelected}
        selectAllFolders={selectAllFolders} deselectAllFolders={deselectAllFolders}
        selectedFolderIds={selectedFolderIds} handleDeleteSelectedFolders={handleDeleteSelectedFolders}
        toggleFolderSelection={toggleFolderSelection}
        expandedFolders={expandedFolders} dropTargetFolderId={dropTargetFolderId}
        handleDragOver={handleDragOver} handleDrop={handleDrop}
        handleDragEnter={handleDragEnter} handleDragLeave={handleDragLeave}
        toggleFolder={toggleFolder}
        editingFolderId={editingFolderId} editingFolderName={editingFolderName}
        setEditingFolderName={setEditingFolderName} setEditingFolderId={setEditingFolderId}
        handleRenameFolder={handleRenameFolder}
        handleCreateNoteInFolder={handleCreateNoteInFolder}
        handleDeleteFolder={handleDeleteFolder}
        noteMultiSelectMode={noteMultiSelectMode} toggleNoteMultiSelectMode={toggleNoteMultiSelectMode}
        isAllNotesSelectedInFolder={isAllNotesSelectedInFolder} isSomeNotesSelectedInFolder={isSomeNotesSelectedInFolder}
        selectAllNotesInFolder={selectAllNotesInFolder} deselectAllNotesInFolder={deselectAllNotesInFolder}
        selectedNoteIds={selectedNoteIds} handleDeleteSelectedNotes={handleDeleteSelectedNotes}
        renderNote={renderNote}
        trashOpen={trashOpen} setTrashOpen={setTrashOpen}
        trashNotes={trashNotes} trashFolders={trashFolders}
        isAllSelected={isAllSelected} isSomeSelected={isSomeSelected}
        deselectAllTrashItems={deselectAllTrashItems} selectAllTrashItems={selectAllTrashItems}
        selectedTrashItems={selectedTrashItems}
        handleRestoreSelected={handleRestoreSelected} handleDeleteSelected={handleDeleteSelected}
        handleEmptyTrash={handleEmptyTrash} toggleTrashItemSelection={toggleTrashItemSelection}
        handleRestoreFolder={handleRestoreFolder} handlePermanentlyDeleteFolder={handlePermanentlyDeleteFolder}
        handleRestoreNote={handleRestoreNote} handlePermanentlyDeleteNote={handlePermanentlyDeleteNote}
      />
    )
  }

  // Right sidebar (metadata inspector)
  return <RightSidebarContent activeNoteId={activeNoteId} />
}
