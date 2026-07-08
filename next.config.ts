import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite (banco dev) carrega WASM via import.meta.url — não pode ser bundlado
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
