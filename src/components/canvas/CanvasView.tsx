import { useRef, useEffect, useState } from 'react'
import { Note } from '@/types'
import { ZoomIn, ZoomOut, Maximize2, Plus, Trash2 } from 'lucide-react'
import { LocalStorage } from '@/lib/localStorage'

interface CanvasViewProps {
  userId?: string | null
  notes?: Note[]
  onOpenNote?: (noteId: string) => void
  deleteNote?: (noteId: string) => Promise<any>
  createNote?: (title: string, content: string) => Promise<any>
}

interface CanvasNode {
  id: string
  type: 'note' | 'text' | 'image'
  x: number
  y: number
  width: number
  height: number
  content: string
  title?: string
  color?: string
}

interface CanvasConnection {
  id: string
  from: string
  to: string
}

export default function CanvasView({ userId, notes = [], onOpenNote, deleteNote, createNote }: CanvasViewProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [canvasNodes, setCanvasNodes] = useState<CanvasNode[]>([])
  const [connections, setConnections] = useState<CanvasConnection[]>([])
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [draggedNode, setDraggedNode] = useState<string | null>(null)
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const lastTouchDistance = useRef<number | null>(null)
  const lastTap = useRef<number>(0)
  const justCreatedIds = useRef<Set<string>>(new Set()) // Track locally created notes to prevent sync race conditions
  const prevNotesRef = useRef<Note[]>(notes)

  // Helper for pinch zoom distance
  const getDistance = (touch1: React.Touch, touch2: React.Touch) => {
    const dx = touch1.clientX - touch2.clientX
    const dy = touch1.clientY - touch2.clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  // Initialize canvas with some example nodes
  useEffect(() => {
    const loadCanvasData = async () => {
      try {
        const savedNodes = await LocalStorage.getItem<CanvasNode[]>('canvas-nodes')
        if (savedNodes && savedNodes.length > 0) {
          // Filter out notes that don't exist in active notes
          const validNodes = savedNodes.filter(node => {
            if (node.type === 'note') {
              return notes.some(n => n.id === node.id)
            }
            return true
          })
          setCanvasNodes(validNodes)
        } else if (notes.length > 0) {
          // Only create initial nodes if no saved data exists
          const initialNodes: CanvasNode[] = notes.slice(0, 5).map((note, index) => ({
            id: note.id,
            type: 'note' as const,
            x: 100 + (index % 3) * 300,
            y: 100 + Math.floor(index / 3) * 250,
            width: 250,
            height: 200,
            content: note.content.slice(0, 150) + '...',
            title: note.title,
            color: '#5a63e9',
          }))
          setCanvasNodes(initialNodes)
          await LocalStorage.setItem('canvas-nodes', initialNodes)
        }
      } catch (error) {
        console.error('Error loading canvas data:', error)
      }
    }
    loadCanvasData()
  }, []) // Run only on mount

  // Sync canvas nodes with active notes (handle additions and deletions)
  useEffect(() => {
    const prevNotes = prevNotesRef.current
    const currentNoteIds = new Set(notes.map(n => n.id))
    
    setCanvasNodes((prev) => {
      const nextNodes = [...prev]
      let hasChanges = false
      
      // 1. Remove nodes that are no longer in notes (and not just created)
      for (let i = nextNodes.length - 1; i >= 0; i--) {
        const node = nextNodes[i]
        if (node.type === 'note') {
          const inNotes = currentNoteIds.has(node.id)
          const isJustCreated = justCreatedIds.current.has(node.id)
          
          if (inNotes) {
            // It's in notes, so we can stop tracking it as "just created"
            if (isJustCreated) {
              justCreatedIds.current.delete(node.id)
            }
          } else if (!isJustCreated) {
            // Not in notes and not just created -> delete it
            nextNodes.splice(i, 1)
            hasChanges = true
          }
        }
      }
      
      // 2. Add new notes from props
      const newNotes = notes.filter(n => !prevNotes.some(pn => pn.id === n.id))
      
      newNotes.forEach(note => {
        // Check if already exists
        if (!nextNodes.some(n => n.id === note.id)) {
           nextNodes.push({
            id: note.id,
            type: 'note',
            x: (-pan.x + window.innerWidth / 2) / zoom + (Math.random() * 40 - 20),
            y: (-pan.y + window.innerHeight / 2) / zoom + (Math.random() * 40 - 20),
            width: 250,
            height: 200,
            content: note.content,
            title: note.title,
            color: '#5a63e9',
          })
          hasChanges = true
        }
      })
      
      return hasChanges ? nextNodes : prev
    })

    prevNotesRef.current = notes
  }, [notes, pan.x, pan.y, zoom])

  // Save canvas nodes whenever they change
  useEffect(() => {
    if (canvasNodes.length > 0) {
      LocalStorage.setItem('canvas-nodes', canvasNodes).catch(err => 
        console.error('Error saving canvas nodes:', err)
      )
    }
  }, [canvasNodes])

  // Handle canvas panning
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains('canvas-background')) {
      setIsDragging(true)
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && !draggedNode) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      })
    } else if (draggedNode) {
      const node = canvasNodes.find((n) => n.id === draggedNode)
      if (node) {
        // Calculate new position based on mouse position and drag offset, adjusted for zoom and pan
        const mouseX = (e.clientX - pan.x) / zoom
        const mouseY = (e.clientY - pan.y) / zoom
        
        const newX = mouseX - dragOffset.x
        const newY = mouseY - dragOffset.y
        
        setCanvasNodes((prev) =>
          prev.map((n) => (n.id === draggedNode ? { ...n, x: newX, y: newY } : n))
        )
      }
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setDraggedNode(null)
  }

  // Handle touch events for pinch zoom and panning
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch zoom start - DISABLED
      e.preventDefault()
    } else if (e.touches.length === 1) {
      // Pan start
      const touch = e.touches[0]
      handleMouseDown({ clientX: touch.clientX, clientY: touch.clientY, target: e.target } as any)
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    // Prevent default to stop scrolling/zooming the page
    e.preventDefault()

    if (e.touches.length === 2) {
      // Pinch zoom move - DISABLED
      return
    } else if (e.touches.length === 1) {
      const touch = e.touches[0]
      
      if (!draggedNode) {
        // Pan move
        // Direct state update without intermediate object creation for performance
        if (isDragging) {
          setPan({
            x: touch.clientX - dragStart.x,
            y: touch.clientY - dragStart.y,
          })
        }
      } else {
        // Node drag move
        const node = canvasNodes.find((n) => n.id === draggedNode)
        if (node) {
          // Calculate new position based on touch position and drag offset, adjusted for zoom and pan
          const mouseX = (touch.clientX - pan.x) / zoom
          const mouseY = (touch.clientY - pan.y) / zoom
          
          const newX = mouseX - dragOffset.x
          const newY = mouseY - dragOffset.y
          
          setCanvasNodes((prev) =>
            prev.map((n) => (n.id === draggedNode ? { ...n, x: newX, y: newY } : n))
          )
        }
      }
    }
  }

  const handleTouchEnd = () => {
    lastTouchDistance.current = null
    handleMouseUp()
  }

  // Handle zoom
  const handleZoom = (delta: number) => {
    setZoom((prev) => Math.max(0.1, Math.min(3, prev + delta)))
  }

  const handleResetView = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  // Handle node dragging
  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation()
    const node = canvasNodes.find((n) => n.id === nodeId)
    if (node) {
      // Calculate offset from node top-left to mouse position
      const mouseX = (e.clientX - pan.x) / zoom
      const mouseY = (e.clientY - pan.y) / zoom
      setDragOffset({
        x: mouseX - node.x,
        y: mouseY - node.y
      })
    }
    setDraggedNode(nodeId)
    setSelectedNode(nodeId)
  }

  const handleNodeTouchStart = (e: React.TouchEvent, nodeId: string) => {
    // Allow pinch zoom to bubble up
    if (e.touches.length > 1) return

    e.stopPropagation()
    const now = Date.now()
    const DOUBLE_TAP_DELAY = 300
    
    if (now - lastTap.current < DOUBLE_TAP_DELAY) {
      // Double tap detected
      const node = canvasNodes.find(n => n.id === nodeId)
      if (node) {
        if (node.type === 'text') {
          setEditingNodeId(nodeId)
        } else if (node.type === 'note' && onOpenNote) {
          onOpenNote(node.id)
        }
      }
    } else {
      const node = canvasNodes.find((n) => n.id === nodeId)
      if (node) {
        const touch = e.touches[0]
        const mouseX = (touch.clientX - pan.x) / zoom
        const mouseY = (touch.clientY - pan.y) / zoom
        setDragOffset({
          x: mouseX - node.x,
          y: mouseY - node.y
        })
      }
      setDraggedNode(nodeId)
      setSelectedNode(nodeId)
    }
    lastTap.current = now
  }

  // Add new note node
  const addNoteNode = async () => {
    if (!createNote) return

    // Create a real note first
    const newNote = await createNote('Nouvelle note', '')
    
    if (newNote) {
      justCreatedIds.current.add(newNote.id)
      
      setCanvasNodes((prev) => {
        // Check if already exists (race condition protection)
        if (prev.some(n => n.id === newNote.id)) return prev
        
        const newNode: CanvasNode = {
          id: newNote.id,
          type: 'note',
          x: (-pan.x + window.innerWidth / 2) / zoom - 125,
          y: (-pan.y + window.innerHeight / 2) / zoom - 100,
          width: 250,
          height: 200,
          content: newNote.content,
          title: newNote.title,
          color: '#5a63e9',
        }
        return [...prev, newNode]
      })
    }
  }

  const handleDeleteNode = async (nodeId: string) => {
    const node = canvasNodes.find((n) => n.id === nodeId)
    
    // If it's a note node, we might want to delete the actual note
    if (node?.type === 'note' && deleteNote) {
      const confirmed = window.confirm('Voulez-vous également supprimer la note originale et la mettre à la corbeille ?')
      if (confirmed) {
        await deleteNote(node.id) // This uses the soft delete from useLocalNotes
      }
    }

    setCanvasNodes((prev) => prev.filter((n) => n.id !== nodeId))
    if (selectedNode === nodeId) setSelectedNode(null)
    if (draggedNode === nodeId) setDraggedNode(null)
    if (editingNodeId === nodeId) setEditingNodeId(null)
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-neutral-50 dark:bg-neutral-900">
      {/* Canvas Controls - Responsive positioning */}
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 flex flex-col gap-2">
        <button
          onClick={() => handleZoom(0.1)}
          className="p-2.5 sm:p-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors shadow-lg min-w-touch min-h-touch flex items-center justify-center"
          title="Zoom avant"
        >
          <ZoomIn className="h-5 w-5 text-neutral-700 dark:text-neutral-300" />
        </button>
        <button
          onClick={() => handleZoom(-0.1)}
          className="p-2.5 sm:p-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors shadow-lg min-w-touch min-h-touch flex items-center justify-center"
          title="Zoom arrière"
        >
          <ZoomOut className="h-5 w-5 text-neutral-700 dark:text-neutral-300" />
        </button>
        <button
          onClick={handleResetView}
          className="p-2.5 sm:p-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors shadow-lg min-w-touch min-h-touch flex items-center justify-center"
          title="Réinitialiser la vue"
        >
          <Maximize2 className="h-5 w-5 text-neutral-700 dark:text-neutral-300" />
        </button>
        <button
          onClick={addNoteNode}
          className="p-2.5 sm:p-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors shadow-lg min-w-touch min-h-touch flex items-center justify-center"
          title="Ajouter une note"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {/* Zoom indicator - Responsive */}
      <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-10 px-3 py-1.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 shadow-lg font-medium">
        {Math.round(zoom * 100)}%
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="canvas-background h-full w-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
          backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            willChange: 'transform',
          }}
        >
          {/* Render connections */}
          <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%' }}>
            {connections.map((conn) => {
              const fromNode = canvasNodes.find((n) => n.id === conn.from)
              const toNode = canvasNodes.find((n) => n.id === conn.to)
              if (!fromNode || !toNode) return null

              const x1 = fromNode.x + fromNode.width / 2
              const y1 = fromNode.y + fromNode.height / 2
              const x2 = toNode.x + toNode.width / 2
              const y2 = toNode.y + toNode.height / 2

              return (
                <line
                  key={conn.id}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#5a63e9"
                  strokeWidth="2"
                  strokeDasharray="5,5"
                />
              )
            })}
          </svg>

          {/* Render nodes */}
          {canvasNodes.map((node) => (
            <div
              key={node.id}
              className={`absolute bg-white dark:bg-neutral-800 border-2 rounded-lg shadow-lg overflow-hidden transition-shadow touch-none select-none ${
                selectedNode === node.id ? 'border-primary-500 shadow-xl' : 'border-neutral-200 dark:border-neutral-700'
              } ${draggedNode === node.id ? 'cursor-grabbing' : 'cursor-grab'}`}
              style={{
                left: node.x,
                top: node.y,
                width: node.width,
                height: node.height,
              }}
              onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
              onTouchStart={(e) => handleNodeTouchStart(e, node.id)}
              onDoubleClick={(e) => {
                e.stopPropagation()
                if (node.type === 'text') {
                  setEditingNodeId(node.id)
                } else if (node.type === 'note' && onOpenNote) {
                  onOpenNote(node.id)
                }
              }}
            >
              {selectedNode === node.id && (
                <button
                  onMouseDown={(e) => {
                    e.stopPropagation()
                    handleDeleteNode(node.id)
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation()
                    handleDeleteNode(node.id)
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-white dark:bg-neutral-800 text-red-500 rounded-full shadow-md border border-neutral-200 dark:border-neutral-700 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all z-50"
                  title="Supprimer"
                >
                  <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
              )}
              {node.type === 'note' && (
                <div className="p-3 sm:p-4 h-full flex flex-col pointer-events-none">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: node.color }}
                    />
                    <h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 truncate flex-1">
                      {node.title}
                    </h3>
                  </div>
                  <div className="text-xs text-neutral-600 dark:text-neutral-400 overflow-hidden">
                    {node.content}
                  </div>
                </div>
              )}
              {node.type === 'text' && (
                <div className="p-3 sm:p-4 h-full">
                  {editingNodeId === node.id ? (
                    <textarea
                      className="w-full h-full resize-none bg-transparent border-none outline-none text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 font-sans"
                      value={node.content}
                      autoFocus
                      onChange={(e) => {
                        const newContent = e.target.value
                        setCanvasNodes((prev) =>
                          prev.map((n) => (n.id === node.id ? { ...n, content: newContent } : n))
                        )
                      }}
                      onBlur={() => setEditingNodeId(null)}
                      onMouseDown={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <div className="text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap h-full select-none pointer-events-none">
                      {node.content}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Help text */}
      {canvasNodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-4">
          <div className="text-center">
            <h2 className="text-lg sm:text-xl md:text-2xl text-neutral-400 dark:text-neutral-500 mb-2 font-semibold">Canvas vide</h2>
            <p className="text-sm sm:text-base text-neutral-400 dark:text-neutral-500 mb-1">
              Cliquez sur le bouton + pour ajouter des éléments
            </p>
            <p className="text-xs sm:text-sm text-neutral-400 dark:text-neutral-500">
              Glissez pour déplacer la vue, utilisez les contrôles pour zoomer
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
