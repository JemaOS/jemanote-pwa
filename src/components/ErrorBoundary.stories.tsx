// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

import type { Meta, StoryObj } from '@storybook/react';

import { ThemeProvider } from '@/contexts/ThemeContext';

import { ErrorBoundary } from './ErrorBoundary';

// Composant qui lance une erreur pour la démonstration
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Ceci est une erreur de test pour le ErrorBoundary');
  }
  return <div className="p-4">Contenu normal sans erreur</div>;
};

const meta: Meta<typeof ErrorBoundary> = {
  title: 'Components/ErrorBoundary',
  component: ErrorBoundary,
  parameters: {
    layout: 'centered',
    chromatic: {
      delay: 300,
    },
  },
  decorators: [
    Story => (
      <ThemeProvider>
        <Story />
      </ThemeProvider>
    ),
  ],
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ErrorBoundary>;

export const Normal: Story = {
  args: {
    children: <ThrowError shouldThrow={false} />,
  },
};

export const WithError: Story = {
  args: {
    children: <ThrowError shouldThrow={true} />,
  },
};
