# Guide de Contribution - Tests

Ce guide explique comment écrire des tests de qualité pour JemaNote. Suivez ces conventions pour maintenir une base de tests cohérente et maintenable.

---

## 📋 Table des matières

- [Philosophie](#philosophie)
- [Conventions de nommage](#conventions-de-nommage)
- [Structure des tests](#structure-des-tests)
- [Bonnes pratiques](#bonnes-pratiques)
- [Exemples par type de test](#exemples-par-type-de-test)
- [Utilitaires disponibles](#utilitaires-disponibles)
- [Mocks et fixtures](#mocks-et-fixtures)

---

## 🎯 Philosophie

### Test-Driven Development (TDD)

Nous encourageons le TDD : **Red → Green → Refactor**

1. **Red** : Écrire un test qui échoue
2. **Green** : Écrire le code minimal pour faire passer le test
3. **Refactor** : Améliorer le code tout en gardant les tests verts

### FIRST Principles

Les tests doivent être :

- **F**ast : Rapides à exécuter (< 100ms par test)
- **I**ndependent : Indépendants les uns des autres
- **R**epeatable : Reproductibles dans n'importe quel environnement
- **S**elf-validating : Résultat binaire (pass/fail)
- **T**imely : Écrits au bon moment (idéalement avant le code)

---

## 🏷️ Conventions de nommage

### Fichiers de test

| Type de test | Pattern | Exemple |
|--------------|---------|---------|
| Tests unitaires | `[name].test.ts` | `useAuth.test.ts` |
| Tests de composants | `[Component].test.tsx` | `Button.test.tsx` |
| Tests E2E | `[feature].spec.ts` | `auth.spec.ts` |
| Tests d'intégration | `[feature].test.ts` | `database.test.ts` |

### Structure des describe/it

```typescript
// Structure recommandée
describe('[Module/Component]', () => {
  describe('[fonctionnalité]', () => {
    it('should [comportement attendu] when [condition]', () => {
      // test
    })
    
    it('should not [comportement non attendu] when [condition]', () => {
      // test
    })
  })
})
```

### Exemples de noms de tests

```typescript
// ✅ Bon
it('should return user data when authenticated')
it('should throw error when email is invalid')
it('should display loading state while fetching')
it('should disable submit button when form is invalid')

// ❌ Mauvais
it('test user')
it('works correctly')
it('auth test')
it('button click')
```

---

## 🏗️ Structure des tests

### Pattern AAA (Arrange-Act-Assert)

```typescript
it('should calculate total price with discount', () => {
  // Arrange - Préparer les données
  const items = [
    { price: 100, quantity: 2 },
    { price: 50, quantity: 1 },
  ]
  const discount = 0.1
  
  // Act - Exécuter l'action
  const total = calculateTotal(items, discount)
  
  // Assert - Vérifier le résultat
  expect(total).toBe(225) // (250 * 0.9)
})
```

### Structure complète d'un fichier de test

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// 1. Imports
import { MyComponent } from './MyComponent'
import { mockService } from '@/mocks/service'

// 2. Mocks (si nécessaire)
vi.mock('@/lib/service', () => ({
  service: mockService,
}))

// 3. Describe principal
describe('MyComponent', () => {
  // 4. Setup et teardown
  beforeEach(() => {
    vi.clearAllMocks()
  })
  
  afterEach(() => {
    vi.restoreAllMocks()
  })
  
  // 5. Tests par fonctionnalité
  describe('rendering', () => {
    it('should render default state correctly', () => {
      render(<MyComponent />)
      expect(screen.getByText('Default')).toBeInTheDocument()
    })
  })
  
  describe('interactions', () => {
    it('should handle click events', async () => {
      const onClick = vi.fn()
      render(<MyComponent onClick={onClick} />)
      
      await userEvent.click(screen.getByRole('button'))
      
      expect(onClick).toHaveBeenCalledTimes(1)
    })
  })
  
  describe('error handling', () => {
    it('should display error message on failure', async () => {
      mockService.fetchData.mockRejectedValue(new Error('Failed'))
      
      render(<MyComponent />)
      
      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument()
      })
    })
  })
})
```

---

## ✅ Bonnes pratiques

### 1. Un seul concept par test

```typescript
// ❌ Mauvais - Trop d'assertions non liées
it('should work', () => {
  const result = processData(data)
  expect(result.id).toBe(1)
  expect(result.name).toBe('Test')
  expect(result.items).toHaveLength(5)
  expect(result.createdAt).toBeInstanceOf(Date)
})

// ✅ Bon - Un concept par test
it('should return correct user data', () => {
  const result = processData(data)
  expect(result).toMatchObject({
    id: 1,
    name: 'Test',
  })
})

it('should include all items', () => {
  const result = processData(data)
  expect(result.items).toHaveLength(5)
})
```

### 2. Pas de logique conditionnelle

```typescript
// ❌ Mauvais
it('should validate input', () => {
  const result = validate(input)
  if (result.isValid) {
    expect(result.errors).toBeEmpty()
  } else {
    expect(result.errors).toHaveLength(1)
  }
})

// ✅ Bon
it('should return no errors for valid input', () => {
  const result = validate(validInput)
  expect(result.errors).toBeEmpty()
})

it('should return errors for invalid input', () => {
  const result = validate(invalidInput)
  expect(result.errors).toHaveLength(1)
})
```

### 3. Utiliser des matchers explicites

```typescript
// ❌ Mauvais
expect(result).toBe(true)
expect(array.length).toBe(3)

// ✅ Bon
expect(result).toBe(true)
expect(array).toHaveLength(3)
expect(object).toHaveProperty('id')
expect(element).toBeVisible()
```

### 4. Isoler les tests

```typescript
// ❌ Mauvais - Les tests dépendent de l'état partagé
let counter = 0

beforeEach(() => {
  // counter n'est pas réinitialisé !
})

it('should increment', () => {
  counter++
  expect(counter).toBe(1)
})

it('should increment again', () => {
  counter++
  expect(counter).toBe(1) // ❌ Échoue car counter = 2
})

// ✅ Bon - Chaque test est isolé
beforeEach(() => {
  counter = 0 // Réinitialisation explicite
})
```

### 5. Éviter les tests de détails d'implémentation

```typescript
// ❌ Mauvais - Teste l'implémentation
it('should call setState with true', () => {
  const setState = vi.fn()
  render(<Toggle setState={setState} />)
  fireEvent.click(screen.getByRole('button'))
  expect(setState).toHaveBeenCalledWith(true)
})

// ✅ Bon - Teste le comportement utilisateur
it('should toggle visibility when clicked', async () => {
  render(<Toggle />)
  expect(screen.queryByText('Content')).not.toBeInTheDocument()
  
  await userEvent.click(screen.getByRole('button'))
  
  expect(screen.getByText('Content')).toBeInTheDocument()
})
```

---

## 💻 Exemples par type de test

### Tests unitaires - Hooks

```typescript
// tests/unit/hooks/useCounter.test.ts
import { renderHook, act } from '@testing-library/react'
import { useCounter } from '@/hooks/useCounter'

describe('useCounter', () => {
  it('should initialize with default value', () => {
    const { result } = renderHook(() => useCounter())
    expect(result.current.count).toBe(0)
  })
  
  it('should initialize with provided value', () => {
    const { result } = renderHook(() => useCounter(10))
    expect(result.current.count).toBe(10)
  })
  
  it('should increment count', () => {
    const { result } = renderHook(() => useCounter())
    
    act(() => {
      result.current.increment()
    })
    
    expect(result.current.count).toBe(1)
  })
  
  it('should decrement count', () => {
    const { result } = renderHook(() => useCounter(5))
    
    act(() => {
      result.current.decrement()
    })
    
    expect(result.current.count).toBe(4)
  })
  
  it('should not go below min value', () => {
    const { result } = renderHook(() => useCounter(0, { min: 0 }))
    
    act(() => {
      result.current.decrement()
    })
    
    expect(result.current.count).toBe(0)
  })
})
```

### Tests de composants

```typescript
// tests/components/Button.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/components/ui/Button'

describe('Button', () => {
  describe('rendering', () => {
    it('should render children correctly', () => {
      render(<Button>Click me</Button>)
      expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
    })
    
    it('should apply variant classes', () => {
      render(<Button variant="danger">Delete</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-red-600')
    })
    
    it('should be disabled when loading', () => {
      render(<Button loading>Submit</Button>)
      expect(screen.getByRole('button')).toBeDisabled()
    })
  })
  
  describe('interactions', () => {
    it('should call onClick when clicked', async () => {
      const onClick = vi.fn()
      render(<Button onClick={onClick}>Click</Button>)
      
      await userEvent.click(screen.getByRole('button'))
      
      expect(onClick).toHaveBeenCalledTimes(1)
    })
    
    it('should not call onClick when disabled', async () => {
      const onClick = vi.fn()
      render(<Button onClick={onClick} disabled>Click</Button>)
      
      await userEvent.click(screen.getByRole('button'))
      
      expect(onClick).not.toHaveBeenCalled()
    })
  })
  
  describe('accessibility', () => {
    it('should have correct aria attributes when loading', () => {
      render(<Button loading>Save</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-busy', 'true')
    })
  })
})
```

### Tests d'intégration avec MSW

```typescript
// tests/integration/api/notes.test.ts
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { fetchNotes } from '@/services/notes'

const server = setupServer()

describe('Notes API Integration', () => {
  beforeAll(() => server.listen())
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())
  
  it('should fetch notes successfully', async () => {
    const mockNotes = [
      { id: '1', title: 'Note 1', content: 'Content 1' },
      { id: '2', title: 'Note 2', content: 'Content 2' },
    ]
    
    server.use(
      http.get('/api/notes', () => {
        return HttpResponse.json(mockNotes)
      })
    )
    
    const notes = await fetchNotes()
    
    expect(notes).toHaveLength(2)
    expect(notes[0]).toHaveProperty('title', 'Note 1')
  })
  
  it('should handle network errors', async () => {
    server.use(
      http.get('/api/notes', () => {
        return HttpResponse.error()
      })
    )
    
    await expect(fetchNotes()).rejects.toThrow('Failed to fetch notes')
  })
  
  it('should handle 401 unauthorized', async () => {
    server.use(
      http.get('/api/notes', () => {
        return new HttpResponse(null, { status: 401 })
      })
    )
    
    await expect(fetchNotes()).rejects.toThrow('Unauthorized')
  })
})
```

### Tests E2E avec Playwright

```typescript
// tests/e2e/notes.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Notes Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })
  
  test('should create a new note', async ({ page }) => {
    // Arrange
    const noteTitle = 'My Test Note'
    
    // Act
    await page.getByRole('button', { name: /new note/i }).click()
    await page.getByPlaceholder(/title/i).fill(noteTitle)
    await page.getByPlaceholder(/content/i).fill('Note content')
    await page.getByRole('button', { name: /save/i }).click()
    
    // Assert
    await expect(page.getByText(noteTitle)).toBeVisible()
  })
  
  test('should edit an existing note', async ({ page }) => {
    // Créer d'abord une note
    await page.getByRole('button', { name: /new note/i }).click()
    await page.getByPlaceholder(/title/i).fill('Original Title')
    await page.getByRole('button', { name: /save/i }).click()
    
    // Éditer la note
    await page.getByText('Original Title').click()
    await page.getByPlaceholder(/title/i).fill('Updated Title')
    await page.getByRole('button', { name: /save/i }).click()
    
    // Vérifier la mise à jour
    await expect(page.getByText('Updated Title')).toBeVisible()
    await expect(page.getByText('Original Title')).not.toBeVisible()
  })
  
  test('should delete a note', async ({ page }) => {
    // Créer une note
    await page.getByRole('button', { name: /new note/i }).click()
    await page.getByPlaceholder(/title/i).fill('Note to Delete')
    await page.getByRole('button', { name: /save/i }).click()
    
    // Supprimer la note
    await page.getByText('Note to Delete').click()
    await page.getByRole('button', { name: /delete/i }).click()
    await page.getByRole('button', { name: /confirm/i }).click()
    
    // Vérifier la suppression
    await expect(page.getByText('Note to Delete')).not.toBeVisible()
  })
  
  test('should search notes', async ({ page }) => {
    // Créer plusieurs notes
    for (const title of ['Work Note', 'Personal Note', 'Shopping List']) {
      await page.getByRole('button', { name: /new note/i }).click()
      await page.getByPlaceholder(/title/i).fill(title)
      await page.getByRole('button', { name: /save/i }).click()
    }
    
    // Rechercher
    await page.getByPlaceholder(/search/i).fill('Work')
    
    // Vérifier les résultats
    await expect(page.getByText('Work Note')).toBeVisible()
    await expect(page.getByText('Personal Note')).not.toBeVisible()
  })
})
```

---

## 🛠️ Utilitaires disponibles

### Utilitaires React Testing Library

```typescript
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Rendu avec providers
import { render as customRender } from '@/tests/utils/test-utils'

// Exemple d'utilisation
const user = userEvent.setup()
render(<MyComponent />)
await user.click(screen.getByRole('button'))
```

### Utilitaires de test personnalisés

```typescript
// tests/utils/test-utils.tsx
import { createTestQueryClient, createMockNote, createMockUser } from '@/tests/utils/test-utils'

// Créer un QueryClient pour les tests
const queryClient = createTestQueryClient()

// Créer des données mock
const note = createMockNote({ title: 'Custom Title' })
const user = createMockUser({ email: 'test@example.com' })
```

### Matchers Jest-DOM

```typescript
// Matchers disponibles
expect(element).toBeInTheDocument()
expect(element).toBeVisible()
expect(element).toBeDisabled()
expect(element).toHaveClass('active')
expect(element).toHaveAttribute('href', '/link')
expect(element).toHaveTextContent('Hello')
expect(element).toHaveValue('test')
expect(input).toBeChecked()
expect(list).toHaveLength(3)
```

---

## 🎭 Mocks et fixtures

### Mock des modules

```typescript
// Mock complet d'un module
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    })),
  },
}))

// Mock partiel
vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    fetchData: vi.fn(),
  }
})
```

### Mock des timers

```typescript
beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

it('should debounce search input', async () => {
  const onSearch = vi.fn()
  render(<SearchInput onSearch={onSearch} debounceMs={300} />)
  
  await userEvent.type(screen.getByRole('searchbox'), 'test')
  
  expect(onSearch).not.toHaveBeenCalled()
  
  vi.advanceTimersByTime(300)
  
  expect(onSearch).toHaveBeenCalledWith('test')
})
```

### Fixtures avec Playwright

```typescript
// tests/e2e/fixtures/auth.ts
import { test as base } from '@playwright/test'

export const test = base.extend({
  authenticatedPage: async ({ page }, use) => {
    await page.addInitScript(() => {
      localStorage.setItem('auth-token', 'mock-token')
    })
    await use(page)
  },
})

// Utilisation
test('should show user profile', async ({ authenticatedPage }) => {
  await authenticatedPage.goto('/profile')
  await expect(authenticatedPage.getByText('Test User')).toBeVisible()
})
```

---

## 📝 Checklist de contribution

Avant de soumettre une PR avec des tests :

- [ ] Les tests passent localement (`npm run test`)
- [ ] Les tests E2E passent (`npm run test:e2e`)
- [ ] La couverture de code est maintenue ou améliorée
- [ ] Les tests suivent les conventions de nommage
- [ ] Les tests utilisent le pattern AAA
- [ ] Les tests sont indépendants
- [ ] Pas de `console.log` oubliés
- [ ] Les mocks sont nettoyés (`vi.clearAllMocks()`)
- [ ] Les tests de composants utilisent des queries accessibles

---

## 📚 Ressources supplémentaires

- [Testing Library - Guiding Principles](https://testing-library.com/docs/guiding-principles)
- [Common Mistakes with React Testing Library](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Vitest Mocking](https://vitest.dev/guide/mocking.html)

---

## 💡 Besoin d'aide ?

Si vous avez des questions sur l'écriture de tests :

1. Consulter les exemples existants dans [`tests/`](./)
2. Voir le guide de débogage [`DEBUGGING.md`](DEBUGGING.md)
3. Ouvrir une discussion sur GitHub
