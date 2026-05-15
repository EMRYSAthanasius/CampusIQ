import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse-fork"],
  outputFileTracingIncludes: {
    '/api/parse-pdf': ['./node_modules/pdf-parse-fork/**/*'],
  },
};

export default nextConfig;
