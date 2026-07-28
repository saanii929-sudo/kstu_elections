import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a self-contained .next/standalone build (server + only the
  // node_modules it actually needs) so the Docker runtime image doesn't
  // have to ship the full node_modules tree.
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pub-114c6506dd8241f4aaf172d7be4a3ec1.r2.dev',
      },
    ],
  },
  // Security: prevent source maps in production
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  // Performance: keep serverless functions warm longer
  serverExternalPackages: ['mongoose'],
};

export default nextConfig;
