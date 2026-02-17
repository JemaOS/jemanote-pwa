// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

import type { Meta, StoryObj } from '@storybook/react'

import { ThemeProvider } from '@/contexts/ThemeContext'

import MarkdownEditor from './MarkdownEditor'

const meta: Meta<typeof MarkdownEditor> = {
  title: 'Editor/MarkdownEditor',
  component: MarkdownEditor,
  parameters: {
    layout: 'fullscreen',
    chromatic: {
      delay: 500,
      disableSnapshot: true, // Editor has canvas, hard to snapshot
    },
  },
  decorators: [
    (Story) => (
      <ThemeProvider>
        <div className="h-[600px] w-full">
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof MarkdownEditor>

const defaultProps = {
  value: '',
  onChange: () => {},
  onWikiLinkClick: () => {},
}

export const Empty: Story = {
  args: defaultProps,
}

export const WithContent: Story = {
  args: {
    ...defaultProps,
    value: `# Titre de la note

Ceci est un paragraphe avec du **texte en gras** et du *texte en italique*.

## Section 2

- Premier élément
- Deuxième élément
- Troisième élément

### Code

\`\`\`javascript
const x = 1;
console.log(x);
\`\`\`

> Citation importante
`,
  },
}

export const WithWikiLinks: Story = {
  args: {
    ...defaultProps,
    value: `# Notes liées

Cette note fait référence à [[Note importante]] et [[Projet Alpha]].

Vous pouvez aussi consulter [[Réunion équipe]] pour plus de détails.
`,
  },
}

export const WithMathEquations: Story = {
  args: {
    ...defaultProps,
    value: `# Mathématiques

Voici une équation: $E = mc^2$

$$
\\int_{a}^{b} f(x) dx = F(b) - F(a)
$$
`,
  },
}

export const LongContent: Story = {
  args: {
    ...defaultProps,
    value: `# Document long

${Array.from({ length: 20 }, (_, i) => `
## Section ${i + 1}

Ceci est le contenu de la section ${i + 1}. Lorem ipsum dolor sit amet, consectetur adipiscing elit.
Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

- Point A
- Point B
- Point C
`).join('\n')}
`,
  },
}
