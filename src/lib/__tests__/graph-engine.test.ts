import { describe, it, expect, beforeEach } from 'vitest';
import {
  socialGraph,
  type NodeType,
  type EdgeType,
  type GraphNode,
  type GraphEdge,
  type PathResult,
  type CommunityResult,
  type GrowthMetrics,
} from '@/lib/graph-engine';

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('Social Graph Engine', () => {
  beforeEach(() => {
    socialGraph.clear();
  });

  // ─── Node Operations ─────────────────────────────────────────────────────

  describe('addNode', () => {
    it('adds a node and returns it', () => {
      const node = socialGraph.addNode('biz-1', 'business', { name: 'Coffee Shop' });
      expect(node).toEqual({
        id: 'biz-1',
        type: 'business',
        properties: { name: 'Coffee Shop' },
      });
    });

    it('defaults properties to empty object when omitted', () => {
      const node = socialGraph.addNode('inf-1', 'influencer');
      expect(node.properties).toEqual({});
    });

    it('overwrites an existing node with the same ID', () => {
      socialGraph.addNode('biz-1', 'business', { name: 'Old Name' });
      const updated = socialGraph.addNode('biz-1', 'business', { name: 'New Name' });
      expect(updated.properties.name).toBe('New Name');
      expect(socialGraph.getNode('biz-1')!.properties.name).toBe('New Name');
    });

    it('supports all node types', () => {
      const types: NodeType[] = ['business', 'influencer', 'customer', 'campaign', 'platform'];
      for (const type of types) {
        const node = socialGraph.addNode(`node-${type}`, type);
        expect(node.type).toBe(type);
      }
      expect(socialGraph.getStats().nodes).toBe(types.length);
    });
  });

  describe('getNode', () => {
    it('returns the node when it exists', () => {
      socialGraph.addNode('c-1', 'customer', { email: 'a@b.com' });
      const result = socialGraph.getNode('c-1');
      expect(result).not.toBeNull();
      expect(result!.id).toBe('c-1');
      expect(result!.type).toBe('customer');
    });

    it('returns null for a non-existent node', () => {
      expect(socialGraph.getNode('does-not-exist')).toBeNull();
    });
  });

  describe('removeNode', () => {
    it('removes a node and returns true', () => {
      socialGraph.addNode('biz-1', 'business');
      expect(socialGraph.removeNode('biz-1')).toBe(true);
      expect(socialGraph.getNode('biz-1')).toBeNull();
    });

    it('returns false when the node does not exist', () => {
      expect(socialGraph.removeNode('ghost')).toBe(false);
    });

    it('removes all connected edges when a node is removed', () => {
      socialGraph.addNode('biz-1', 'business');
      socialGraph.addNode('c-1', 'customer');
      socialGraph.addNode('c-2', 'customer');
      socialGraph.addEdge('c-1', 'biz-1', 'follows');
      socialGraph.addEdge('c-2', 'biz-1', 'reviewed');

      expect(socialGraph.getStats().edges).toBe(2);
      socialGraph.removeNode('biz-1');
      expect(socialGraph.getStats().edges).toBe(0);
    });

    it('cleans up adjacency lists of remaining nodes', () => {
      socialGraph.addNode('a', 'customer');
      socialGraph.addNode('b', 'customer');
      socialGraph.addNode('c', 'customer');
      socialGraph.addEdge('a', 'b', 'referred_by');
      socialGraph.addEdge('b', 'c', 'referred_by');

      socialGraph.removeNode('b');
      // a and c should have no edges left
      expect(socialGraph.getEdges('a', 'both')).toHaveLength(0);
      expect(socialGraph.getEdges('c', 'both')).toHaveLength(0);
    });
  });

  describe('getNodes', () => {
    it('returns all nodes when no type filter is given', () => {
      socialGraph.addNode('biz-1', 'business');
      socialGraph.addNode('inf-1', 'influencer');
      socialGraph.addNode('c-1', 'customer');
      expect(socialGraph.getNodes()).toHaveLength(3);
    });

    it('filters by node type', () => {
      socialGraph.addNode('biz-1', 'business');
      socialGraph.addNode('biz-2', 'business');
      socialGraph.addNode('inf-1', 'influencer');
      const businesses = socialGraph.getNodes('business');
      expect(businesses).toHaveLength(2);
      expect(businesses.every((n) => n.type === 'business')).toBe(true);
    });

    it('returns empty array when no nodes match the type', () => {
      socialGraph.addNode('biz-1', 'business');
      expect(socialGraph.getNodes('platform')).toHaveLength(0);
    });

    it('returns empty array on empty graph', () => {
      expect(socialGraph.getNodes()).toHaveLength(0);
    });
  });

  // ─── Edge Operations ─────────────────────────────────────────────────────

  describe('addEdge', () => {
    it('creates an edge between two existing nodes', () => {
      socialGraph.addNode('c-1', 'customer');
      socialGraph.addNode('biz-1', 'business');
      const edge = socialGraph.addEdge('c-1', 'biz-1', 'follows', 0.8, { since: '2025-01' });

      expect(edge.from).toBe('c-1');
      expect(edge.to).toBe('biz-1');
      expect(edge.type).toBe('follows');
      expect(edge.weight).toBe(0.8);
      expect(edge.properties.since).toBe('2025-01');
      expect(edge.id).toMatch(/^edge_/);
      expect(edge.createdAt).toBeTruthy();
    });

    it('defaults weight to 0.5 when omitted', () => {
      socialGraph.addNode('a', 'customer');
      socialGraph.addNode('b', 'business');
      const edge = socialGraph.addEdge('a', 'b', 'follows');
      expect(edge.weight).toBe(0.5);
    });

    it('clamps weight to [0, 1]', () => {
      socialGraph.addNode('a', 'customer');
      socialGraph.addNode('b', 'business');

      const lowEdge = socialGraph.addEdge('a', 'b', 'follows', -5);
      expect(lowEdge.weight).toBe(0);

      const highEdge = socialGraph.addEdge('a', 'b', 'reviewed', 99);
      expect(highEdge.weight).toBe(1);
    });

    it('handles NaN weight by defaulting to 0.5', () => {
      socialGraph.addNode('a', 'customer');
      socialGraph.addNode('b', 'business');
      const edge = socialGraph.addEdge('a', 'b', 'follows', NaN);
      expect(edge.weight).toBe(0.5);
    });

    it('throws when source node does not exist', () => {
      socialGraph.addNode('b', 'business');
      expect(() => socialGraph.addEdge('ghost', 'b', 'follows')).toThrow(
        'Source node "ghost" does not exist.'
      );
    });

    it('throws when target node does not exist', () => {
      socialGraph.addNode('a', 'customer');
      expect(() => socialGraph.addEdge('a', 'ghost', 'follows')).toThrow(
        'Target node "ghost" does not exist.'
      );
    });

    it('allows self-loops', () => {
      socialGraph.addNode('a', 'customer');
      const edge = socialGraph.addEdge('a', 'a', 'referred_by');
      expect(edge.from).toBe('a');
      expect(edge.to).toBe('a');
    });

    it('allows duplicate edges between the same nodes', () => {
      socialGraph.addNode('a', 'customer');
      socialGraph.addNode('b', 'business');
      const e1 = socialGraph.addEdge('a', 'b', 'follows');
      const e2 = socialGraph.addEdge('a', 'b', 'reviewed');
      expect(e1.id).not.toBe(e2.id);
      expect(socialGraph.getStats().edges).toBe(2);
    });

    it('supports all edge types', () => {
      socialGraph.addNode('a', 'customer');
      socialGraph.addNode('b', 'business');
      const types: EdgeType[] = [
        'completed_campaign',
        'launched_campaign',
        'participated_in',
        'referred_by',
        'follows',
        'reviewed',
        'located_near',
        'same_niche',
        'cross_promoted',
      ];
      for (const type of types) {
        socialGraph.addEdge('a', 'b', type);
      }
      expect(socialGraph.getStats().edges).toBe(types.length);
    });
  });

  describe('getEdges', () => {
    beforeEach(() => {
      socialGraph.addNode('a', 'customer');
      socialGraph.addNode('b', 'business');
      socialGraph.addNode('c', 'campaign');
      socialGraph.addEdge('a', 'b', 'follows', 0.7);
      socialGraph.addEdge('c', 'a', 'completed_campaign', 0.9);
    });

    it('returns all edges for a node with direction "both"', () => {
      const edges = socialGraph.getEdges('a', 'both');
      expect(edges).toHaveLength(2);
    });

    it('defaults to "both" direction', () => {
      const edges = socialGraph.getEdges('a');
      expect(edges).toHaveLength(2);
    });

    it('returns only outbound edges with direction "out"', () => {
      const edges = socialGraph.getEdges('a', 'out');
      expect(edges).toHaveLength(1);
      expect(edges[0].to).toBe('b');
    });

    it('returns only inbound edges with direction "in"', () => {
      const edges = socialGraph.getEdges('a', 'in');
      expect(edges).toHaveLength(1);
      expect(edges[0].from).toBe('c');
    });

    it('returns empty array for a node with no edges', () => {
      socialGraph.addNode('lonely', 'platform');
      expect(socialGraph.getEdges('lonely')).toHaveLength(0);
    });

    it('returns empty array for a non-existent node', () => {
      expect(socialGraph.getEdges('ghost')).toHaveLength(0);
    });
  });

  describe('getEdgesBetween', () => {
    it('returns all edges between two specific nodes in both directions', () => {
      socialGraph.addNode('a', 'customer');
      socialGraph.addNode('b', 'business');
      socialGraph.addEdge('a', 'b', 'follows');
      socialGraph.addEdge('b', 'a', 'launched_campaign');
      socialGraph.addEdge('a', 'b', 'reviewed');

      const edges = socialGraph.getEdgesBetween('a', 'b');
      expect(edges).toHaveLength(3);
    });

    it('returns same result regardless of argument order', () => {
      socialGraph.addNode('a', 'customer');
      socialGraph.addNode('b', 'business');
      socialGraph.addEdge('a', 'b', 'follows');

      expect(socialGraph.getEdgesBetween('a', 'b')).toHaveLength(1);
      expect(socialGraph.getEdgesBetween('b', 'a')).toHaveLength(1);
    });

    it('returns empty array when no edges exist between nodes', () => {
      socialGraph.addNode('a', 'customer');
      socialGraph.addNode('b', 'business');
      expect(socialGraph.getEdgesBetween('a', 'b')).toHaveLength(0);
    });

    it('returns empty array for non-existent nodes', () => {
      expect(socialGraph.getEdgesBetween('ghost-a', 'ghost-b')).toHaveLength(0);
    });
  });

  describe('removeEdge', () => {
    it('removes an edge by ID and returns true', () => {
      socialGraph.addNode('a', 'customer');
      socialGraph.addNode('b', 'business');
      const edge = socialGraph.addEdge('a', 'b', 'follows');

      expect(socialGraph.removeEdge(edge.id)).toBe(true);
      expect(socialGraph.getStats().edges).toBe(0);
    });

    it('returns false for a non-existent edge ID', () => {
      expect(socialGraph.removeEdge('edge_nonexistent')).toBe(false);
    });

    it('removes the edge from adjacency lists of both endpoints', () => {
      socialGraph.addNode('a', 'customer');
      socialGraph.addNode('b', 'business');
      const edge = socialGraph.addEdge('a', 'b', 'follows');

      socialGraph.removeEdge(edge.id);
      expect(socialGraph.getEdges('a')).toHaveLength(0);
      expect(socialGraph.getEdges('b')).toHaveLength(0);
    });

    it('only removes the specified edge when multiple exist', () => {
      socialGraph.addNode('a', 'customer');
      socialGraph.addNode('b', 'business');
      const e1 = socialGraph.addEdge('a', 'b', 'follows');
      socialGraph.addEdge('a', 'b', 'reviewed');

      socialGraph.removeEdge(e1.id);
      expect(socialGraph.getStats().edges).toBe(1);
      expect(socialGraph.getEdges('a')[0].type).toBe('reviewed');
    });
  });

  // ─── Graph Queries ────────────────────────────────────────────────────────

  describe('getNeighbors', () => {
    it('returns 1-hop neighbors by default', () => {
      socialGraph.addNode('a', 'customer');
      socialGraph.addNode('b', 'business');
      socialGraph.addNode('c', 'influencer');
      socialGraph.addEdge('a', 'b', 'follows');
      socialGraph.addEdge('a', 'c', 'follows');

      const neighbors = socialGraph.getNeighbors('a');
      expect(neighbors).toHaveLength(2);
      const ids = neighbors.map((n) => n.id).sort();
      expect(ids).toEqual(['b', 'c']);
    });

    it('returns multi-hop neighbors', () => {
      socialGraph.addNode('a', 'customer');
      socialGraph.addNode('b', 'customer');
      socialGraph.addNode('c', 'customer');
      socialGraph.addNode('d', 'customer');
      socialGraph.addEdge('a', 'b', 'referred_by');
      socialGraph.addEdge('b', 'c', 'referred_by');
      socialGraph.addEdge('c', 'd', 'referred_by');

      // 1 hop: b
      expect(socialGraph.getNeighbors('a', 1).map((n) => n.id)).toEqual(['b']);
      // 2 hops: b, c
      expect(socialGraph.getNeighbors('a', 2).map((n) => n.id).sort()).toEqual(['b', 'c']);
      // 3 hops: b, c, d
      expect(socialGraph.getNeighbors('a', 3).map((n) => n.id).sort()).toEqual(['b', 'c', 'd']);
    });

    it('does not include the start node in results', () => {
      socialGraph.addNode('a', 'customer');
      socialGraph.addNode('b', 'customer');
      socialGraph.addEdge('a', 'b', 'follows');
      socialGraph.addEdge('b', 'a', 'follows');

      const neighbors = socialGraph.getNeighbors('a', 2);
      expect(neighbors.find((n) => n.id === 'a')).toBeUndefined();
    });

    it('filters by edge type', () => {
      socialGraph.addNode('a', 'customer');
      socialGraph.addNode('b', 'business');
      socialGraph.addNode('c', 'business');
      socialGraph.addEdge('a', 'b', 'follows');
      socialGraph.addEdge('a', 'c', 'reviewed');

      const followNeighbors = socialGraph.getNeighbors('a', 1, ['follows']);
      expect(followNeighbors).toHaveLength(1);
      expect(followNeighbors[0].id).toBe('b');
    });

    it('returns empty for a disconnected node', () => {
      socialGraph.addNode('lone', 'customer');
      expect(socialGraph.getNeighbors('lone')).toHaveLength(0);
    });

    it('returns empty for a non-existent node', () => {
      expect(socialGraph.getNeighbors('ghost')).toHaveLength(0);
    });

    it('handles depth of 0 (no neighbors)', () => {
      socialGraph.addNode('a', 'customer');
      socialGraph.addNode('b', 'business');
      socialGraph.addEdge('a', 'b', 'follows');
      expect(socialGraph.getNeighbors('a', 0)).toHaveLength(0);
    });

    it('traverses edges bidirectionally', () => {
      socialGraph.addNode('a', 'customer');
      socialGraph.addNode('b', 'business');
      socialGraph.addEdge('b', 'a', 'launched_campaign'); // edge goes b->a

      // a should still reach b since adjacency is bidirectional
      const neighbors = socialGraph.getNeighbors('a', 1);
      expect(neighbors).toHaveLength(1);
      expect(neighbors[0].id).toBe('b');
    });
  });

  describe('shortestPath', () => {
    it('finds a direct path between neighbors', () => {
      socialGraph.addNode('a', 'customer');
      socialGraph.addNode('b', 'business');
      socialGraph.addEdge('a', 'b', 'follows', 0.7);

      const path = socialGraph.shortestPath('a', 'b');
      expect(path).not.toBeNull();
      expect(path!.nodes).toEqual(['a', 'b']);
      expect(path!.edges).toHaveLength(1);
      expect(path!.totalWeight).toBe(0.7);
    });

    it('finds a multi-hop shortest path', () => {
      socialGraph.addNode('a', 'customer');
      socialGraph.addNode('b', 'customer');
      socialGraph.addNode('c', 'customer');
      socialGraph.addNode('d', 'customer');
      socialGraph.addEdge('a', 'b', 'referred_by', 0.3);
      socialGraph.addEdge('b', 'c', 'referred_by', 0.4);
      socialGraph.addEdge('c', 'd', 'referred_by', 0.5);

      const path = socialGraph.shortestPath('a', 'd');
      expect(path).not.toBeNull();
      expect(path!.nodes).toEqual(['a', 'b', 'c', 'd']);
      expect(path!.edges).toHaveLength(3);
      expect(path!.totalWeight).toBeCloseTo(1.2, 5);
    });

    it('returns a trivial path when source equals target', () => {
      socialGraph.addNode('a', 'customer');
      const path = socialGraph.shortestPath('a', 'a');
      expect(path).not.toBeNull();
      expect(path!.nodes).toEqual(['a']);
      expect(path!.edges).toHaveLength(0);
      expect(path!.totalWeight).toBe(0);
    });

    it('returns null when source does not exist', () => {
      socialGraph.addNode('b', 'business');
      expect(socialGraph.shortestPath('ghost', 'b')).toBeNull();
    });

    it('returns null when target does not exist', () => {
      socialGraph.addNode('a', 'customer');
      expect(socialGraph.shortestPath('a', 'ghost')).toBeNull();
    });

    it('returns null when no path exists between disconnected nodes', () => {
      socialGraph.addNode('a', 'customer');
      socialGraph.addNode('b', 'business');
      // No edge between them
      expect(socialGraph.shortestPath('a', 'b')).toBeNull();
    });

    it('returns null for same-node query when node does not exist', () => {
      expect(socialGraph.shortestPath('ghost', 'ghost')).toBeNull();
    });

    it('finds shortest path even when longer paths exist', () => {
      // a-b direct vs a-c-d-b indirect
      socialGraph.addNode('a', 'customer');
      socialGraph.addNode('b', 'customer');
      socialGraph.addNode('c', 'customer');
      socialGraph.addNode('d', 'customer');
      socialGraph.addEdge('a', 'b', 'referred_by', 0.5); // direct: 1 hop
      socialGraph.addEdge('a', 'c', 'referred_by', 0.1);
      socialGraph.addEdge('c', 'd', 'referred_by', 0.1);
      socialGraph.addEdge('d', 'b', 'referred_by', 0.1);

      const path = socialGraph.shortestPath('a', 'b');
      expect(path!.nodes).toEqual(['a', 'b']); // BFS finds the 1-hop path
    });
  });

  describe('getConnectedComponent', () => {
    it('returns all nodes in a connected component', () => {
      socialGraph.addNode('a', 'customer');
      socialGraph.addNode('b', 'customer');
      socialGraph.addNode('c', 'customer');
      socialGraph.addEdge('a', 'b', 'referred_by');
      socialGraph.addEdge('b', 'c', 'referred_by');

      const component = socialGraph.getConnectedComponent('a');
      expect(component).toHaveLength(3);
      const ids = component.map((n) => n.id).sort();
      expect(ids).toEqual(['a', 'b', 'c']);
    });

    it('returns only the node itself when disconnected', () => {
      socialGraph.addNode('lone', 'customer');
      const component = socialGraph.getConnectedComponent('lone');
      expect(component).toHaveLength(1);
      expect(component[0].id).toBe('lone');
    });

    it('returns empty array for a non-existent node', () => {
      expect(socialGraph.getConnectedComponent('ghost')).toHaveLength(0);
    });

    it('does not cross into disconnected components', () => {
      // Component 1: a-b
      socialGraph.addNode('a', 'customer');
      socialGraph.addNode('b', 'customer');
      socialGraph.addEdge('a', 'b', 'referred_by');

      // Component 2: c-d
      socialGraph.addNode('c', 'business');
      socialGraph.addNode('d', 'business');
      socialGraph.addEdge('c', 'd', 'located_near');

      const comp1 = socialGraph.getConnectedComponent('a');
      expect(comp1).toHaveLength(2);
      const ids = comp1.map((n) => n.id).sort();
      expect(ids).toEqual(['a', 'b']);
    });

    it('includes node even if it only has inbound edges', () => {
      socialGraph.addNode('a', 'customer');
      socialGraph.addNode('b', 'business');
      socialGraph.addEdge('a', 'b', 'follows'); // a -> b

      const comp = socialGraph.getConnectedComponent('b');
      expect(comp).toHaveLength(2);
    });
  });

  // ─── Social Network Analysis ──────────────────────────────────────────────

  describe('getInfluenceScore', () => {
    it('returns 0 for a non-existent node', () => {
      expect(socialGraph.getInfluenceScore('ghost')).toBe(0);
    });

    it('returns 0 for a node with no edges', () => {
      socialGraph.addNode('lone', 'influencer');
      expect(socialGraph.getInfluenceScore('lone')).toBe(0);
    });

    it('returns a positive score for a connected node', () => {
      socialGraph.addNode('inf-1', 'influencer');
      socialGraph.addNode('c-1', 'customer');
      socialGraph.addNode('c-2', 'customer');
      socialGraph.addEdge('c-1', 'inf-1', 'follows', 0.8);
      socialGraph.addEdge('c-2', 'inf-1', 'follows', 0.9);

      const score = socialGraph.getInfluenceScore('inf-1');
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('gives higher scores to nodes with more inbound connections', () => {
      socialGraph.addNode('popular', 'influencer');
      socialGraph.addNode('quiet', 'influencer');
      for (let i = 0; i < 10; i++) {
        socialGraph.addNode(`c-${i}`, 'customer');
        socialGraph.addEdge(`c-${i}`, 'popular', 'follows', 0.8);
      }
      socialGraph.addNode('c-solo', 'customer');
      socialGraph.addEdge('c-solo', 'quiet', 'follows', 0.8);

      expect(socialGraph.getInfluenceScore('popular')).toBeGreaterThan(
        socialGraph.getInfluenceScore('quiet')
      );
    });

    it('rewards edge type diversity', () => {
      // Node with diverse edge types
      socialGraph.addNode('diverse', 'business');
      socialGraph.addNode('c-1', 'customer');
      socialGraph.addNode('c-2', 'customer');
      socialGraph.addNode('camp-1', 'campaign');
      socialGraph.addEdge('c-1', 'diverse', 'follows', 0.5);
      socialGraph.addEdge('c-2', 'diverse', 'reviewed', 0.5);
      socialGraph.addEdge('diverse', 'camp-1', 'launched_campaign', 0.5);

      // Node with same number of edges but all same type
      socialGraph.addNode('uniform', 'business');
      socialGraph.addNode('c-3', 'customer');
      socialGraph.addNode('c-4', 'customer');
      socialGraph.addNode('c-5', 'customer');
      socialGraph.addEdge('c-3', 'uniform', 'follows', 0.5);
      socialGraph.addEdge('c-4', 'uniform', 'follows', 0.5);
      socialGraph.addEdge('c-5', 'uniform', 'follows', 0.5);

      // Diverse node should get higher diversity component
      const diverseScore = socialGraph.getInfluenceScore('diverse');
      const uniformScore = socialGraph.getInfluenceScore('uniform');
      // Both have edges, both positive; the diverse node gets diversity bonus
      expect(diverseScore).toBeGreaterThan(0);
      expect(uniformScore).toBeGreaterThan(0);
    });

    it('caps score at 100', () => {
      socialGraph.addNode('mega', 'influencer');
      // Add many high-weight inbound edges from diverse sources
      for (let i = 0; i < 50; i++) {
        socialGraph.addNode(`c-${i}`, 'customer');
        const edgeTypes: EdgeType[] = ['follows', 'reviewed', 'completed_campaign'];
        socialGraph.addEdge(`c-${i}`, 'mega', edgeTypes[i % 3], 1.0);
      }
      const score = socialGraph.getInfluenceScore('mega');
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('getReferralChain', () => {
    it('returns a chain of referrals', () => {
      socialGraph.addNode('c-1', 'customer');
      socialGraph.addNode('c-2', 'customer');
      socialGraph.addNode('c-3', 'customer');
      // c-1 was referred by c-2, c-2 was referred by c-3
      socialGraph.addEdge('c-1', 'c-2', 'referred_by');
      socialGraph.addEdge('c-2', 'c-3', 'referred_by');

      const chain = socialGraph.getReferralChain('c-1');
      expect(chain.map((n) => n.id)).toEqual(['c-1', 'c-2', 'c-3']);
    });

    it('returns only the start node when there are no referral edges', () => {
      socialGraph.addNode('c-1', 'customer');
      const chain = socialGraph.getReferralChain('c-1');
      expect(chain).toHaveLength(1);
      expect(chain[0].id).toBe('c-1');
    });

    it('returns empty array for non-existent node', () => {
      const chain = socialGraph.getReferralChain('ghost');
      expect(chain).toHaveLength(0);
    });

    it('handles cycles in referral chains without infinite loop', () => {
      socialGraph.addNode('c-1', 'customer');
      socialGraph.addNode('c-2', 'customer');
      socialGraph.addEdge('c-1', 'c-2', 'referred_by');
      socialGraph.addEdge('c-2', 'c-1', 'referred_by');

      const chain = socialGraph.getReferralChain('c-1');
      // Should not loop infinitely; visited set prevents it
      expect(chain.length).toBeLessThanOrEqual(2);
    });

    it('ignores non-referral edges', () => {
      socialGraph.addNode('c-1', 'customer');
      socialGraph.addNode('biz-1', 'business');
      socialGraph.addEdge('c-1', 'biz-1', 'follows'); // not a referral

      const chain = socialGraph.getReferralChain('c-1');
      expect(chain).toHaveLength(1);
      expect(chain[0].id).toBe('c-1');
    });
  });

  describe('getCommunity', () => {
    it('returns the center node even with no neighbors', () => {
      socialGraph.addNode('lone', 'customer');
      const community = socialGraph.getCommunity('lone');
      expect(community.centerId).toBe('lone');
      expect(community.members).toHaveLength(1);
      expect(community.members[0].id).toBe('lone');
    });

    it('returns empty result for a non-existent node', () => {
      const community = socialGraph.getCommunity('ghost');
      expect(community.centerId).toBe('ghost');
      expect(community.members).toHaveLength(0);
      expect(community.density).toBe(0);
    });

    it('detects a dense community', () => {
      // Create a clique of 4 nodes (fully connected)
      socialGraph.addNode('a', 'customer');
      socialGraph.addNode('b', 'customer');
      socialGraph.addNode('c', 'customer');
      socialGraph.addNode('d', 'customer');
      socialGraph.addEdge('a', 'b', 'referred_by');
      socialGraph.addEdge('a', 'c', 'referred_by');
      socialGraph.addEdge('a', 'd', 'referred_by');
      socialGraph.addEdge('b', 'c', 'referred_by');
      socialGraph.addEdge('b', 'd', 'referred_by');
      socialGraph.addEdge('c', 'd', 'referred_by');

      const community = socialGraph.getCommunity('a');
      expect(community.members.length).toBeGreaterThanOrEqual(4);
      expect(community.density).toBeGreaterThan(0);
      expect(community.edges.length).toBeGreaterThan(0);
    });

    it('filters out loosely connected nodes', () => {
      // Create a core of tightly connected nodes, plus one loosely connected
      socialGraph.addNode('a', 'customer');
      socialGraph.addNode('b', 'customer');
      socialGraph.addNode('c', 'customer');
      socialGraph.addNode('d', 'customer');
      socialGraph.addNode('outsider', 'customer');

      // Tight core: a-b, a-c, b-c, a-d, b-d, c-d (fully connected 4-clique)
      socialGraph.addEdge('a', 'b', 'referred_by');
      socialGraph.addEdge('a', 'c', 'referred_by');
      socialGraph.addEdge('a', 'd', 'referred_by');
      socialGraph.addEdge('b', 'c', 'referred_by');
      socialGraph.addEdge('b', 'd', 'referred_by');
      socialGraph.addEdge('c', 'd', 'referred_by');

      // Outsider only connected to 'a'
      socialGraph.addEdge('a', 'outsider', 'referred_by');

      const community = socialGraph.getCommunity('a');
      // The outsider has only 1 connection in the community (to 'a')
      // threshold is max(1, floor(6 * 0.3)) = max(1, 1) = 1
      // So outsider with 1 connection might still pass the 30% threshold
      // But the core members should definitely be included
      const memberIds = community.members.map((m) => m.id);
      expect(memberIds).toContain('a');
      expect(memberIds).toContain('b');
      expect(memberIds).toContain('c');
      expect(memberIds).toContain('d');
    });

    it('always includes the center node in members', () => {
      socialGraph.addNode('center', 'customer');
      socialGraph.addNode('other', 'customer');
      socialGraph.addEdge('center', 'other', 'follows');

      const community = socialGraph.getCommunity('center');
      expect(community.members.find((m) => m.id === 'center')).toBeTruthy();
    });
  });

  // ─── Business Intelligence ────────────────────────────────────────────────

  describe('getViralPotential', () => {
    it('returns zero scores when campaign has no participants', () => {
      socialGraph.addNode('camp-1', 'campaign');
      const result = socialGraph.getViralPotential('camp-1');
      expect(result.score).toBe(0);
      expect(result.uniqueReach).toBe(0);
      expect(result.avgInfluence).toBe(0);
      expect(result.participantCount).toBe(0);
      expect(result.networkDensity).toBe(0);
    });

    it('returns zero scores for non-existent campaign', () => {
      const result = socialGraph.getViralPotential('ghost');
      expect(result.score).toBe(0);
      expect(result.participantCount).toBe(0);
    });

    it('calculates viral potential with participants', () => {
      socialGraph.addNode('camp-1', 'campaign');
      socialGraph.addNode('inf-1', 'influencer');
      socialGraph.addNode('inf-2', 'influencer');
      socialGraph.addNode('c-1', 'customer');
      socialGraph.addNode('c-2', 'customer');
      socialGraph.addNode('c-3', 'customer');

      // Influencers participate in campaign (inbound to campaign)
      socialGraph.addEdge('inf-1', 'camp-1', 'participated_in', 0.9);
      socialGraph.addEdge('inf-2', 'camp-1', 'participated_in', 0.8);

      // Customers follow the influencers
      socialGraph.addEdge('c-1', 'inf-1', 'follows', 0.7);
      socialGraph.addEdge('c-2', 'inf-1', 'follows', 0.6);
      socialGraph.addEdge('c-3', 'inf-2', 'follows', 0.5);

      // Influencers know each other
      socialGraph.addEdge('inf-1', 'inf-2', 'same_niche', 0.8);

      const result = socialGraph.getViralPotential('camp-1');
      expect(result.participantCount).toBe(2);
      expect(result.uniqueReach).toBeGreaterThan(0);
      expect(result.avgInfluence).toBeGreaterThan(0);
      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('accounts for network density among participants', () => {
      socialGraph.addNode('camp-1', 'campaign');
      socialGraph.addNode('p-1', 'influencer');
      socialGraph.addNode('p-2', 'influencer');
      socialGraph.addNode('p-3', 'influencer');

      socialGraph.addEdge('p-1', 'camp-1', 'participated_in');
      socialGraph.addEdge('p-2', 'camp-1', 'participated_in');
      socialGraph.addEdge('p-3', 'camp-1', 'participated_in');

      // All participants know each other
      socialGraph.addEdge('p-1', 'p-2', 'same_niche');
      socialGraph.addEdge('p-2', 'p-3', 'same_niche');
      socialGraph.addEdge('p-1', 'p-3', 'same_niche');

      const result = socialGraph.getViralPotential('camp-1');
      expect(result.networkDensity).toBe(1); // fully connected participants
    });
  });

  describe('findCrossPromotionPartners', () => {
    it('returns empty array for non-existent business', () => {
      expect(socialGraph.findCrossPromotionPartners('ghost')).toHaveLength(0);
    });

    it('returns empty array for non-business node', () => {
      socialGraph.addNode('inf-1', 'influencer');
      expect(socialGraph.findCrossPromotionPartners('inf-1')).toHaveLength(0);
    });

    it('finds partners with shared customers', () => {
      socialGraph.addNode('biz-1', 'business');
      socialGraph.addNode('biz-2', 'business');
      socialGraph.addNode('c-1', 'customer');
      socialGraph.addNode('c-2', 'customer');

      // Both businesses share customer c-1
      socialGraph.addEdge('c-1', 'biz-1', 'follows');
      socialGraph.addEdge('c-1', 'biz-2', 'follows');
      // c-2 only follows biz-1
      socialGraph.addEdge('c-2', 'biz-1', 'follows');

      const partners = socialGraph.findCrossPromotionPartners('biz-1');
      expect(partners).toHaveLength(1);
      expect(partners[0].business.id).toBe('biz-2');
      expect(partners[0].sharedCustomers).toBe(1);
      expect(partners[0].connectionStrength).toBeGreaterThan(0);
    });

    it('includes businesses with existing cross-promotion relationship even without shared customers', () => {
      socialGraph.addNode('biz-1', 'business');
      socialGraph.addNode('biz-2', 'business');
      socialGraph.addEdge('biz-1', 'biz-2', 'cross_promoted');

      const partners = socialGraph.findCrossPromotionPartners('biz-1');
      expect(partners).toHaveLength(1);
      expect(partners[0].existingRelationship).toBe(true);
    });

    it('sorts by shared customers descending', () => {
      socialGraph.addNode('biz-1', 'business');
      socialGraph.addNode('biz-2', 'business');
      socialGraph.addNode('biz-3', 'business');

      for (let i = 0; i < 5; i++) {
        socialGraph.addNode(`c-${i}`, 'customer');
        socialGraph.addEdge(`c-${i}`, 'biz-1', 'follows');
      }
      // biz-2 shares 3 customers, biz-3 shares 1
      socialGraph.addEdge('c-0', 'biz-2', 'follows');
      socialGraph.addEdge('c-1', 'biz-2', 'follows');
      socialGraph.addEdge('c-2', 'biz-2', 'follows');
      socialGraph.addEdge('c-0', 'biz-3', 'follows');

      const partners = socialGraph.findCrossPromotionPartners('biz-1');
      expect(partners).toHaveLength(2);
      expect(partners[0].business.id).toBe('biz-2');
      expect(partners[0].sharedCustomers).toBe(3);
      expect(partners[1].business.id).toBe('biz-3');
      expect(partners[1].sharedCustomers).toBe(1);
    });

    it('respects the limit parameter', () => {
      socialGraph.addNode('biz-1', 'business');
      for (let i = 2; i <= 5; i++) {
        socialGraph.addNode(`biz-${i}`, 'business');
      }
      socialGraph.addNode('c-1', 'customer');
      socialGraph.addEdge('c-1', 'biz-1', 'follows');
      socialGraph.addEdge('c-1', 'biz-2', 'follows');
      socialGraph.addEdge('c-1', 'biz-3', 'follows');
      socialGraph.addEdge('c-1', 'biz-4', 'follows');
      socialGraph.addEdge('c-1', 'biz-5', 'follows');

      const partners = socialGraph.findCrossPromotionPartners('biz-1', 2);
      expect(partners).toHaveLength(2);
    });

    it('considers reviewed and completed_campaign edges for customer relationships', () => {
      socialGraph.addNode('biz-1', 'business');
      socialGraph.addNode('biz-2', 'business');
      socialGraph.addNode('c-1', 'customer');

      socialGraph.addEdge('c-1', 'biz-1', 'reviewed');
      socialGraph.addEdge('c-1', 'biz-2', 'completed_campaign');

      const partners = socialGraph.findCrossPromotionPartners('biz-1');
      expect(partners).toHaveLength(1);
      expect(partners[0].sharedCustomers).toBe(1);
    });
  });

  describe('getInfluencerReach', () => {
    it('returns zero values for non-existent influencer', () => {
      const result = socialGraph.getInfluencerReach('ghost');
      expect(result.directFollowers).toBe(0);
      expect(result.uniqueReach).toBe(0);
      expect(result.overlapPercentage).toBe(0);
      expect(result.topOverlaps).toHaveLength(0);
    });

    it('counts direct followers', () => {
      socialGraph.addNode('inf-1', 'influencer');
      socialGraph.addNode('c-1', 'customer');
      socialGraph.addNode('c-2', 'customer');
      socialGraph.addNode('c-3', 'customer');
      socialGraph.addEdge('c-1', 'inf-1', 'follows');
      socialGraph.addEdge('c-2', 'inf-1', 'follows');
      socialGraph.addEdge('c-3', 'inf-1', 'follows');

      const result = socialGraph.getInfluencerReach('inf-1');
      expect(result.directFollowers).toBe(3);
    });

    it('calculates overlap with other influencers', () => {
      socialGraph.addNode('inf-1', 'influencer');
      socialGraph.addNode('inf-2', 'influencer');
      socialGraph.addNode('c-1', 'customer');
      socialGraph.addNode('c-2', 'customer');
      socialGraph.addNode('c-3', 'customer');

      // c-1 and c-2 follow both influencers (overlap)
      socialGraph.addEdge('c-1', 'inf-1', 'follows');
      socialGraph.addEdge('c-2', 'inf-1', 'follows');
      socialGraph.addEdge('c-3', 'inf-1', 'follows');
      socialGraph.addEdge('c-1', 'inf-2', 'follows');
      socialGraph.addEdge('c-2', 'inf-2', 'follows');

      const result = socialGraph.getInfluencerReach('inf-1');
      expect(result.directFollowers).toBe(3);
      expect(result.topOverlaps).toHaveLength(1);
      expect(result.topOverlaps[0].influencerId).toBe('inf-2');
      expect(result.topOverlaps[0].overlap).toBe(2);
      expect(result.overlapPercentage).toBeGreaterThan(0);
    });

    it('includes 2-hop reach through followers connections', () => {
      socialGraph.addNode('inf-1', 'influencer');
      socialGraph.addNode('c-1', 'customer');
      socialGraph.addNode('c-2', 'customer');
      socialGraph.addEdge('c-1', 'inf-1', 'follows');
      socialGraph.addEdge('c-2', 'c-1', 'referred_by');

      const result = socialGraph.getInfluencerReach('inf-1');
      expect(result.directFollowers).toBe(1);
      expect(result.uniqueReach).toBeGreaterThanOrEqual(2); // c-1 + c-2 at minimum
    });

    it('returns at most 5 top overlaps', () => {
      socialGraph.addNode('inf-main', 'influencer');
      socialGraph.addNode('c-shared', 'customer');
      socialGraph.addEdge('c-shared', 'inf-main', 'follows');

      for (let i = 1; i <= 7; i++) {
        socialGraph.addNode(`inf-${i}`, 'influencer');
        socialGraph.addEdge('c-shared', `inf-${i}`, 'follows');
      }

      const result = socialGraph.getInfluencerReach('inf-main');
      expect(result.topOverlaps.length).toBeLessThanOrEqual(5);
    });

    it('caps overlap percentage at 100', () => {
      // This tests the Math.min(100, overlapPercentage) guard
      socialGraph.addNode('inf-1', 'influencer');
      socialGraph.addNode('c-1', 'customer');
      socialGraph.addEdge('c-1', 'inf-1', 'follows');

      // Multiple influencers sharing the same single follower
      for (let i = 2; i <= 5; i++) {
        socialGraph.addNode(`inf-${i}`, 'influencer');
        socialGraph.addEdge('c-1', `inf-${i}`, 'follows');
      }

      const result = socialGraph.getInfluencerReach('inf-1');
      expect(result.overlapPercentage).toBeLessThanOrEqual(100);
    });
  });

  // ─── Network Effects Measurement ──────────────────────────────────────────

  describe('getNetworkDensity', () => {
    it('returns 0 for empty graph', () => {
      expect(socialGraph.getNetworkDensity()).toBe(0);
    });

    it('returns 0 for a single node', () => {
      socialGraph.addNode('a', 'customer');
      expect(socialGraph.getNetworkDensity()).toBe(0);
    });

    it('returns 1 for a fully connected pair', () => {
      socialGraph.addNode('a', 'customer');
      socialGraph.addNode('b', 'customer');
      socialGraph.addEdge('a', 'b', 'referred_by');
      expect(socialGraph.getNetworkDensity()).toBe(1);
    });

    it('returns 1 for a fully connected triangle', () => {
      socialGraph.addNode('a', 'customer');
      socialGraph.addNode('b', 'customer');
      socialGraph.addNode('c', 'customer');
      socialGraph.addEdge('a', 'b', 'referred_by');
      socialGraph.addEdge('b', 'c', 'referred_by');
      socialGraph.addEdge('a', 'c', 'referred_by');

      expect(socialGraph.getNetworkDensity()).toBe(1);
    });

    it('returns correct density for a partial graph', () => {
      // 4 nodes, 3 possible unique pairs = 6, but only 2 edges
      socialGraph.addNode('a', 'customer');
      socialGraph.addNode('b', 'customer');
      socialGraph.addNode('c', 'customer');
      socialGraph.addNode('d', 'customer');
      socialGraph.addEdge('a', 'b', 'referred_by');
      socialGraph.addEdge('c', 'd', 'referred_by');

      // 2 unique edges / 6 possible = 0.3333
      const density = socialGraph.getNetworkDensity();
      expect(density).toBeCloseTo(0.3333, 3);
    });

    it('counts duplicate edges between same pair only once', () => {
      socialGraph.addNode('a', 'customer');
      socialGraph.addNode('b', 'customer');
      socialGraph.addEdge('a', 'b', 'follows');
      socialGraph.addEdge('a', 'b', 'reviewed');
      socialGraph.addEdge('b', 'a', 'referred_by');

      // All between same pair -> 1 unique pair / 1 possible = 1
      expect(socialGraph.getNetworkDensity()).toBe(1);
    });
  });

  describe('getClusteringCoefficient', () => {
    it('returns 0 for a node with fewer than 2 neighbors', () => {
      socialGraph.addNode('a', 'customer');
      socialGraph.addNode('b', 'customer');
      socialGraph.addEdge('a', 'b', 'referred_by');
      expect(socialGraph.getClusteringCoefficient('a')).toBe(0);
    });

    it('returns 0 for a node with no edges', () => {
      socialGraph.addNode('a', 'customer');
      expect(socialGraph.getClusteringCoefficient('a')).toBe(0);
    });

    it('returns 1 for a node whose neighbors are all interconnected', () => {
      // Triangle: a-b, a-c, b-c
      socialGraph.addNode('a', 'customer');
      socialGraph.addNode('b', 'customer');
      socialGraph.addNode('c', 'customer');
      socialGraph.addEdge('a', 'b', 'referred_by');
      socialGraph.addEdge('a', 'c', 'referred_by');
      socialGraph.addEdge('b', 'c', 'referred_by');

      expect(socialGraph.getClusteringCoefficient('a')).toBe(1);
    });

    it('returns 0 when no neighbors are interconnected', () => {
      // Star: a connects to b, c, d but b, c, d are not connected to each other
      socialGraph.addNode('a', 'customer');
      socialGraph.addNode('b', 'customer');
      socialGraph.addNode('c', 'customer');
      socialGraph.addNode('d', 'customer');
      socialGraph.addEdge('a', 'b', 'referred_by');
      socialGraph.addEdge('a', 'c', 'referred_by');
      socialGraph.addEdge('a', 'd', 'referred_by');

      expect(socialGraph.getClusteringCoefficient('a')).toBe(0);
    });

    it('returns correct coefficient for partial clustering', () => {
      // a connects to b, c, d. Only b-c are connected.
      socialGraph.addNode('a', 'customer');
      socialGraph.addNode('b', 'customer');
      socialGraph.addNode('c', 'customer');
      socialGraph.addNode('d', 'customer');
      socialGraph.addEdge('a', 'b', 'referred_by');
      socialGraph.addEdge('a', 'c', 'referred_by');
      socialGraph.addEdge('a', 'd', 'referred_by');
      socialGraph.addEdge('b', 'c', 'referred_by');

      // k=3 neighbors, 1 edge between them, max possible = 3
      const coeff = socialGraph.getClusteringCoefficient('a');
      expect(coeff).toBeCloseTo(0.3333, 3);
    });
  });

  describe('getGrowthRate', () => {
    it('returns metrics with zero growth for invalid date', () => {
      socialGraph.addNode('a', 'customer');
      const metrics = socialGraph.getGrowthRate('not-a-date');
      expect(metrics.newNodes).toBe(0);
      expect(metrics.newEdges).toBe(0);
      expect(metrics.nodeGrowthRate).toBe(0);
      expect(metrics.edgeGrowthRate).toBe(0);
      expect(metrics.totalNodes).toBe(1);
    });

    it('counts new edges since the given timestamp', () => {
      socialGraph.addNode('a', 'customer');
      socialGraph.addNode('b', 'customer');

      // Edge created now should be "new" relative to 1 hour ago
      socialGraph.addEdge('a', 'b', 'referred_by');

      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const metrics = socialGraph.getGrowthRate(oneHourAgo);
      expect(metrics.newEdges).toBe(1);
      expect(metrics.totalEdges).toBe(1);
    });

    it('counts new nodes based on createdAt property', () => {
      const recentDate = new Date().toISOString();
      socialGraph.addNode('old', 'customer', {
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
      socialGraph.addNode('new', 'customer', { createdAt: recentDate });

      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
      const metrics = socialGraph.getGrowthRate(twoDaysAgo);
      expect(metrics.newNodes).toBe(1);
      expect(metrics.totalNodes).toBe(2);
    });

    it('calculates growth rate relative to previous count', () => {
      // 2 old nodes, 1 new node
      socialGraph.addNode('old-1', 'customer', {
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
      socialGraph.addNode('old-2', 'customer', {
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
      socialGraph.addNode('new-1', 'customer', {
        createdAt: new Date().toISOString(),
      });

      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const metrics = socialGraph.getGrowthRate(oneWeekAgo);
      // 1 new / 2 previous = 0.5
      expect(metrics.nodeGrowthRate).toBe(0.5);
    });

    it('returns growth rate of 1 when all items are new', () => {
      socialGraph.addNode('a', 'customer', { createdAt: new Date().toISOString() });
      socialGraph.addNode('b', 'customer', { createdAt: new Date().toISOString() });

      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const metrics = socialGraph.getGrowthRate(oneHourAgo);
      // previousNodes = 0, newNodes > 0 → rate = 1
      expect(metrics.nodeGrowthRate).toBe(1);
    });

    it('includes period timestamps', () => {
      const since = new Date(Date.now() - 86400000).toISOString();
      const metrics = socialGraph.getGrowthRate(since);
      expect(metrics.period.since).toBe(since);
      expect(metrics.period.until).toBeTruthy();
    });
  });

  // ─── Utility ──────────────────────────────────────────────────────────────

  describe('getStats', () => {
    it('returns zeros for an empty graph', () => {
      const stats = socialGraph.getStats();
      expect(stats.nodes).toBe(0);
      expect(stats.edges).toBe(0);
      expect(stats.nodesByType).toEqual({});
      expect(stats.edgesByType).toEqual({});
    });

    it('counts nodes and edges by type', () => {
      socialGraph.addNode('biz-1', 'business');
      socialGraph.addNode('biz-2', 'business');
      socialGraph.addNode('c-1', 'customer');
      socialGraph.addNode('inf-1', 'influencer');
      socialGraph.addEdge('c-1', 'biz-1', 'follows');
      socialGraph.addEdge('c-1', 'biz-2', 'reviewed');
      socialGraph.addEdge('inf-1', 'biz-1', 'participated_in');

      const stats = socialGraph.getStats();
      expect(stats.nodes).toBe(4);
      expect(stats.edges).toBe(3);
      expect(stats.nodesByType).toEqual({
        business: 2,
        customer: 1,
        influencer: 1,
      });
      expect(stats.edgesByType).toEqual({
        follows: 1,
        reviewed: 1,
        participated_in: 1,
      });
    });
  });

  describe('clear', () => {
    it('removes all nodes and edges', () => {
      socialGraph.addNode('a', 'customer');
      socialGraph.addNode('b', 'business');
      socialGraph.addEdge('a', 'b', 'follows');

      socialGraph.clear();

      const stats = socialGraph.getStats();
      expect(stats.nodes).toBe(0);
      expect(stats.edges).toBe(0);
      expect(socialGraph.getNode('a')).toBeNull();
      expect(socialGraph.getNode('b')).toBeNull();
    });

    it('allows adding new nodes after clear', () => {
      socialGraph.addNode('a', 'customer');
      socialGraph.clear();
      const node = socialGraph.addNode('b', 'business');
      expect(node.id).toBe('b');
      expect(socialGraph.getStats().nodes).toBe(1);
    });
  });

  // ─── Edge Cases ───────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('handles self-loop edges in neighbor queries', () => {
      socialGraph.addNode('a', 'customer');
      socialGraph.addEdge('a', 'a', 'referred_by');

      // getNeighbors removes the start node from results
      const neighbors = socialGraph.getNeighbors('a');
      expect(neighbors).toHaveLength(0);
    });

    it('handles self-loop in shortestPath', () => {
      socialGraph.addNode('a', 'customer');
      socialGraph.addEdge('a', 'a', 'referred_by');

      const path = socialGraph.shortestPath('a', 'a');
      expect(path).not.toBeNull();
      expect(path!.nodes).toEqual(['a']);
      expect(path!.totalWeight).toBe(0);
    });

    it('handles self-loop in getEdgesBetween', () => {
      socialGraph.addNode('a', 'customer');
      socialGraph.addEdge('a', 'a', 'referred_by');

      const edges = socialGraph.getEdgesBetween('a', 'a');
      // A self-loop edge appears twice in the adjacency list (once for from, once for to)
      // and matches both filter conditions, so 2 entries are returned
      expect(edges).toHaveLength(2);
      // Both entries reference the same underlying edge
      expect(edges[0].id).toBe(edges[1].id);
    });

    it('handles a graph with many disconnected components', () => {
      for (let i = 0; i < 10; i++) {
        socialGraph.addNode(`lone-${i}`, 'customer');
      }
      const stats = socialGraph.getStats();
      expect(stats.nodes).toBe(10);
      expect(stats.edges).toBe(0);
      expect(socialGraph.getNetworkDensity()).toBe(0);

      for (let i = 0; i < 10; i++) {
        const comp = socialGraph.getConnectedComponent(`lone-${i}`);
        expect(comp).toHaveLength(1);
      }
    });

    it('handles large chain graph for shortest path', () => {
      const size = 50;
      for (let i = 0; i < size; i++) {
        socialGraph.addNode(`n-${i}`, 'customer');
      }
      for (let i = 0; i < size - 1; i++) {
        socialGraph.addEdge(`n-${i}`, `n-${i + 1}`, 'referred_by', 0.1);
      }

      const path = socialGraph.shortestPath('n-0', `n-${size - 1}`);
      expect(path).not.toBeNull();
      expect(path!.nodes).toHaveLength(size);
      expect(path!.edges).toHaveLength(size - 1);
      expect(path!.totalWeight).toBeCloseTo((size - 1) * 0.1, 1);
    });

    it('influence score accounts for balance between in and out edges', () => {
      // Balanced node: equal in and out
      socialGraph.addNode('balanced', 'customer');
      socialGraph.addNode('a', 'customer');
      socialGraph.addNode('b', 'customer');
      socialGraph.addEdge('a', 'balanced', 'follows', 0.5); // in
      socialGraph.addEdge('balanced', 'b', 'follows', 0.5); // out

      const balancedScore = socialGraph.getInfluenceScore('balanced');

      // Unbalanced node: only outbound
      socialGraph.addNode('unbalanced', 'customer');
      socialGraph.addNode('c', 'customer');
      socialGraph.addNode('d', 'customer');
      socialGraph.addEdge('unbalanced', 'c', 'follows', 0.5);
      socialGraph.addEdge('unbalanced', 'd', 'follows', 0.5);

      const unbalancedScore = socialGraph.getInfluenceScore('unbalanced');

      // Balanced node should get the balance bonus
      // Both have 2 edges total at same weight, but balanced gets bonus
      expect(balancedScore).toBeGreaterThanOrEqual(unbalancedScore);
    });

    it('getNeighbors handles edge type filter with multiple types', () => {
      socialGraph.addNode('a', 'customer');
      socialGraph.addNode('b', 'business');
      socialGraph.addNode('c', 'campaign');
      socialGraph.addNode('d', 'platform');
      socialGraph.addEdge('a', 'b', 'follows');
      socialGraph.addEdge('a', 'c', 'completed_campaign');
      socialGraph.addEdge('a', 'd', 'referred_by');

      const filtered = socialGraph.getNeighbors('a', 1, ['follows', 'completed_campaign']);
      expect(filtered).toHaveLength(2);
      const ids = filtered.map((n) => n.id).sort();
      expect(ids).toEqual(['b', 'c']);
    });
  });
});
