// Copyright (c) 2025 Jema Technology.
// Tests for ErrorBoundary component

import { describe, it, expect, vi, beforeEach } from 'vitest'

import { ErrorBoundary } from '@/components/ErrorBoundary'

import { render, screen } from '@/tests/utils/test-utils'

// Component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <div>No error</div>
}

describe('ErrorBoundary', () => {
  // Suppress console.error for error boundary tests
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  describe('Normal Rendering', () => {
    it('should render children when there is no error', () => {
      render(
        <ErrorBoundary>
          <div>Child content</div>
        </ErrorBoundary>
      )
      expect(screen.getByText('Child content')).toBeInTheDocument()
    })

    it('should render nested children', () => {
      render(
        <ErrorBoundary>
          <div>
            <span>Nested</span>
            <span>Content</span>
          </div>
        </ErrorBoundary>
      )
      expect(screen.getByText('Nested')).toBeInTheDocument()
      expect(screen.getByText('Content')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should render error fallback when child throws', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )
      expect(screen.getByText('Something went wrong.')).toBeInTheDocument()
    })

    it('should display error message', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )
      expect(screen.getByText(/Test error/)).toBeInTheDocument()
    })

    it('should have error styling', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )
      const container = screen.getByText('Something went wrong.').parentElement
      expect(container).toHaveClass('border-red-500')
    })

    it('should display error in pre tag', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )
      const preElement = screen.getByText(/Test error/)
      expect(preElement.tagName).toBe('PRE')
    })
  })

  describe('Error Serialization', () => {
    it('should serialize Error objects correctly', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )
      const errorText = screen.getByText(/Test error/).textContent
      expect(errorText).toContain('Test error')
    })

    it('should handle non-Error objects', () => {
      const ThrowString = () => {
        throw 'String error'
      }

      render(
        <ErrorBoundary>
          <ThrowString />
        </ErrorBoundary>
      )
      expect(screen.getByText('Something went wrong.')).toBeInTheDocument()
    })

    it('should handle null errors', () => {
      const ThrowNull = () => {
        throw null
      }

      render(
        <ErrorBoundary>
          <ThrowNull />
        </ErrorBoundary>
      )
      expect(screen.getByText('Something went wrong.')).toBeInTheDocument()
    })

    it('should handle undefined errors', () => {
      const ThrowUndefined = () => {
        throw undefined
      }

      render(
        <ErrorBoundary>
          <ThrowUndefined />
        </ErrorBoundary>
      )
      expect(screen.getByText('Something went wrong.')).toBeInTheDocument()
    })

    it('should handle object errors', () => {
      const ThrowObject = () => {
        throw { custom: 'error', code: 500 }
      }

      render(
        <ErrorBoundary>
          <ThrowObject />
        </ErrorBoundary>
      )
      expect(screen.getByText('Something went wrong.')).toBeInTheDocument()
      expect(screen.getByText(/custom/)).toBeInTheDocument()
    })
  })

  describe('Error Recovery', () => {
    it('should reset when remounted with different children', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Something went wrong.')).toBeInTheDocument()

      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      )

      expect(screen.getByText('No error')).toBeInTheDocument()
    })

    it('should catch errors in nested components', () => {
      const DeepComponent = () => {
        throw new Error('Deep error')
      }

      render(
        <ErrorBoundary>
          <div>
            <div>
              <DeepComponent />
            </div>
          </div>
        </ErrorBoundary>
      )

      expect(screen.getByText('Something went wrong.')).toBeInTheDocument()
    })
  })

  describe('Error Details', () => {
    it('should display error stack trace', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )
      const errorDetails = screen.getByText(/Test error/)
      expect(errorDetails).toBeInTheDocument()
    })

    it('should format error details with proper spacing', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )
      const preElement = screen.getByText(/Test error/)
      expect(preElement).toHaveClass('text-sm')
    })
  })

  describe('Styling', () => {
    it('should have padding', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )
      const container = screen.getByText('Something went wrong.').parentElement
      expect(container).toHaveClass('p-4')
    })

    it('should have border', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )
      const container = screen.getByText('Something went wrong.').parentElement
      expect(container).toHaveClass('border')
    })

    it('should have rounded corners', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )
      const container = screen.getByText('Something went wrong.').parentElement
      expect(container).toHaveClass('rounded')
    })

    it('should have red text for heading', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )
      const heading = screen.getByText('Something went wrong.')
      expect(heading).toHaveClass('text-red-500')
    })
  })

  describe('Accessibility', () => {
    it('should have heading element for error message', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )
      const heading = screen.getByRole('heading', { level: 2 })
      expect(heading).toBeInTheDocument()
    })

    it('should have semantic error container', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )
      const container = screen.getByText('Something went wrong.').parentElement
      expect(container?.tagName).toBe('DIV')
    })
  })

  describe('Multiple Children', () => {
    it('should render multiple children', () => {
      render(
        <ErrorBoundary>
          <div>Child 1</div>
          <div>Child 2</div>
          <div>Child 3</div>
        </ErrorBoundary>
      )
      expect(screen.getByText('Child 1')).toBeInTheDocument()
      expect(screen.getByText('Child 2')).toBeInTheDocument()
      expect(screen.getByText('Child 3')).toBeInTheDocument()
    })

    it('should catch error from any child', () => {
      render(
        <ErrorBoundary>
          <div>Safe child</div>
          <ThrowError shouldThrow={true} />
          <div>Another safe child</div>
        </ErrorBoundary>
      )
      expect(screen.getByText('Something went wrong.')).toBeInTheDocument()
      expect(screen.queryByText('Safe child')).not.toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty children', () => {
      render(<ErrorBoundary>{null}</ErrorBoundary>)
      // Should not throw
      expect(document.body).toBeInTheDocument()
    })

    it('should handle text children', () => {
      render(<ErrorBoundary>Plain text</ErrorBoundary>)
      expect(screen.getByText('Plain text')).toBeInTheDocument()
    })

    it('should handle number children', () => {
      render(<ErrorBoundary>{42}</ErrorBoundary>)
      expect(screen.getByText('42')).toBeInTheDocument()
    })

    it('should handle boolean children', () => {
      render(<ErrorBoundary>{true}</ErrorBoundary>)
      // Boolean children render nothing
      expect(document.body).toBeInTheDocument()
    })
  })
})
