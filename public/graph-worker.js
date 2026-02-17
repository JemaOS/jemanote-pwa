// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

/**
 * Web Worker pour calculs de physique du graphe
 * Algorithme Force-Directed (Fruchterman-Reingold adapté)
 */

let nodes = new Map()
let edges = []
let params = {
  attraction: 0.01,
  repulsion: 300,
  damping: 0.8,
  maxSpeed: 10,
  centerForce: 0.02,
  linkDistance: 50, // Distance idéale des liens
}

let isRunning = false
let animationId = null

// Initialiser le graphe
function initGraph(data) {
  nodes.clear()
  edges = data.edges

  if (data.params) {
    params = { ...params, ...data.params }
  }

  // Initialiser les nœuds avec positions aléatoires
  data.nodes.forEach((nodeData) => {
    const angle = Math.random() * Math.PI * 2
    const radius = 200 + Math.random() * 100
    
    nodes.set(nodeData.id, {
      id: nodeData.id,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      vx: 0,
      vy: 0,
      mass: nodeData.type === 'main' ? 2 : (nodeData.type === 'secondary' ? 1.5 : 1),
      type: nodeData.type,
    })
  })
}

// Calculer les forces de répulsion (tous les nœuds se repoussent)
function applyRepulsion() {
  const nodeArray = Array.from(nodes.values())
  
  for (let i = 0; i < nodeArray.length; i++) {
    const nodeA = nodeArray[i]
    
    for (let j = i + 1; j < nodeArray.length; j++) {
      const nodeB = nodeArray[j]
      
      const dx = nodeB.x - nodeA.x
      const dy = nodeB.y - nodeA.y
      const distance = Math.hypot(dx, dy) || 1
      
      // Force de répulsion inversement proportionnelle au carré de la distance
      const force = params.repulsion / (distance * distance)
      
      const fx = (dx / distance) * force
      const fy = (dy / distance) * force
      
      nodeA.vx -= fx / nodeA.mass
      nodeA.vy -= fy / nodeA.mass
      nodeB.vx += fx / nodeB.mass
      nodeB.vy += fy / nodeB.mass
    }
  }
}

// Calculer les forces d'attraction (nœuds liés s'attirent)
function applyAttraction() {
  edges.forEach((edge) => {
    const source = nodes.get(edge.source)
    const target = nodes.get(edge.target)
    
    if (!source || !target) return
    
    const dx = target.x - source.x
    const dy = target.y - source.y
    const distance = Math.hypot(dx, dy) || 1
    
    // Force de ressort (Spring force)
    // F = k * (current_length - rest_length)
    const displacement = distance - params.linkDistance
    const force = displacement * params.attraction
    
    const fx = (dx / distance) * force
    const fy = (dy / distance) * force
    
    source.vx += fx / source.mass
    source.vy += fy / source.mass
    target.vx -= fx / target.mass
    target.vy -= fy / target.mass
  })
}

// Force de centrage (ramène les nœuds vers le centre)
function applyCenterForce() {
  nodes.forEach((node) => {
    node.vx -= node.x * params.centerForce
    node.vy -= node.y * params.centerForce
  })
}

// Mettre à jour les positions
function updatePositions() {
  nodes.forEach((node) => {
    // Appliquer l'amortissement
    node.vx *= params.damping
    node.vy *= params.damping
    
    // Limiter la vitesse maximale
    const speed = Math.hypot(node.vx, node.vy)
    if (speed > params.maxSpeed) {
      node.vx = (node.vx / speed) * params.maxSpeed
      node.vy = (node.vy / speed) * params.maxSpeed
    }
    
    // Mettre à jour les positions
    node.x += node.vx
    node.y += node.vy
  })
}

// Étape de simulation
function simulationStep() {
  applyRepulsion()
  applyAttraction()
  applyCenterForce()
  updatePositions()
  
  // Envoyer les positions mises à jour
  const positions = Array.from(nodes.values()).map((node) => ({
    id: node.id,
    x: node.x,
    y: node.y,
  }))
  
  self.postMessage({
    type: 'positions',
    data: positions,
  })
}

// Boucle de simulation
function startSimulation() {
  if (isRunning) return
  
  isRunning = true
  
  const loop = () => {
    if (!isRunning) return
    
    simulationStep()
    
    // Continue la simulation à 60 FPS
    setTimeout(() => {
      if (isRunning) {
        loop()
      }
    }, 1000 / 60)
  }
  
  loop()
}

function stopSimulation() {
  isRunning = false
}

// Gestionnaire de messages
self.onmessage = (e) => {
  const { type, data } = e.data
  
  switch (type) {
    case 'init':
      initGraph(data)
      startSimulation()
      break
      
    case 'start':
      startSimulation()
      break
      
    case 'stop':
      stopSimulation()
      break
      
    case 'updateParams':
      params = { ...params, ...data }
      break
      
    case 'updateNodes':
      // Mettre à jour les données des nœuds sans réinitialiser les positions
      data.forEach((nodeData) => {
        const existing = nodes.get(nodeData.id)
        if (existing) {
          existing.mass = nodeData.type === 'main' ? 2 : (nodeData.type === 'secondary' ? 1.5 : 1)
          existing.type = nodeData.type
        }
      })
      break
      
    default:
      console.warn('Unknown message type:', type)
  }
}
