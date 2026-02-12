// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

import { describe, it, expect } from 'vitest'

import { cn } from '@/lib/utils'

console.log('[TEST] Loading utils.test.ts')

describe('cn utility function', () => {
  console.log('[TEST] Inside describe block')
  
  describe('basic functionality', () => {
    it('should merge simple class names', () => {
      console.log('[TEST] Running test: should merge simple class names')
      const result = cn('class1', 'class2')
      expect(result).toBe('class1 class2')
    })

    it('should handle single class name', () => {
      const result = cn('single-class')
      expect(result).toBe('single-class')
    })

    it('should handle empty input', () => {
      const result = cn()
      expect(result).toBe('')
    })
  })

  describe('conditional classes', () => {
    it('should handle conditional classes with objects', () => {
      const result = cn('base-class', {
        'conditional-true': true,
        'conditional-false': false,
      })
      expect(result).toBe('base-class conditional-true')
    })

    it('should handle multiple conditional objects', () => {
      const result = cn('base', {
        active: true,
        disabled: false,
      }, {
        highlighted: true,
        hidden: false,
      })
      expect(result).toBe('base active highlighted')
    })

    it('should handle all false conditions', () => {
      const result = cn('base', {
        'class-1': false,
        'class-2': false,
      })
      expect(result).toBe('base')
    })

    it('should handle all true conditions', () => {
      const result = cn('base', {
        'class-1': true,
        'class-2': true,
        'class-3': true,
      })
      expect(result).toBe('base class-1 class-2 class-3')
    })
  })

  describe('array handling', () => {
    it('should handle array of classes', () => {
      const result = cn(['class1', 'class2', 'class3'])
      expect(result).toBe('class1 class2 class3')
    })

    it('should handle nested arrays', () => {
      const result = cn('base', ['class1', ['class2', 'class3']])
      expect(result).toBe('base class1 class2 class3')
    })

    it('should handle mixed arrays and objects', () => {
      const result = cn(['base', 'class1'], {
        active: true,
      })
      expect(result).toBe('base class1 active')
    })
  })

  describe('tailwind merge', () => {
    it('should merge conflicting tailwind classes', () => {
      const result = cn('px-2 py-1', 'px-4')
      expect(result).toBe('py-1 px-4')
    })

    it('should merge multiple conflicting classes', () => {
      const result = cn('text-sm text-red-500', 'text-lg text-blue-500')
      expect(result).toBe('text-lg text-blue-500')
    })

    it('should handle margin conflicts', () => {
      const result = cn('m-2', 'm-4', 'mt-6')
      expect(result).toBe('m-4 mt-6')
    })

    it('should handle padding conflicts', () => {
      const result = cn('p-4', 'px-6 py-2')
      // tailwind-merge keeps all padding classes as they don't conflict directly
      expect(result).toBe('p-4 px-6 py-2')
    })

    it('should handle color conflicts', () => {
      const result = cn('bg-red-500 text-white', 'bg-blue-500')
      expect(result).toBe('text-white bg-blue-500')
    })

    it('should handle flex/display conflicts', () => {
      const result = cn('block', 'flex')
      expect(result).toBe('flex')
    })

    it('should handle width conflicts', () => {
      const result = cn('w-full', 'w-1/2')
      expect(result).toBe('w-1/2')
    })

    it('should handle height conflicts', () => {
      const result = cn('h-10', 'h-20')
      expect(result).toBe('h-20')
    })
  })

  describe('null and undefined handling', () => {
    it('should filter out null values', () => {
      const result = cn('class1', null, 'class2', null)
      expect(result).toBe('class1 class2')
    })

    it('should filter out undefined values', () => {
      const result = cn('class1', undefined, 'class2', undefined)
      expect(result).toBe('class1 class2')
    })

    it('should filter out false values', () => {
      const result = cn('class1', false, 'class2')
      expect(result).toBe('class1 class2')
    })

    it('should filter out empty strings', () => {
      const result = cn('class1', '', 'class2')
      expect(result).toBe('class1 class2')
    })

    it('should handle all null/undefined input', () => {
      const result = cn(null, undefined, false, '')
      expect(result).toBe('')
    })
  })

  describe('complex scenarios', () => {
    it('should handle complex button styling', () => {
      const isActive = true
      const isDisabled = false
      const isLoading = false

      const result = cn(
        'inline-flex items-center justify-center rounded-md text-sm font-medium',
        'px-4 py-2 bg-blue-500 text-white',
        {
          'opacity-50 cursor-not-allowed': isDisabled,
          'ring-2 ring-offset-2': isActive,
          'animate-pulse': isLoading,
        }
      )

      expect(result).toBe(
        'inline-flex items-center justify-center rounded-md text-sm font-medium px-4 py-2 bg-blue-500 text-white ring-2 ring-offset-2'
      )
    })

    it('should handle card component styling', () => {
      const isHovered = true
      const isSelected = false

      const result = cn(
        'rounded-lg border bg-white p-4 shadow-sm',
        'transition-all duration-200',
        {
          'shadow-md scale-[1.02]': isHovered,
          'ring-2 ring-blue-500': isSelected,
        }
      )

      // tailwind-merge merges shadow-sm and shadow-md (shadow-md wins)
      expect(result).toBe(
        'rounded-lg border bg-white p-4 transition-all duration-200 shadow-md scale-[1.02]'
      )
    })

    it('should handle dynamic class merging', () => {
      const baseClasses = 'flex items-center gap-2'
      const sizeClasses = 'text-sm px-3 py-1.5'
      const variantClasses = 'bg-primary text-primary-foreground hover:bg-primary/90'
      const customClasses = 'my-custom-class'

      const result = cn(baseClasses, sizeClasses, variantClasses, customClasses)

      expect(result).toContain('flex')
      expect(result).toContain('items-center')
      expect(result).toContain('my-custom-class')
    })
  })

  describe('edge cases', () => {
    it('should handle whitespace in class names', () => {
      const result = cn('  class1  ', '  class2  ')
      expect(result).toBe('class1 class2')
    })

    it('should handle duplicate class names', () => {
      const result = cn('class1', 'class1', 'class2')
      // clsx keeps duplicates, which is expected behavior
      expect(result).toBe('class1 class1 class2')
    })

    it('should handle very long class strings', () => {
      const longClass = 'a'.repeat(1000)
      const result = cn(longClass, 'other-class')
      expect(result).toBe(`${longClass} other-class`)
    })

    it('should handle special characters in class names', () => {
      const result = cn('class-[100px]', 'class-[#fff]', 'hover:bg-[#000]')
      expect(result).toBe('class-[100px] class-[#fff] hover:bg-[#000]')
    })

    it('should handle arbitrary values', () => {
      const result = cn('w-[100px]', 'h-[50px]', 'bg-[#123456]')
      expect(result).toBe('w-[100px] h-[50px] bg-[#123456]')
    })
  })
})
