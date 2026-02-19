// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

import type { Meta, StoryObj } from '@storybook/react';

import { ThemeProvider } from '@/contexts/ThemeContext';
import { ViewMode } from '@/types';

import Navigation from './Navigation';

const meta: Meta<typeof Navigation> = {
  title: 'Layout/Navigation',
  component: Navigation,
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
type Story = StoryObj<typeof Navigation>;

const defaultProps = {
  currentView: 'workspace' as ViewMode,
  onViewChange: () => {},
  onToggleLeftSidebar: () => {},
  onToggleRightSidebar: () => {},
  leftSidebarOpen: true,
  rightSidebarOpen: false,
  user: null,
  onShowAuth: () => {},
  searchQuery: '',
  onSearchQueryChange: () => {},
};

export const Default: Story = {
  args: defaultProps,
};

export const WithUser: Story = {
  args: {
    ...defaultProps,
    user: {
      id: 'user-123',
      email: 'user@example.com',
      user_metadata: { name: 'John Doe' },
    } as any,
  },
};

export const WithSearch: Story = {
  args: {
    ...defaultProps,
    searchQuery: 'recherche de notes',
  },
};

export const GraphView: Story = {
  args: {
    ...defaultProps,
    currentView: 'graph',
  },
};

export const SettingsView: Story = {
  args: {
    ...defaultProps,
    currentView: 'settings',
  },
};

export const BothSidebarsOpen: Story = {
  args: {
    ...defaultProps,
    leftSidebarOpen: true,
    rightSidebarOpen: true,
  },
};

export const BothSidebarsClosed: Story = {
  args: {
    ...defaultProps,
    leftSidebarOpen: false,
    rightSidebarOpen: false,
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
