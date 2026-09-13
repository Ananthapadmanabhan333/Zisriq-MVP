import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The parent directory (C:\Users\<user>) is itself a git repo with its own
  // package-lock.json, which Turbopack would otherwise consider as a possible
  // workspace root. Pin it to this project so builds are identical everywhere.
  turbopack: { root: process.cwd() },

  // Type errors must fail the build; lint runs as its own CI step.
  typescript: { ignoreBuildErrors: false },

  // Security headers. CSP is added in Phase 6 once every external origin is known.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
