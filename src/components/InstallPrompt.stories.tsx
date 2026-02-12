// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

import type { Meta, StoryObj } from '@storybook/react'

import { ThemeProvider } from '@/contexts/ThemeContext'

import InstallPrompt from './InstallPrompt'

const meta: Meta<typeof InstallPrompt> = {
  title: 'Components/InstallPrompt',
  component: InstallPrompt,
  parameters: {
    layout: 'fullscreen',
    chromatic: {
      delay: 300,
    },
  },
  decorators: [
    (Story) => (
      <ThemeProvider>
        <div className="h-screen w-full relative">
          <div className="p-4">Contenu de la page</div>
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof InstallPrompt>

export const Default: Story = {
  args: {},
}

export const MobileViewport: Story = {
  args: {},
  parameters: {
    viewport: {
      defaultViewport: 'mobile',
    },
  },
}

export const TabletViewport: Story = {
  args: {},
  parameters: {
    viewport: {
      defaultViewport: 'tablet',
    },
  },
}
