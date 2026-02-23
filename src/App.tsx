// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

import React, { useState, useEffect, useRef, Suspense } from 'react';

import AuthModal from '@/components/auth/AuthModal';
import CommandPalette from '@/components/command/CommandPalette';
import InstallPrompt from '@/components/InstallPrompt';
import Navigation from '@/components/layout/Navigation';
import StatusBar from '@/components/layout/StatusBar';
import WorkspaceView from '@/components/workspace/WorkspaceView';
import { useAuth } from '@/hooks/useAuth';
import { useLocalNotes } from '@/hooks/useLocalNotes';
import { ViewMode, Note } from '@/types';

// Lazy load heavy view components for better code splitting
// WorkspaceView is the default view - imported directly to avoid lazy-load delay
// Sidebar is lazy-loaded since it starts closed on mobile (most users)
const SearchView = React.lazy(() => import('@/components/search/SearchView'));
const SettingsView = React.lazy(() => import('@/components/settings/SettingsView'));
const TimelineView = React.lazy(() => import('@/components/timeline/TimelineView'));
const Sidebar = React.lazy(() => import('@/components/layout/Sidebar'));

function App() {
  const { user, loading, signOut } = useAuth();
  const {
    notes,
    folders,
    syncing,
    syncEnabled,
    createNote,
    updateNote,
    deleteNote,
    restoreNote,
    permanentlyDeleteNote,
    deleteFolder,
    restoreFolder,
    permanentlyDeleteFolder,
    reloadFolders,
    trashNotes,
    trashFolders,
    enableSync,
    disableSync,
  } = useLocalNotes(user?.id);
  const [currentView, setCurrentView] = useState<ViewMode>('workspace');
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [isMobile, setIsMobile] = useState(globalThis.innerWidth < 1024);
  const [hasUserToggledSidebar, setHasUserToggledSidebar] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Auto-enable sync when user logs in and trigger immediate sync
  React.useEffect(() => {
    if (user?.id && !syncEnabled) {
      enableSync();
    }
  }, [user?.id, syncEnabled, enableSync]);

  // Force a manual sync when user transitions from logged out to logged in
  React.useEffect(() => {
    if (user?.id && syncEnabled) {
      // Small delay to ensure the sync effect in useLocalNotes has run
      const timer = setTimeout(() => {
        disableSync();
        setTimeout(() => {
          enableSync();
        }, 50);
      }, 100);
      return () => {
        clearTimeout(timer);
      };
    }
    return undefined;
  }, [user?.id]);

  // Responsive: Detect mobile/desktop
  useEffect(() => {
    const handleResize = () => {
      const mobile = globalThis.innerWidth < 1024;
      setIsMobile(mobile);

      // Only auto-manage sidebar if user hasn't manually toggled it
      if (!hasUserToggledSidebar) {
        // Auto-close sidebar on mobile, auto-open on desktop
        if (mobile && leftSidebarOpen) {
          setLeftSidebarOpen(false);
        } else if (!mobile && !leftSidebarOpen) {
          setLeftSidebarOpen(true);
        }
      }
    };

    globalThis.addEventListener('resize', handleResize);
    // Initial check
    handleResize();
    return () => {
      globalThis.removeEventListener('resize', handleResize);
    };
  }, [leftSidebarOpen, hasUserToggledSidebar]);

  // Keyboard shortcuts - Toggle command palette with Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K: Toggle command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(prev => !prev);
      }
      // Cmd/Ctrl + N: Create new note
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        const button = document.querySelector('[data-new-note]');
        if (button) (button as HTMLElement).click();
      }
    };

    globalThis.addEventListener('keydown', handleKeyDown);
    return () => {
      globalThis.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Escape key handler (separate effect to avoid stale closure)
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowCommandPalette(false);
      }
    };

    globalThis.addEventListener('keydown', handleEscape);
    return () => {
      globalThis.removeEventListener('keydown', handleEscape);
    };
  }, []);

  // Sauvegarder avant de fermer l'application (F5, fermeture onglet, etc.)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Le navigateur va fermer/recharger la page
      // On ne peut pas faire d'async ici, mais on peut déclencher une sauvegarde synchrone
      // Cependant, comme nous utilisons LocalStorage.saveNoteSync dans WorkspaceView,
      // les données devraient déjà être sauvegardées quand on quitte une note
      // On laisse quand même un message de confirmation si nécessaire
      const hasUnsavedChanges = document.querySelector('[data-save-status="unsaved"]');
      if (hasUnsavedChanges) {
        e.preventDefault();
        // Modern browsers require returnValue to be set for the beforeunload event
        // This is intentional and not deprecated in this context
        Object.defineProperty(e, 'returnValue', {
          value: '',
          writable: false,
        });
      }
    };

    globalThis.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      globalThis.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Manual sync function - just toggle sync to trigger a refresh
  const handleManualSync = () => {
    if (user?.id && syncEnabled) {
      disableSync();
      setTimeout(() => {
        enableSync();
      }, 100);
    }
  };

  const handleCreateNote = async () => {
    const result = await createNote('Nouvelle note', '');
    if (result.data) {
      setActiveNoteId(result.data.id);
      setCurrentView('workspace');
    }
  };

  // Wrapper pour créer une note (utilisé par les fonctionnalités IA et Canvas)
  const handleCreateNoteFromAI = async (
    title: string,
    content: string,
    folderId?: string
  ): Promise<Note | null> => {
    const result = await createNote(title, content, folderId);
    return result.data || null;
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary-500 border-t-transparent mx-auto"></div>
          <p className="text-body text-neutral-700">Chargement...</p>
        </div>
      </div>
    );
  }

  const renderView = () => {
    switch (currentView) {
      case 'workspace':
        return (
          <WorkspaceView
            userId={user?.id ?? null}
            activeNoteId={activeNoteId}
            onNoteChange={setActiveNoteId}
            rightSidebarOpen={rightSidebarOpen}
            notes={notes}
            updateNote={updateNote}
            createNote={handleCreateNoteFromAI}
          />
        );
      case 'search':
        return (
          <SearchView
            userId={user?.id ?? null}
            notes={notes}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            onSelectNote={noteId => {
              setActiveNoteId(noteId);
              setCurrentView('workspace');
              setSearchQuery('');
            }}
          />
        );
      case 'settings':
        return <SettingsView userId={user?.id ?? null} />;
      case 'timeline':
        return (
          <TimelineView
            notes={notes}
            onOpenNote={noteId => {
              setActiveNoteId(noteId);
              setCurrentView('workspace');
            }}
          />
        );
    }
  };

  return (
    <div className="flex h-screen flex-col bg-neutral-50 dark:bg-neutral-900 overflow-hidden">
      <Navigation
        currentView={currentView}
        onViewChange={setCurrentView}
        onToggleLeftSidebar={() => {
          setLeftSidebarOpen(!leftSidebarOpen);
          setHasUserToggledSidebar(true);
        }}
        onToggleRightSidebar={() => {
          setRightSidebarOpen(!rightSidebarOpen);
        }}
        leftSidebarOpen={leftSidebarOpen}
        rightSidebarOpen={rightSidebarOpen}
        user={user}
        onShowAuth={() => {
          setShowAuthModal(true);
        }}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
      />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile & Tablet overlay backdrop */}
        {isMobile && leftSidebarOpen && (
          <button
            type="button"
            className="fixed inset-0 bg-black/50 z-30 laptop-sm:hidden"
            onClick={() => {
              setLeftSidebarOpen(false);
            }}
            aria-label="Fermer le menu"
          />
        )}

        {/* Left Sidebar - lazy-loaded since it starts closed on mobile */}
        {leftSidebarOpen && (
          <div
            className={
              isMobile
                ? 'fixed left-0 top-[48px] xs:top-[52px] sm:top-[56px] md:top-[60px] bottom-0 z-40 w-[85vw] max-w-[280px] xs:max-w-[300px] sm:max-w-[320px] md:max-w-[340px] animate-slide-in-right shadow-2xl'
                : 'relative w-[260px] sm:w-[280px] md:w-[300px] laptop-sm:w-[320px] laptop:w-[360px] laptop-lg:w-[400px]'
            }
          >
            <Suspense
              fallback={<div className="h-full bg-neutral-50 dark:bg-neutral-900 animate-pulse" />}
            >
              <Sidebar
                side="left"
                userId={user?.id ?? null}
                activeNoteId={activeNoteId}
                onNoteSelect={noteId => {
                  setActiveNoteId(noteId);
                  setCurrentView('workspace');
                  if (isMobile) {
                    setLeftSidebarOpen(false);
                  }
                }}
                notes={notes}
                folders={folders}
                trashNotes={trashNotes}
                trashFolders={trashFolders}
                createNote={createNote}
                updateNote={updateNote}
                deleteNote={deleteNote}
                restoreNote={restoreNote}
                permanentlyDeleteNote={permanentlyDeleteNote}
                deleteFolder={deleteFolder}
                restoreFolder={restoreFolder}
                permanentlyDeleteFolder={permanentlyDeleteFolder}
                reloadFolders={reloadFolders}
              />
            </Suspense>
          </div>
        )}

        <main className="flex-1 overflow-hidden min-w-0">
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent"></div>
              </div>
            }
          >
            {renderView()}
          </Suspense>
        </main>

        {currentView === 'workspace' && rightSidebarOpen && (
          <div className="hidden laptop-sm:block">
            <Suspense
              fallback={<div className="h-full bg-neutral-50 dark:bg-neutral-900 animate-pulse" />}
            >
              <Sidebar side="right" userId={user?.id ?? null} activeNoteId={activeNoteId} />
            </Suspense>
          </div>
        )}
      </div>

      <StatusBar
        userId={user?.id ?? null}
        activeNoteId={activeNoteId}
        syncing={syncing}
        syncEnabled={syncEnabled}
        onShowAuth={() => {
          setShowAuthModal(true);
        }}
        onEnableSync={enableSync}
        onManualSync={handleManualSync}
      />

      {showAuthModal && (
        <AuthModal
          onClose={() => {
            setShowAuthModal(false);
          }}
        />
      )}

      <CommandPalette
        open={showCommandPalette}
        onClose={() => {
          setShowCommandPalette(false);
        }}
        notes={notes}
        currentView={currentView}
        onViewChange={setCurrentView}
        onNoteSelect={noteId => {
          setActiveNoteId(noteId);
          setCurrentView('workspace');
        }}
        onCreateNote={handleCreateNote}
        onShowAuth={() => {
          setShowAuthModal(true);
        }}
        user={user}
        onSignOut={signOut}
      />

      <InstallPrompt />
    </div>
  );
}

export default App;
