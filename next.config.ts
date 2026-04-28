import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Server Actions default to a 1 MB body cap. We accept image uploads
  // (logo / cover / thumbnails) and PDFs in portfolios, so 1 MB is too low.
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
