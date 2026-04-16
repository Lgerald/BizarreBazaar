import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client/client";

const globalForPrisma = globalThis as unknown as { __prisma?: PrismaClient };

export function getPrisma(): PrismaClient {
  if (globalForPrisma.__prisma) return globalForPrisma.__prisma;
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });
  const prisma = new PrismaClient({ adapter });
  globalForPrisma.__prisma = prisma;
  return prisma;
}
