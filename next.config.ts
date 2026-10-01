import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// The browser talks to Supabase directly for auth (REST + realtime websocket).
// Every other external call (Gemini, geocoding, prayer times) is made server-side.
const supabaseOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "").origin;
  } catch {
    return "";
  }
})();
const supabaseWs = supabaseOrigin.replace(/^http/, "ws");

/**
 * 'unsafe-inline' for scripts is required by Next's hydration payload and the
 * theme bootstrap script in app/layout.tsx unless every page is rendered with a
 * per-request nonce. The other directives still block the dangerous cases:
 * no third-party script origins, no plugins, no <base> hijacking, no framing.
 * 'unsafe-eval' is only needed by React Refresh in development.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  `connect-src 'self' ${supabaseOrigin} ${supabaseWs}${isDev ? " ws://localhost:* ws://127.0.0.1:*" : ""}`,
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Geolocation stays available to this site (Qibla / prayer times); everything else is off.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), payment=(), usb=(), geolocation=(self), interest-cohort=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

const config: NextConfig = {
  reactStrictMode: true,
  // Don't advertise the framework/version to scanners.
  poweredByHeader: false,
  // Never ship readable source to browsers in production.
  productionBrowserSourceMaps: false,
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
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default config;
