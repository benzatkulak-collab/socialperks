// ══════════════════════════════════════════════════════════════════════════════
// Social Perks — Social Graph System
// Real graph data structure with PageRank, community detection, and
// collaboration suggestion algorithms
// ══════════════════════════════════════════════════════════════════════════════

// ─── Type Definitions ─────────────────────────────────────────────────────────

/** Node types in the social graph. */
export type NodeType = "influencer" | "business" | "campaign" | "platform" | "niche";

/** Edge types representing relationships between nodes. */
export type EdgeType =
  | "follows"
  | "completed"
  | "launched"
  | "similar_to"
  | "collaborates"
  | "competes"
  | "belongs_to";

/** A node in the social graph. */
export interface GraphNode {
  id: string;
  type: NodeType;
  properties: Record<string, unknown>;
}

/** A directed, weighted edge between two nodes. */
export interface GraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  type: EdgeType;
  weight: number;
  properties: Record<string, unknown>;
  createdAt: string;
}

/** Result of a shortest-path query. */
export interface PathResult {
  nodes: string[];
  edges: GraphEdge[];
  totalWeight: number;
  hops: number;
}

/** Result of a PageRank computation. */
export interface PageRankResult {
  nodeId: string;
  score: number;
  type: NodeType;
}

/** A detected community / cluster of nodes. */
export interface Community {
  id: number;
  members: string[];
  nodeTypes: Record<NodeType, number>;
  size: number;
  density: number;
}

/** A collaboration suggestion between a business and an influencer. */
export interface CollaborationSuggestion {
  businessId: string;
  influencerId: string;
  score: number;
  reasons: string[];
  sharedConnections: string[];
  pathLength: number;
}

/** A subgraph extracted from the full graph. */
export interface Subgraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  nodeCount: number;
  edgeCount: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Social Graph
// ═══════════════════════════════════════════════════════════════════════════════

let edgeIdCounter = 0;

/**
 * Adjacency-list-based social graph with support for typed, weighted,
 * directed edges. Provides traversal, shortest path, PageRank,
 * community detection, and collaboration suggestion algorithms.
 */
export class SocialGraph {
  private nodes: Map<string, GraphNode> = new Map();
  private edgeMap: Map<string, GraphEdge> = new Map();

  /**
   * Adjacency lists: nodeId -> list of edge IDs connected to that node.
   * Both directions are stored for efficient undirected traversal.
   */
  private outEdges: Map<string, Set<string>> = new Map();
  private inEdges: Map<string, Set<string>> = new Map();

  // ── Node Operations ─────────────────────────────────────────────────────────

  /**
   * Add a node to the graph. If a node with the same ID already exists,
   * its type and properties are updated.
   */
  addNode(
    id: string,
    type: NodeType,
    properties: Record<string, unknown> = {}
  ): GraphNode {
    const node: GraphNode = { id, type, properties };
    this.nodes.set(id, node);

    if (!this.outEdges.has(id)) this.outEdges.set(id, new Set());
    if (!this.inEdges.has(id)) this.inEdges.set(id, new Set());

    return node;
  }

  /**
   * Remove a node and all edges connected to it.
   * Returns true if the node existed and was removed.
   */
  removeNode(id: string): boolean {
    if (!this.nodes.has(id)) return false;

    // Collect all edge IDs connected to this node
    const outIds = this.outEdges.get(id) ?? new Set();
    const inIds = this.inEdges.get(id) ?? new Set();
    const allEdgeIds = new Set([...outIds, ...inIds]);

    // Remove each edge from the other endpoint's adjacency lists and the edge map
    for (const edgeId of allEdgeIds) {
      const edge = this.edgeMap.get(edgeId);
      if (!edge) continue;

      const otherId = edge.sourceId === id ? edge.targetId : edge.sourceId;

      this.outEdges.get(otherId)?.delete(edgeId);
      this.inEdges.get(otherId)?.delete(edgeId);
      this.edgeMap.delete(edgeId);
    }

    this.outEdges.delete(id);
    this.inEdges.delete(id);
    this.nodes.delete(id);

    return true;
  }

  /**
   * Get a node by ID. Returns null if not found.
   */
  getNode(id: string): GraphNode | null {
    return this.nodes.get(id) ?? null;
  }

  /**
   * Get all nodes, optionally filtered by type.
   */
  getNodes(type?: NodeType): GraphNode[] {
    const all = [...this.nodes.values()];
    if (!type) return all;
    return all.filter((n) => n.type === type);
  }

  /** Total number of nodes in the graph. */
  get nodeCount(): number {
    return this.nodes.size;
  }

  /** Total number of edges in the graph. */
  get edgeCount(): number {
    return this.edgeMap.size;
  }

  // ── Edge Operations ─────────────────────────────────────────────────────────

  /**
   * Add a directed, weighted edge between two nodes.
   * Both nodes must already exist in the graph.
   */
  addEdge(
    sourceId: string,
    targetId: string,
    type: EdgeType,
    weight: number = 0.5,
    properties: Record<string, unknown> = {}
  ): GraphEdge {
    if (!this.nodes.has(sourceId)) {
      throw new Error(`Source node "${sourceId}" does not exist in the graph.`);
    }
    if (!this.nodes.has(targetId)) {
      throw new Error(`Target node "${targetId}" does not exist in the graph.`);
    }

    edgeIdCounter++;
    const edge: GraphEdge = {
      id: `e_${edgeIdCounter}_${Date.now().toString(36)}`,
      sourceId,
      targetId,
      type,
      weight: Math.max(0, Math.min(1, isNaN(weight) ? 0.5 : weight)),
      properties,
      createdAt: new Date().toISOString(),
    };

    this.edgeMap.set(edge.id, edge);
    this.outEdges.get(sourceId)!.add(edge.id);
    this.inEdges.get(targetId)!.add(edge.id);

    return edge;
  }

  /**
   * Remove an edge by its ID. Returns true if the edge existed and was removed.
   */
  removeEdge(edgeId: string): boolean {
    const edge = this.edgeMap.get(edgeId);
    if (!edge) return false;

    this.outEdges.get(edge.sourceId)?.delete(edgeId);
    this.inEdges.get(edge.targetId)?.delete(edgeId);
    this.edgeMap.delete(edgeId);

    return true;
  }

  /**
   * Get edges connected to a node.
   * @param direction - "out" for outgoing, "in" for incoming, "both" for all
   * @param edgeType - optional filter by edge type
   */
  getEdges(
    nodeId: string,
    direction: "in" | "out" | "both" = "both",
    edgeType?: EdgeType
  ): GraphEdge[] {
    const results: GraphEdge[] = [];

    if (direction === "out" || direction === "both") {
      const outIds = this.outEdges.get(nodeId) ?? new Set();
      for (const eid of outIds) {
        const edge = this.edgeMap.get(eid);
        if (edge && (!edgeType || edge.type === edgeType)) {
          results.push(edge);
        }
      }
    }

    if (direction === "in" || direction === "both") {
      const inIds = this.inEdges.get(nodeId) ?? new Set();
      for (const eid of inIds) {
        const edge = this.edgeMap.get(eid);
        if (edge && (!edgeType || edge.type === edgeType)) {
          results.push(edge);
        }
      }
    }

    return results;
  }

  /**
   * Get all edges between two specific nodes (in either direction).
   */
  getEdgesBetween(nodeA: string, nodeB: string): GraphEdge[] {
    const results: GraphEdge[] = [];
    const outA = this.outEdges.get(nodeA) ?? new Set();
    for (const eid of outA) {
      const edge = this.edgeMap.get(eid);
      if (edge && edge.targetId === nodeB) results.push(edge);
    }
    const outB = this.outEdges.get(nodeB) ?? new Set();
    for (const eid of outB) {
      const edge = this.edgeMap.get(eid);
      if (edge && edge.targetId === nodeA) results.push(edge);
    }
    return results;
  }

  /**
   * Get a specific edge by ID.
   */
  getEdge(edgeId: string): GraphEdge | null {
    return this.edgeMap.get(edgeId) ?? null;
  }

  // ── Neighbor Queries ────────────────────────────────────────────────────────

  /**
   * Get all neighbor nodes of a given node, treating edges as undirected.
   * Optionally filter by edge type. Returns unique neighbor nodes.
   */
  getNeighbors(
    nodeId: string,
    edgeType?: EdgeType,
    nodeType?: NodeType
  ): GraphNode[] {
    if (!this.nodes.has(nodeId)) return [];

    const neighborIds = new Set<string>();

    // Outgoing edges
    const outIds = this.outEdges.get(nodeId) ?? new Set();
    for (const eid of outIds) {
      const edge = this.edgeMap.get(eid);
      if (edge && (!edgeType || edge.type === edgeType)) {
        neighborIds.add(edge.targetId);
      }
    }

    // Incoming edges
    const inIds = this.inEdges.get(nodeId) ?? new Set();
    for (const eid of inIds) {
      const edge = this.edgeMap.get(eid);
      if (edge && (!edgeType || edge.type === edgeType)) {
        neighborIds.add(edge.sourceId);
      }
    }

    neighborIds.delete(nodeId); // Exclude self-loops

    const neighbors: GraphNode[] = [];
    for (const nid of neighborIds) {
      const node = this.nodes.get(nid);
      if (node && (!nodeType || node.type === nodeType)) {
        neighbors.push(node);
      }
    }
    return neighbors;
  }

  /**
   * Get neighbors up to N hops away (BFS multi-hop traversal).
   * Returns unique nodes reachable within the given depth.
   */
  getNeighborsWithDepth(
    nodeId: string,
    depth: number = 1,
    edgeType?: EdgeType
  ): GraphNode[] {
    if (!this.nodes.has(nodeId)) return [];

    const visited = new Set<string>();
    visited.add(nodeId);
    let frontier = [nodeId];

    for (let d = 0; d < depth; d++) {
      const nextFrontier: string[] = [];
      for (const currentId of frontier) {
        const neighbors = this.getNeighborIds(currentId, edgeType);
        for (const nid of neighbors) {
          if (!visited.has(nid)) {
            visited.add(nid);
            nextFrontier.push(nid);
          }
        }
      }
      frontier = nextFrontier;
      if (frontier.length === 0) break;
    }

    visited.delete(nodeId);
    return [...visited]
      .map((id) => this.nodes.get(id))
      .filter((n): n is GraphNode => n !== undefined);
  }

  // ── Graph Algorithms ────────────────────────────────────────────────────────

  /**
   * BFS shortest path between two nodes. Treats edges as undirected.
   * Returns null if no path exists.
   */
  shortestPath(fromId: string, toId: string): PathResult | null {
    if (fromId === toId) {
      if (!this.nodes.has(fromId)) return null;
      return { nodes: [fromId], edges: [], totalWeight: 0, hops: 0 };
    }

    if (!this.nodes.has(fromId) || !this.nodes.has(toId)) return null;

    const visited = new Set<string>();
    visited.add(fromId);

    // BFS queue entries: [nodeId, parent info]
    interface BFSEntry {
      nodeId: string;
      parent: string | null;
      edge: GraphEdge | null;
    }

    const queue: BFSEntry[] = [{ nodeId: fromId, parent: null, edge: null }];
    const parentMap = new Map<string, { parent: string | null; edge: GraphEdge | null }>();
    parentMap.set(fromId, { parent: null, edge: null });

    let found = false;
    let head = 0;

    while (head < queue.length) {
      const current = queue[head++];

      if (current.nodeId === toId) {
        found = true;
        break;
      }

      // Get all adjacent edges (undirected traversal)
      const allEdgeIds = new Set<string>();
      for (const eid of this.outEdges.get(current.nodeId) ?? new Set()) {
        allEdgeIds.add(eid);
      }
      for (const eid of this.inEdges.get(current.nodeId) ?? new Set()) {
        allEdgeIds.add(eid);
      }

      for (const eid of allEdgeIds) {
        const edge = this.edgeMap.get(eid);
        if (!edge) continue;

        const neighborId =
          edge.sourceId === current.nodeId ? edge.targetId : edge.sourceId;

        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          parentMap.set(neighborId, { parent: current.nodeId, edge });
          queue.push({ nodeId: neighborId, parent: current.nodeId, edge });
        }
      }
    }

    if (!found) return null;

    // Reconstruct path
    const pathNodes: string[] = [];
    const pathEdges: GraphEdge[] = [];
    let totalWeight = 0;
    let current: string | null = toId;

    while (current !== null) {
      pathNodes.unshift(current);
      const entry = parentMap.get(current);
      if (entry?.edge) {
        pathEdges.unshift(entry.edge);
        totalWeight += entry.edge.weight;
      }
      current = entry?.parent ?? null;
    }

    return {
      nodes: pathNodes,
      edges: pathEdges,
      totalWeight,
      hops: pathEdges.length,
    };
  }

  /**
   * Find all nodes in the connected component containing the given node.
   * Uses BFS, treating all edges as undirected.
   */
  getConnectedComponent(nodeId: string): GraphNode[] {
    if (!this.nodes.has(nodeId)) return [];

    const visited = new Set<string>();
    const queue = [nodeId];
    visited.add(nodeId);
    let head = 0;

    while (head < queue.length) {
      const current = queue[head++];
      const neighbors = this.getNeighborIds(current);
      for (const nid of neighbors) {
        if (!visited.has(nid)) {
          visited.add(nid);
          queue.push(nid);
        }
      }
    }

    return [...visited]
      .map((id) => this.nodes.get(id))
      .filter((n): n is GraphNode => n !== undefined);
  }

  /**
   * Compute PageRank scores for all nodes in the graph.
   * Uses the power iteration method.
   *
   * @param dampingFactor - Probability of following a link (default 0.85)
   * @param iterations - Number of power iterations (default 50)
   * @param tolerance - Convergence tolerance (default 1e-6)
   */
  pageRank(
    dampingFactor: number = 0.85,
    iterations: number = 50,
    tolerance: number = 1e-6
  ): PageRankResult[] {
    const n = this.nodes.size;
    if (n === 0) return [];

    const nodeIds = [...this.nodes.keys()];
    const nodeIdToIdx = new Map<string, number>();
    nodeIds.forEach((id, i) => nodeIdToIdx.set(id, i));

    // Initialize scores uniformly
    let scores = new Float64Array(n).fill(1 / n);
    let newScores = new Float64Array(n);

    // Precompute outgoing edge structure:
    // For each node, collect (targetIdx, weight) pairs and total outgoing weight
    const outLinks: Array<Array<{ targetIdx: number; weight: number }>> = new Array(n);
    const totalOutWeight = new Float64Array(n);

    for (let i = 0; i < n; i++) {
      outLinks[i] = [];
      const outIds = this.outEdges.get(nodeIds[i]) ?? new Set();
      for (const eid of outIds) {
        const edge = this.edgeMap.get(eid);
        if (edge) {
          const targetIdx = nodeIdToIdx.get(edge.targetId);
          if (targetIdx !== undefined) {
            outLinks[i].push({ targetIdx, weight: edge.weight });
            totalOutWeight[i] += edge.weight;
          }
        }
      }
    }

    // Power iteration
    for (let iter = 0; iter < iterations; iter++) {
      newScores.fill(0);

      // Distribute rank along outgoing edges
      for (let i = 0; i < n; i++) {
        if (totalOutWeight[i] === 0) {
          // Dangling node: distribute rank uniformly
          const share = scores[i] / n;
          for (let j = 0; j < n; j++) {
            newScores[j] += dampingFactor * share;
          }
        } else {
          for (const link of outLinks[i]) {
            newScores[link.targetIdx] +=
              dampingFactor * scores[i] * (link.weight / totalOutWeight[i]);
          }
        }
      }

      // Add teleportation probability
      const teleport = (1 - dampingFactor) / n;
      for (let j = 0; j < n; j++) {
        newScores[j] += teleport;
      }

      // Check convergence
      let diff = 0;
      for (let j = 0; j < n; j++) {
        diff += Math.abs(newScores[j] - scores[j]);
      }

      // Swap buffers
      const tmp = scores;
      scores = newScores;
      newScores = tmp;

      if (diff < tolerance) break;
    }

    // Build results sorted by score descending
    const results: PageRankResult[] = nodeIds.map((id, i) => ({
      nodeId: id,
      score: scores[i],
      type: this.nodes.get(id)!.type,
    }));

    results.sort((a, b) => b.score - a.score);
    return results;
  }

  /**
   * Community detection using label propagation algorithm.
   * Iteratively assigns each node the label most common among its neighbors
   * (weighted by edge weight), until convergence or max iterations.
   *
   * @param maxIterations - Maximum number of iterations (default 30)
   */
  communityDetection(maxIterations: number = 30): Community[] {
    const n = this.nodes.size;
    if (n === 0) return [];

    const nodeIds = [...this.nodes.keys()];

    // Initialize: each node is its own community (label = index)
    const labels = new Map<string, number>();
    nodeIds.forEach((id, i) => labels.set(id, i));

    for (let iter = 0; iter < maxIterations; iter++) {
      let changed = false;

      // Process nodes in random order to avoid oscillation
      const shuffled = [...nodeIds];
      for (let i = shuffled.length - 1; i > 0; i--) {
        // Deterministic shuffle based on iteration to ensure reproducibility
        const j = (fnv1aHashSimple(`${iter}_${i}`) % (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      for (const nodeId of shuffled) {
        const neighborIds = this.getNeighborIds(nodeId);
        if (neighborIds.length === 0) continue;

        // Count weighted label frequencies among neighbors
        const labelWeights = new Map<number, number>();

        for (const nid of neighborIds) {
          const nLabel = labels.get(nid)!;
          // Get edge weight between nodeId and neighbor
          const edges = this.getEdgesBetween(nodeId, nid);
          const maxWeight = edges.length > 0
            ? Math.max(...edges.map((e) => e.weight))
            : 0.5;
          labelWeights.set(nLabel, (labelWeights.get(nLabel) ?? 0) + maxWeight);
        }

        // Find the label with the highest total weight
        let bestLabel = labels.get(nodeId)!;
        let bestWeight = -1;
        for (const [label, weight] of labelWeights) {
          if (weight > bestWeight) {
            bestWeight = weight;
            bestLabel = label;
          }
        }

        if (bestLabel !== labels.get(nodeId)) {
          labels.set(nodeId, bestLabel);
          changed = true;
        }
      }

      if (!changed) break;
    }

    // Group nodes by label
    const communityMap = new Map<number, string[]>();
    for (const [nodeId, label] of labels) {
      if (!communityMap.has(label)) communityMap.set(label, []);
      communityMap.get(label)!.push(nodeId);
    }

    // Build community objects
    const communities: Community[] = [];
    let communityId = 0;

    for (const [, members] of communityMap) {
      if (members.length === 0) continue;

      // Count node types in this community
      const nodeTypes: Record<NodeType, number> = {
        influencer: 0,
        business: 0,
        campaign: 0,
        platform: 0,
        niche: 0,
      };
      for (const mid of members) {
        const node = this.nodes.get(mid);
        if (node) nodeTypes[node.type]++;
      }

      // Calculate density: ratio of actual edges to possible edges within community
      const memberSet = new Set(members);
      let internalEdges = 0;
      for (const mid of members) {
        const outIds = this.outEdges.get(mid) ?? new Set();
        for (const eid of outIds) {
          const edge = this.edgeMap.get(eid);
          if (edge && memberSet.has(edge.targetId)) {
            internalEdges++;
          }
        }
      }
      const possibleEdges = members.length * (members.length - 1);
      const density = possibleEdges > 0 ? internalEdges / possibleEdges : 0;

      communities.push({
        id: communityId++,
        members,
        nodeTypes,
        size: members.length,
        density,
      });
    }

    // Sort by size descending
    communities.sort((a, b) => b.size - a.size);
    return communities;
  }

  // ── Domain-Specific Queries ─────────────────────────────────────────────────

  /**
   * Build a subgraph containing only influencer nodes and the edges
   * between them (follows, similar_to, collaborates).
   */
  getInfluencerGraph(): Subgraph {
    const influencerEdgeTypes: EdgeType[] = ["follows", "similar_to", "collaborates"];
    const influencerNodes = this.getNodes("influencer");
    const influencerIds = new Set(influencerNodes.map((n) => n.id));

    const subEdges: GraphEdge[] = [];
    const includedEdgeIds = new Set<string>();

    for (const node of influencerNodes) {
      const outIds = this.outEdges.get(node.id) ?? new Set();
      for (const eid of outIds) {
        if (includedEdgeIds.has(eid)) continue;
        const edge = this.edgeMap.get(eid);
        if (
          edge &&
          influencerEdgeTypes.includes(edge.type) &&
          influencerIds.has(edge.targetId)
        ) {
          subEdges.push(edge);
          includedEdgeIds.add(eid);
        }
      }

      const inIds = this.inEdges.get(node.id) ?? new Set();
      for (const eid of inIds) {
        if (includedEdgeIds.has(eid)) continue;
        const edge = this.edgeMap.get(eid);
        if (
          edge &&
          influencerEdgeTypes.includes(edge.type) &&
          influencerIds.has(edge.sourceId)
        ) {
          subEdges.push(edge);
          includedEdgeIds.add(eid);
        }
      }
    }

    return {
      nodes: influencerNodes,
      edges: subEdges,
      nodeCount: influencerNodes.length,
      edgeCount: subEdges.length,
    };
  }

  /**
   * Use graph structure to suggest business-influencer collaborations.
   *
   * Scoring factors:
   * 1. Shared connections (common neighbors between business and influencer)
   * 2. Path length (shorter = more relevant)
   * 3. Node importance (PageRank of the influencer)
   * 4. Edge weight strength of connections
   * 5. Niche/industry overlap from node properties
   */
  getCollaborationSuggestions(
    businessId: string,
    maxSuggestions: number = 10
  ): CollaborationSuggestion[] {
    const business = this.nodes.get(businessId);
    if (!business || business.type !== "business") return [];

    // Get all influencer nodes
    const influencers = this.getNodes("influencer");
    if (influencers.length === 0) return [];

    // Get business neighbors for shared-connection scoring
    const businessNeighborIds = new Set(
      this.getNeighborIds(businessId)
    );

    // Compute PageRank for importance scoring
    const pageRankResults = this.pageRank(0.85, 20, 1e-4);
    const pageRankMap = new Map<string, number>();
    for (const pr of pageRankResults) {
      pageRankMap.set(pr.nodeId, pr.score);
    }
    const maxPageRank = pageRankResults.length > 0 ? pageRankResults[0].score : 1;

    const suggestions: CollaborationSuggestion[] = [];

    for (const influencer of influencers) {
      // Skip if already directly connected via "collaborates" edge
      const existingCollabs = this.getEdgesBetween(businessId, influencer.id)
        .filter((e) => e.type === "collaborates");
      if (existingCollabs.length > 0) continue;

      // Factor 1: Shared connections
      const influencerNeighborIds = new Set(this.getNeighborIds(influencer.id));
      const sharedConnections: string[] = [];
      for (const nid of businessNeighborIds) {
        if (influencerNeighborIds.has(nid)) {
          sharedConnections.push(nid);
        }
      }
      const sharedScore = Math.min(1, sharedConnections.length / 5);

      // Factor 2: Path length (shorter = better)
      const path = this.shortestPath(businessId, influencer.id);
      const pathLength = path ? path.hops : Infinity;
      const pathScore = pathLength === Infinity ? 0 : Math.max(0, 1 - (pathLength - 1) / 6);

      // Factor 3: PageRank importance
      const prScore = maxPageRank > 0
        ? (pageRankMap.get(influencer.id) ?? 0) / maxPageRank
        : 0;

      // Factor 4: Edge weight strength of existing connections
      const influencerEdges = this.getEdges(influencer.id);
      const avgWeight = influencerEdges.length > 0
        ? influencerEdges.reduce((s, e) => s + e.weight, 0) / influencerEdges.length
        : 0;

      // Factor 5: Niche/industry overlap
      const bizIndustry = ((business.properties.industry as string) ?? "").toLowerCase();
      const bizType = ((business.properties.type as string) ?? "").toLowerCase();
      const infNiches: string[] = (influencer.properties.niches as string[]) ?? [];
      let nicheOverlap = 0;
      for (const niche of infNiches) {
        if (bizIndustry.includes(niche.toLowerCase()) || bizType.includes(niche.toLowerCase())) {
          nicheOverlap++;
        }
      }
      const nicheScore = Math.min(1, nicheOverlap / Math.max(1, infNiches.length));

      // Composite score (weighted combination)
      const score =
        0.25 * sharedScore +
        0.20 * pathScore +
        0.15 * prScore +
        0.15 * avgWeight +
        0.25 * nicheScore;

      if (score <= 0) continue;

      // Generate reasons
      const reasons: string[] = [];
      if (sharedConnections.length > 0) {
        reasons.push(`${sharedConnections.length} shared connection(s) in the network`);
      }
      if (pathLength !== Infinity && pathLength <= 3) {
        reasons.push(`Only ${pathLength} hop(s) away in the graph`);
      }
      if (prScore > 0.5) {
        reasons.push("High influence score (PageRank) in the network");
      }
      if (nicheOverlap > 0) {
        reasons.push(`${nicheOverlap} niche(s) overlap with business industry`);
      }
      if (avgWeight > 0.7) {
        reasons.push("Strong existing relationships with other nodes");
      }
      if (reasons.length === 0) {
        reasons.push("Potential match based on network proximity");
      }

      suggestions.push({
        businessId,
        influencerId: influencer.id,
        score,
        reasons,
        sharedConnections,
        pathLength: pathLength === Infinity ? -1 : pathLength,
      });
    }

    // Sort by score descending
    suggestions.sort((a, b) => b.score - a.score);
    return suggestions.slice(0, maxSuggestions);
  }

  // ── Utility Methods ─────────────────────────────────────────────────────────

  /**
   * Get the degree (number of connections) of a node.
   * @param direction - "out" for out-degree, "in" for in-degree, "both" for total
   */
  getDegree(nodeId: string, direction: "in" | "out" | "both" = "both"): number {
    let degree = 0;
    if (direction === "out" || direction === "both") {
      degree += (this.outEdges.get(nodeId)?.size ?? 0);
    }
    if (direction === "in" || direction === "both") {
      degree += (this.inEdges.get(nodeId)?.size ?? 0);
    }
    return degree;
  }

  /**
   * Check whether two nodes are directly connected (by any edge).
   */
  areConnected(nodeA: string, nodeB: string): boolean {
    return this.getEdgesBetween(nodeA, nodeB).length > 0;
  }

  /**
   * Clear the entire graph.
   */
  clear(): void {
    this.nodes.clear();
    this.edgeMap.clear();
    this.outEdges.clear();
    this.inEdges.clear();
  }

  /**
   * Export the graph as a plain object for serialization.
   */
  toJSON(): { nodes: GraphNode[]; edges: GraphEdge[] } {
    return {
      nodes: [...this.nodes.values()],
      edges: [...this.edgeMap.values()],
    };
  }

  /**
   * Import a graph from a plain object (e.g., parsed from JSON).
   * Clears the existing graph first.
   */
  fromJSON(data: { nodes: GraphNode[]; edges: GraphEdge[] }): void {
    this.clear();
    for (const node of data.nodes) {
      this.addNode(node.id, node.type, node.properties);
    }
    for (const edge of data.edges) {
      // Re-add edges using internal method to rebuild adjacency lists
      if (this.nodes.has(edge.sourceId) && this.nodes.has(edge.targetId)) {
        this.edgeMap.set(edge.id, edge);
        this.outEdges.get(edge.sourceId)!.add(edge.id);
        this.inEdges.get(edge.targetId)!.add(edge.id);
      }
    }
  }

  // ── Private Helpers ─────────────────────────────────────────────────────────

  /**
   * Get neighbor node IDs (both directions, treating edges as undirected).
   */
  private getNeighborIds(nodeId: string, edgeType?: EdgeType): string[] {
    const neighborIds = new Set<string>();

    const outIds = this.outEdges.get(nodeId) ?? new Set();
    for (const eid of outIds) {
      const edge = this.edgeMap.get(eid);
      if (edge && (!edgeType || edge.type === edgeType)) {
        neighborIds.add(edge.targetId);
      }
    }

    const inIds = this.inEdges.get(nodeId) ?? new Set();
    for (const eid of inIds) {
      const edge = this.edgeMap.get(eid);
      if (edge && (!edgeType || edge.type === edgeType)) {
        neighborIds.add(edge.sourceId);
      }
    }

    neighborIds.delete(nodeId);
    return [...neighborIds];
  }
}

// ─── Simple Hash (used by community detection shuffle) ────────────────────────

function fnv1aHashSimple(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Exports
// ═══════════════════════════════════════════════════════════════════════════════

/** Shared singleton instance for convenience. */
export const socialGraph = new SocialGraph();
