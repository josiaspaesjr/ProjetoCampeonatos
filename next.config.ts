import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite (banco dev) carrega WASM via import.meta.url — não pode ser bundlado
  serverExternalPackages: ["@electric-sql/pglite"],
  // a aba pública "Atletas" virou "Checagem" — links antigos continuam valendo
  async redirects() {
    return [
      {
        source: "/evento/:slug/atletas",
        destination: "/evento/:slug/checagem",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
