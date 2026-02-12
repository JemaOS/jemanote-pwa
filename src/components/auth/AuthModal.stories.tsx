// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

import type { Meta, StoryObj } from '@storybook/react'

import { ThemeProvider } from '@/contexts/ThemeContext'

import AuthModal from './AuthModal'

const meta: Meta<typeof AuthModal> = {
  title: 'Auth/AuthModal',
  component: AuthModal,
  parameters: {
    layout: 'centered',
    chromatic: {
      delay: 300,
    },
  },
  decorators: [
    (Story) => (
      <ThemeProvider>
        <div className="h-screen w-screen flex items-center justify-center bg-black/50">
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof AuthModal>

const defaultProps = {
  onClose: () => {},
}

export const Default: Story = {
  args: defaultProps,
}

export const LoginTab: Story = {
  args: defaultProps,
}

export const SignupTab: Story = {
  args: defaultProps,
  play: async ({ canvasElement }) => {
    // Simuler le clic sur l'onglet Inscription
    const signupButton = canvasElement.querySelector('button:nth-child(2)') as HTMLButtonElement | null
    if (signupButton) {
      signupButton.click()
    }
  },
}

export const MobileViewport: Story = {
  args: defaultProps,
  parameters: {
    viewport: {
      defaultViewport: 'mobile',
    },
  },
}

export const TabletViewport: Story = {
  args: defaultProps,
  parameters: {
    viewport: {
      defaultViewport: 'tablet',
    },
  },
}
