import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Neon's connection string includes `channel_binding=require`, which the Prisma CLI's
// schema engine cannot negotiate (P1001 "Can't reach database server"). The app's
// `pg` driver handles it fine, so strip it only here, for migrate/status/diff.
const databaseUrl = new URL(env("DATABASE_URL"));
databaseUrl.searchParams.delete("channel_binding");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl.toString(),
  },
});
