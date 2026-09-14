import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL tanımlı değil.");
  // DATABASE_SCHEMA yalnizca testte: ayni Neon projesinde ayri bir Postgres semasi
  // (ornek: kurulum sihirbazini bos veritabaninda denemek). Uretimde tanimsiz = public.
  const adapter = new PrismaPg({ connectionString }, process.env.DATABASE_SCHEMA ? { schema: process.env.DATABASE_SCHEMA } : undefined);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
