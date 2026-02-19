// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

import type { Meta, StoryObj } from '@storybook/react';

import { ThemeProvider } from '@/contexts/ThemeContext';

import MarkdownPreview from './MarkdownPreview';

const meta: Meta<typeof MarkdownPreview> = {
  title: 'Editor/MarkdownPreview',
  component: MarkdownPreview,
  parameters: {
    layout: 'fullscreen',
    chromatic: {
      delay: 500,
    },
  },
  decorators: [
    Story => (
      <ThemeProvider>
        <div className="h-[600px] w-full p-8">
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof MarkdownPreview>;

const defaultProps = {
  content: '',
  onWikiLinkClick: () => {},
};

export const Empty: Story = {
  args: defaultProps,
};

export const BasicFormatting: Story = {
  args: {
    ...defaultProps,
    content: `# Titre principal

## Sous-titre

Ceci est un paragraphe avec du **texte en gras**, du *texte en italique*, et du ~~texte barré~~.

Voici un [lien externe](https://example.com).
`,
  },
};

export const Lists: Story = {
  args: {
    ...defaultProps,
    content: `# Listes

## Liste non ordonnée
- Premier élément
- Deuxième élément
  - Sous-élément A
  - Sous-élément B
- Troisième élément

## Liste ordonnée
1. Premier
2. Deuxième
3. Troisième
   1. Sous-item 1
   2. Sous-item 2
`,
  },
};

export const CodeBlocks: Story = {
  args: {
    ...defaultProps,
    content: `# Code

## Inline code
Utilisez \`console.log()\` pour déboguer.

## Block code
\`\`\`typescript
interface User {
  id: string;
  name: string;
  email: string;
}

const user: User = {
  id: '1',
  name: 'John',
  email: 'john@example.com'
};
\`\`\`
`,
  },
};

export const WikiLinks: Story = {
  args: {
    ...defaultProps,
    content: `# Liens Wiki

Cette note fait référence à [[Note importante]] et [[Projet Alpha]].

Vous pouvez aussi consulter [[Réunion équipe]] pour plus de détails sur les décisions prises.
`,
  },
};

export const MathEquations: Story = {
  args: {
    ...defaultProps,
    content: String.raw`# Mathématiques

Voici une équation inline: $E = mc^2$

Et voici un bloc d'équation:

$$
\int_{a}^{b} f(x) \, dx = F(b) - F(a)
$$

$$
\\sum_{i=1}^{n} x_i = x_1 + x_2 + \\cdots + x_n
$$
`,
  },
};

export const Tables: Story = {
  args: {
    ...defaultProps,
    content: `# Tableaux

| Colonne 1 | Colonne 2 | Colonne 3 |
|-----------|-----------|-----------|
| Valeur A1 | Valeur B1 | Valeur C1 |
| Valeur A2 | Valeur B2 | Valeur C2 |
| Valeur A3 | Valeur B3 | Valeur C3 |

## Alignement

| Gauche | Centre | Droite |
|:-------|:------:|-------:|
| A      | B      | C      |
| D      | E      | F      |
`,
  },
};

export const Blockquotes: Story = {
  args: {
    ...defaultProps,
    content: `# Citations

> Ceci est une citation simple.

> Ceci est une citation
> sur plusieurs lignes.
> > Et une citation imbriquée.

> **Note importante:** N'oubliez pas de sauvegarder vos modifications !
`,
  },
};

export const MermaidDiagram: Story = {
  args: {
    ...defaultProps,
    content: `# Diagramme Mermaid

\`\`\`mermaid
graph TD
    A[Démarrer] --> B{Condition?}
    B -->|Oui| C[Action 1]
    B -->|Non| D[Action 2]
    C --> E[Fin]
    D --> E
\`\`\`
`,
  },
};

export const FullDocument: Story = {
  args: {
    ...defaultProps,
    content: `# Documentation complète

## Introduction

Ceci est un document de démonstration montrant toutes les capacités de l'éditeur Markdown.

## Fonctionnalités

### Mise en forme
- **Gras** pour l'importance
- *Italique* pour l'emphase
- ~~Barré~~ pour le contenu obsolète
- \`Code inline\` pour les références techniques

### Liens
- [Lien externe](https://example.com)
- [[Lien interne]] vers une autre note

### Code

\`\`\`javascript
function hello() {
  console.log('Hello, World!');
}
\`\`\`

## Conclusion

> "La simplicité est la sophistication suprême." - Leonardo da Vinci
`,
  },
};
