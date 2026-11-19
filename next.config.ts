import type { NextConfig } from 'next';
import { imageHosts } from './lib/config/image-hosts';

const nextConfig: NextConfig = {
  agentRules: false,
  distDir: process.env.VERCEL ? '.next' : '.next-build',
  turbopack: {
    root: process.cwd(),
  },
  images: {
    remotePatterns: imageHosts.map((hostname) => ({ protocol: 'https', hostname })),
    formats: ['image/avif', 'image/webp'],
  },
};

export default nextConfig;
