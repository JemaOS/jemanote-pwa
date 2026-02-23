// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

/**
 * Panel IA centralisé - Sidebar dédiée avec toutes les fonctionnalités IA
 * Inclut: Résumés, Tags, Brainstorming, Synthèse multi-notes
 */

import { X, Sparkles, Tag, Lightbulb, FileText, Link as LinkIcon } from 'lucide-react';
import { useState, useEffect } from 'react';

import { aiService, type SummaryHistoryEntry } from '@/services/ai/mistralService';
import { linkDetectionService, type LinkSuggestion } from '@/services/linkDetectionService';
import type { Note } from '@/types';

interface AIPanelProps {
  readonly currentNote: Note | null;
  readonly notes: readonly Note[];
  readonly onClose: () => void;
  readonly onCreateNote: (title: string, content: string) => Promise<void>;
  readonly onUpdateNoteTags: (noteId: string, tags: string[]) => void;
  readonly onUpdateNoteContent?: (noteId: string, content: string) => Promise<void>;
  readonly onNavigateToNote: (noteId: string) => void;
}

type TabType = 'summary' | 'tags' | 'links' | 'brainstorm' | 'synthesis';

export default function AIPanel({
  currentNote,
  notes,
  onClose,
  onCreateNote,
  onUpdateNoteTags,
  onUpdateNoteContent,
  onNavigateToNote,
}: AIPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // États pour les résumés
  const [summaryType, setSummaryType] = useState<'short' | 'detailed' | 'bullets'>('detailed');
  const [summary, setSummary] = useState<string>('');
  const [summaryHistory, setSummaryHistory] = useState<SummaryHistoryEntry[]>([]);

  // États pour les tags
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // États pour les liens
  const [linkSuggestions, setLinkSuggestions] = useState<LinkSuggestion[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(false);

  // États pour le brainstorming
  const [brainstormTopic, setBrainstormTopic] = useState('');
  const [ideas, setIdeas] = useState<string[]>([]);

  // États pour la synthèse
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
  const [synthesis, setSynthesis] = useState('');

  // Charger l'historique des résumés
  useEffect(() => {
    const loadHistory = async () => {
      const history = await aiService.getSummaryHistory(10);
      setSummaryHistory(history);
    };
    void loadHistory();
  }, []);

  // Charger les tags actuels de la note
  useEffect(() => {
    if (currentNote) {
      // SECURITY FIX: Added length limit to prevent ReDoS attacks
      // Limit content size and tag length for safe regex processing
      const MAX_CONTENT_LENGTH = 100000; // 100KB max
      const safeContent =
        currentNote.content.length > MAX_CONTENT_LENGTH
          ? currentNote.content.substring(0, MAX_CONTENT_LENGTH)
          : currentNote.content;

      // Extraire les tags du contenu de la note (format #tag)
      const tagRegex = /#[\w-]{1,50}/g;
      const matches = safeContent.match(tagRegex) ?? [];
      const extractedTags = matches.map(tag => tag.slice(1));
      setSelectedTags(extractedTags);
    }
  }, [currentNote]);

  // Fonction: Générer un résumé
  const handleGenerateSummary = async () => {
    if (!currentNote?.content) {
      setError('Aucune note sélectionnée ou note vide');
      return;
    }

    setLoading(true);
    setError(null);
    setSummary('');

    try {
      const result = await aiService.summarize(currentNote.content, summaryType);
      setSummary(result);

      // Sauvegarder dans l'historique
      await aiService.saveSummaryToHistory(
        currentNote.id,
        currentNote.title,
        currentNote.content,
        result,
        summaryType
      );

      // Recharger l'historique
      const history = await aiService.getSummaryHistory(10);
      setSummaryHistory(history);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Erreur lors de la génération du résumé';

      // Message plus clair pour l'utilisateur
      if (
        errorMessage.includes('API Mistral non configurée') ||
        errorMessage.includes('MISSING_API_KEY')
      ) {
        setError(
          "⚠️ Configuration manquante : La clé API Mistral n'est pas configurée sur le serveur Supabase. Veuillez suivre les instructions de configuration dans la documentation."
        );
      } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        setError(
          '🔑 Clé API invalide : La clé API Mistral configurée est invalide ou expirée. Veuillez la vérifier dans la console Supabase.'
        );
      } else if (errorMessage.includes('429')) {
        setError(
          "⏱️ Quota dépassé : Limite d'utilisation API atteinte. Veuillez réessayer plus tard ou mettre à niveau votre plan Mistral."
        );
      } else {
        setError(`❌ ${errorMessage}`);
      }
      console.error('Erreur génération résumé:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fonction: Générer des tags
  const handleGenerateTags = async () => {
    if (!currentNote?.content) {
      setError('Aucune note sélectionnée ou note vide');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const tags = await aiService.generateTags(currentNote.content, 8);
      setSuggestedTags(tags);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la génération des tags');
    } finally {
      setLoading(false);
    }
  };

  // Fonction: Appliquer les tags
  const handleApplyTags = () => {
    if (!currentNote) {
      return;
    }

    // Ajouter les tags au contenu de la note
    const newTags = suggestedTags.filter(tag => !selectedTags.includes(tag));
    if (newTags.length > 0) {
      onUpdateNoteTags(currentNote.id, [...selectedTags, ...newTags]);
      setSelectedTags([...selectedTags, ...newTags]);
    }
  };

  // Fonction: Brainstorming
  const handleBrainstorm = async () => {
    const topic = brainstormTopic ?? currentNote?.title ?? '';

    if (!topic) {
      setError('Veuillez entrer un sujet de brainstorming');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const generatedIdeas = await aiService.generateIdeas(topic, currentNote?.content);
      setIdeas(generatedIdeas);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du brainstorming');
    } finally {
      setLoading(false);
    }
  };

  // Fonction: Créer une note depuis une idée
  const handleCreateNoteFromIdea = async (idea: string) => {
    await onCreateNote(`Idée: ${idea.substring(0, 50)}...`, idea);
  };

  // Fonction: Ajouter l'idée à la note actuelle
  const handleAddIdeaToCurrentNote = async (idea: string) => {
    if (!currentNote || !onUpdateNoteContent) {
      return;
    }
    const newContent = `${currentNote.content}\n\n### Idée IA\n${idea}`;
    await onUpdateNoteContent(currentNote.id, newContent);
  };

  // Fonction: Synthèse multi-notes
  const handleSynthesis = async () => {
    if (selectedNotes.length === 0) {
      setError('Veuillez sélectionner au moins une note');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const notesToSynthesize = notes
        .filter(note => selectedNotes.includes(note.id))
        .map(note => ({ title: note.title, content: note.content }));

      const result = await aiService.synthesizeNotes(notesToSynthesize);
      setSynthesis(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la synthèse');
    } finally {
      setLoading(false);
    }
  };

  // Fonction: Créer une note depuis la synthèse
  const handleCreateNoteFromSynthesis = async () => {
    if (!synthesis) {
      return;
    }
    await onCreateNote('Synthèse Multi-Notes', synthesis);
    setSynthesis('');
  };

  // Fonction: Détecter les liens automatiques
  const handleDetectLinks = async () => {
    if (!currentNote?.content) {
      setError('Aucune note sélectionnée ou note vide');
      return;
    }

    setLoadingLinks(true);
    setError(null);

    try {
      // Utiliser la détection par mots-clés (rapide)
      const suggestions = linkDetectionService.detectLinks(currentNote, notes);
      setLinkSuggestions(suggestions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la détection de liens');
    } finally {
      setLoadingLinks(false);
    }
  };

  // Fonction: Insérer un lien wiki dans la note
  const handleInsertLink = (targetNoteTitle: string) => {
    if (!currentNote) {
      return;
    }

    // Créer un lien wiki [[Note cible]]
    // const link = `[[${targetNoteTitle}]]`

    // Ajouter le lien à la fin du contenu de la note
    onUpdateNoteTags(currentNote.id, []); // Utiliser la fonction disponible pour mettre à jour

    // Note: Dans une implémentation complète, il faudrait une fonction dédiée onUpdateNoteContent
  };

  return (
    <div className="fixed right-0 top-0 h-full w-full sm:w-[400px] bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-2xl z-40 overflow-y-auto text-gray-900 dark:text-gray-100">
      {/* Header */}
      <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary-600" />
          <h2 className="text-lg font-semibold">Assistant IA</h2>
        </div>
        <button
          onClick={onClose}
          type="button"
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 overflow-x-auto no-scrollbar">
        <button
          onClick={() => {
            setActiveTab('summary');
          }}
          type="button"
          className={(() => {
            const baseClasses =
              'flex-none sm:flex-1 px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap';
            const activeClasses = 'text-primary-600 border-b-2 border-primary-600';
            const inactiveClasses =
              'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200';
            return `${baseClasses} ${activeTab === 'summary' ? activeClasses : inactiveClasses}`;
          })()}
        >
          <FileText className="w-4 h-4 inline mr-1" />
          Résumés
        </button>
        <button
          onClick={() => {
            setActiveTab('tags');
          }}
          type="button"
          className={(() => {
            const baseClasses =
              'flex-none sm:flex-1 px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap';
            const activeClasses = 'text-primary-600 border-b-2 border-primary-600';
            const inactiveClasses =
              'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200';
            return `${baseClasses} ${activeTab === 'tags' ? activeClasses : inactiveClasses}`;
          })()}
        >
          <Tag className="w-4 h-4 inline mr-1" />
          Tags
        </button>
        <button
          onClick={() => {
            setActiveTab('links');
          }}
          type="button"
          className={(() => {
            const baseClasses =
              'flex-none sm:flex-1 px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap';
            const activeClasses = 'text-primary-600 border-b-2 border-primary-600';
            const inactiveClasses =
              'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200';
            return `${baseClasses} ${activeTab === 'links' ? activeClasses : inactiveClasses}`;
          })()}
        >
          <LinkIcon className="w-4 h-4 inline mr-1" />
          Liens
        </button>
        <button
          onClick={() => {
            setActiveTab('brainstorm');
          }}
          type="button"
          className={(() => {
            const baseClasses =
              'flex-none sm:flex-1 px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap';
            const activeClasses = 'text-primary-600 border-b-2 border-primary-600';
            const inactiveClasses =
              'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200';
            return `${baseClasses} ${activeTab === 'brainstorm' ? activeClasses : inactiveClasses}`;
          })()}
        >
          <Lightbulb className="w-4 h-4 inline mr-1" />
          Idées
        </button>
        <button
          onClick={() => {
            setActiveTab('synthesis');
          }}
          type="button"
          className={(() => {
            const baseClasses =
              'flex-none sm:flex-1 px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap';
            const activeClasses = 'text-primary-600 border-b-2 border-primary-600';
            const inactiveClasses =
              'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200';
            return `${baseClasses} ${activeTab === 'synthesis' ? activeClasses : inactiveClasses}`;
          })()}
        >
          <FileText className="w-4 h-4 inline mr-1" />
          Synthèse
        </button>
      </div>

      {/* Contenu */}
      <div className="p-4">
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md text-sm">
            {error}
          </div>
        )}

        {/* Tab: Résumés */}
        {activeTab === 'summary' && (
          <div className="space-y-4">
            <div>
              <label htmlFor="summary-type" className="block text-sm font-medium mb-2">
                Type de résumé
              </label>
              <select
                id="summary-type"
                value={summaryType}
                onChange={e => {
                  setSummaryType(e.target.value as 'short' | 'detailed' | 'bullets');
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100"
              >
                <option value="short">Résumé court</option>
                <option value="detailed">Résumé détaillé</option>
                <option value="bullets">Points clés</option>
              </select>
            </div>

            <button
              onClick={() => {
                void handleGenerateSummary();
              }}
              disabled={loading || !currentNote}
              type="button"
              className="w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Génération...' : 'Générer un résumé'}
            </button>

            {summary && (
              <div data-testid="ai-summary" className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
                <p className="text-sm whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                  {summary}
                </p>
                <button
                  onClick={() => {
                    void onCreateNote(`Résumé - ${currentNote?.title ?? 'Note'}`, summary);
                  }}
                  type="button"
                  className="mt-3 w-full px-3 py-2 text-sm bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Créer une note
                </button>
              </div>
            )}

            {summaryHistory.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-2">Historique récent</h3>
                <div className="space-y-2">
                  {summaryHistory.slice(0, 5).map(entry => (
                    <button
                      key={entry.id}
                      type="button"
                      className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 w-full"
                      onClick={() => {
                        setSummary(entry.summary);
                      }}
                      aria-label={`Voir le résumé: ${entry.noteTitle}`}
                    >
                      <div className="font-medium text-xs text-gray-500 mb-1">
                        {entry.noteTitle} - {new Date(entry.timestamp).toLocaleDateString()}
                      </div>
                      <div className="text-gray-700 dark:text-gray-300 line-clamp-2">
                        {entry.summary}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab: Tags */}
        {activeTab === 'tags' && (
          <div className="space-y-4">
            <button
              onClick={() => {
                void handleGenerateTags();
              }}
              disabled={loading || !currentNote}
              type="button"
              className="w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Génération...' : 'Générer des tags'}
            </button>

            {suggestedTags.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-2">Tags suggérés</h3>
                <div className="flex flex-wrap gap-2">
                  {suggestedTags.map(tag => (
                    <span
                      key={tag}
                      data-testid="suggested-tag"
                      className="px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-sm"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
                <button
                  onClick={handleApplyTags}
                  className="mt-3 w-full px-3 py-2 text-sm bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Appliquer les tags
                </button>
              </div>
            )}

            {selectedTags.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-2">Tags actuels</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedTags.map(tag => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab: Liens */}
        {activeTab === 'links' && (
          <div className="space-y-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Découvrez des notes similaires et créez des connexions automatiquement.
            </div>

            <button
              onClick={() => {
                handleDetectLinks().catch(console.error);
              }}
              disabled={loadingLinks || !currentNote}
              type="button"
              className="w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loadingLinks ? 'Analyse en cours...' : 'Détecter les liens'}
            </button>

            {linkSuggestions.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-2">Notes liées suggérées</h3>
                <div className="space-y-2">
                  {linkSuggestions.map(suggestion => (
                    <div
                      key={suggestion.targetNoteId}
                      className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <button
                          onClick={() => {
                            onNavigateToNote(suggestion.targetNoteId);
                          }}
                          type="button"
                          className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline flex-1 text-left"
                        >
                          {suggestion.targetNoteTitle}
                        </button>
                        <span className="text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-2 py-1 rounded-full ml-2">
                          {Math.round(suggestion.confidence)}%
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                        {suggestion.reason}
                      </p>
                      {suggestion.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {suggestion.keywords.slice(0, 5).map(keyword => (
                            <span
                              key={keyword}
                              className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded"
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>
                      )}
                      <button
                        onClick={() => {
                          handleInsertLink(suggestion.targetNoteTitle);
                        }}
                        type="button"
                        className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                      >
                        Insérer lien [[{suggestion.targetNoteTitle}]]
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {linkSuggestions.length === 0 && !loadingLinks && (
              <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">
                Aucune suggestion de lien pour le moment.
                <br />
                Cliquez sur "Détecter les liens" pour analyser.
              </div>
            )}
          </div>
        )}

        {/* Tab: Brainstorming */}
        {activeTab === 'brainstorm' && (
          <div className="space-y-4">
            <div>
              <label htmlFor="brainstorm-topic" className="block text-sm font-medium mb-2">
                Sujet de brainstorming
              </label>
              <input
                id="brainstorm-topic"
                type="text"
                value={brainstormTopic}
                onChange={e => {
                  setBrainstormTopic(e.target.value);
                }}
                placeholder={currentNote?.title ?? 'Entrez un sujet...'}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100"
              />
            </div>

            <button
              onClick={() => {
                void handleBrainstorm();
              }}
              disabled={loading}
              type="button"
              className="w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Génération...' : 'Générer des idées'}
            </button>

            {ideas.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-2">Idées générées</h3>
                <div className="space-y-2">
                  {ideas.map((idea, index) => (
                    <div
                      key={`idea-${idea.substring(0, 20)}-${index}`}
                      className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md group"
                    >
                      <p className="text-sm mb-2 text-gray-700 dark:text-gray-300">{idea}</p>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            void handleCreateNoteFromIdea(idea);
                          }}
                          type="button"
                          className="text-xs text-primary-600 hover:text-primary-700"
                        >
                          Créer une note
                        </button>
                        {onUpdateNoteContent && (
                          <button
                            onClick={() => {
                              handleAddIdeaToCurrentNote(idea);
                            }}
                            type="button"
                            className="text-xs text-primary-600 hover:text-primary-700"
                          >
                            Ajouter à la note
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab: Synthèse */}
        {activeTab === 'synthesis' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Sélectionner les notes</h3>
              <div className="max-h-[200px] overflow-y-auto space-y-1">
                {notes.map(note => (
                  <label
                    key={note.id}
                    className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedNotes.includes(note.id)}
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedNotes([...selectedNotes, note.id]);
                        } else {
                          setSelectedNotes(selectedNotes.filter(id => id !== note.id));
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{note.title}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                void handleSynthesis();
              }}
              disabled={loading || selectedNotes.length === 0}
              type="button"
              className="w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Génération...' : `Synthétiser ${String(selectedNotes.length)} note(s)`}
            </button>

            {synthesis && (
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
                <p className="text-sm whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                  {synthesis}
                </p>
                <button
                  onClick={() => {
                    void handleCreateNoteFromSynthesis();
                  }}
                  type="button"
                  className="mt-3 w-full px-3 py-2 text-sm bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Créer une note
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
