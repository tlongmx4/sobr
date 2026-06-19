import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

// Pin logging to warnings/errors only. Never enable 'query' — query logs include
// chat content and journal entries, which previously leaked to stdout. This also
// stops DEBUG=prisma* from silently re-enabling query logging in any environment.
export const prisma =
    globalForPrisma.prisma ?? new PrismaClient({ log: ['warn', 'error'] });

if (process.env.NODE_ENV !== 'production') { 
    globalForPrisma.prisma = prisma;
}