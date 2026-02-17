// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

/**
 * Service d'indexation du graphe - Style Obsidian
 * Extraction rapide de wikilinks [[note]] et liens markdown [text](note)
 */

import type { Note } from '@/types'

export interface GraphNode {
  id: string
  title: string
  size: number // degree (nombre de connexions)
  x?: number
  y?: number
  tags: string[]
  color?: string
  degree?: number
}

export interface GraphEdge {
  from: string
  to: string
  type: 'wikilink' | 'mdlink' | 'backlink'
}

export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

class GraphIndexer {
  // SECURITY FIX: Using safe regex patterns with length limits to prevent ReDoS
  // (Regular Expression Denial of Service) attacks. These patterns limit the
  // maximum match length and avoid nested quantifiers that could cause
  // catastrophic backtracking on malicious input.
  private readonly wikilinkRegex = /\[\[([^\]|#]{1,200})(?:#[^\]|]{0,100})?(?:\|[^\]]{0,100})?\]\]/g
  private readonly mdLinkRegex = /\[[^\]]{0,200}\]\(([^)]{1,500})\)/g
  private readonly tagRegex = /#[\w-]{1,50}/g

  /**
   * Indexer toutes les notes et construire le graphe
   */
  indexGraph(notes: readonly Note[]): GraphData {
    console.log(`🔍 [GraphIndexer] Indexation de ${notes.length} notes...`)
    console.log(`📋 [GraphIndexer] Première note:`, notes[0]?.title, notes[0]?.id)

    // Map id -> note pour résolution rapide
    const noteMap = new Map<string, Note>()
    const titleMap = new Map<string, string>() // title -> id
    
    notes.forEach(note => {
      noteMap.set(note.id, note)
      titleMap.set(note.title.toLowerCase(), note.id)
      console.log(`  ➕ Note ajoutée: "${note.title}" (${note.id})`)
    })

    const edges: GraphEdge[] = []
    const nodeDegree = new Map<string, number>()

    // Initialiser les degrés à 0
    notes.forEach(note => nodeDegree.set(note.id, 0))

    // Extraire tous les liens
    notes.forEach(note => {
      const links = this.extractLinks(note.content)
      console.log(`  🔗 Note "${note.title}": ${links.length} liens trouvés`, links)
      
      links.forEach(link => {
        // Résoudre le lien vers un ID de note
        const targetId = this.resolveLink(link, titleMap, noteMap)
        console.log(`    → Lien "${link.target}" résolu vers: ${targetId}`)
        
        if (targetId && targetId !== note.id) {
          // Lien forward
          // Add both forward link and backlink in single push operation
          edges.push(
            { from: note.id, to: targetId, type: link.type },
            { from: targetId, to: note.id, type: 'backlink' }
          )
          
          // Incrémenter les degrés
          nodeDegree.set(note.id, (nodeDegree.get(note.id) || 0) + 1)
          nodeDegree.set(targetId, (nodeDegree.get(targetId) || 0) + 1)
        }
      })
    })

    // Construire les nœuds
    const nodes: GraphNode[] = notes.map(note => {
      const tags = this.extractTags(note.content)
      const degree = nodeDegree.get(note.id) || 0
      
      return {
        id: note.id,
        title: note.title,
        size: Math.max(1, Math.log(degree + 1) * 6), // Taille logarithmique
        tags,
        degree,
        color: this.getColorForNode(tags, degree)
      }
    })

    // Dédupliquer les edges (éviter doublons from-to)
    const edgesUnique = this.deduplicateEdges(edges)

    console.log(`✅ [GraphIndexer] Graphe indexé: ${nodes.length} nœuds, ${edgesUnique.length} arêtes`)
    console.log(`📊 [GraphIndexer] Échantillon nœuds:`, nodes.slice(0, 3))
    console.log(`📊 [GraphIndexer] Échantillon arêtes:`, edgesUnique.slice(0, 5))

    return { nodes, edges: edgesUnique }
  }

  /**
   * Extraire les liens d'un contenu markdown
   */
  private extractLinks(content: string): Array<{ target: string; type: 'wikilink' | 'mdlink' }> {
    const links: Array<{ target: string; type: 'wikilink' | 'mdlink' }> = []

    // Wikilinks [[Note]] ou [[Note|alias]]
    let match
    while ((match = this.wikilinkRegex.exec(content)) !== null) {
      const target = match[1].trim()
      if (target) {
        links.push({ target, type: 'wikilink' })
      }
    }

    // Markdown links [text](path) - ignorer URLs externes
    this.mdLinkRegex.lastIndex = 0
    while ((match = this.mdLinkRegex.exec(content)) !== null) {
      const target = match[1].trim()
      // Ignorer URLs http/https
      if (target && !target.startsWith('http://') && !target.startsWith('https://')) {
        links.push({ target, type: 'mdlink' })
      }
    }

    return links
  }

  /**
   * Résoudre un lien vers un ID de note
   */
  private resolveLink(
    link: { target: string; type: string },
    titleMap: Map<string, string>,
    noteMap: Map<string, Note>
  ): string | null {
    const target = link.target

    // Cas 1: c'est déjà un ID
    if (noteMap.has(target)) {
      return target
    }

    // Cas 2: c'est un titre (wikilink)
    const titleLower = target.toLowerCase()
    if (titleMap.has(titleLower)) {
      return titleMap.get(titleLower)!
    }

    // Cas 3: nettoyer le nom de fichier (.md, chemins relatifs)
    const cleaned = target.replace(/\.md$/, '').replace(/^\.\//, '')
    const cleanedLower = cleaned.toLowerCase()
    
    if (titleMap.has(cleanedLower)) {
      return titleMap.get(cleanedLower)!
    }

    // Cas 4: chercher par correspondance partielle (basename)
    const basename = cleaned.split('/').pop() || cleaned
    const basenameLower = basename.toLowerCase()
    
    if (titleMap.has(basenameLower)) {
      return titleMap.get(basenameLower)!
    }

    // Non résolu
    return null
  }

  /**
   * Extraire les tags #tag d'un contenu
   */
  private extractTags(content: string): string[] {
    const matches = content.match(this.tagRegex)
    if (!matches) return []
    return [...new Set(matches.map(t => t.substring(1)))] // dédupliquer
  }

  /**
   * Couleur du nœud selon tags et degré
   */
  private getColorForNode(tags: string[], degree: number): string {
    // Nœud hub (beaucoup de liens)
    if (degree >= 10) {return '#5a63e9'} // Bleu primaire
    if (degree >= 5) {return '#8B92FF'}   // Bleu clair
    if (degree >= 2) {return '#A8AEFF'}   // Bleu très clair
    
    // Nœud isolé
    if (degree === 0) {return '#6B7280'} // Gris
    
    // Nœud normal
    return '#9CA3AF' // Gris clair
  }

  /**
   * Dédupliquer les arêtes (garder une seule direction)
   */
  private deduplicateEdges(edges: GraphEdge[]): GraphEdge[] {
    const seen = new Set<string>()
    const unique: GraphEdge[] = []

    edges.forEach(edge => {
      // Clé unique (ordre croissant pour bidirectionnel)
      const key = edge.from < edge.to 
        ? `${edge.from}->${edge.to}` 
        : `${edge.to}->${edge.from}`

      if (!seen.has(key)) {
        seen.add(key)
        unique.push(edge)
      }
    })

    return unique
  }

  /**
   * Calculer les backlinks pour une note
   */
  getBacklinks(noteId: string, edges: GraphEdge[]): string[] {
    return edges
      .filter(e => e.to === noteId && e.type !== 'backlink')
      .map(e => e.from)
  }

  /**
   * Trouver le chemin le plus court entre deux notes
   */
  shortestPath(fromId: string, toId: string, edges: GraphEdge[]): string[] | null {
    // BFS simple
    const queue: Array<{ id: string; path: string[] }> = [{ id: fromId, path: [fromId] }]
    const visited = new Set<string>([fromId])

    // Construire graphe d'adjacence
    const adjacency = new Map<string, string[]>()
    edges.forEach(edge => {
      if (!adjacency.has(edge.from)) {adjacency.set(edge.from, [])}
      adjacency.get(edge.from)!.push(edge.to)
    })

    while (queue.length > 0) {
      const current = queue.shift()!
      
      if (current.id === toId) {
        return current.path
      }

      const neighbors = adjacency.get(current.id) || []
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor)
          queue.push({
            id: neighbor,
            path: [...current.path, neighbor]
          })
        }
      }
    }

    return null // Pas de chemin
  }
}

export const graphIndexer = new GraphIndexer()
