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
      PrismaClient: new () => PrismaClientInstance;
    };
    return new PrismaClient();
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
