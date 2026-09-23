import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv();
import { defineConfig } from "prisma/config";

// Prisma 7: CLI (migrate/studio) baglantisi buradan okunur.
// DIKKAT: env("DATABASE_URL") degisken yokken FIRLATIR ve postinstall'daki
// `prisma generate` uzerinden tum Vercel build'ini cokertir. Bu yuzden process.env.
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // Neon entegrasyonu projeye gore farkli adlar enjekte edebiliyor; hepsini dene.
    // Migration icin havuzsuz (unpooled / non-pooling) baglanti tercih edilir.
    url:
      process.env.DATABASE_URL_UNPOOLED ??
      process.env.POSTGRES_URL_NON_POOLING ??
      process.env.DATABASE_URL ??
      process.env.POSTGRES_URL ??
      "",
  },
});
