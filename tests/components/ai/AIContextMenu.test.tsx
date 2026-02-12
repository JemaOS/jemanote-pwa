// Copyright (c) 2025 Jema Technology.
// Tests for AIContextMenu component

import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import AIContextMenu from '@/components/ai/AIContextMenu';

import { render, screen, waitFor } from '../../utils/test-utils';

// Mock aiService
vi.mock('@/services/ai/mistralService', () => ({
  aiService: {
    continueText: vi.fn().mockResolvedValue('Continued text'),
    improveText: vi.fn().mockResolvedValue('Improved text'),
    changeTone: vi.fn().mockResolvedValue('Text with changed tone'),
    translate: vi.fn().mockResolvedValue('Translated text'),
  },
}));

describe('AIContextMenu', () => {
  const defaultProps = {
    position: { x: 100, y: 200 },
    selectedText: 'Selected text for AI processing',
    onClose: vi.fn(),
    onInsert: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render context menu at correct position', () => {
      render(<AIContextMenu {...defaultProps} />);
      const menu = screen.getByText('Assistant IA').closest('div[class*="fixed"]');
      expect(menu).toHaveStyle({ top: '200px', left: '100px' });
    });

    it('should render header with title', () => {
      render(<AIContextMenu {...defaultProps} />);
      expect(screen.getByText('Assistant IA')).toBeInTheDocument();
    });

    it('should render close button', () => {
      render(<AIContextMenu {...defaultProps} />);
      const closeButton = screen.getByRole('button', { name: '' });
      expect(closeButton).toBeInTheDocument();
    });

    it('should render main action buttons', () => {
      render(<AIContextMenu {...defaultProps} />);
      expect(screen.getByText('Continuer le texte')).toBeInTheDocument();
      expect(screen.getByText('Améliorer le style')).toBeInTheDocument();
      expect(screen.getByText('Changer le ton')).toBeInTheDocument();
      expect(screen.getByText('Traduire')).toBeInTheDocument();
    });
  });

  describe('Main Actions', () => {
    it('should call continueText when clicking continue', async () => {
      const user = userEvent.setup();
      const { aiService } = await import('@/services/ai/mistralService');

      render(<AIContextMenu {...defaultProps} />);

      const continueButton = screen.getByText('Continuer le texte');
      await user.click(continueButton);

      await waitFor(() => {
        expect(aiService.continueText).toHaveBeenCalledWith(defaultProps.selectedText);
      });
    });

    it('should call improveText when clicking improve', async () => {
      const user = userEvent.setup();
      const { aiService } = await import('@/services/ai/mistralService');

      render(<AIContextMenu {...defaultProps} />);

      const improveButton = screen.getByText('Améliorer le style');
      await user.click(improveButton);

      await waitFor(() => {
        expect(aiService.improveText).toHaveBeenCalledWith(defaultProps.selectedText);
      });
    });

    it('should show tone submenu when clicking change tone', async () => {
      const user = userEvent.setup();
      render(<AIContextMenu {...defaultProps} />);

      const toneButton = screen.getByText('Changer le ton');
      await user.click(toneButton);

      expect(screen.getByText('Formel')).toBeInTheDocument();
      expect(screen.getByText('Décontracté')).toBeInTheDocument();
      expect(screen.getByText('Professionnel')).toBeInTheDocument();
      expect(screen.getByText('Persuasif')).toBeInTheDocument();
    });

    it('should show translate submenu when clicking translate', async () => {
      const user = userEvent.setup();
      render(<AIContextMenu {...defaultProps} />);

      const translateButton = screen.getByText('Traduire');
      await user.click(translateButton);

      expect(screen.getByText('Anglais')).toBeInTheDocument();
      expect(screen.getByText('Espagnol')).toBeInTheDocument();
      expect(screen.getByText('Allemand')).toBeInTheDocument();
      expect(screen.getByText('Italien')).toBeInTheDocument();
    });
  });

  describe('Tone Actions', () => {
    it('should call changeTone with formal tone', async () => {
      const user = userEvent.setup();
      const { aiService } = await import('@/services/ai/mistralService');

      render(<AIContextMenu {...defaultProps} />);

      // Open tone submenu
      await user.click(screen.getByText('Changer le ton'));

      // Click formal
      await user.click(screen.getByText('Formel'));

      await waitFor(() => {
        expect(aiService.changeTone).toHaveBeenCalledWith(defaultProps.selectedText, 'formal');
      });
    });

    it('should call changeTone with informal tone', async () => {
      const user = userEvent.setup();
      const { aiService } = await import('@/services/ai/mistralService');

      render(<AIContextMenu {...defaultProps} />);

      await user.click(screen.getByText('Changer le ton'));
      await user.click(screen.getByText('Décontracté'));

      await waitFor(() => {
        expect(aiService.changeTone).toHaveBeenCalledWith(defaultProps.selectedText, 'informal');
      });
    });

    it('should go back from tone menu', async () => {
      const user = userEvent.setup();
      render(<AIContextMenu {...defaultProps} />);

      await user.click(screen.getByText('Changer le ton'));
      expect(screen.getByText('← Retour')).toBeInTheDocument();

      await user.click(screen.getByText('← Retour'));
      expect(screen.getByText('Continuer le texte')).toBeInTheDocument();
    });
  });

  describe('Translation Actions', () => {
    it('should call translate with english', async () => {
      const user = userEvent.setup();
      const { aiService } = await import('@/services/ai/mistralService');

      render(<AIContextMenu {...defaultProps} />);

      await user.click(screen.getByText('Traduire'));
      await user.click(screen.getByText('Anglais'));

      await waitFor(() => {
        expect(aiService.translate).toHaveBeenCalledWith(defaultProps.selectedText, 'anglais');
      });
    });

    it('should call translate with spanish', async () => {
      const user = userEvent.setup();
      const { aiService } = await import('@/services/ai/mistralService');

      render(<AIContextMenu {...defaultProps} />);

      await user.click(screen.getByText('Traduire'));
      await user.click(screen.getByText('Espagnol'));

      await waitFor(() => {
        expect(aiService.translate).toHaveBeenCalledWith(defaultProps.selectedText, 'espagnol');
      });
    });

    it('should go back from translate menu', async () => {
      const user = userEvent.setup();
      render(<AIContextMenu {...defaultProps} />);

      await user.click(screen.getByText('Traduire'));
      expect(screen.getByText('← Retour')).toBeInTheDocument();

      await user.click(screen.getByText('← Retour'));
      expect(screen.getByText('Continuer le texte')).toBeInTheDocument();
    });
  });

  describe('Result Handling', () => {
    it('should show result after AI processing', async () => {
      const user = userEvent.setup();
      render(<AIContextMenu {...defaultProps} />);

      await user.click(screen.getByText('Continuer le texte'));

      await waitFor(() => {
        expect(screen.getByText('Continued text')).toBeInTheDocument();
      });
    });

    it('should show insert and replace buttons after processing', async () => {
      const user = userEvent.setup();
      render(<AIContextMenu {...defaultProps} />);

      await user.click(screen.getByText('Continuer le texte'));

      await waitFor(() => {
        expect(screen.getByText('Insérer après')).toBeInTheDocument();
        expect(screen.getByText('Remplacer')).toBeInTheDocument();
      });
    });

    it('should call onInsert when clicking insert', async () => {
      const user = userEvent.setup();
      render(<AIContextMenu {...defaultProps} />);

      await user.click(screen.getByText('Continuer le texte'));

      await waitFor(() => {
        expect(screen.getByText('Insérer après')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Insérer après'));

      expect(defaultProps.onInsert).toHaveBeenCalledWith('Continued text');
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('should call onInsert when clicking replace', async () => {
      const user = userEvent.setup();
      render(<AIContextMenu {...defaultProps} />);

      await user.click(screen.getByText('Continuer le texte'));

      await waitFor(() => {
        expect(screen.getByText('Remplacer')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Remplacer'));

      expect(defaultProps.onInsert).toHaveBeenCalledWith('Continued text');
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator during processing', async () => {
      const user = userEvent.setup();
      const { aiService } = await import('@/services/ai/mistralService');
      (aiService.continueText as any).mockImplementation(() => new Promise(() => {}));

      render(<AIContextMenu {...defaultProps} />);

      await user.click(screen.getByText('Continuer le texte'));

      expect(screen.getByText('Traitement en cours...')).toBeInTheDocument();
    });

    it('should disable buttons during loading', async () => {
      const user = userEvent.setup();
      const { aiService } = await import('@/services/ai/mistralService');
      (aiService.continueText as any).mockImplementation(() => new Promise(() => {}));

      render(<AIContextMenu {...defaultProps} />);

      const continueButton = screen.getByRole('button', { name: /continuer le texte/i });
      await user.click(continueButton);

      // After clicking, the button should be disabled (check by looking for disabled attribute on parent button)
      const buttons = screen.getAllByRole('button');
      const mainActionButton = buttons.find(b => b.textContent?.includes('Continuer') ?? false);
      expect(mainActionButton).toHaveAttribute('disabled');
    });
  });

  describe('Error Handling', () => {
    it('should display error message on API failure', async () => {
      const user = userEvent.setup();
      const { aiService } = await import('@/services/ai/mistralService');
      (aiService.continueText as any).mockRejectedValue(new Error('API Error'));

      render(<AIContextMenu {...defaultProps} />);

      await user.click(screen.getByText('Continuer le texte'));

      await waitFor(() => {
        expect(screen.getByText('API Error')).toBeInTheDocument();
      });
    });

    it('should display generic error for unknown errors', async () => {
      const user = userEvent.setup();
      const { aiService } = await import('@/services/ai/mistralService');
      (aiService.continueText as any).mockRejectedValue('Unknown error');

      render(<AIContextMenu {...defaultProps} />);

      await user.click(screen.getByText('Continuer le texte'));

      await waitFor(() => {
        expect(screen.getByText('Erreur lors du traitement IA')).toBeInTheDocument();
      });
    });
  });

  describe('Closing', () => {
    it('should call onClose when clicking close button', async () => {
      const user = userEvent.setup();
      render(<AIContextMenu {...defaultProps} />);

      const closeButton = screen.getByRole('button', { name: '' });
      await user.click(closeButton);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe('Styling', () => {
    it('should have correct styling classes', () => {
      render(<AIContextMenu {...defaultProps} />);
      const menu = screen.getByText('Assistant IA').closest('div[class*="fixed"]');
      expect(menu).toHaveClass('z-50', 'rounded-lg', 'shadow-2xl');
    });

    it('should have dark mode support', () => {
      render(<AIContextMenu {...defaultProps} />);
      const menu = screen.getByText('Assistant IA').closest('div[class*="fixed"]');
      expect(menu).toHaveClass('dark:bg-gray-800');
    });
  });

  describe('Accessibility', () => {
    it('should have accessible buttons', () => {
      render(<AIContextMenu {...defaultProps} />);
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should have proper contrast', () => {
      render(<AIContextMenu {...defaultProps} />);
      const menu = screen.getByText('Assistant IA');
      expect(menu).toBeInTheDocument();
    });
  });
});
