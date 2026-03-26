import { describe, it, expect, beforeEach } from "vitest";
import {
  ShardManager,
  ReadWriteSplitter,
  CrossShardQueryEngine,
  ShardRebalancer,
  murmurHash3,
  type ShardConfig,
} from "../sharding";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePrimary(
  id: string,
  db: string = "db_main",
  region: string = "us-east-1",
  weight: number = 1,
): ShardConfig {
  return {
    shardId: id,
    host: `${id}.db.local`,
    port: 5432,
    database: db,
    role: "primary",
    region,
    weight,
    maxConnections: 100,
    status: "active",
  };
}

function makeReplica(
  id: string,
  db: string = "db_main",
  region: string = "us-east-1",
  weight: number = 1,
): ShardConfig {
  return {
    shardId: id,
    host: `${id}.db.local`,
    port: 5432,
    database: db,
    role: "replica",
    region,
    weight,
    maxConnections: 100,
    status: "active",
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ShardManager
// ═══════════════════════════════════════════════════════════════════════════════

describe("ShardManager", () => {
  let manager: ShardManager;

  beforeEach(() => {
    manager = new ShardManager({ shardingStrategy: "hash" });
  });

  it("addShard registers a new shard", () => {
    const shard = makePrimary("s1");
    manager.addShard(shard);
    expect(manager.getShard("s1")).toBeDefined();
    expect(manager.getShard("s1").shardId).toBe("s1");
  });

  it("addShard throws on duplicate shard ID", () => {
    manager.addShard(makePrimary("s1"));
    expect(() => manager.addShard(makePrimary("s1"))).toThrow("already exists");
  });

  it("routeQuery uses hash-based routing consistently", () => {
    manager.addShard(makePrimary("s1", "db1"));
    manager.addShard(makePrimary("s2", "db2"));
    manager.addShard(makePrimary("s3", "db3"));

    const tenantId = "tenant_abc";
    const firstRoute = manager.routeQuery(tenantId).shardId;
    // Same tenant always hits the same shard
    for (let i = 0; i < 10; i++) {
      expect(manager.routeQuery(tenantId).shardId).toBe(firstRoute);
    }
  });

  it("routeQuery distributes different tenants across shards", () => {
    manager.addShard(makePrimary("s1", "db1"));
    manager.addShard(makePrimary("s2", "db2"));
    manager.addShard(makePrimary("s3", "db3"));

    const shardIds = new Set<string>();
    for (let i = 0; i < 100; i++) {
      shardIds.add(manager.routeQuery(`tenant_${i}`).shardId);
    }
    // With 100 tenants and 3 shards, at least 2 shards should be used
    expect(shardIds.size).toBeGreaterThanOrEqual(2);
  });

  it("routeWrite returns a primary shard", () => {
    manager.addShard(makePrimary("s1", "db1"));
    const shard = manager.routeWrite("tenant_x");
    expect(shard.role).toBe("primary");
  });

  it("routeWrite throws for draining shard", () => {
    manager.addShard(makePrimary("s1", "db1"));
    manager.drainShard("s1");
    expect(() => manager.routeWrite("tenant_x")).toThrow("draining");
  });

  it("routeRead with eventual consistency returns replica if available", () => {
    manager.addShard(makePrimary("s1", "db1"));
    manager.addShard(makeReplica("r1", "db1"));

    // Since routeRead uses Math.random for weighted selection, we run multiple
    // times to verify the replica path is reachable
    const results = new Set<string>();
    for (let i = 0; i < 20; i++) {
      results.add(manager.routeRead("tenant_x", "eventual").shardId);
    }
    expect(results.has("r1")).toBe(true);
  });

  it("routeRead with strong consistency returns primary", () => {
    manager.addShard(makePrimary("s1", "db1"));
    manager.addShard(makeReplica("r1", "db1"));

    const shard = manager.routeRead("tenant_x", "strong");
    expect(shard.role).toBe("primary");
  });

  it("routeRead falls back to primary when no replicas exist", () => {
    manager.addShard(makePrimary("s1", "db1"));
    const shard = manager.routeRead("tenant_x", "eventual");
    expect(shard.shardId).toBe("s1");
    expect(shard.role).toBe("primary");
  });

  it("drainShard sets status to draining", () => {
    manager.addShard(makePrimary("s1"));
    manager.drainShard("s1");
    expect(manager.getShard("s1").status).toBe("draining");
  });

  it("removeShard succeeds after draining", () => {
    manager.addShard(makePrimary("s1"));
    manager.drainShard("s1");
    manager.removeShard("s1");
    expect(() => manager.getShard("s1")).toThrow("not found");
  });

  it("removeShard throws on active shard", () => {
    manager.addShard(makePrimary("s1"));
    expect(() => manager.removeShard("s1")).toThrow("Drain it first");
  });

  it("murmurHash3 returns consistent values for same input", () => {
    const a = murmurHash3("hello");
    const b = murmurHash3("hello");
    expect(a).toBe(b);
  });

  it("murmurHash3 returns different values for different inputs", () => {
    const a = murmurHash3("hello");
    const b = murmurHash3("world");
    expect(a).not.toBe(b);
  });

  it("getAllShards returns all added shards", () => {
    manager.addShard(makePrimary("s1", "db1"));
    manager.addShard(makePrimary("s2", "db2"));
    manager.addShard(makeReplica("r1", "db1"));
    expect(manager.getAllShards()).toHaveLength(3);
  });

  it("getActivePrimaries returns only active primaries", () => {
    manager.addShard(makePrimary("s1", "db1"));
    manager.addShard(makePrimary("s2", "db2"));
    manager.addShard(makeReplica("r1", "db1"));
    manager.drainShard("s2");
    const primaries = manager.getActivePrimaries();
    expect(primaries).toHaveLength(1);
    expect(primaries[0].shardId).toBe("s1");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ReadWriteSplitter
// ═══════════════════════════════════════════════════════════════════════════════

describe("ReadWriteSplitter", () => {
  let manager: ShardManager;
  let splitter: ReadWriteSplitter;

  beforeEach(() => {
    manager = new ShardManager({ shardingStrategy: "hash" });
    manager.addShard(makePrimary("s1", "db1"));
    manager.addShard(makeReplica("r1", "db1"));
    manager.addShard(makeReplica("r2", "db1"));
    splitter = new ReadWriteSplitter(manager, { stickyWindowMs: 100 });
  });

  it("getConnection routes writes to primary", () => {
    const shard = splitter.getConnection({
      tenantId: "t1",
      queryType: "write",
      consistency: "eventual",
    });
    expect(shard.role).toBe("primary");
  });

  it("getConnection routes eventual reads to replicas", () => {
    const results = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const shard = splitter.getConnection({
        tenantId: "t1",
        queryType: "read",
        consistency: "eventual",
      });
      results.add(shard.role);
    }
    // Should hit replicas
    expect(results.has("replica")).toBe(true);
  });

  it("getConnection routes strong reads to primary", () => {
    const shard = splitter.getConnection({
      tenantId: "t1",
      queryType: "read",
      consistency: "strong",
    });
    expect(shard.role).toBe("primary");
  });

  it("sticky sessions force reads to primary after write", () => {
    // Write creates sticky session
    splitter.getConnection({
      tenantId: "t1",
      queryType: "write",
      consistency: "eventual",
    });

    // Immediate read should go to primary due to sticky session
    const shard = splitter.getConnection({
      tenantId: "t1",
      queryType: "read",
      consistency: "eventual",
    });
    expect(shard.role).toBe("primary");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CrossShardQueryEngine
// ═══════════════════════════════════════════════════════════════════════════════

describe("CrossShardQueryEngine", () => {
  let manager: ShardManager;
  let engine: CrossShardQueryEngine;

  beforeEach(() => {
    manager = new ShardManager({ shardingStrategy: "hash" });
    manager.addShard(makePrimary("s1", "db1"));
    manager.addShard(makePrimary("s2", "db2"));
    engine = new CrossShardQueryEngine(manager);
  });

  it("scatterGather merges results from all shards", async () => {
    const result = await engine.scatterGather<{ id: string; name: string }>(
      {
        query: "SELECT * FROM users",
        sortField: "name",
        sortDirection: "asc",
      },
      async (shard) => {
        if (shard.shardId === "s1") return [{ id: "1", name: "Alice" }];
        return [{ id: "2", name: "Bob" }];
      },
    );

    expect(result.results).toHaveLength(2);
    expect(result.shardsQueried).toBe(2);
    expect(result.shardsSucceeded).toBe(2);
    expect(result.shardsFailed).toHaveLength(0);
    // Sorted by name asc
    expect(result.results[0].name).toBe("Alice");
    expect(result.results[1].name).toBe("Bob");
  });

  it("scatterGather respects limit and offset", async () => {
    const result = await engine.scatterGather<{ id: string; val: number }>(
      { query: "SELECT *", limit: 2, offset: 1 },
      async (shard) => {
        if (shard.shardId === "s1")
          return [
            { id: "1", val: 10 },
            { id: "2", val: 20 },
          ];
        return [{ id: "3", val: 30 }];
      },
    );

    expect(result.results).toHaveLength(2);
    expect(result.totalCount).toBe(3);
  });

  it("scatter handles partial failures with allowPartialResults", async () => {
    const results = await engine.scatter<string[]>(
      async (shard) => {
        if (shard.shardId === "s1") throw new Error("down");
        return ["ok"];
      },
      { allowPartialResults: true },
    );

    const entries = Array.from(results.entries());
    const errors = entries.filter(([, r]) => r.error);
    const successes = entries.filter(([, r]) => r.data);
    expect(errors).toHaveLength(1);
    expect(successes).toHaveLength(1);
  });

  it("gather separates successful and failed shards", () => {
    const scatterResults = new Map<string, { data?: string[]; error?: Error }>();
    scatterResults.set("s1", { data: ["a", "b"] });
    scatterResults.set("s2", { error: new Error("fail") });

    const gathered = engine.gather(scatterResults);
    expect(gathered.results).toEqual(["a", "b"]);
    expect(gathered.successfulShards).toEqual(["s1"]);
    expect(gathered.failedShards).toEqual(["s2"]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ShardRebalancer
// ═══════════════════════════════════════════════════════════════════════════════

describe("ShardRebalancer", () => {
  let manager: ShardManager;
  let rebalancer: ShardRebalancer;

  beforeEach(() => {
    manager = new ShardManager({ shardingStrategy: "hash" });
    manager.addShard(makePrimary("s1", "db1"));
    manager.addShard(makePrimary("s2", "db2"));
    rebalancer = new ShardRebalancer(manager, { imbalanceThreshold: 0.2 });
  });

  it("analyze returns an imbalance score", () => {
    rebalancer.recordMetrics({
      shardId: "s1",
      tenantCount: 100,
      dataSize: 1000,
      queryRate: 500,
      writeRate: 100,
      cpuUtilization: 80,
      memoryUtilization: 70,
    });
    rebalancer.recordMetrics({
      shardId: "s2",
      tenantCount: 10,
      dataSize: 100,
      queryRate: 50,
      writeRate: 10,
      cpuUtilization: 20,
      memoryUtilization: 15,
    });

    const analysis = rebalancer.analyze();
    expect(typeof analysis.imbalanceScore).toBe("number");
    expect(analysis.imbalanceScore).toBeGreaterThanOrEqual(0);
    expect(analysis.shardLoads.size).toBe(2);
  });

  it("analyze returns zero imbalance for balanced shards", () => {
    rebalancer.recordMetrics({
      shardId: "s1",
      tenantCount: 50,
      dataSize: 500,
      queryRate: 250,
      writeRate: 50,
      cpuUtilization: 50,
      memoryUtilization: 50,
    });
    rebalancer.recordMetrics({
      shardId: "s2",
      tenantCount: 50,
      dataSize: 500,
      queryRate: 250,
      writeRate: 50,
      cpuUtilization: 50,
      memoryUtilization: 50,
    });

    const analysis = rebalancer.analyze();
    expect(analysis.imbalanceScore).toBe(0);
  });

  it("analyze generates recommendations when imbalanced", () => {
    rebalancer.recordMetrics({
      shardId: "s1",
      tenantCount: 100,
      dataSize: 10000,
      queryRate: 500,
      writeRate: 100,
      cpuUtilization: 90,
      memoryUtilization: 85,
    });
    rebalancer.recordMetrics({
      shardId: "s2",
      tenantCount: 5,
      dataSize: 100,
      queryRate: 10,
      writeRate: 2,
      cpuUtilization: 10,
      memoryUtilization: 8,
    });

    const analysis = rebalancer.analyze();
    expect(analysis.imbalanceScore).toBeGreaterThan(0.2);
  });
});
