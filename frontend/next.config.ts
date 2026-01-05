import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tell Next.js to NOT bundle these packages (use Node.js require instead)
  serverExternalPackages: [
    "chromadb",
    "onnxruntime-node",
    "pino",
    "thread-stream",
    "pino-pretty",
  ],

  // Empty turbopack config to acknowledge we're using Turbopack
  turbopack: {},

  webpack: (config, { isServer }) => {
    // Add fallbacks for client-side builds
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        worker_threads: false,
        pino: false,
        "pino-pretty": false,
      };
    }

    // Externalize pino and related packages to prevent bundling issues
    config.externals = config.externals || [];
    config.externals.push({
      pino: "commonjs pino",
      "thread-stream": "commonjs thread-stream",
      "pino-pretty": "commonjs pino-pretty",
    });

    return config;
  },
};

export default nextConfig;
