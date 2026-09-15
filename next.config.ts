import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Transformers.js loads ONNX weights from disk at runtime; bundling it breaks
  // both the native runtime and the model cache lookup.
  serverExternalPackages: ['@xenova/transformers', 'onnxruntime-node', 'sharp'],
  webpack: (config, { isServer }) => {
    // Node built-ins are unavailable in the browser bundle only — stubbing them
    // on the server would break anything that actually reads from disk.
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    return config;
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default config;
