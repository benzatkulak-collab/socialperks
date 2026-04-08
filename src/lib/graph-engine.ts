// ══════════════════════════════════════════════════════════════════════════════
// Social Perks — Social Graph & Relationship Engine
// Future-proofing foundation for network effects and social intelligence
// ══════════════════════════════════════════════════════════════════════════════

// ─── Type Definitions ───────────────────────────────────────────────────────

export type NodeType =
  | "business"
  | "influencer"
  | "customer"
  | "campaign"
  | "platform";

export type EdgeType =
  | "completed_campaign" // customer -> campaign
  | "launched_campaign" // business -> campaign
  | "participated_in" // influencer -> campaign
  | "referred_by" // customer -> customer
  | "follows" // customer -> business (on social)
  | "reviewed" // customer -> business
  | "located_near" // business -> business
  | "same_niche" // influencer -> influencer
  | "cross_promoted"; // business -> business

export interface GraphNode {
  id: string;
  type: NodeType;
  properties: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  type: EdgeType;
  /** Strength of connection from 0 to 1. */
  weight: number;
  properties: Record<string, unknown>;
  createdAt: string;
}

// ─── Path Result ────────────────────────────────────────────────────────────

export interface PathResult {
  nodes: string[];
  edges: GraphEdge[];
  totalWeight: number;
}

// ─── Community Result ───────────────────────────────────────────────────────

export interface CommunityResult {
  centerId: string;
  members: GraphNode[];
  edges: GraphEdge[];
  density: number;
}

// ─── Growth Metrics ─────────────────────────────────────────────────────────

export interface GrowthMetrics {
  period: { since: string; until: string };
  newNodes: number;
  newEdges: number;
  nodeGrowthRate: number;
  edgeGrowthRate: number;
  totalNodes: number;
  totalEdges: number;
}

// ─── Social Graph ───────────────────────────────────────────────────────────

let edgeCounter = 0;

class SocialGraph {
  private nodes: Map<string, GraphNode> = new Map();
  private edges: GraphEdge[] = [];
  /** Adjacency list: nodeId -> edges connected to that node (in or out). */
  private adjacency: Map<string, GraphEdge[]> = new Map();
  // ── Node Operations ─────────────────────────────────────────────────────

  /** Add a node to the graph. If a node with the same ID exists, it is overwritten. */
  addNode(id: string, type: NodeType, properties: Record<string, unknown> = {}): GraphNode {
    const node: GraphNode = { id, type, properties };
    this.nodes.set(id, node);
    if (!this.adjacency.has(id)) {
      this.adjacency.set(id, []);
    }
    return node;
  }

  /** Get a node by ID, or null if not found. */
  getNode(id: string): GraphNode | null {
    return this.nodes.get(id) ?? null;
  }

  /** Remove a node and all edges connected to it. */
  removeNode(id: string): boolean {
    if (!this.nodes.has(id)) return false;

    // Collect edges connected to this node
    const connectedEdges = this.adjacency.get(id) ?? [];
    const edgeIdsToRemove = new Set(connectedEdges.map((e) => e.id));

    // Remove from global edge list
    this.edges = this.edges.filter((e) => !edgeIdsToRemove.has(e.id));

    // Remove from adjacency lists of other nodes
    for (const edge of connectedEdges) {
      const otherId = edge.from === id ? edge.to : edge.from;
      const otherEdges = this.adjacency.get(otherId);
      if (otherEdges) {
        this.adjacency.set(
          otherId,
          otherEdges.filter((e) => !edgeIdsToRemove.has(e.id))
        );
      }
    }

    // Remove the node itself
    this.adjacency.delete(id);
    this.nodes.delete(id);
    return true;
  }

  /** Get all nodes, optionally filtered by type. */
  getNodes(type?: NodeType): GraphNode[] {
    const all = [...this.nodes.values()];
    return type ? all.filter((n) => n.type === type) : all;
  }

  // ── Edge Operations ─────────────────────────────────────────────────────

  /** Create an edge between two nodes. Both nodes must already exist. */
  addEdge(
    from: string,
    to: string,
    type: EdgeType,
    weight: number = 0.5,
    properties: Record<string, unknown> = {}
  ): GraphEdge {
    if (!this.nodes.has(from)) {
      throw new Error(`Source node "${from}" does not exist.`);
    }
    if (!this.nodes.has(to)) {
      throw new Error(`Target node "${to}" does not exist.`);
    }

    edgeCounter++;
    const edge: GraphEdge = {
      id: `edge_${edgeCounter}_${Date.now().toString(36)}`,
      from,
      to,
      type,
      weight: Math.max(0, Math.min(1, isNaN(weight) ? 0.5 : weight)),
      properties,
      createdAt: new Date().toISOString(),
    };

    this.edges.push(edge);

    // Add to adjacency lists for both endpoints
    if (!this.adjacency.has(from)) this.adjacency.set(from, []);
    if (!this.adjacency.has(to)) this.adjacency.set(to, []);
    this.adjacency.get(from)!.push(edge);
    this.adjacency.get(to)!.push(edge);

    return edge;
  }

  /**
   * Get edges connected to a node, optionally filtered by direction.
   * - "out": edges where the node is the source
   * - "in":  edges where the node is the target
   * - "both" (default): all connected edges
   */
  getEdges(nodeId: string, direction: "in" | "out" | "both" = "both"): GraphEdge[] {
    const all = this.adjacency.get(nodeId) ?? [];
    if (direction === "both") return [...all];
    if (direction === "out") return all.filter((e) => e.from === nodeId);
    return all.filter((e) => e.to === nodeId);
  }

  /** Get all edges between two specific nodes. */
  getEdgesBetween(nodeA: string, nodeB: string): GraphEdge[] {
    const aEdges = this.adjacency.get(nodeA) ?? [];
    return aEdges.filter(
      (e) =>
        (e.from === nodeA && e.to === nodeB) ||
        (e.from === nodeB && e.to === nodeA)
    );
  }

  /** Remove a specific edge by ID. */
  removeEdge(edgeId: string): boolean {
    const idx = this.edges.findIndex((e) => e.id === edgeId);
    if (idx === -1) return false;

    const edge = this.edges[idx];
    this.edges.splice(idx, 1);

    // Remove from adjacency of both endpoints
    for (const nodeId of [edge.from, edge.to]) {
      const adj = this.adjacency.get(nodeId);
      if (adj) {
        this.adjacency.set(
          nodeId,
          adj.filter((e) => e.id !== edgeId)
        );
      }
    }
    return true;
  }

  // ── Graph Queries ───────────────────────────────────────────────────────

  /**
   * Get neighbor nodes within N hops, optionally filtering by edge type.
   * Returns unique nodes reachable from the start node.
   */
  getNeighbors(
    nodeId: string,
    depth: number = 1,
    edgeTypes?: EdgeType[]
  ): GraphNode[] {
    const visited = new Set<string>();
    visited.add(nodeId);

    let frontier = [nodeId];

    for (let d = 0; d < depth; d++) {
      const nextFrontier: string[] = [];
      for (const currentId of frontier) {
        const edges = this.adjacency.get(currentId) ?? [];
        for (const edge of edges) {
          if (edgeTypes && !edgeTypes.includes(edge.type)) continue;
          const neighborId = edge.from === currentId ? edge.to : edge.from;
          if (!visited.has(neighborId)) {
            visited.add(neighborId);
            nextFrontier.push(neighborId);
          }
        }
      }
      frontier = nextFrontier;
      if (frontier.length === 0) break;
    }

    // Remove the start node from results
    visited.delete(nodeId);
    return [...visited]
      .map((id) => this.nodes.get(id))
      .filter((n): n is GraphNode => n !== undefined);
  }

  /**
   * BFS shortest path between two nodes. Returns null if no path exists.
   * The path includes both endpoints.
   */
  shortestPath(from: string, to: string): PathResult | null {
    if (from === to) {
      const node = this.nodes.get(from);
      return node ? { nodes: [from], edges: [], totalWeight: 0 } : null;
    }

    if (!this.nodes.has(from) || !this.nodes.has(to)) return null;

    // BFS with parent tracking
    const visited = new Set<string>();
    visited.add(from);

    // Each entry stores: [nodeId, parentNodeId, edgeUsed]
    const queue: Array<{ nodeId: string; parent: string | null; edge: GraphEdge | null }> = [
      { nodeId: from, parent: null, edge: null },
    ];
    const parentMap = new Map<
      string,
      { parent: string | null; edge: GraphEdge | null }
    >();
    parentMap.set(from, { parent: null, edge: null });

    let found = false;
    let head = 0;

    while (head < queue.length) {
      const current = queue[head++];

      if (current.nodeId === to) {
        found = true;
        break;
      }

      const edges = this.adjacency.get(current.nodeId) ?? [];
      for (const edge of edges) {
        const neighborId =
          edge.from === current.nodeId ? edge.to : edge.from;
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          parentMap.set(neighborId, {
            parent: current.nodeId,
            edge,
          });
          queue.push({ nodeId: neighborId, parent: current.nodeId, edge });
        }
      }
    }

    if (!found) return null;

    // Reconstruct path
    const pathNodes: string[] = [];
    const pathEdges: GraphEdge[] = [];
    let totalWeight = 0;
    let current: string | null = to;

    while (current !== null) {
      pathNodes.unshift(current);
      const entry = parentMap.get(current);
      if (entry?.edge) {
        pathEdges.unshift(entry.edge);
        totalWeight += entry.edge.weight;
      }
      current = entry?.parent ?? null;
    }

    return { nodes: pathNodes, edges: pathEdges, totalWeight };
  }

  /**
   * Get all nodes in the connected component containing the given node.
   * Uses BFS to traverse all reachable nodes regardless of edge direction.
   */
  getConnectedComponent(nodeId: string): GraphNode[] {
    if (!this.nodes.has(nodeId)) return [];

    const visited = new Set<string>();
    const queue = [nodeId];
    visited.add(nodeId);

    let head = 0;
    while (head < queue.length) {
      const current = queue[head++];
      const edges = this.adjacency.get(current) ?? [];
      for (const edge of edges) {
        const neighborId = edge.from === current ? edge.to : edge.from;
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          queue.push(neighborId);
        }
      }
    }

    return [...visited]
      .map((id) => this.nodes.get(id))
      .filter((n): n is GraphNode => n !== undefined);
  }

  // ── Social Network Analysis ─────────────────────────────────────────────

  /**
   * Compute an influence score for a node based on its connections and edge
   * weights. This is a simplified PageRank-like algorithm that considers:
   * - Number of inbound connections
   * - Average weight of connections
   * - Type diversity of connections
   * - Depth of reach (2-hop neighborhood size)
   *
   * Returns a score from 0 to 100.
   */
  getInfluenceScore(nodeId: string): number {
    if (!this.nodes.has(nodeId)) return 0;

    const inEdges = this.getEdges(nodeId, "in");
    const outEdges = this.getEdges(nodeId, "out");
    const allEdges = this.getEdges(nodeId, "both");

    if (allEdges.length === 0) return 0;

    // Factor 1: Inbound connection count (max 30 points)
    const inboundScore = Math.min(30, inEdges.length * 3);

    // Factor 2: Average edge weight (max 20 points)
    const avgWeight =
      allEdges.reduce((sum, e) => sum + e.weight, 0) / allEdges.length;
    const weightScore = avgWeight * 20;

    // Factor 3: Edge type diversity (max 20 points)
    const edgeTypes = new Set(allEdges.map((e) => e.type));
    const diversityScore = Math.min(20, edgeTypes.size * 4);

    // Factor 4: Two-hop reach (max 30 points)
    const twoHopNeighbors = this.getNeighbors(nodeId, 2);
    const reachScore = Math.min(30, twoHopNeighbors.length * 0.5);

    // Factor 5: Balance between in and out (bonus up to 5 points)
    // Nodes that both receive and create connections are more influential
    const balance =
      allEdges.length > 0
        ? 1 - Math.abs(inEdges.length - outEdges.length) / allEdges.length
        : 0;
    const balanceBonus = balance * 5;

    const raw =
      inboundScore + weightScore + diversityScore + reachScore + balanceBonus;

    return Math.min(100, Math.round(raw * 100) / 100);
  }

  /**
   * Trace the referral chain for a customer.
   * Follows "referred_by" edges backwards to find who referred whom.
   */
  getReferralChain(customerId: string): GraphNode[] {
    const chain: GraphNode[] = [];
    const visited = new Set<string>();
    let current = customerId;

    // Walk backwards along referred_by edges
    while (current && !visited.has(current)) {
      visited.add(current);
      const node = this.nodes.get(current);
      if (node) chain.push(node);

      // Find who referred this customer
      const referralEdges = this.getEdges(current, "out").filter(
        (e) => e.type === "referred_by"
      );
      if (referralEdges.length === 0) break;
      current = referralEdges[0].to;
    }

    return chain;
  }

  /**
   * Get a community cluster around a node. Uses a simple approach:
   * finds the 1-hop neighborhood and keeps only nodes that are densely
   * interconnected (have edges to at least 30% of other community members).
   */
  getCommunity(nodeId: string): CommunityResult {
    if (!this.nodes.has(nodeId)) {
      return { centerId: nodeId, members: [], edges: [], density: 0 };
    }

    // Start with 1-hop neighbors
    const neighbors = this.getNeighbors(nodeId, 1);
    const centerNode = this.nodes.get(nodeId)!;
    const candidates = [centerNode, ...neighbors];
    const candidateIds = new Set(candidates.map((n) => n.id));

    // Filter: keep only nodes connected to at least 30% of other candidates
    const threshold = Math.max(1, Math.floor(candidates.length * 0.3));
    const members = candidates.filter((node) => {
      const edges = this.adjacency.get(node.id) ?? [];
      const connectionsInCommunity = edges.filter((e) => {
        const otherId = e.from === node.id ? e.to : e.from;
        return candidateIds.has(otherId) && otherId !== node.id;
      }).length;
      return connectionsInCommunity >= threshold || node.id === nodeId;
    });

    const memberIds = new Set(members.map((m) => m.id));

    // Collect internal edges
    const communityEdges = this.edges.filter(
      (e) => memberIds.has(e.from) && memberIds.has(e.to)
    );

    // Density = actual edges / possible edges
    const n = members.length;
    const possibleEdges = n > 1 ? (n * (n - 1)) / 2 : 0;
    const density = possibleEdges > 0 ? communityEdges.length / possibleEdges : 0;

    return {
      centerId: nodeId,
      members,
      edges: communityEdges,
      density: Math.round(density * 1000) / 1000,
    };
  }

  // ── Business Intelligence ───────────────────────────────────────────────

  /**
   * Estimate the viral potential of a campaign based on its participants'
   * social graphs. Looks at:
   * - Total unique reach through participant networks
   * - Average influence score of participants
   * - Network density among participants
   */
  getViralPotential(campaignId: string): {
    score: number;
    uniqueReach: number;
    avgInfluence: number;
    participantCount: number;
    networkDensity: number;
  } {
    // Find all nodes connected to this campaign
    const campaignEdges = this.getEdges(campaignId, "in");
    const participantIds = campaignEdges.map((e) => e.from);

    if (participantIds.length === 0) {
      return {
        score: 0,
        uniqueReach: 0,
        avgInfluence: 0,
        participantCount: 0,
        networkDensity: 0,
      };
    }

    // Unique reach: all 2-hop neighbors of participants (deduplicated)
    const reachSet = new Set<string>();
    let totalInfluence = 0;

    for (const pid of participantIds) {
      const neighbors = this.getNeighbors(pid, 2);
      for (const neighbor of neighbors) {
        reachSet.add(neighbor.id);
      }
      totalInfluence += this.getInfluenceScore(pid);
    }

    // Remove the campaign itself and participants from reach
    reachSet.delete(campaignId);
    for (const pid of participantIds) reachSet.delete(pid);

    const avgInfluence = totalInfluence / participantIds.length;

    // Network density among participants
    const participantSet = new Set(participantIds);
    let internalEdges = 0;
    for (const pid of participantIds) {
      const edges = this.adjacency.get(pid) ?? [];
      for (const edge of edges) {
        const otherId = edge.from === pid ? edge.to : edge.from;
        if (participantSet.has(otherId) && otherId !== pid) {
          internalEdges++;
        }
      }
    }
    // Each edge counted twice (from both endpoints)
    internalEdges = Math.floor(internalEdges / 2);
    const possibleEdges =
      participantIds.length > 1
        ? (participantIds.length * (participantIds.length - 1)) / 2
        : 0;
    const networkDensity =
      possibleEdges > 0 ? internalEdges / possibleEdges : 0;

    // Viral score: weighted combination
    const reachFactor = Math.min(40, reachSet.size * 0.4);
    const influenceFactor = Math.min(30, avgInfluence * 0.3);
    const densityFactor = networkDensity * 20;
    const participantFactor = Math.min(10, participantIds.length);

    const score = Math.min(
      100,
      Math.round(
        (reachFactor + influenceFactor + densityFactor + participantFactor) * 100
      ) / 100
    );

    return {
      score,
      uniqueReach: reachSet.size,
      avgInfluence: Math.round(avgInfluence * 100) / 100,
      participantCount: participantIds.length,
      networkDensity: Math.round(networkDensity * 1000) / 1000,
    };
  }

  /**
   * Find potential cross-promotion partners for a business.
   * Looks for other businesses that share customers or are in the same area.
   */
  findCrossPromotionPartners(
    businessId: string,
    limit: number = 10
  ): Array<{
    business: GraphNode;
    sharedCustomers: number;
    connectionStrength: number;
    existingRelationship: boolean;
  }> {
    if (!this.nodes.has(businessId)) return [];

    const businessNode = this.nodes.get(businessId)!;
    if (businessNode.type !== "business") return [];

    // Find all customers of this business
    const customerEdges = this.getEdges(businessId, "in").filter(
      (e) =>
        e.type === "follows" ||
        e.type === "reviewed" ||
        e.type === "completed_campaign"
    );
    const myCustomerIds = new Set(customerEdges.map((e) => e.from));

    // Check for existing cross-promotion relationships
    const existingPartnerIds = new Set(
      this.getEdges(businessId, "both")
        .filter(
          (e) => e.type === "cross_promoted" || e.type === "located_near"
        )
        .map((e) => (e.from === businessId ? e.to : e.from))
    );

    // For each other business, count shared customers
    const otherBusinesses = this.getNodes("business").filter(
      (b) => b.id !== businessId
    );

    const candidates: Array<{
      business: GraphNode;
      sharedCustomers: number;
      connectionStrength: number;
      existingRelationship: boolean;
    }> = [];

    for (const other of otherBusinesses) {
      const otherCustomerEdges = this.getEdges(other.id, "in").filter(
        (e) =>
          e.type === "follows" ||
          e.type === "reviewed" ||
          e.type === "completed_campaign"
      );
      const otherCustomerIds = new Set(otherCustomerEdges.map((e) => e.from));

      // Count overlap
      let shared = 0;
      for (const cid of myCustomerIds) {
        if (otherCustomerIds.has(cid)) shared++;
      }

      // Connection strength: Jaccard similarity of customer sets
      const unionSize = new Set([...myCustomerIds, ...otherCustomerIds]).size;
      const connectionStrength = unionSize > 0 ? shared / unionSize : 0;

      if (shared > 0 || existingPartnerIds.has(other.id)) {
        candidates.push({
          business: other,
          sharedCustomers: shared,
          connectionStrength: Math.round(connectionStrength * 1000) / 1000,
          existingRelationship: existingPartnerIds.has(other.id),
        });
      }
    }

    // Sort by shared customers descending, then by connection strength
    candidates.sort((a, b) => {
      if (b.sharedCustomers !== a.sharedCustomers) {
        return b.sharedCustomers - a.sharedCustomers;
      }
      return b.connectionStrength - a.connectionStrength;
    });

    return candidates.slice(0, limit);
  }

  /**
   * Calculate unique audience reach for an influencer, accounting for overlap
   * with other influencers in the graph.
   */
  getInfluencerReach(influencerId: string): {
    directFollowers: number;
    uniqueReach: number;
    overlapPercentage: number;
    topOverlaps: Array<{ influencerId: string; overlap: number }>;
  } {
    if (!this.nodes.has(influencerId)) {
      return {
        directFollowers: 0,
        uniqueReach: 0,
        overlapPercentage: 0,
        topOverlaps: [],
      };
    }

    // Direct followers: nodes that follow this influencer
    const followerEdges = this.getEdges(influencerId, "in").filter(
      (e) => e.type === "follows"
    );
    const myFollowerIds = new Set(followerEdges.map((e) => e.from));

    // Find other influencers and compute overlap
    const otherInfluencers = this.getNodes("influencer").filter(
      (i) => i.id !== influencerId
    );

    const allReached = new Set(myFollowerIds);
    const overlaps: Array<{ influencerId: string; overlap: number }> = [];

    for (const other of otherInfluencers) {
      const otherFollowers = this.getEdges(other.id, "in")
        .filter((e) => e.type === "follows")
        .map((e) => e.from);

      let overlapCount = 0;
      for (const fid of otherFollowers) {
        if (myFollowerIds.has(fid)) overlapCount++;
        allReached.add(fid);
      }

      if (overlapCount > 0) {
        overlaps.push({
          influencerId: other.id,
          overlap: overlapCount,
        });
      }
    }

    // Also count 2-hop reach through followers' connections
    for (const fid of myFollowerIds) {
      const followerNeighbors = this.getNeighbors(fid, 1, ["follows", "referred_by"]);
      for (const n of followerNeighbors) {
        allReached.add(n.id);
      }
    }

    // Remove the influencer itself
    allReached.delete(influencerId);

    const totalOverlap = overlaps.reduce((sum, o) => sum + o.overlap, 0);
    const overlapPercentage =
      myFollowerIds.size > 0
        ? Math.round((totalOverlap / myFollowerIds.size) * 100 * 100) / 100
        : 0;

    overlaps.sort((a, b) => b.overlap - a.overlap);

    return {
      directFollowers: myFollowerIds.size,
      uniqueReach: allReached.size,
      overlapPercentage: Math.min(100, overlapPercentage),
      topOverlaps: overlaps.slice(0, 5),
    };
  }

  // ── Network Effects Measurement ─────────────────────────────────────────

  /**
   * Overall graph density: ratio of actual edges to maximum possible edges.
   * A fully connected graph has density 1.0.
   */
  getNetworkDensity(): number {
    const n = this.nodes.size;
    if (n < 2) return 0;
    const maxEdges = (n * (n - 1)) / 2;
    // Count unique undirected edges
    const edgePairs = new Set<string>();
    for (const edge of this.edges) {
      const key =
        edge.from < edge.to
          ? `${edge.from}::${edge.to}`
          : `${edge.to}::${edge.from}`;
      edgePairs.add(key);
    }
    return Math.round((edgePairs.size / maxEdges) * 10000) / 10000;
  }

  /**
   * Local clustering coefficient for a node: measures how interconnected
   * its immediate neighbors are. A value of 1.0 means all neighbors are
   * connected to each other.
   */
  getClusteringCoefficient(nodeId: string): number {
    const neighbors = this.getNeighbors(nodeId, 1);
    const k = neighbors.length;

    if (k < 2) return 0;

    const neighborIds = new Set(neighbors.map((n) => n.id));

    // Count edges between neighbors
    let edgesBetweenNeighbors = 0;
    const counted = new Set<string>();

    for (const neighbor of neighbors) {
      const edges = this.adjacency.get(neighbor.id) ?? [];
      for (const edge of edges) {
        const otherId = edge.from === neighbor.id ? edge.to : edge.from;
        if (neighborIds.has(otherId) && otherId !== neighbor.id) {
          const key =
            neighbor.id < otherId
              ? `${neighbor.id}::${otherId}`
              : `${otherId}::${neighbor.id}`;
          if (!counted.has(key)) {
            counted.add(key);
            edgesBetweenNeighbors++;
          }
        }
      }
    }

    const maxPossible = (k * (k - 1)) / 2;
    return Math.round((edgesBetweenNeighbors / maxPossible) * 10000) / 10000;
  }

  /**
   * Measure network growth rate since a given timestamp.
   * Returns new nodes, new edges, and growth rates.
   */
  getGrowthRate(since: string): GrowthMetrics {
    const sinceTime = new Date(since).getTime();
    if (isNaN(sinceTime)) {
      return {
        period: { since, until: new Date().toISOString() },
        newNodes: 0,
        newEdges: 0,
        nodeGrowthRate: 0,
        edgeGrowthRate: 0,
        totalNodes: this.nodes.size,
        totalEdges: this.edges.length,
      };
    }
    const now = new Date();
    const nowIso = now.toISOString();

    // Count new edges since the timestamp
    const newEdges = this.edges.filter(
      (e) => new Date(e.createdAt).getTime() >= sinceTime
    );

    // We cannot track node creation time without storing it in properties,
    // so we check for a "createdAt" property on nodes
    let newNodes = 0;
    for (const node of this.nodes.values()) {
      const createdAt = node.properties.createdAt as string | undefined;
      if (createdAt && new Date(createdAt).getTime() >= sinceTime) {
        newNodes++;
      }
    }

    const totalNodes = this.nodes.size;
    const totalEdges = this.edges.length;
    const previousNodes = totalNodes - newNodes;
    const previousEdges = totalEdges - newEdges.length;

    return {
      period: { since, until: nowIso },
      newNodes,
      newEdges: newEdges.length,
      nodeGrowthRate:
        previousNodes > 0
          ? Math.round((newNodes / previousNodes) * 10000) / 10000
          : newNodes > 0
            ? 1
            : 0,
      edgeGrowthRate:
        previousEdges > 0
          ? Math.round((newEdges.length / previousEdges) * 10000) / 10000
          : newEdges.length > 0
            ? 1
            : 0,
      totalNodes,
      totalEdges,
    };
  }

  // ── Utility ─────────────────────────────────────────────────────────────

  /** Get total counts for the graph. */
  getStats(): {
    nodes: number;
    edges: number;
    nodesByType: Record<string, number>;
    edgesByType: Record<string, number>;
  } {
    const nodesByType: Record<string, number> = {};
    for (const node of this.nodes.values()) {
      nodesByType[node.type] = (nodesByType[node.type] ?? 0) + 1;
    }

    const edgesByType: Record<string, number> = {};
    for (const edge of this.edges) {
      edgesByType[edge.type] = (edgesByType[edge.type] ?? 0) + 1;
    }

    return {
      nodes: this.nodes.size,
      edges: this.edges.length,
      nodesByType,
      edgesByType,
    };
  }

  /** Clear the entire graph. Primarily for testing. */
  clear(): void {
    this.nodes.clear();
    this.edges = [];
    this.adjacency.clear();
  }
}

// ── Singleton Export ────────────────────────────────────────────────────────

export const socialGraph = new SocialGraph();
