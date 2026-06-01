/**
 * Schema-Driven Migration System for Social Perks
 * ─────────────────────────────────────────────────
 * Generates DDL from the SCHEMA object in schema.ts and applies it
 * via the db.query() interface from connection.ts.
 *
 * This complements the hand-written migrations in migrations.ts by
 * providing an automated path: read the TypeScript schema definition,
 * emit CREATE TABLE / CREATE INDEX SQL, and run it idempotently.
 *
 * Usage:
 *   import { generateSQL, runMigrations, getMigrationState } from "./migrate";
 *   const ddl = generateSQL();             // inspect the SQL
 *   const result = await runMigrations();   // apply if not already done
 *   const state = await getMigrationState(); // check status
 */

import { SCHEMA, TABLE_NAMES } from "./schema";
import { db, InMemoryConnection } from "./connection";
import type { DatabaseConnection, TransactionClient } from "./connection";

// ─── Type Mapping ───────────────────────────────────────────────────────────

/**
 * Maps the TypeScript ColumnType strings from schema.ts to Postgres SQL types.
 */
const TYPE_MAP: Record<string, string> = {
  uuid: "UUID",
  text: "TEXT",
  "varchar(255)": "VARCHAR(255)",
  "varchar(50)": "VARCHAR(50)",
  "varchar(100)": "VARCHAR(100)",
  int: "INTEGER",
  bigint: "BIGINT",
  "decimal(10,2)": "DECIMAL(10,2)",
  "decimal(5,4)": "DECIMAL(5,4)",
  float: "DOUBLE PRECISION",
  boolean: "BOOLEAN",
  timestamptz: "TIMESTAMPTZ",
  jsonb: "JSONB",
  "text[]": "TEXT[]",
};

function mapType(columnType: string): string {
  const mapped = TYPE_MAP[columnType];
  if (!mapped) {
    // Handle any varchar(N) or decimal(P,S) patterns not in the static map
    const varcharMatch = columnType.match(/^varchar\((\d+)\)$/);
    if (varcharMatch) return `VARCHAR(${varcharMatch[1]})`;

    const decimalMatch = columnType.match(/^decimal\((\d+),(\d+)\)$/);
    if (decimalMatch) return `DECIMAL(${decimalMatch[1]},${decimalMatch[2]})`;

    // Fallback: return as-is (uppercase)
    return columnType.toUpperCase();
  }
  return mapped;
}

// ─── SQL Generation ─────────────────────────────────────────────────────────

/**
 * Topologically sort tables so that tables referenced by foreign keys are
 * created before the tables that reference them. Handles circular
 * dependencies (like users <-> influencers) by deferring the FK constraint
 * via ALTER TABLE statements emitted after all CREATE TABLEs.
 */
function getTableCreationOrder(): {
  ordered: string[];
  deferredFKs: Array<{
    table: string;
    column: string;
    refTable: string;
    refColumn: string;
    onDelete: string;
  }>;
} {
  const tables = Object.keys(SCHEMA);
  const deps = new Map<string, Set<string>>();

  // Build dependency graph: table -> set of tables it depends on
  for (const tableName of tables) {
    const tableDef = SCHEMA[tableName as keyof typeof SCHEMA];
    const tableDeps = new Set<string>();
    for (const [, col] of Object.entries(tableDef.columns)) {
      if (col.references && tables.includes(col.references.table)) {
        tableDeps.add(col.references.table);
      }
    }
    // Remove self-references (a table can reference itself)
    tableDeps.delete(tableName);
    deps.set(tableName, tableDeps);
  }

  // Kahn's algorithm for topological sort
  const ordered: string[] = [];
  const remaining = new Map(deps);
  const deferredFKs: Array<{
    table: string;
    column: string;
    refTable: string;
    refColumn: string;
    onDelete: string;
  }> = [];

  // Iteratively pick tables with no unresolved dependencies
  let changed = true;
  while (changed && remaining.size > 0) {
    changed = false;
    for (const [table, tableDeps] of remaining) {
      // Remove already-ordered tables from deps
      for (const dep of tableDeps) {
        if (ordered.includes(dep)) {
          tableDeps.delete(dep);
        }
      }
      if (tableDeps.size === 0) {
        ordered.push(table);
        remaining.delete(table);
        changed = true;
      }
    }
  }

  // Any remaining tables have circular dependencies.
  // Add them and defer their foreign keys.
  if (remaining.size > 0) {
    for (const [table] of remaining) {
      ordered.push(table);
    }

    // For circular-dependency tables, identify which FKs need deferral
    for (const [table] of remaining) {
      const tableDef = SCHEMA[table as keyof typeof SCHEMA];
      for (const [colName, col] of Object.entries(tableDef.columns)) {
        if (col.references) {
          const refTableIdx = ordered.indexOf(col.references.table);
          const thisTableIdx = ordered.indexOf(table);
          // If the referenced table comes after this table, defer the FK
          if (refTableIdx >= thisTableIdx && col.references.table !== table) {
            deferredFKs.push({
              table,
              column: colName,
              refTable: col.references.table,
              refColumn: col.references.column,
              onDelete: col.references.onDelete,
            });
          }
        }
      }
    }
  }

  return { ordered, deferredFKs };
}

/**
 * Generate the complete DDL (CREATE TABLE + CREATE INDEX statements)
 * from the SCHEMA object. Returns a single SQL string.
 *
 * Features:
 * - Proper column types via TYPE_MAP
 * - NOT NULL constraints
 * - DEFAULT values
 * - FOREIGN KEY inline references (where dependency order allows)
 * - Deferred ALTER TABLE ADD CONSTRAINT for circular FK dependencies
 * - CREATE [UNIQUE] INDEX statements
 * - IF NOT EXISTS for idempotent re-runs
 */
export function generateSQL(): string {
  const { ordered, deferredFKs } = getTableCreationOrder();
  const statements: string[] = [];

  // Enable UUID generation extension
  statements.push("CREATE EXTENSION IF NOT EXISTS \"pgcrypto\";");
  statements.push("");

  // Track which FKs are deferred so we skip them in CREATE TABLE
  const deferredSet = new Set(
    deferredFKs.map((fk) => `${fk.table}.${fk.column}`),
  );

  // ── CREATE TABLE statements ─────────────────────────────────────────────

  for (const tableName of ordered) {
    const tableDef = SCHEMA[tableName as keyof typeof SCHEMA];
    const colDefs: string[] = [];

    for (const [colName, col] of Object.entries(tableDef.columns)) {
      let def = `  ${colName} ${mapType(col.type)}`;

      // Primary key for id column
      if (colName === "id") {
        def += " PRIMARY KEY";
      }

      // NOT NULL
      if (!col.nullable) {
        // PRIMARY KEY implies NOT NULL, avoid duplication
        if (colName !== "id") {
          def += " NOT NULL";
        }
      }

      // DEFAULT
      if (col.default !== undefined) {
        // id defaults are handled by PRIMARY KEY DEFAULT
        if (colName === "id") {
          def = `  ${colName} ${mapType(col.type)} PRIMARY KEY DEFAULT ${col.default}`;
        } else {
          def += ` DEFAULT ${col.default}`;
        }
      }

      // Inline REFERENCES (only if not deferred)
      if (col.references && !deferredSet.has(`${tableName}.${colName}`)) {
        def += ` REFERENCES ${col.references.table}(${col.references.column}) ON DELETE ${col.references.onDelete}`;
      }

      colDefs.push(def);
    }

    statements.push(
      `CREATE TABLE IF NOT EXISTS ${tableName} (\n${colDefs.join(",\n")}\n);`,
    );
    statements.push("");
  }

  // ── Deferred FOREIGN KEY constraints (for circular dependencies) ────────

  for (const fk of deferredFKs) {
    const constraintName = `${fk.table}_${fk.column}_fkey`;
    statements.push(
      `DO $$ BEGIN\n` +
        `  IF NOT EXISTS (\n` +
        `    SELECT 1 FROM pg_constraint WHERE conname = '${constraintName}'\n` +
        `  ) THEN\n` +
        `    ALTER TABLE ${fk.table}\n` +
        `      ADD CONSTRAINT ${constraintName}\n` +
        `      FOREIGN KEY (${fk.column}) REFERENCES ${fk.refTable}(${fk.refColumn})\n` +
        `      ON DELETE ${fk.onDelete};\n` +
        `  END IF;\n` +
        `END $$;`,
    );
    statements.push("");
  }

  // ── CREATE INDEX statements ─────────────────────────────────────────────

  for (const tableName of ordered) {
    const tableDef = SCHEMA[tableName as keyof typeof SCHEMA] as { indexes: readonly { columns: readonly string[]; unique: boolean; name?: string }[] };

    for (const idx of tableDef.indexes) {
      // Skip primary key indexes (already handled by PRIMARY KEY constraint)
      if (
        idx.columns.length === 1 &&
        idx.columns[0] === "id" &&
        idx.unique &&
        idx.name?.endsWith("_pkey")
      ) {
        continue;
      }

      const indexName =
        idx.name ?? `${tableName}_${idx.columns.join("_")}_idx`;
      const uniqueStr = idx.unique ? "UNIQUE " : "";
      const colList = idx.columns.join(", ");

      statements.push(
        `CREATE ${uniqueStr}INDEX IF NOT EXISTS ${indexName} ON ${tableName} (${colList});`,
      );
    }
    statements.push("");
  }

  // ── updated_at trigger function ─────────────────────────────────────────
  //
  // Guarded create instead of CREATE OR REPLACE. On managed Postgres (Supabase)
  // the function can already exist from a prior migration and be owned by a
  // different role; CREATE OR REPLACE then fails with "must be owner of
  // function set_updated_at", aborting the whole idempotent migration. A
  // NOT EXISTS guard needs no ownership when the function is already present,
  // and the body is stable so there is nothing to replace.

  statements.push(
    `DO $$\n` +
      `BEGIN\n` +
      `  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at') THEN\n` +
      `    CREATE FUNCTION set_updated_at()\n` +
      `    RETURNS TRIGGER AS $fn$\n` +
      `    BEGIN\n` +
      `      NEW.updated_at = now();\n` +
      `      RETURN NEW;\n` +
      `    END;\n` +
      `    $fn$ LANGUAGE plpgsql;\n` +
      `  END IF;\n` +
      `END $$;`,
  );
  statements.push("");

  // Add updated_at triggers for tables that have an updated_at column
  for (const tableName of ordered) {
    const tableDef = SCHEMA[tableName as keyof typeof SCHEMA];
    if ("updated_at" in tableDef.columns) {
      const triggerName = `${tableName}_updated_at`;
      statements.push(
        `DO $$ BEGIN\n` +
          `  IF NOT EXISTS (\n` +
          `    SELECT 1 FROM pg_trigger WHERE tgname = '${triggerName}'\n` +
          `  ) THEN\n` +
          `    CREATE TRIGGER ${triggerName}\n` +
          `      BEFORE UPDATE ON ${tableName}\n` +
          `      FOR EACH ROW EXECUTE FUNCTION set_updated_at();\n` +
          `  END IF;\n` +
          `END $$;`,
      );
    }
  }
  statements.push("");

  // ── Row-Level Security (RLS) Policies ──────────────────────────────────

  statements.push("-- Row-Level Security for multi-tenant isolation");
  statements.push("");

  // Function to set the tenant context for the current transaction
  statements.push(
    `CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id TEXT)\n` +
      `RETURNS VOID AS $$\n` +
      `BEGIN\n` +
      `  PERFORM set_config('app.tenant_id', tenant_id, true);\n` +
      `END;\n` +
      `$$ LANGUAGE plpgsql;`,
  );
  statements.push("");

  // Tables that require RLS with a direct business_id column.
  // campaign_submissions is isolated transitively via launched_campaigns.
  const rlsTables = ["launched_campaigns", "perk_wallets", "api_keys", "webhooks", "platform_connections"];

  for (const tableName of rlsTables) {
    // Only apply if the table exists in the schema
    if (!ordered.includes(tableName)) continue;

    // Enable RLS on the table
    statements.push(`ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY;`);

    // Force RLS for table owners too (prevents bypasses)
    statements.push(
      `ALTER TABLE ${tableName} FORCE ROW LEVEL SECURITY;`,
    );

    // SELECT policy: only return rows belonging to the current tenant
    const selectPolicyName = `${tableName}_tenant_select`;
    statements.push(
      `DO $$ BEGIN\n` +
        `  IF NOT EXISTS (\n` +
        `    SELECT 1 FROM pg_policies WHERE policyname = '${selectPolicyName}'\n` +
        `  ) THEN\n` +
        `    CREATE POLICY ${selectPolicyName}\n` +
        `      ON ${tableName}\n` +
        `      FOR SELECT\n` +
        `      USING (business_id::text = current_setting('app.tenant_id', true));\n` +
        `  END IF;\n` +
        `END $$;`,
    );

    // INSERT policy: only allow inserting rows for the current tenant
    const insertPolicyName = `${tableName}_tenant_insert`;
    statements.push(
      `DO $$ BEGIN\n` +
        `  IF NOT EXISTS (\n` +
        `    SELECT 1 FROM pg_policies WHERE policyname = '${insertPolicyName}'\n` +
        `  ) THEN\n` +
        `    CREATE POLICY ${insertPolicyName}\n` +
        `      ON ${tableName}\n` +
        `      FOR INSERT\n` +
        `      WITH CHECK (business_id::text = current_setting('app.tenant_id', true));\n` +
        `  END IF;\n` +
        `END $$;`,
    );

    // UPDATE policy: only allow updating rows belonging to the current tenant
    const updatePolicyName = `${tableName}_tenant_update`;
    statements.push(
      `DO $$ BEGIN\n` +
        `  IF NOT EXISTS (\n` +
        `    SELECT 1 FROM pg_policies WHERE policyname = '${updatePolicyName}'\n` +
        `  ) THEN\n` +
        `    CREATE POLICY ${updatePolicyName}\n` +
        `      ON ${tableName}\n` +
        `      FOR UPDATE\n` +
        `      USING (business_id::text = current_setting('app.tenant_id', true))\n` +
        `      WITH CHECK (business_id::text = current_setting('app.tenant_id', true));\n` +
        `  END IF;\n` +
        `END $$;`,
    );

    // DELETE policy: only allow deleting rows belonging to the current tenant
    const deletePolicyName = `${tableName}_tenant_delete`;
    statements.push(
      `DO $$ BEGIN\n` +
        `  IF NOT EXISTS (\n` +
        `    SELECT 1 FROM pg_policies WHERE policyname = '${deletePolicyName}'\n` +
        `  ) THEN\n` +
        `    CREATE POLICY ${deletePolicyName}\n` +
        `      ON ${tableName}\n` +
        `      FOR DELETE\n` +
        `      USING (business_id::text = current_setting('app.tenant_id', true));\n` +
        `  END IF;\n` +
        `END $$;`,
    );

    statements.push("");
  }

  return statements.join("\n");
}

// ─── Migration Name ─────────────────────────────────────────────────────────

/**
 * Deterministic migration identifier based on the schema content.
 * Changes when tables, columns, indexes, or types change.
 */
function schemaMigrationName(): string {
  // Build a stable fingerprint from the schema structure
  const parts: string[] = [];
  for (const tableName of TABLE_NAMES) {
    const tableDef = SCHEMA[tableName] as { columns: Record<string, { type: string; nullable: boolean; default?: string; references?: { table: string; column: string } }>; indexes: readonly { columns: readonly string[]; unique: boolean; name?: string }[] };
    parts.push(`table:${tableName}`);
    for (const [colName, col] of Object.entries(tableDef.columns)) {
      parts.push(`  col:${colName}:${col.type}:${col.nullable}:${col.default ?? ""}:${col.references ? `${col.references.table}.${col.references.column}` : ""}`);
    }
    for (const idx of tableDef.indexes) {
      parts.push(`  idx:${idx.name ?? idx.columns.join("_")}:${idx.unique}:${idx.columns.join(",")}`);
    }
  }
  const content = parts.join("\n");

  // Simple hash: DJB2
  let hash = 5381;
  for (let i = 0; i < content.length; i++) {
    hash = ((hash << 5) + hash + content.charCodeAt(i)) & 0xffffffff;
  }
  const hashHex = (hash >>> 0).toString(16).padStart(8, "0");

  return `schema_auto_${hashHex}`;
}

// ─── Migrations Tracking ────────────────────────────────────────────────────

const TRACKING_TABLE_DDL = `
CREATE TABLE IF NOT EXISTS _migrations (
  version     INT          PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  applied_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  checksum    VARCHAR(64),
  duration_ms INT
);
`;

/**
 * Ensure the _migrations table exists.
 */
async function ensureTrackingTable(conn: DatabaseConnection): Promise<void> {
  if (conn instanceof InMemoryConnection) return;
  await conn.query(TRACKING_TABLE_DDL);
  // Add checksum and duration_ms columns if they don't exist (backwards compat)
  await conn.query(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = '_migrations' AND column_name = 'checksum'
      ) THEN
        ALTER TABLE _migrations ADD COLUMN checksum VARCHAR(64);
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = '_migrations' AND column_name = 'duration_ms'
      ) THEN
        ALTER TABLE _migrations ADD COLUMN duration_ms INT;
      END IF;
    END $$;
  `);
}

/**
 * Check if a schema migration with the given name has already been applied.
 */
async function isSchemaApplied(
  conn: DatabaseConnection,
  name: string,
): Promise<boolean> {
  if (conn instanceof InMemoryConnection) {
    return inMemoryMigrations.some((m) => m.name === name);
  }
  const result = await conn.query<{ name: string }>(
    "SELECT name FROM _migrations WHERE name = $1",
    [name],
  );
  return result.rows.length > 0;
}

/**
 * Get the next available version number.
 */
async function nextVersion(conn: DatabaseConnection): Promise<number> {
  if (conn instanceof InMemoryConnection) {
    if (inMemoryMigrations.length === 0) return 100;
    return Math.max(...inMemoryMigrations.map((m) => m.version)) + 1;
  }
  const result = await conn.query<{ max_version: number }>(
    "SELECT COALESCE(MAX(version), 99) as max_version FROM _migrations",
  );
  return (result.rows[0]?.max_version ?? 99) + 1;
}

// In-memory tracking for InMemoryConnection
const inMemoryMigrations: Array<{
  version: number;
  name: string;
  applied_at: string;
  checksum: string | null;
  duration_ms: number | null;
}> = [];

// ─── Public API ─────────────────────────────────────────────────────────────

export interface MigrationResult {
  success: boolean;
  migrationName: string;
  version: number;
  tablesCreated: string[];
  indexesCreated: number;
  durationMs: number;
  skipped: boolean;
  error?: string;
}

/**
 * Run the schema migration.
 *
 * - Creates the _migrations tracking table if it doesn't exist
 * - Generates DDL from the SCHEMA object
 * - Wraps the DDL in a transaction
 * - Only runs if not already applied (checks by migration name)
 * - Returns the result
 *
 * @param conn - Optional database connection (defaults to the singleton `db`)
 */
export async function runMigrations(
  conn: DatabaseConnection = db,
): Promise<MigrationResult> {
  const migrationName = schemaMigrationName();
  const tableNames = Object.keys(SCHEMA);
  const totalIndexes = Object.values(SCHEMA).reduce(
    (sum, t) => sum + t.indexes.filter((idx) => !(idx.columns.length === 1 && idx.columns[0] === "id" && idx.unique)).length,
    0,
  );
  const start = performance.now();

  try {
    await ensureTrackingTable(conn);

    // Check if already applied
    const alreadyApplied = await isSchemaApplied(conn, migrationName);
    if (alreadyApplied) {
      return {
        success: true,
        migrationName,
        version: 0,
        tablesCreated: [],
        indexesCreated: 0,
        durationMs: Math.round(performance.now() - start),
        skipped: true,
      };
    }

    const ddl = generateSQL();

    if (conn instanceof InMemoryConnection) {
      // InMemoryConnection cannot execute SQL; just record it
      const version = await nextVersion(conn);
      inMemoryMigrations.push({
        version,
        name: migrationName,
        applied_at: new Date().toISOString(),
        checksum: null,
        duration_ms: Math.round(performance.now() - start),
      });

      return {
        success: true,
        migrationName,
        version,
        tablesCreated: tableNames,
        indexesCreated: totalIndexes,
        durationMs: Math.round(performance.now() - start),
        skipped: false,
      };
    }

    // Run within a transaction for atomicity
    const tx: TransactionClient = await conn.transaction("serializable");
    try {
      await tx.query(ddl);

      // Record the migration
      const version = await nextVersion(conn);
      const durationMs = Math.round(performance.now() - start);
      await tx.query(
        "INSERT INTO _migrations (version, name, applied_at, checksum, duration_ms) VALUES ($1, $2, now(), $3, $4)",
        [version, migrationName, null, durationMs],
      );

      await tx.commit();

      return {
        success: true,
        migrationName,
        version,
        tablesCreated: tableNames,
        indexesCreated: totalIndexes,
        durationMs,
        skipped: false,
      };
    } catch (err) {
      await tx.rollback();
      throw err;
    }
  } catch (err) {
    const durationMs = Math.round(performance.now() - start);
    return {
      success: false,
      migrationName,
      version: 0,
      tablesCreated: [],
      indexesCreated: 0,
      durationMs,
      skipped: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Check the current migration state without running anything.
 *
 * @param conn - Optional database connection (defaults to the singleton `db`)
 */
export async function getMigrationState(
  conn: DatabaseConnection = db,
): Promise<{
  currentSchemaName: string;
  isApplied: boolean;
  appliedMigrations: Array<{
    version: number;
    name: string;
    applied_at: string;
    duration_ms: number | null;
  }>;
  tableCount: number;
  tableNames: string[];
}> {
  const migrationName = schemaMigrationName();

  try {
    await ensureTrackingTable(conn);

    let appliedMigrations: Array<{
      version: number;
      name: string;
      applied_at: string;
      duration_ms: number | null;
    }> = [];

    if (conn instanceof InMemoryConnection) {
      appliedMigrations = inMemoryMigrations.map((m) => ({
        version: m.version,
        name: m.name,
        applied_at: m.applied_at,
        duration_ms: m.duration_ms,
      }));
    } else {
      const result = await conn.query<{
        version: number;
        name: string;
        applied_at: string;
        duration_ms: number | null;
      }>(
        "SELECT version, name, applied_at, duration_ms FROM _migrations ORDER BY version",
      );
      appliedMigrations = result.rows;
    }

    const isApplied = appliedMigrations.some((m) => m.name === migrationName);

    return {
      currentSchemaName: migrationName,
      isApplied,
      appliedMigrations,
      tableCount: TABLE_NAMES.length,
      tableNames: [...TABLE_NAMES] as string[],
    };
  } catch {
    // If _migrations table doesn't exist yet, nothing is applied
    return {
      currentSchemaName: migrationName,
      isApplied: false,
      appliedMigrations: [],
      tableCount: TABLE_NAMES.length,
      tableNames: [...TABLE_NAMES] as string[],
    };
  }
}
