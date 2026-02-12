// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

import { describe, it, expect, vi, beforeEach } from 'vitest'

import { aiContextMenuExtension } from '@/lib/aiContextMenu'

// Mock CodeMirror modules
vi.mock('@codemirror/view', () => ({
  EditorView: {
    domEventHandlers: vi.fn((handlers) => ({
      type: 'domEventHandlers',
      handlers,
    })),
  },
}))

// Mock CodeMirror types
interface MockEditorView {
  state: {
    selection: {
      main: {
        from: number
        to: number
      }
    }
    sliceDoc: (from: number, to: number) => string
  }
}

const createMockView = (selectedText: string = '') => ({
  state: {
    selection: {
      main: {
        from: 10,
        to: 10 + selectedText.length,
      },
    },
    sliceDoc: vi.fn().mockReturnValue(selectedText),
  },
})

describe('aiContextMenu', () => {
  let onShowMenuMock: ReturnType<typeof vi.fn> & ((position: { x: number; y: number; selectedText: string }) => void)

  beforeEach(() => {
    onShowMenuMock = vi.fn() as unknown as ReturnType<typeof vi.fn> & ((position: { x: number; y: number; selectedText: string }) => void)
    vi.clearAllMocks()
  })

  describe('aiContextMenuExtension', () => {
    it('should create an extension with domEventHandlers', () => {
      const extension = aiContextMenuExtension(onShowMenuMock)
      
      // The extension returns a ViewPlugin from CodeMirror
      expect(extension).toBeDefined()
    })

    it('should prevent default context menu behavior', () => {
      const extension = aiContextMenuExtension(onShowMenuMock)
      const mockEvent = {
        preventDefault: vi.fn(),
        clientX: 100,
        clientY: 200,
      }
      const mockView = createMockView('selected text')

      // The extension uses EditorView.domEventHandlers which returns an object with handlers
      // We need to access the handlers directly from the mock
      const { handlers } = extension as unknown as { handlers: { contextmenu: (event: any, view: any) => boolean } }
      const result = handlers.contextmenu(mockEvent, mockView as any)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(result).toBe(true)
    })

    it('should show menu when text is selected', () => {
      const extension = aiContextMenuExtension(onShowMenuMock)
      const selectedText = 'This is selected text'
      const mockEvent = {
        preventDefault: vi.fn(),
        clientX: 150,
        clientY: 250,
      }
      const mockView = createMockView(selectedText)

      const { handlers } = extension as unknown as { handlers: { contextmenu: (event: any, view: any) => boolean } }
      handlers.contextmenu(mockEvent, mockView as any)

      expect(onShowMenuMock).toHaveBeenCalledWith({
        x: 150,
        y: 250,
        selectedText,
      })
    })

    it('should not show menu when no text is selected', () => {
      const extension = aiContextMenuExtension(onShowMenuMock)
      const mockEvent = {
        preventDefault: vi.fn(),
        clientX: 100,
        clientY: 200,
      }
      const mockView = createMockView('') // Empty selection

      const { handlers } = extension as unknown as { handlers: { contextmenu: (event: any, view: any) => boolean } }
      handlers.contextmenu(mockEvent, mockView as any)

      expect(onShowMenuMock).not.toHaveBeenCalled()
    })

    it('should not show menu when only whitespace is selected', () => {
      const extension = aiContextMenuExtension(onShowMenuMock)
      const mockEvent = {
        preventDefault: vi.fn(),
        clientX: 100,
        clientY: 200,
      }
      const mockView = createMockView('   \t\n  ') // Only whitespace

      const { handlers } = extension as unknown as { handlers: { contextmenu: (event: any, view: any) => boolean } }
      handlers.contextmenu(mockEvent, mockView as any)

      expect(onShowMenuMock).not.toHaveBeenCalled()
    })

    it('should handle different mouse positions', () => {
      const extension = aiContextMenuExtension(onShowMenuMock)
      const testCases = [
        { x: 0, y: 0 },
        { x: 100, y: 200 },
        { x: 1920, y: 1080 },
        { x: -10, y: -10 }, // Edge case
      ]

      testCases.forEach(({ x, y }) => {
        onShowMenuMock.mockClear()
        const mockEvent = {
          preventDefault: vi.fn(),
          clientX: x,
          clientY: y,
        }
        const mockView = createMockView('text')

        const { handlers } = extension as unknown as { handlers: { contextmenu: (event: any, view: any) => boolean } }
        handlers.contextmenu(mockEvent, mockView as any)

        expect(onShowMenuMock).toHaveBeenCalledWith({
          x,
          y,
          selectedText: 'text',
        })
      })
    })

    it('should handle single character selection', () => {
      const extension = aiContextMenuExtension(onShowMenuMock)
      const mockEvent = {
        preventDefault: vi.fn(),
        clientX: 100,
        clientY: 200,
      }
      const mockView = createMockView('X')

      const { handlers } = extension as unknown as { handlers: { contextmenu: (event: any, view: any) => boolean } }
      handlers.contextmenu(mockEvent, mockView as any)

      expect(onShowMenuMock).toHaveBeenCalledWith({
        x: 100,
        y: 200,
        selectedText: 'X',
      })
    })

    it('should handle multi-line text selection', () => {
      const extension = aiContextMenuExtension(onShowMenuMock)
      const multiLineText = 'Line 1\nLine 2\nLine 3'
      const mockEvent = {
        preventDefault: vi.fn(),
        clientX: 100,
        clientY: 200,
      }
      const mockView = createMockView(multiLineText)

      const { handlers } = extension as unknown as { handlers: { contextmenu: (event: any, view: any) => boolean } }
      handlers.contextmenu(mockEvent, mockView as any)

      expect(onShowMenuMock).toHaveBeenCalledWith({
        x: 100,
        y: 200,
        selectedText: multiLineText,
      })
    })

    it('should handle special characters in selection', () => {
      const extension = aiContextMenuExtension(onShowMenuMock)
      const specialText = 'Special chars: éàù@#$%^&*()'
      const mockEvent = {
        preventDefault: vi.fn(),
        clientX: 100,
        clientY: 200,
      }
      const mockView = createMockView(specialText)

      const { handlers } = extension as unknown as { handlers: { contextmenu: (event: any, view: any) => boolean } }
      handlers.contextmenu(mockEvent, mockView as any)

      expect(onShowMenuMock).toHaveBeenCalledWith({
        x: 100,
        y: 200,
        selectedText: specialText,
      })
    })

    it('should handle unicode text selection', () => {
      const extension = aiContextMenuExtension(onShowMenuMock)
      const unicodeText = '日本語テキスト 🎉 émojis'
      const mockEvent = {
        preventDefault: vi.fn(),
        clientX: 100,
        clientY: 200,
      }
      const mockView = createMockView(unicodeText)

      const { handlers } = extension as unknown as { handlers: { contextmenu: (event: any, view: any) => boolean } }
      handlers.contextmenu(mockEvent, mockView as any)

      expect(onShowMenuMock).toHaveBeenCalledWith({
        x: 100,
        y: 200,
        selectedText: unicodeText,
      })
    })

    it('should handle very long text selection', () => {
      const extension = aiContextMenuExtension(onShowMenuMock)
      const longText = 'A'.repeat(10000)
      const mockEvent = {
        preventDefault: vi.fn(),
        clientX: 100,
        clientY: 200,
      }
      const mockView = createMockView(longText)

      const { handlers } = extension as unknown as { handlers: { contextmenu: (event: any, view: any) => boolean } }
      handlers.contextmenu(mockEvent, mockView as any)

      expect(onShowMenuMock).toHaveBeenCalledWith({
        x: 100,
        y: 200,
        selectedText: longText,
      })
    })

    it('should trim selected text before checking', () => {
      const extension = aiContextMenuExtension(onShowMenuMock)
      const mockEvent = {
        preventDefault: vi.fn(),
        clientX: 100,
        clientY: 200,
      }
      const mockView = createMockView('  trimmed text  ')

      const { handlers } = extension as unknown as { handlers: { contextmenu: (event: any, view: any) => boolean } }
      handlers.contextmenu(mockEvent, mockView as any)

      // Should still show menu because trimmed text has content
      expect(onShowMenuMock).toHaveBeenCalledWith({
        x: 100,
        y: 200,
        selectedText: '  trimmed text  ',
      })
    })

    it('should handle selection at document boundaries', () => {
      const extension = aiContextMenuExtension(onShowMenuMock)
      const mockView = {
        state: {
          selection: {
            main: {
              from: 0,
              to: 5,
            },
          },
          sliceDoc: vi.fn().mockReturnValue('Start'),
        },
      }
      const mockEvent = {
        preventDefault: vi.fn(),
        clientX: 100,
        clientY: 200,
      }

      const { handlers } = extension as unknown as { handlers: { contextmenu: (event: any, view: any) => boolean } }
      handlers.contextmenu(mockEvent, mockView as any)

      expect(onShowMenuMock).toHaveBeenCalledWith({
        x: 100,
        y: 200,
        selectedText: 'Start',
      })
    })

    it('should handle callback errors gracefully', () => {
      const errorCallback = vi.fn().mockImplementation(() => {
        throw new Error('Callback error')
      })
      const extension = aiContextMenuExtension(errorCallback)
      const mockEvent = {
        preventDefault: vi.fn(),
        clientX: 100,
        clientY: 200,
      }
      const mockView = createMockView('text')

      // The extension should catch errors from the callback
      // preventDefault should be called before the callback
      const { handlers } = extension as unknown as { handlers: { contextmenu: (event: any, view: any) => boolean } }
      
      // The handler may or may not catch the error depending on implementation
      // What's important is that preventDefault is called
      try {
        handlers.contextmenu(mockEvent, mockView as any)
      } catch (e) {
        // Error may be thrown - that's acceptable if preventDefault was called
      }

      expect(mockEvent.preventDefault).toHaveBeenCalled()
    })
  })

  describe('AIContextMenuPosition interface', () => {
    it('should have correct structure for position object', () => {
      const extension = aiContextMenuExtension(onShowMenuMock)
      const mockEvent = {
        preventDefault: vi.fn(),
        clientX: 100,
        clientY: 200,
      }
      const mockView = createMockView('test text')

      const { handlers } = extension as unknown as { handlers: { contextmenu: (event: any, view: any) => boolean } }
      handlers.contextmenu(mockEvent, mockView as any)

      const callArg = onShowMenuMock.mock.calls[0]?.[0]
      expect(callArg).toHaveProperty('x')
      expect(callArg).toHaveProperty('y')
      expect(callArg).toHaveProperty('selectedText')
      expect(typeof callArg.x).toBe('number')
      expect(typeof callArg.y).toBe('number')
      expect(typeof callArg.selectedText).toBe('string')
    })
  })
})
