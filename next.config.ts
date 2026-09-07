import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.NEXT_EXPORT === 'true' ? { output: "export" } : {}),
  images: {
    unoptimized: true
  },
  allowedDevOrigins: ["192.168.29.125", "localhost", "127.0.0.1", "0.0.0.0"]
};

export default nextConfig;
