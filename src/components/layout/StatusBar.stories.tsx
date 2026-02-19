// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

import type { Meta, StoryObj } from '@storybook/react';

import { ThemeProvider } from '@/contexts/ThemeContext';

import StatusBar from './StatusBar';

const meta: Meta<typeof StatusBar> = {
  title: 'Layout/StatusBar',
  component: StatusBar,
  parameters: {
    layout: 'fullscreen',
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
type Story = StoryObj<typeof StatusBar>;

const defaultProps = {
  userId: null as string | null,
  activeNoteId: null as string | null,
  syncing: false,
  syncEnabled: false,
  onShowAuth: () => {},
  onEnableSync: () => {},
  onManualSync: () => {},
};

export const Default: Story = {
  args: defaultProps,
};

export const LocalMode: Story = {
  args: defaultProps,
};

export const WithUserDisconnected: Story = {
  args: {
    ...defaultProps,
    userId: 'user-123',
    syncEnabled: false,
  },
};

export const WithUserSyncing: Story = {
  args: {
    ...defaultProps,
    userId: 'user-123',
    syncing: true,
    syncEnabled: true,
  },
};

export const WithUserSynced: Story = {
  args: {
    ...defaultProps,
    userId: 'user-123',
    syncing: false,
    syncEnabled: true,
  },
};

export const WithActiveNote: Story = {
  args: {
    ...defaultProps,
    userId: 'user-123',
    activeNoteId: 'note-123',
    syncing: false,
    syncEnabled: true,
  },
};

export const MobileViewport: Story = {
  args: defaultProps,
  parameters: {
    viewport: {
      defaultViewport: 'mobile',
    },
  },
};

export const TabletViewport: Story = {
  args: defaultProps,
  parameters: {
    viewport: {
      defaultViewport: 'tablet',
    },
  },
};
