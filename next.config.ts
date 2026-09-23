import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.truzov.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      // Local/demo only: the backend's seed data (db/seed/data.sql) points product and banner
      // images at placehold.co. Without this entry next/image throws on every seeded product
      // and the whole catalogue fails to render against a freshly seeded database.
      { protocol: 'https', hostname: 'placehold.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
    formats: ['image/avif', 'image/webp'],
  },
};

export default nextConfig;
