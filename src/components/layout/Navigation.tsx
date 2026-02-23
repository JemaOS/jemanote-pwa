// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

import {
  Search,
  SidebarOpen,
  SidebarClose,
  Settings,
  LogOut,
  LogIn,
  PanelRightOpen,
  LayoutTemplate,
  Menu,
  X,
  Layout,
  History,
} from 'lucide-react';
import { useState } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { ViewMode, User } from '@/types';

interface NavigationProps {
  readonly currentView: ViewMode;
  readonly onViewChange: (view: ViewMode) => void;
  readonly onToggleLeftSidebar: () => void;
  readonly onToggleRightSidebar: () => void;
  readonly leftSidebarOpen: boolean;
  readonly rightSidebarOpen: boolean;
  readonly user: User | null;
  readonly onShowAuth: () => void;
  readonly searchQuery?: string;
  readonly onSearchQueryChange?: (query: string) => void;
}

export default function Navigation({
  currentView,
  onViewChange,
  onToggleLeftSidebar,
  onToggleRightSidebar,
  leftSidebarOpen,
  rightSidebarOpen,
  user,
  onShowAuth,
  searchQuery = '',
  onSearchQueryChange,
}: NavigationProps) {
  const { signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    setMobileMenuOpen(false);
  };

  const handleViewChange = (view: ViewMode) => {
    onViewChange(view);
    setMobileMenuOpen(false);
  };

  const viewButtonClass = (view: ViewMode) =>
    currentView === view
      ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-500'
      : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300';

  const mobileViewButtonClass = (view: ViewMode) =>
    `w-full flex items-center gap-2 xs:gap-2.5 sm:gap-3 px-3 xs:px-3.5 sm:px-4 py-2.5 xs:py-2.75 sm:py-3 rounded-md transition-colors min-h-[44px] text-sm xs:text-base ${viewButtonClass(view)}`;

  return (
    <nav
      aria-label="Navigation principale"
      className="h-12 xs:h-13 sm:h-14 md:h-15 laptop-sm:h-16 laptop:h-[4.5rem] bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 flex items-center px-2 xs:px-2.5 sm:px-3 md:px-4 laptop-sm:px-5 laptop:px-6 laptop-lg:px-8 gap-1.5 xs:gap-2 sm:gap-2.5 md:gap-3 laptop-sm:gap-4 laptop:gap-6 relative z-20"
    >
      {/* Mobile & Tablet: Logo + Search Icon + Menu */}
      <div className="laptop-sm:hidden flex items-center gap-1.5 xs:gap-2 sm:gap-2.5 md:gap-3 flex-1">
        <button
          onClick={onToggleLeftSidebar}
          className="p-1.5 xs:p-2 sm:p-2 md:p-2.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors min-w-[40px] min-h-[40px] xs:min-w-[44px] xs:min-h-[44px] flex items-center justify-center"
          title={leftSidebarOpen ? 'Masquer la barre latérale' : 'Afficher la barre latérale'}
          aria-label={leftSidebarOpen ? 'Masquer la barre latérale' : 'Afficher la barre latérale'}
        >
          {leftSidebarOpen ? (
            <SidebarClose className="h-4.5 w-4.5 xs:h-5 xs:w-5 sm:h-5.5 sm:w-5.5 md:h-6 md:w-6 text-neutral-700 dark:text-neutral-300" />
          ) : (
            <SidebarOpen className="h-4.5 w-4.5 xs:h-5 xs:w-5 sm:h-5.5 sm:w-5.5 md:h-6 md:w-6 text-neutral-700 dark:text-neutral-300" />
          )}
        </button>

        <h1 className="text-base xs:text-lg sm:text-xl md:text-2xl font-bold text-neutral-900 dark:text-neutral-100 flex-1 truncate">
          Jemanote
        </h1>

        <button
          onClick={() => {
            onViewChange('search');
          }}
          className="p-1.5 xs:p-2 sm:p-2 md:p-2.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors min-w-[40px] min-h-[40px] xs:min-w-[44px] xs:min-h-[44px] flex items-center justify-center"
          title="Rechercher"
          aria-label="Rechercher"
        >
          <Search className="h-4.5 w-4.5 xs:h-5 xs:w-5 sm:h-5.5 sm:w-5.5 md:h-6 md:w-6 text-neutral-700 dark:text-neutral-300" />
        </button>

        <button
          onClick={() => {
            setMobileMenuOpen(!mobileMenuOpen);
          }}
          className="p-1.5 xs:p-2 sm:p-2 md:p-2.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors min-w-[40px] min-h-[40px] xs:min-w-[44px] xs:min-h-[44px] flex items-center justify-center"
          title="Menu"
          aria-label="Menu"
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? (
            <X className="h-4.5 w-4.5 xs:h-5 xs:w-5 sm:h-5.5 sm:w-5.5 md:h-6 md:w-6 text-neutral-700 dark:text-neutral-300" />
          ) : (
            <Menu className="h-4.5 w-4.5 xs:h-5 xs:w-5 sm:h-5.5 sm:w-5.5 md:h-6 md:w-6 text-neutral-700 dark:text-neutral-300" />
          )}
        </button>
      </div>

      {/* Desktop: Full navigation */}
      <div className="hidden laptop-sm:flex items-center gap-3 laptop:gap-4 laptop-lg:gap-6 flex-1">
        <button
          onClick={onToggleLeftSidebar}
          className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors laptop:p-2.5"
          title={leftSidebarOpen ? 'Masquer la barre latérale' : 'Afficher la barre latérale'}
          aria-label={leftSidebarOpen ? 'Masquer la barre latérale' : 'Afficher la barre latérale'}
        >
          {leftSidebarOpen ? (
            <SidebarClose className="h-5 w-5 laptop:h-5.5 laptop:w-5.5 laptop-lg:h-6 laptop-lg:w-6 text-neutral-700 dark:text-neutral-300" />
          ) : (
            <SidebarOpen className="h-5 w-5 laptop:h-5.5 laptop:w-5.5 laptop-lg:h-6 laptop-lg:w-6 text-neutral-700 dark:text-neutral-300" />
          )}
        </button>

        <h1 className="text-xl laptop:text-2xl laptop-lg:text-3xl font-bold text-neutral-900 dark:text-neutral-100">
          Jemanote
        </h1>

        <div className="flex-1 max-w-md laptop:max-w-lg laptop-lg:max-w-xl desktop:max-w-2xl ml-4 laptop:ml-6">
          <div className="relative">
            <Search className="absolute left-3 laptop:left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 laptop:h-5 laptop:w-5 text-neutral-500 dark:text-neutral-400" />
            <input
              type="text"
              placeholder="Rechercher des notes..."
              value={searchQuery}
              onChange={e => {
                onSearchQueryChange?.(e.target.value);
                if (currentView !== 'search') {
                  onViewChange('search');
                }
              }}
              className="w-full h-10 laptop:h-11 laptop-lg:h-12 pl-9 laptop:pl-11 pr-4 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm laptop:text-base text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-500 dark:placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              onFocus={() => {
                if (currentView !== 'search') {
                  onViewChange('search');
                }
              }}
            />
          </div>
        </div>

        <div className="flex items-center gap-1 laptop:gap-1.5 laptop-lg:gap-2">
          <button
            onClick={() => {
              onViewChange('workspace');
            }}
            className={`p-2 laptop:p-2.5 rounded-md transition-colors ${viewButtonClass('workspace')}`}
            title="Espace de travail"
            aria-label="Espace de travail"
          >
            <Layout className="h-5 w-5 laptop:h-5.5 laptop:w-5.5 laptop-lg:h-6 laptop-lg:w-6" />
          </button>

          <button
            onClick={() => {
              onViewChange('canvas');
            }}
            className={`p-2 laptop:p-2.5 rounded-md transition-colors ${viewButtonClass('canvas')}`}
            title="Canvas"
            aria-label="Canvas"
          >
            <LayoutTemplate className="h-5 w-5 laptop:h-5.5 laptop:w-5.5 laptop-lg:h-6 laptop-lg:w-6" />
          </button>

          <button
            onClick={() => {
              onViewChange('timeline');
            }}
            className={`p-2 laptop:p-2.5 rounded-md transition-colors ${viewButtonClass('timeline')}`}
            title="Chronologie"
            aria-label="Chronologie"
          >
            <History className="h-5 w-5 laptop:h-5.5 laptop:w-5.5 laptop-lg:h-6 laptop-lg:w-6" />
          </button>

          <button
            onClick={() => {
              onViewChange('settings');
            }}
            className={`p-2 laptop:p-2.5 rounded-md transition-colors ${viewButtonClass('settings')}`}
            title="Paramètres"
            aria-label="Paramètres"
          >
            <Settings className="h-5 w-5 laptop:h-5.5 laptop:w-5.5 laptop-lg:h-6 laptop-lg:w-6" />
          </button>

          {/* Right sidebar toggle - Hidden on small screens */}
          <button
            onClick={onToggleRightSidebar}
            className="hidden laptop-sm:block p-2 laptop:p-2.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors"
            title={rightSidebarOpen ? "Masquer l'inspecteur" : "Afficher l'inspecteur"}
            aria-label={rightSidebarOpen ? "Masquer l'inspecteur" : "Afficher l'inspecteur"}
          >
            {rightSidebarOpen ? (
              <PanelRightOpen className="h-5 w-5 laptop:h-5.5 laptop:w-5.5 laptop-lg:h-6 laptop-lg:w-6 text-neutral-700 dark:text-neutral-300" />
            ) : (
              <SidebarClose className="h-5 w-5 laptop:h-5.5 laptop:w-5.5 laptop-lg:h-6 laptop-lg:w-6 text-neutral-700 dark:text-neutral-300" />
            )}
          </button>
        </div>

        {/* Bouton connexion séparé - tout à droite */}
        {user ? (
          <button
            onClick={handleSignOut}
            className="ml-auto p-2 laptop:p-2.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors text-neutral-700 dark:text-neutral-300"
            title="Se déconnecter"
            aria-label="Se déconnecter"
          >
            <LogOut className="h-5 w-5 laptop:h-5.5 laptop:w-5.5 laptop-lg:h-6 laptop-lg:w-6" />
          </button>
        ) : (
          <button
            onClick={onShowAuth}
            className="ml-auto px-3 laptop:px-4 laptop-lg:px-5 h-9 laptop:h-10 laptop-lg:h-11 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors flex items-center gap-2 font-semibold text-sm laptop:text-base whitespace-nowrap"
            title="Se connecter pour synchroniser"
            aria-label="Se connecter pour synchroniser"
          >
            <LogIn className="h-4 w-4 laptop:h-4.5 laptop:w-4.5" />
            <span className="hidden laptop:inline">Connexion</span>
          </button>
        )}
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="laptop-sm:hidden absolute top-full left-0 right-0 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 shadow-lg z-50 animate-slide-up">
          <div className="p-2 xs:p-2.5 sm:p-3 md:p-4 space-y-1.5 xs:space-y-2">
            <button
              onClick={() => {
                handleViewChange('workspace');
              }}
              className={mobileViewButtonClass('workspace')}
            >
              <Layout className="h-4.5 w-4.5 xs:h-5 xs:w-5 sm:h-5.5 sm:w-5.5" />
              <span className="font-medium">Espace de travail</span>
            </button>

            <button
              onClick={() => {
                handleViewChange('canvas');
              }}
              className={mobileViewButtonClass('canvas')}
            >
              <LayoutTemplate className="h-4.5 w-4.5 xs:h-5 xs:w-5 sm:h-5.5 sm:w-5.5" />
              <span className="font-medium">Canvas</span>
            </button>

            <button
              onClick={() => {
                handleViewChange('timeline');
              }}
              className={mobileViewButtonClass('timeline')}
            >
              <History className="h-4.5 w-4.5 xs:h-5 xs:w-5 sm:h-5.5 sm:w-5.5" />
              <span className="font-medium">Chronologie</span>
            </button>

            <button
              onClick={() => {
                handleViewChange('settings');
              }}
              className={mobileViewButtonClass('settings')}
            >
              <Settings className="h-4.5 w-4.5 xs:h-5 xs:w-5 sm:h-5.5 sm:w-5.5" />
              <span className="font-medium">Paramètres</span>
            </button>

            <div className="border-t border-neutral-200 dark:border-neutral-800 my-1.5 xs:my-2" />

            {user ? (
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 xs:gap-2.5 sm:gap-3 px-3 xs:px-3.5 sm:px-4 py-2.5 xs:py-2.75 sm:py-3 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors min-h-[44px] text-sm xs:text-base"
              >
                <LogOut className="h-4.5 w-4.5 xs:h-5 xs:w-5 sm:h-5.5 sm:w-5.5" />
                <span className="font-medium">Se déconnecter</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  onShowAuth();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 xs:gap-2.5 sm:gap-3 px-3 xs:px-3.5 sm:px-4 py-2.5 xs:py-2.75 sm:py-3 rounded-md bg-primary-500 text-white hover:bg-primary-600 transition-colors font-semibold min-h-[44px] text-sm xs:text-base"
              >
                <LogIn className="h-4.5 w-4.5 xs:h-5 xs:w-5 sm:h-5.5 sm:w-5.5" />
                <span>Se connecter</span>
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
