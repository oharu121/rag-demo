import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:7860",
  },
  // Fix Turbopack path alias resolution (top-level in Next.js 16)
  turbopack: {
    resolveAlias: {
      "@/lib/*": "./lib/*",
      "@/hooks/*": "./hooks/*",
      "@/app/*": "./app/*",
    },
  },
};

export default nextConfig;
