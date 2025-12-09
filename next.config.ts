import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: false, // Disable to prevent double mounting in development
  output: 'standalone', // Required for Docker deployment
};

export default nextConfig;
