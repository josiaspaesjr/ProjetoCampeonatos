import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite (banco dev) carrega WASM via import.meta.url — não pode ser bundlado
  serverExternalPackages: ["@electric-sql/pglite"],
  // abas públicas renomeadas/fundidas — links antigos continuam valendo
  async redirects() {
    return [
      {
        source: "/evento/:slug/atletas",
        destination: "/evento/:slug/checagem",
        permanent: true,
      },
      {
        source: "/evento/:slug/lutas",
        destination: "/evento/:slug/cronograma",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
