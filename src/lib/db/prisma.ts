/**
 * Prisma Client Singleton for Next.js
 *
 * Placeholder until `npx prisma generate` is run with a real DATABASE_URL.
 * The app uses InMemoryConnection in repositories until Prisma is configured.
 *
 * To activate:
 * 1. Run `npx prisma generate`
 * 2. Run `npx prisma db push` (or `migrate dev`)
 * 3. Replace this file's export with a real PrismaClient instance
 */

// Prisma is not yet configured — export null.
// Repositories detect this and fall back to InMemoryConnection.
export const prisma: unknown = null;
