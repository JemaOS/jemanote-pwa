import { test, expect } from 'vitest'

import { cn } from './utils'

test('cn should merge simple class names', () => {
  const result = cn('class1', 'class2')
  expect(result).toBe('class1 class2')
})

test('cn should handle single class name', () => {
  const result = cn('single-class')
  expect(result).toBe('single-class')
})

test('cn should handle empty input', () => {
  const result = cn()
  expect(result).toBe('')
})

test('cn should handle conditional classes with objects', () => {
  const result = cn('base-class', {
    'conditional-true': true,
    'conditional-false': false,
  })
  expect(result).toBe('base-class conditional-true')
})

test('cn should merge conflicting tailwind classes', () => {
  const result = cn('px-2 py-1', 'px-4')
  expect(result).toBe('py-1 px-4')
})