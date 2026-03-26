import { describe, it, expect, beforeEach } from "vitest";
import { SocialGraph } from "../social-graph";

// ═══════════════════════════════════════════════════════════════════════════════
// SocialGraph
// ═══════════════════════════════════════════════════════════════════════════════

describe("SocialGraph", () => {
  let graph: SocialGraph;

  beforeEach(() => {
    graph = new SocialGraph();
  });

  // ── Node Operations ─────────────────────────────────────────────────────────

  describe("addNode", () => {
    it("adds a node and increments nodeCount", () => {
      const node = graph.addNode("n1", "influencer", { name: "Alice" });
      expect(node.id).toBe("n1");
      expect(node.type).toBe("influencer");
      expect(node.properties.name).toBe("Alice");
      expect(graph.nodeCount).toBe(1);
    });

    it("updates an existing node if same ID is used", () => {
      graph.addNode("n1", "influencer", { name: "Alice" });
      graph.addNode("n1", "business", { name: "Acme" });
      expect(graph.nodeCount).toBe(1);
      const node = graph.getNode("n1");
      expect(node!.type).toBe("business");
      expect(node!.properties.name).toBe("Acme");
    });
  });

  describe("getNode", () => {
    it("returns null for non-existent node", () => {
      expect(graph.getNode("missing")).toBeNull();
    });

    it("returns the node for a valid ID", () => {
      graph.addNode("n1", "campaign", {});
      const node = graph.getNode("n1");
      expect(node).not.toBeNull();
      expect(node!.id).toBe("n1");
    });
  });

  describe("getNodes", () => {
    it("returns all nodes when no type filter", () => {
      graph.addNode("n1", "influencer");
      graph.addNode("n2", "business");
      expect(graph.getNodes().length).toBe(2);
    });

    it("filters by type", () => {
      graph.addNode("n1", "influencer");
      graph.addNode("n2", "business");
      graph.addNode("n3", "influencer");
      const influencers = graph.getNodes("influencer");
      expect(influencers.length).toBe(2);
      expect(influencers.every((n) => n.type === "influencer")).toBe(true);
    });
  });

  describe("removeNode", () => {
    it("removes a node and its edges", () => {
      graph.addNode("a", "influencer");
      graph.addNode("b", "business");
      graph.addEdge("a", "b", "follows");
      expect(graph.edgeCount).toBe(1);

      graph.removeNode("a");
      expect(graph.nodeCount).toBe(1);
      expect(graph.edgeCount).toBe(0);
    });

    it("returns false for non-existent node", () => {
      expect(graph.removeNode("missing")).toBe(false);
    });
  });

  // ── Edge Operations ─────────────────────────────────────────────────────────

  describe("addEdge", () => {
    it("adds an edge between two existing nodes", () => {
      graph.addNode("a", "influencer");
      graph.addNode("b", "business");
      const edge = graph.addEdge("a", "b", "completed", 0.8);

      expect(edge.sourceId).toBe("a");
      expect(edge.targetId).toBe("b");
      expect(edge.type).toBe("completed");
      expect(edge.weight).toBe(0.8);
      expect(graph.edgeCount).toBe(1);
    });

    it("throws if source node does not exist", () => {
      graph.addNode("b", "business");
      expect(() => graph.addEdge("missing", "b", "follows")).toThrow(/does not exist/);
    });

    it("throws if target node does not exist", () => {
      graph.addNode("a", "influencer");
      expect(() => graph.addEdge("a", "missing", "follows")).toThrow(/does not exist/);
    });

    it("clamps weight to [0, 1]", () => {
      graph.addNode("a", "influencer");
      graph.addNode("b", "business");
      const edge = graph.addEdge("a", "b", "follows", 5.0);
      expect(edge.weight).toBeLessThanOrEqual(1);
    });
  });

  // ── Neighbor Queries ────────────────────────────────────────────────────────

  describe("getNeighbors", () => {
    it("returns neighbors in both directions", () => {
      graph.addNode("a", "influencer");
      graph.addNode("b", "business");
      graph.addNode("c", "campaign");
      graph.addEdge("a", "b", "follows");
      graph.addEdge("c", "a", "completed");

      const neighbors = graph.getNeighbors("a");
      const neighborIds = neighbors.map((n) => n.id);
      expect(neighborIds).toContain("b");
      expect(neighborIds).toContain("c");
    });

    it("filters by edge type", () => {
      graph.addNode("a", "influencer");
      graph.addNode("b", "business");
      graph.addNode("c", "campaign");
      graph.addEdge("a", "b", "follows");
      graph.addEdge("a", "c", "completed");

      const follows = graph.getNeighbors("a", "follows");
      expect(follows.length).toBe(1);
      expect(follows[0].id).toBe("b");
    });

    it("filters by node type", () => {
      graph.addNode("a", "influencer");
      graph.addNode("b", "business");
      graph.addNode("c", "campaign");
      graph.addEdge("a", "b", "follows");
      graph.addEdge("a", "c", "completed");

      const businesses = graph.getNeighbors("a", undefined, "business");
      expect(businesses.length).toBe(1);
      expect(businesses[0].id).toBe("b");
    });

    it("returns empty array for non-existent node", () => {
      expect(graph.getNeighbors("missing")).toEqual([]);
    });
  });

  // ── Shortest Path ──────────────────────────────────────────────────────────

  describe("shortestPath", () => {
    it("returns null when no path exists", () => {
      graph.addNode("a", "influencer");
      graph.addNode("b", "business");
      // No edges between them
      expect(graph.shortestPath("a", "b")).toBeNull();
    });

    it("returns trivial path for same node", () => {
      graph.addNode("a", "influencer");
      const path = graph.shortestPath("a", "a");
      expect(path).not.toBeNull();
      expect(path!.hops).toBe(0);
      expect(path!.nodes).toEqual(["a"]);
    });

    it("finds a direct path", () => {
      graph.addNode("a", "influencer");
      graph.addNode("b", "business");
      graph.addEdge("a", "b", "follows");

      const path = graph.shortestPath("a", "b");
      expect(path).not.toBeNull();
      expect(path!.hops).toBe(1);
      expect(path!.nodes).toEqual(["a", "b"]);
    });

    it("finds the shortest path through intermediaries", () => {
      graph.addNode("a", "influencer");
      graph.addNode("b", "campaign");
      graph.addNode("c", "business");
      graph.addEdge("a", "b", "completed");
      graph.addEdge("b", "c", "launched");

      const path = graph.shortestPath("a", "c");
      expect(path).not.toBeNull();
      expect(path!.hops).toBe(2);
      expect(path!.nodes).toEqual(["a", "b", "c"]);
    });

    it("returns null for non-existent nodes", () => {
      expect(graph.shortestPath("missing1", "missing2")).toBeNull();
    });
  });

  // ── PageRank ───────────────────────────────────────────────────────────────

  describe("pageRank", () => {
    it("returns empty array for empty graph", () => {
      expect(graph.pageRank()).toEqual([]);
    });

    it("returns scores for all nodes", () => {
      graph.addNode("a", "influencer");
      graph.addNode("b", "business");
      graph.addNode("c", "campaign");
      graph.addEdge("a", "b", "follows");
      graph.addEdge("b", "c", "launched");
      graph.addEdge("c", "a", "completed");

      const results = graph.pageRank();
      expect(results.length).toBe(3);

      // All scores should be positive
      for (const r of results) {
        expect(r.score).toBeGreaterThan(0);
        expect(r.nodeId).toBeTruthy();
      }

      // Scores should sum to approximately 1.0
      const totalScore = results.reduce((sum, r) => sum + r.score, 0);
      expect(totalScore).toBeCloseTo(1.0, 1);
    });

    it("assigns higher score to more connected nodes", () => {
      // Create a star graph: center connected to 4 others
      graph.addNode("center", "influencer");
      graph.addNode("a", "business");
      graph.addNode("b", "business");
      graph.addNode("c", "business");
      graph.addNode("d", "business");
      graph.addEdge("a", "center", "follows");
      graph.addEdge("b", "center", "follows");
      graph.addEdge("c", "center", "follows");
      graph.addEdge("d", "center", "follows");

      const results = graph.pageRank();
      const centerResult = results.find((r) => r.nodeId === "center");
      expect(centerResult).toBeDefined();
      // Center should have the highest score
      expect(centerResult!.score).toBe(results[0].score);
    });
  });

  // ── Community Detection ────────────────────────────────────────────────────

  describe("communityDetection", () => {
    it("returns empty array for empty graph", () => {
      expect(graph.communityDetection()).toEqual([]);
    });

    it("detects separate communities for disconnected components", () => {
      // Component 1
      graph.addNode("a1", "influencer");
      graph.addNode("a2", "influencer");
      graph.addEdge("a1", "a2", "follows");

      // Component 2
      graph.addNode("b1", "business");
      graph.addNode("b2", "business");
      graph.addEdge("b1", "b2", "collaborates");

      const communities = graph.communityDetection();
      // Should have at least 2 communities
      expect(communities.length).toBeGreaterThanOrEqual(2);

      // Total members across all communities should equal total nodes
      const totalMembers = communities.reduce((sum, c) => sum + c.size, 0);
      expect(totalMembers).toBe(4);
    });

    it("returns communities with correct metadata", () => {
      graph.addNode("a", "influencer");
      graph.addNode("b", "influencer");
      graph.addEdge("a", "b", "follows");

      const communities = graph.communityDetection();
      expect(communities.length).toBeGreaterThan(0);

      const community = communities[0];
      expect(community.size).toBeGreaterThan(0);
      expect(community.members.length).toBe(community.size);
      expect(typeof community.density).toBe("number");
      expect(community.nodeTypes).toBeDefined();
    });
  });

  // ── Utility ────────────────────────────────────────────────────────────────

  describe("toJSON / fromJSON", () => {
    it("serializes and deserializes the graph", () => {
      graph.addNode("a", "influencer", { name: "Alice" });
      graph.addNode("b", "business", { name: "Acme" });
      graph.addEdge("a", "b", "follows", 0.7);

      const json = graph.toJSON();
      expect(json.nodes.length).toBe(2);
      expect(json.edges.length).toBe(1);

      const newGraph = new SocialGraph();
      newGraph.fromJSON(json);
      expect(newGraph.nodeCount).toBe(2);
      expect(newGraph.edgeCount).toBe(1);
      expect(newGraph.getNode("a")!.properties.name).toBe("Alice");
    });
  });

  describe("clear", () => {
    it("removes all nodes and edges", () => {
      graph.addNode("a", "influencer");
      graph.addNode("b", "business");
      graph.addEdge("a", "b", "follows");

      graph.clear();
      expect(graph.nodeCount).toBe(0);
      expect(graph.edgeCount).toBe(0);
    });
  });
});
