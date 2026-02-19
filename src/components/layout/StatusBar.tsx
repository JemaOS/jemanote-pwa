// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

import { Cloud, HardDrive, RefreshCw, Clock } from 'lucide-react';

interface StatusBarProps {
  readonly userId?: string | null;
  readonly activeNoteId?: string | null;
  readonly syncing?: boolean;
  readonly syncEnabled?: boolean;
  readonly onShowAuth: () => void;
  readonly onEnableSync?: () => void;
  readonly onManualSync?: () => void;
}

// Helper functions to get sync status text
function getSyncStatusText(syncing: boolean, syncEnabled: boolean): string {
  if (syncing) {
    return 'Synchronisation...';
  }
  return syncEnabled ? 'Synchronisé' : 'Déconnecté';
}

function getSyncStatusShortText(syncing: boolean, syncEnabled: boolean): string {
  if (syncing) {
    return 'Sync';
  }
  return syncEnabled ? 'OK' : 'Off';
}

export default function StatusBar({
  userId,
  activeNoteId,
  syncing,
  syncEnabled,
  onShowAuth,
  onEnableSync,
  onManualSync,
}: StatusBarProps) {
  return (
    <div className="h-6 xs:h-7 sm:h-8 md:h-8 bg-neutral-100 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between px-1.5 xs:px-2 sm:px-3 md:px-4 text-[10px] xs:text-xs sm:text-xs text-neutral-700 dark:text-neutral-300">
      <div className="flex items-center gap-1.5 xs:gap-2 sm:gap-3 md:gap-4 overflow-hidden">
        {userId ? (
          <div className="flex items-center gap-1 xs:gap-1.5 sm:gap-2 min-w-0">
            <div className="flex items-center gap-0.5 xs:gap-1 min-w-0">
              <Cloud className="h-2.5 w-2.5 xs:h-3 xs:w-3 text-primary-500 flex-shrink-0" />
              <span className="hidden sm:inline truncate">
                {getSyncStatusText(!!syncing, !!syncEnabled)}
              </span>
              <span className="sm:hidden truncate">
                {getSyncStatusShortText(!!syncing, !!syncEnabled)}
              </span>
            </div>

            {syncEnabled && !syncing && onManualSync && (
              <button
                onClick={onManualSync}
                className="flex items-center gap-0.5 xs:gap-1 hover:text-primary-500 transition-colors p-0.5 xs:p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 min-w-[24px] min-h-[24px] xs:min-w-[28px] xs:min-h-[28px] justify-center"
                title="Synchroniser maintenant"
                aria-label="Synchroniser maintenant"
              >
                <RefreshCw className="h-2.5 w-2.5 xs:h-3 xs:w-3" />
              </button>
            )}

            {!syncEnabled && onEnableSync && (
              <button
                onClick={onEnableSync}
                className="text-[10px] xs:text-xs bg-primary-500 text-white px-1.5 xs:px-2 py-0.5 rounded hover:bg-primary-600 transition-colors whitespace-nowrap"
              >
                Activer
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={onShowAuth}
            className="flex items-center gap-0.5 xs:gap-1 hover:text-primary-500 transition-colors min-w-0 p-0.5 xs:p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800"
            title="Connectez-vous pour synchroniser vos notes"
            aria-label="Connectez-vous pour synchroniser vos notes"
          >
            <HardDrive className="h-2.5 w-2.5 xs:h-3 xs:w-3 flex-shrink-0" />
            <span className="hidden md:inline truncate">
              Mode Local - Cliquez pour activer la synchronisation cloud
            </span>
            <span className="md:hidden truncate">Local</span>
          </button>
        )}

        {activeNoteId && (
          <div className="hidden lg:flex items-center gap-0.5 xs:gap-1">
            <Clock className="h-2.5 w-2.5 xs:h-3 xs:w-3 flex-shrink-0" />
            <span className="truncate">
              Dernière modification: {new Date().toLocaleTimeString('fr-FR')}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 xs:gap-2 sm:gap-3 md:gap-4">
        <span className="hidden lg:inline text-[10px] xs:text-xs text-neutral-700 dark:text-neutral-300">
          Développé par{' '}
          <a
            href="https://www.jematechnology.fr/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 hover:underline"
          >
            Jema Technology
          </a>{' '}
          © 2025 • Open Source & sous licence AGPL
        </span>
        <span className="hidden sm:inline lg:hidden text-[10px] xs:text-xs text-neutral-700 dark:text-neutral-300">
          <a
            href="https://www.jematechnology.fr/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 hover:underline"
          >
            Jema Technology
          </a>{' '}
          © 2025
        </span>
        <span className="hidden sm:inline">Mode: Édition</span>
        <span className="sm:hidden text-[10px] xs:text-xs text-neutral-700 dark:text-neutral-300">
          Édit
        </span>
      </div>
    </div>
  );
}
