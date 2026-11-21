import type { NextConfig } from "next";
const config: NextConfig = {
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-better-sqlite3"],
  poweredByHeader: false,
};
export default config;
