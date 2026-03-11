import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Keep Telegram Mini App rendering reliable on small VPS builds
    // by serving static image assets directly instead of runtime optimization.
    unoptimized: true,
  },
};

export default nextConfig;
