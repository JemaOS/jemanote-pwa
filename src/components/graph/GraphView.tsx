// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

import { 
  ZoomIn, 
  ZoomOut, 
  Maximize, 
  Filter, 
  Settings, 
  Circle,
  Play,
  Pause,
  SlidersHorizontal,
  Target
} from 'lucide-react'
import * as PIXI from 'pixi.js'
import React, { useEffect, useRef, useState, useCallback } from 'react'

import { graphIndexer } from '@/services/graphIndexer'
import type { GraphNode, GraphEdge } from '@/services/graphIndexer'
import { Note } from '@/types'

interface GraphViewProps {
  userId?: string | null
  notes: Note[]
  onNoteSelect?: (noteId: string) => void
}

interface NodeData {
  id: string
  label: string
  type: 'main' | 'secondary' | 'isolated'
  links: number
  x: number
  y: number
  tags?: string[]
  centrality?: number
}

interface EdgeData {
  source: string
  target: string
  strength?: number
  type?: 'explicit' | 'ai-suggested'  // Type de lien
  confidence?: number  // Score de confiance pour liens IA
}

interface GraphSettings {
  showLabels: boolean
  showOrphans: boolean
  nodeSize: number
  linkThickness: number
  colorScheme: 'default' | 'tags' | 'centrality'
  minLinks: number
  maxDepth: number
  localMode: boolean
  localNodeId: string | null
  highlightTags: string[]
}

const NODE_COLORS = {
  main: 0x5a63e9,        // Couleur primaire pour nœuds principaux
  secondary: 0x8B92FF,   // Bleu clair pour nœuds secondaires
  isolated: 0x9CA3AF,    // Gris pour nœuds isolés
  selected: 0x4850d9,    // Couleur plus foncée pour sélection
  hover: 0x7B82FF,       // Bleu vif pour hover
}

const NODE_SIZES = {
  main: 14,              // Plus grand pour meilleure visibilité
  secondary: 10,
  isolated: 7,
}

// Helper: Convertir HSL en Hex pour les couleurs dynamiques
function HSLToHex(h: number, s: number, l: number): string {
  l /= 100
  const a = s * Math.min(l, 1 - l) / 100
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color).toString(16).padStart(2, '0')
  }
  return `${f(0)}${f(8)}${f(4)}`
}

// Helper: update node positions from worker data
function updateNodePositions(
  positions: { id: string; x: number; y: number }[],
  nodesMap: Map<string, { graphics: PIXI.Graphics; text: PIXI.Text; data: NodeData }>
) {
  for (const pos of positions) {
    const node = nodesMap.get(pos.id)
    if (!node) {continue}
    node.graphics.position.set(pos.x, pos.y)
    node.data.x = pos.x
    node.data.y = pos.y
  }
}

// Helper: find neighbor nodes up to maxDepth
function findNeighborNodes(
  startNodeId: string,
  edges: GraphEdge[],
  maxDepth: number
): Set<string> {
  const neighbors = new Set<string>([startNodeId])
  const findNeighbors = (nodeId: string, depth: number) => {
    if (depth >= maxDepth) {return}
    for (const edge of edges) {
      if (edge.from === nodeId && !neighbors.has(edge.to)) {
        neighbors.add(edge.to)
        findNeighbors(edge.to, depth + 1)
      }
      if (edge.to === nodeId && !neighbors.has(edge.from)) {
        neighbors.add(edge.from)
        findNeighbors(edge.from, depth + 1)
      }
    }
  }
  findNeighbors(startNodeId, 0)
  return neighbors
}

// Helper: resolve node color based on color scheme and groups
function resolveNodeColor(
  baseColor: number,
  nodeData: NodeData,
  settings: GraphSettings,
  groups: { query: string; color: string }[]
): number {
  let color = baseColor
  const hasTags = nodeData.tags && nodeData.tags.length > 0
  
  if (settings.colorScheme === 'tags' && hasTags) {
    const tagHash = nodeData.tags![0].split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const hue = (tagHash * 137.508) % 360
    color = parseInt(`0x${HSLToHex(hue, 70, 60)}`, 16)
  } else if (settings.colorScheme === 'centrality' && nodeData.centrality !== undefined) {
    const lightness = 40 + Math.min(nodeData.centrality / 10, 1) * 30
    color = parseInt(`0x${HSLToHex(240, 80, lightness)}`, 16)
  }

  for (const group of groups) {
    const matchesLabel = group.query && nodeData.label.toLowerCase().includes(group.query.toLowerCase())
    const matchesTag = group.query && nodeData.tags?.some(t => t.toLowerCase().includes(group.query.toLowerCase()))
    if (matchesLabel || matchesTag) {
      return parseInt(group.color.replace('#', '0x'), 16)
    }
  }
  return color
}

// Helper: draw arrow for edge
function drawArrow(
  edgesGraphics: PIXI.Graphics,
  sourcePos: { x: number; y: number },
  targetPos: { x: number; y: number },
  settings: GraphSettings,
  color: number,
  alpha: number
) {
  const dx = targetPos.x - sourcePos.x
  const dy = targetPos.y - sourcePos.y
  const angle = Math.atan2(dy, dx)
  const arrowSize = 4 * settings.linkThickness
  const targetRadius = 10 * settings.nodeSize + 2
  const arrowX = targetPos.x - Math.cos(angle) * targetRadius
  const arrowY = targetPos.y - Math.sin(angle) * targetRadius
  
  edgesGraphics.moveTo(arrowX, arrowY)
  edgesGraphics.lineTo(
    arrowX - Math.cos(angle - Math.PI / 6) * arrowSize,
    arrowY - Math.sin(angle - Math.PI / 6) * arrowSize
  )
  edgesGraphics.lineTo(
    arrowX - Math.cos(angle + Math.PI / 6) * arrowSize,
    arrowY - Math.sin(angle + Math.PI / 6) * arrowSize
  )
  edgesGraphics.lineTo(arrowX, arrowY)
  edgesGraphics.fill({ color, alpha })
}

export default function GraphView({ userId, notes, onNoteSelect }: GraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<PIXI.Application | null>(null)
  const workerRef = useRef<Worker | null>(null)
  const nodesRef = useRef<Map<string, { graphics: PIXI.Graphics, text: PIXI.Text, data: NodeData }>>(new Map())
  const edgesRef = useRef<PIXI.Graphics | null>(null)
  
  const [showLegend, setShowLegend] = useState(true)
  const [showControls, setShowControls] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [isSimulationRunning, setIsSimulationRunning] = useState(true)
  
  // Settings avancés type Obsidian
  const [graphSettings, setGraphSettings] = useState<GraphSettings>({
    showLabels: true,
    showOrphans: true,
    nodeSize: 1,
    linkThickness: 1,
    colorScheme: 'default',
    minLinks: 0,
    maxDepth: 2,
    localMode: false,
    localNodeId: null,
    highlightTags: [],
  })
  
  // Groupes de couleurs personnalisés
  const [groups, setGroups] = useState<{ query: string, color: string }[]>([])
  const [newGroupQuery, setNewGroupQuery] = useState('')
  const [showArrows, setShowArrows] = useState(false)
  const [textFadeThreshold, setTextFadeThreshold] = useState(0.5)

  // Paramètres de physique optimisés pour un graphe intelligent type Obsidian
  const [physicsParams, setPhysicsParams] = useState({
    attraction: 0.015,      // Augmenté pour des liens plus forts
    repulsion: 500,         // Augmenté pour plus d'espace
    damping: 0.85,          // Meilleur amortissement
    centerForce: 0.015,     // Force de centrage modérée
    linkDistance: 50,       // Distance idéale des liens
  })

  // Zoom et pan
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPixiReady, setIsPixiReady] = useState(false)

  // Initialiser PixiJS
  useEffect(() => {
    console.log(`🎨 [GraphView] Initialisation PIXI...`)
    if (!containerRef.current) {
      console.warn(`⚠️ [GraphView] containerRef.current est null`)
      return
    }
    
    let mounted = true

    const initPixi = async () => {
      try {
        console.log(`🎨 [GraphView] Création de l'application PIXI...`)
        const app = new PIXI.Application()
        
        await app.init({
          width: containerRef.current?.clientWidth || 800,
          height: containerRef.current?.clientHeight || 600,
          backgroundColor: 0x0a0a0a,
          antialias: true,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
        })

        if (!mounted || !containerRef.current) {
          console.warn(`⚠️ [GraphView] Component unmounted avant fin init PIXI`)
          app.destroy(true)
          return
        }

        containerRef.current.appendChild(app.canvas)
        appRef.current = app
        
        console.log(`✅ [GraphView] PIXI initialisé avec succès !`)
        setIsPixiReady(true) // IMPORTANT: marquer comme prêt

    // Container principal pour zoom/pan
    const mainContainer = new PIXI.Container()
    app.stage.addChild(mainContainer)

    // Container pour les arêtes (en dessous)
    const edgesContainer = new PIXI.Graphics()
    mainContainer.addChild(edgesContainer)
    edgesRef.current = edgesContainer

        // Activer les interactions
        app.stage.eventMode = 'static'
        app.stage.hitArea = app.screen

        // Gestion du zoom avec la molette
        let isDragging = false
        let dragStart = { x: 0, y: 0 }
        
        // Gestion du multitouch (pinch-to-zoom)
        let initialPinchDistance: number | null = null
        let initialZoom = 1

        const getDistance = (touches: TouchList) => {
          const dx = touches[0].clientX - touches[1].clientX
          const dy = touches[0].clientY - touches[1].clientY
          return Math.sqrt(dx * dx + dy * dy)
        }

        const handleTouchStart = (e: TouchEvent) => {
          if (e.touches.length === 2) {
            e.preventDefault()
            initialPinchDistance = getDistance(e.touches)
            initialZoom = zoom
          } else if (e.touches.length === 1) {
            isDragging = true
            dragStart = { x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y }
          }
        }

        const handleTouchMove = (e: TouchEvent) => {
          if (e.touches.length === 2 && initialPinchDistance) {
            e.preventDefault()
            const currentDistance = getDistance(e.touches)
            const scale = currentDistance / initialPinchDistance
            const newZoom = Math.max(0.1, Math.min(3, initialZoom * scale))
            setZoom(newZoom)
          } else if (e.touches.length === 1 && isDragging) {
            setPan({
              x: e.touches[0].clientX - dragStart.x,
              y: e.touches[0].clientY - dragStart.y,
            })
          }
        }

        const handleTouchEnd = () => {
          initialPinchDistance = null
          isDragging = false
        }

        const handleWheel = (e: WheelEvent) => {
          e.preventDefault()
          const delta = e.deltaY > 0 ? 0.9 : 1.1
          const newZoom = Math.max(0.1, Math.min(3, zoom * delta))
          setZoom(newZoom)
        }

        const handleMouseDown = (e: MouseEvent) => {
          isDragging = true
          dragStart = { x: e.clientX - pan.x, y: e.clientY - pan.y }
        }

        const handleMouseMove = (e: MouseEvent) => {
          if (isDragging) {
            setPan({
              x: e.clientX - dragStart.x,
              y: e.clientY - dragStart.y,
            })
          }
        }

        const handleMouseUp = () => {
          isDragging = false
        }

        app.canvas.addEventListener('wheel', handleWheel)
        app.canvas.addEventListener('mousedown', handleMouseDown)
        app.canvas.addEventListener('mousemove', handleMouseMove)
        app.canvas.addEventListener('mouseup', handleMouseUp)
        app.canvas.addEventListener('mouseleave', handleMouseUp)
        
        // Touch events
        app.canvas.addEventListener('touchstart', handleTouchStart, { passive: false })
        app.canvas.addEventListener('touchmove', handleTouchMove, { passive: false })
        app.canvas.addEventListener('touchend', handleTouchEnd)
      } catch (error) {
        console.error('Erreur initialisation PixiJS:', error)
      }
    }

    initPixi()

    // Gérer le redimensionnement
    const handleResize = () => {
      if (appRef.current && containerRef.current) {
        appRef.current.renderer.resize(
          containerRef.current.clientWidth,
          containerRef.current.clientHeight
        )
        // Forcer la mise à jour du centre
        const mainContainer = appRef.current.stage.children[0]
        if (mainContainer) {
          mainContainer.position.set(
            appRef.current.screen.width / 2 + pan.x,
            appRef.current.screen.height / 2 + pan.y
          )
        }
      }
    }

    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize)
      mounted = false
      if (appRef.current) {
        appRef.current.destroy(true, { children: true })
        appRef.current = null
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Appliquer zoom et pan
  useEffect(() => {
    if (!appRef.current) {return}
    
    const mainContainer = appRef.current.stage.children[0]
    if (mainContainer) {
      mainContainer.scale.set(zoom)
      mainContainer.position.set(
        appRef.current.screen.width / 2 + pan.x,
        appRef.current.screen.height / 2 + pan.y
      )
    }
  }, [zoom, pan])

  // Fonction pour centrer la vue sur un nœud
  const centerOnNode = useCallback((nodeId: string) => {
    const node = nodesRef.current.get(nodeId)
    if (node && appRef.current) {
      const targetX = -node.data.x * zoom
      const targetY = -node.data.y * zoom
      
      // Animation fluide vers la cible
      const startPan = { ...pan }
      const startTime = performance.now()
      const duration = 500 // ms
      
      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime
        const progress = Math.min(elapsed / duration, 1)
        const ease = 1 - Math.pow(1 - progress, 3) // Cubic ease out
        
        setPan({
          x: startPan.x + (targetX - startPan.x) * ease,
          y: startPan.y + (targetY - startPan.y) * ease
        })
        
        if (progress < 1) {
          requestAnimationFrame(animate)
        }
      }
      
      requestAnimationFrame(animate)
    }
  }, [zoom, pan])

  // Centrer quand un nœud est sélectionné (optionnel, peut être désactivé si gênant)
  /*
  useEffect(() => {
    if (selectedNode) {
      centerOnNode(selectedNode)
    }
  }, [selectedNode, centerOnNode])
  */

  // Créer un nœud PixiJS avec meilleur style
  const createNode = useCallback((nodeData: NodeData) => {
    if (!appRef.current) {return null}

    const mainContainer = appRef.current.stage.children[0]
    
    // Graphique du nœud
    const graphics = new PIXI.Graphics()
    graphics.eventMode = 'static'
    graphics.cursor = 'pointer'
    
    // Appliquer le multiplicateur de taille depuis graphSettings
    const baseSize = NODE_SIZES[nodeData.type]
    const size = baseSize * graphSettings.nodeSize
    let color = NODE_COLORS[nodeData.type]
    
    // Appliquer la colorisation selon le schéma choisi
    color = resolveNodeColor(color, nodeData, graphSettings, groups)
    
    // Halo pour les nœuds importants
    if (nodeData.type === 'main') {
      graphics.circle(0, 0, size + 4)
      graphics.fill({ color, alpha: 0.2 })
    }
    
    // Cercle principal
    graphics.circle(0, 0, size)
    graphics.fill({ color, alpha: 0.9 })
    
    // Bordure blanche pour contraste
    graphics.circle(0, 0, size)
    graphics.stroke({ width: 2, color: 0xFFFFFF, alpha: 0.3 })
    
    graphics.position.set(nodeData.x, nodeData.y)
    
    // Texte du label avec visibilité contrôlée
    const labelVisible = graphSettings.showLabels && (nodeData.type === 'main' || zoom > (1.5 - textFadeThreshold))
    const text = new PIXI.Text(nodeData.label, {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: nodeData.type === 'main' ? 13 : 11,
      fill: 0xFFFFFF,
      align: 'center',
      fontWeight: nodeData.type === 'main' ? 'bold' : 'normal',
    })
    text.anchor.set(0.5, -1.8)
    text.position.set(0, 0)
    text.alpha = labelVisible ? (nodeData.type === 'main' ? 0.95 : 0.75) : 0
    graphics.addChild(text)
    
    // Events améliorés
    graphics.on('pointerover', () => {
      setHoveredNode(nodeData.id)
      graphics.clear()
      
      // Effet glow plus prononcé au hover
      if (nodeData.type === 'main') {
        graphics.circle(0, 0, size + 6)
        graphics.fill({ color: NODE_COLORS.hover, alpha: 0.3 })
      }
      
      graphics.circle(0, 0, size * 1.3)
      graphics.fill({ color: NODE_COLORS.hover, alpha: 1 })
      
      graphics.circle(0, 0, size * 1.3)
      graphics.stroke({ width: 2, color: 0xFFFFFF, alpha: 0.8 })
      
      text.alpha = 1
      text.scale.set(1.1)
    })
    
    graphics.on('pointerout', () => {
      setHoveredNode(null)
      graphics.clear()
      
      if (nodeData.type === 'main') {
        graphics.circle(0, 0, size + 4)
        graphics.fill({ color, alpha: 0.2 })
      }
      
      graphics.circle(0, 0, size)
      graphics.fill({ color, alpha: 0.9 })
      
      graphics.circle(0, 0, size)
      graphics.stroke({ width: 2, color: 0xFFFFFF, alpha: 0.3 })
      
      text.alpha = nodeData.type === 'main' ? 0.95 : 0.75
      text.scale.set(1)
    })
    
    graphics.on('pointertap', () => {
      setSelectedNode(nodeData.id)
      // Ouvrir la note si un handler est fourni
      if (onNoteSelect) {
        onNoteSelect(nodeData.id)
      }
    })
    
    mainContainer.addChild(graphics)
    
    return { graphics, text, data: nodeData }
  }, [])

  // Compute edge style based on selection/hover state
  const computeEdgeStyle = useCallback((edge: EdgeData) => {
    const isConnectedToSelected = selectedNode === edge.source || selectedNode === edge.target
    const isConnectedToHovered = hoveredNode === edge.source || hoveredNode === edge.target
    const baseAlpha = isConnectedToSelected ? 0.8 : isConnectedToHovered ? 0.6 : 0.5
    const baseWidth = isConnectedToSelected ? 2.5 : isConnectedToHovered ? 2 : 1.5
    return {
      width: baseWidth * graphSettings.linkThickness,
      color: (isConnectedToSelected || isConnectedToHovered) ? 0x5a63e9 : 0x9CA3AF,
      alpha: baseAlpha,
    }
  }, [selectedNode, hoveredNode, graphSettings.linkThickness])

  // Draw a single edge line between two positions
  const drawSingleEdge = useCallback((
    graphics: NonNullable<typeof edgesRef.current>,
    sourcePos: { x: number; y: number },
    targetPos: { x: number; y: number },
    style: { width: number; color: number; alpha: number }
  ) => {
    graphics.moveTo(sourcePos.x, sourcePos.y)
    graphics.lineTo(targetPos.x, targetPos.y)
    graphics.stroke({ width: style.width, color: style.color, alpha: style.alpha })
    if (showArrows) {
      drawArrow(graphics, sourcePos, targetPos, graphSettings, style.color, style.alpha)
    }
  }, [showArrows, graphSettings])

  // Dessiner les arêtes avec style Obsidian
  const drawEdges = useCallback((edges: EdgeData[], nodePositions: Map<string, { x: number, y: number }>) => {
    if (!edgesRef.current) {return}
    
    edgesRef.current.clear()
    
    for (const edge of edges) {
      const sourcePos = nodePositions.get(edge.source)
      const targetPos = nodePositions.get(edge.target)
      if (!sourcePos || !targetPos) {continue}
      
      const style = computeEdgeStyle(edge)
      drawSingleEdge(edgesRef.current, sourcePos, targetPos, style)
    }
  }, [computeEdgeStyle, drawSingleEdge])

  // Factory for worker message handler (extracted to reduce nesting depth)
  const createWorkerMessageHandler = useCallback((edgeDataArray: EdgeData[]) => {
    return (e: MessageEvent) => {
      if (e.data.type !== 'positions') {return}
      const positions: { id: string, x: number, y: number }[] = e.data.data
      updateNodePositions(positions, nodesRef.current)
      const nodePositions = new Map(positions.map(pos => [pos.id, { x: pos.x, y: pos.y }]))
      drawEdges(edgeDataArray, nodePositions)
    }
  }, [drawEdges])

  // Charger et initialiser le graphe avec système d'indexation Obsidian
  useEffect(() => {
    const loadGraph = async () => {
      console.log(`🎯 [GraphView] loadGraph() appelé`)
      console.log(`🎯 [GraphView] isPixiReady =`, isPixiReady)
      console.log(`🎯 [GraphView] appRef.current =`, appRef.current)
      console.log(`🎯 [GraphView] notes.length =`, notes.length)
      
      if (!isPixiReady || !appRef.current) {
        console.warn(`⚠️ [GraphView] PIXI pas prêt encore - abandon (isPixiReady=${isPixiReady}, appRef=${!!appRef.current})`)
        return
      }

      try {
        console.log(`🔍 Indexation du graphe style Obsidian...`)
        const startTime = performance.now()
        
        // Indexer toutes les notes (extraction rapide de wikilinks)
        const graphData = graphIndexer.indexGraph(notes)
        
        const indexTime = performance.now() - startTime
        console.log(`✅ Indexation terminée en ${indexTime.toFixed(0)}ms`)
        console.log(`📊 ${graphData.nodes.length} nœuds, ${graphData.edges.length} arêtes`)
        
        // Filtrer selon les paramètres
        let filteredNodes = graphData.nodes.filter(node => {
          // Filtre: orphelins (notes sans liens)
          if (!graphSettings.showOrphans && node.degree === 0) {
            return false
          }
          
          // Filtre: nombre minimum de liens
          if ((node.degree || 0) < graphSettings.minLinks) {
            return false
          }
          
          return true
        })

        // Mode Local Graph: ne montrer que les voisins du nœud sélectionné
        if (graphSettings.localMode && graphSettings.localNodeId) {
          const neighbors = findNeighborNodes(
            graphSettings.localNodeId,
            graphData.edges,
            graphSettings.maxDepth
          )
          filteredNodes = filteredNodes.filter(node => neighbors.has(node.id))
        }
        
        console.log(`🔵 ${filteredNodes.length} nœuds après filtrage`)

        // Filtrer les arêtes pour ne garder que celles entre nœuds visibles
        const nodeIds = new Set(filteredNodes.map(n => n.id))
        const filteredEdges = graphData.edges.filter(
          edge => nodeIds.has(edge.from) && nodeIds.has(edge.to)
        )
        
        console.log(`🔗 ${filteredEdges.length} arêtes après filtrage`)

        // Convertir au format attendu par le worker
        const nodeDataArray: NodeData[] = filteredNodes.map(node => ({
          id: node.id,
          label: node.title,
          type: (node.degree || 0) >= 3 ? 'main' : (node.degree || 0) >= 1 ? 'secondary' : 'isolated',
          links: node.degree || 0,
          x: node.x || 0,
          y: node.y || 0,
          tags: node.tags,
          centrality: node.degree || 0
        }))

        const edgeDataArray: EdgeData[] = filteredEdges.map(edge => ({
          source: edge.from,
          target: edge.to,
          strength: 1,
          type: 'explicit',
          confidence: 100
        }))

        // Initialiser le Web Worker
        if (workerRef.current) {
          workerRef.current.terminate()
        }

        const worker = new Worker('/graph-worker.js')
        workerRef.current = worker

        // Recevoir les positions du worker
        worker.onmessage = createWorkerMessageHandler(edgeDataArray)

        // Initialiser la simulation
        worker.postMessage({
          type: 'init',
          data: {
            nodes: nodeDataArray,
            edges: edgeDataArray,
            params: physicsParams,
          },
        })

        // Nettoyer les anciens nœuds graphiques du container principal
        const mainContainer = appRef.current.stage.children[0] as PIXI.Container
        // On garde le container des arêtes (premier enfant), on supprime le reste (les nœuds)
        while (mainContainer.children.length > 1) {
          mainContainer.removeChildAt(1).destroy()
        }

        // Créer les nouveaux nœuds PixiJS
        nodesRef.current.clear()
        nodeDataArray.forEach((nodeData) => {
          const node = createNode(nodeData)
          if (node) {
            nodesRef.current.set(nodeData.id, node)
          }
        })

      } catch (error) {
        console.error('Erreur lors du chargement du graphe:', error)
      }
    }

    loadGraph()

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate()
      }
    }
  }, [notes, createNode, drawEdges, physicsParams, graphSettings, isPixiReady, groups, textFadeThreshold])

  // Mettre à jour les paramètres de physique
  useEffect(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({
        type: 'updateParams',
        data: physicsParams,
      })
    }
  }, [physicsParams])

  // Contrôler la simulation
  const toggleSimulation = () => {
    if (workerRef.current) {
      if (isSimulationRunning) {
        workerRef.current.postMessage({ type: 'stop' })
      } else {
        workerRef.current.postMessage({ type: 'start' })
      }
      setIsSimulationRunning(!isSimulationRunning)
    }
  }

  // Réinitialiser la vue
  const resetView = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  return (
    <div className="relative h-full w-full bg-neutral-900">
      {/* Container PixiJS */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Contrôles de zoom */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <button
          onClick={() => { setZoom(Math.min(3, zoom * 1.2)); }}
          className="p-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg border border-neutral-700 transition-colors"
          title="Zoom avant"
        >
          <ZoomIn className="w-5 h-5 text-neutral-300" />
        </button>
        <button
          onClick={() => { setZoom(Math.max(0.1, zoom / 1.2)); }}
          className="p-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg border border-neutral-700 transition-colors"
          title="Zoom arrière"
        >
          <ZoomOut className="w-5 h-5 text-neutral-300" />
        </button>
        <button
          onClick={resetView}
          className="p-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg border border-neutral-700 transition-colors"
          title="Réinitialiser la vue"
        >
          <Maximize className="w-5 h-5 text-neutral-300" />
        </button>
        <button
          onClick={toggleSimulation}
          className="p-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg border border-neutral-700 transition-colors"
          title={isSimulationRunning ? 'Pause' : 'Reprendre'}
        >
          {isSimulationRunning ? (
            <Pause className="w-5 h-5 text-neutral-300" />
          ) : (
            <Play className="w-5 h-5 text-neutral-300" />
          )}
        </button>
        <button
          onClick={() => { setShowFilters(!showFilters); }}
          className="p-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg border border-neutral-700 transition-colors"
          title="Paramètres du Graphe"
        >
          <Settings className="w-5 h-5 text-neutral-300" />
        </button>
        {selectedNode && (
          <button
            onClick={() => {
              setGraphSettings(prev => ({
                ...prev,
                localMode: !prev.localMode,
                localNodeId: prev.localMode ? null : selectedNode,
              }))
            }}
            className={`p-2 rounded-lg border transition-colors ${
              graphSettings.localMode 
                ? 'bg-blue-600 hover:bg-blue-700 border-blue-500' 
                : 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700'
            }`}
            title={graphSettings.localMode ? 'Vue Globale' : 'Vue Locale'}
          >
            <Target className="w-5 h-5 text-neutral-300" />
          </button>
        )}
      </div>

      {/* Panneau de contrôle de physique (Obsolète, intégré dans les filtres) */}
      {/* {showControls && ( ... )} */}

      {/* Panneau de filtres avancés Obsidian */}
      {showFilters && (
        <div className="absolute top-4 left-4 bg-neutral-800 border border-neutral-700 rounded-lg p-4 max-w-md laptop:max-w-lg max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-neutral-100">Paramètres du Graphe</h3>
            <button
              onClick={() => { setShowFilters(false); }}
              className="text-neutral-400 hover:text-neutral-200 text-xs"
            >
              Fermer
            </button>
          </div>
          
          <div className="grid grid-cols-1 laptop:grid-cols-2 gap-6">
            {/* Colonne 1: Filtres & Groupes */}
            <div className="space-y-6">
              {/* Filtres */}
              <div className="space-y-3">
                <h4 className="text-xs font-medium text-neutral-300 uppercase tracking-wide border-b border-neutral-700 pb-1">Filtres</h4>
                
                <div className="flex items-center justify-between">
                  <label className="text-xs text-neutral-400">Notes isolées</label>
                  <button
                    onClick={() => { setGraphSettings(prev => ({ ...prev, showOrphans: !prev.showOrphans })); }}
                    className={`w-8 h-4 rounded-full transition-colors relative ${
                      graphSettings.showOrphans ? 'bg-blue-600' : 'bg-neutral-600'
                    }`}
                  >
                    <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${
                      graphSettings.showOrphans ? 'translate-x-4' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                <div>
                  <label className="text-xs text-neutral-400 block mb-1">
                    Liens minimum: {graphSettings.minLinks}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="1"
                    value={graphSettings.minLinks}
                    onChange={(e) => { setGraphSettings(prev => ({ ...prev, minLinks: parseInt(e.target.value) })); }}
                    className="w-full accent-blue-500 h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>

              {/* Groupes */}
              <div className="space-y-3">
                <h4 className="text-xs font-medium text-neutral-300 uppercase tracking-wide border-b border-neutral-700 pb-1">Groupes</h4>
                
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Rechercher..." 
                    value={newGroupQuery}
                    onChange={(e) => { setNewGroupQuery(e.target.value); }}
                    className="flex-1 bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs text-white focus:border-blue-500 outline-none"
                  />
                  <button 
                    onClick={() => {
                      if (newGroupQuery) {
                        const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#a855f7', '#ec4899']
                        const randomColor = colors[groups.length % colors.length]
                        setGroups([...groups, { query: newGroupQuery, color: randomColor }])
                        setNewGroupQuery('')
                      }
                    }}
                    className="bg-neutral-700 hover:bg-neutral-600 text-white px-2 py-1 rounded text-xs"
                  >
                    +
                  </button>
                </div>

                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {groups.map((group, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-neutral-900 p-1.5 rounded border border-neutral-800">
                      <input 
                        type="color" 
                        value={group.color}
                        onChange={(e) => {
                          const newGroups = [...groups]
                          newGroups[idx].color = e.target.value
                          setGroups(newGroups)
                        }}
                        className="w-4 h-4 rounded cursor-pointer border-none p-0 bg-transparent"
                      />
                      <span className="text-xs text-neutral-300 flex-1 truncate">{group.query}</span>
                      <button 
                        onClick={() => { setGroups(groups.filter((_, i) => i !== idx)); }}
                        className="text-neutral-500 hover:text-red-400"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {groups.length === 0 && (
                    <p className="text-xs text-neutral-500 italic">Aucun groupe défini</p>
                  )}
                </div>
              </div>
            </div>

            {/* Colonne 2: Affichage & Forces */}
            <div className="space-y-6">
              {/* Affichage */}
              <div className="space-y-3">
                <h4 className="text-xs font-medium text-neutral-300 uppercase tracking-wide border-b border-neutral-700 pb-1">Affichage</h4>
                
                <div className="flex items-center justify-between">
                  <label className="text-xs text-neutral-400">Flèches</label>
                  <button
                    onClick={() => { setShowArrows(!showArrows); }}
                    className={`w-8 h-4 rounded-full transition-colors relative ${
                      showArrows ? 'bg-blue-600' : 'bg-neutral-600'
                    }`}
                  >
                    <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${
                      showArrows ? 'translate-x-4' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-xs text-neutral-400">Étiquettes</label>
                  <button
                    onClick={() => { setGraphSettings(prev => ({ ...prev, showLabels: !prev.showLabels })); }}
                    className={`w-8 h-4 rounded-full transition-colors relative ${
                      graphSettings.showLabels ? 'bg-blue-600' : 'bg-neutral-600'
                    }`}
                  >
                    <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${
                      graphSettings.showLabels ? 'translate-x-4' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                <div>
                  <label className="text-xs text-neutral-400 block mb-1">
                    Seuil texte: {textFadeThreshold.toFixed(1)}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={textFadeThreshold}
                    onChange={(e) => { setTextFadeThreshold(parseFloat(e.target.value)); }}
                    className="w-full accent-blue-500 h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-xs text-neutral-400 block mb-1">
                    Taille des nœuds: {graphSettings.nodeSize.toFixed(1)}x
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={graphSettings.nodeSize}
                    onChange={(e) => { setGraphSettings(prev => ({ ...prev, nodeSize: parseFloat(e.target.value) })); }}
                    className="w-full accent-blue-500 h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-xs text-neutral-400 block mb-1">
                    Épaisseur des liens: {graphSettings.linkThickness.toFixed(1)}x
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={graphSettings.linkThickness}
                    onChange={(e) => { setGraphSettings(prev => ({ ...prev, linkThickness: parseFloat(e.target.value) })); }}
                    className="w-full accent-blue-500 h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>

              {/* Forces */}
              <div className="space-y-3">
                <h4 className="text-xs font-medium text-neutral-300 uppercase tracking-wide border-b border-neutral-700 pb-1">Forces</h4>
                
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">
                    Force centrale: {physicsParams.centerForce.toFixed(3)}
                  </label>
                  <input
                    type="range"
                    min="0.001"
                    max="0.1"
                    step="0.001"
                    value={physicsParams.centerForce}
                    onChange={(e) => { setPhysicsParams({ ...physicsParams, centerForce: parseFloat(e.target.value) }); }}
                    className="w-full accent-blue-500 h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-xs text-neutral-400 block mb-1">
                    Force de répulsion: {physicsParams.repulsion.toFixed(0)}
                  </label>
                  <input
                    type="range"
                    min="100"
                    max="1000"
                    step="10"
                    value={physicsParams.repulsion}
                    onChange={(e) => { setPhysicsParams({ ...physicsParams, repulsion: parseFloat(e.target.value) }); }}
                    className="w-full accent-blue-500 h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-xs text-neutral-400 block mb-1">
                    Force des liens: {physicsParams.attraction.toFixed(3)}
                  </label>
                  <input
                    type="range"
                    min="0.001"
                    max="0.05"
                    step="0.001"
                    value={physicsParams.attraction}
                    onChange={(e) => { setPhysicsParams({ ...physicsParams, attraction: parseFloat(e.target.value) }); }}
                    className="w-full accent-blue-500 h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-xs text-neutral-400 block mb-1">
                    Distance des liens: {physicsParams.linkDistance.toFixed(0)}
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="200"
                    step="5"
                    value={physicsParams.linkDistance}
                    onChange={(e) => { setPhysicsParams({ ...physicsParams, linkDistance: parseFloat(e.target.value) }); }}
                    className="w-full accent-blue-500 h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Légende */}
      {showLegend && (
        <div className="absolute bottom-4 left-4 bg-neutral-800 border border-neutral-700 rounded-lg p-4 max-w-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-neutral-100">Légende</h3>
            <button
              onClick={() => { setShowLegend(false); }}
              className="text-neutral-400 hover:text-neutral-200 text-xs"
            >
              Masquer
            </button>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: '#5a63e9' }} />
              <span className="text-neutral-300">Notes principales (2+ liens)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#8B92FF' }} />
              <span className="text-neutral-300">Notes secondaires (1 lien)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-neutral-400" />
              <span className="text-neutral-300">Notes isolées (0 lien)</span>
            </div>
            <div className="pt-2 border-t border-neutral-700 mt-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-blue-500" />
                <span className="text-neutral-300">Lien wikilink [[note]]</span>
              </div>
            </div>
            <div className="pt-2 border-t border-neutral-700 mt-2">
              <p className="text-neutral-400">💡 Cliquez-glissez pour déplacer</p>
              <p className="text-neutral-400">🔍 Molette pour zoomer</p>
            </div>
          </div>
        </div>
      )}

      {!showLegend && (
        <button
          onClick={() => { setShowLegend(true); }}
          className="absolute bottom-4 left-4 p-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg border border-neutral-700 transition-colors"
          title="Afficher la légende"
        >
          <Circle className="w-5 h-5 text-neutral-300" />
        </button>
      )}

      {/* Info nœud sélectionné */}
      {selectedNode && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2">
          <div className="text-sm text-neutral-100">
            {nodesRef.current.get(selectedNode)?.data.label || 'Note sélectionnée'}
          </div>
          <button
            onClick={() => { setSelectedNode(null); }}
            className="absolute -top-2 -right-2 w-5 h-5 bg-neutral-700 hover:bg-neutral-600 rounded-full flex items-center justify-center text-neutral-300 text-xs"
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}
