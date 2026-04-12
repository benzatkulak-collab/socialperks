/**
 * Prisma Client Singleton for Next.js
 *
 * Creates a real PrismaClient when DATABASE_URL is set.
 * Otherwise exports null so repositories fall back to InMemoryConnection.
 *
 * Uses the globalThis trick to prevent multiple instances during Next.js
 * hot module replacement in development.
 */

// Use a generic type to avoid compile-time dependency on @prisma/client.
// At runtime, the actual PrismaClient type is used when the module is available.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaClientInstance = any;

function createPrismaClient(): PrismaClientInstance | null {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaClient } = require("@prisma/client") as {
      PrismaClient: new (opts?: { log?: string[] }) => PrismaClientInstance;
    };
    return new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    });
  } catch {
    // @prisma/client not generated yet — fall back to null
    return null;
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientInstance | null;
};

export const prisma: PrismaClientInstance | null =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Check if Prisma can reach the database by executing `SELECT 1`.
 * Returns { connected: true, latencyMs } on success,
 * or { connected: false, latencyMs, error } on failure.
 */
export async function checkPrismaHealth(): Promise<{
  connected: boolean;
  latencyMs: number;
  error?: string;
}> {
  if (!prisma) {
    return { connected: false, latencyMs: 0, error: "Prisma client not initialized" };
  }

  const start = performance.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { connected: true, latencyMs: Math.round(performance.now() - start) };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return {
      connected: false,
      latencyMs: Math.round(performance.now() - start),
      error: message,
    };
  }
}
