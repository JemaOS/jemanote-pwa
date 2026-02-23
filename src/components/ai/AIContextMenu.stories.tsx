// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

import type { Meta, StoryObj } from '@storybook/react';

import { ThemeProvider } from '@/contexts/ThemeContext';

import AIContextMenu from './AIContextMenu';

const meta: Meta<typeof AIContextMenu> = {
  title: 'AI/AIContextMenu',
  component: AIContextMenu,
  parameters: {
    layout: 'centered',
    chromatic: {
      delay: 300,
    },
  },
  decorators: [
    Story => (
      <ThemeProvider>
        <div className="h-screen w-screen flex items-center justify-center">
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof AIContextMenu>;

const defaultProps = {
  position: { x: 100, y: 100 },
  selectedText: "Ceci est le texte sélectionné pour l'analyse IA.",
  onClose: () => {},
  onInsert: () => {},
};

export const Default: Story = {
  args: defaultProps,
};

export const WithShortText: Story = {
  args: {
    ...defaultProps,
    selectedText: 'Texte court.',
  },
};

export const WithLongText: Story = {
  args: {
    ...defaultProps,
    selectedText: `Ceci est un texte beaucoup plus long qui pourrait être sélectionné par l'utilisateur.
Il contient plusieurs phrases et pourrait représenter un paragraphe entier d'une note.
L'assistant IA pourrait analyser ce texte pour proposer des améliorations, une continuation,
ou même une traduction dans une autre langue selon les besoins de l'utilisateur.`,
  },
};

export const PositionTopLeft: Story = {
  args: {
    ...defaultProps,
    position: { x: 50, y: 50 },
  },
};

export const PositionBottomRight: Story = {
  args: {
    ...defaultProps,
    position: { x: 500, y: 400 },
  },
};
