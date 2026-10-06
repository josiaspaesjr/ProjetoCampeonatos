import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite (banco dev) carrega WASM via import.meta.url — não pode ser bundlado
  serverExternalPackages: ["@electric-sql/pglite"],
  // upload da imagem de capa vai junto no form do evento (já reduzida no
  // navegador); a Vercel limita o corpo da função a 4,5 MB
  experimental: {
    serverActions: { bodySizeLimit: "4mb" },
  },
  // abas públicas renomeadas/fundidas — links antigos continuam valendo
  async redirects() {
    return [
      // o catálogo de eventos virou a home; /eventos continua valendo
      {
        source: "/eventos",
        destination: "/",
        permanent: true,
      },
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
