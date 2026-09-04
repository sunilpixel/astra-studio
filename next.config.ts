import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Editorial photography is served from the Unsplash CDN.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.pexels.com",
        pathname: "/videos/**",
      },
    ],
    // Next 16 restricts qualities to [75] by default; we grade imagery heavily
    // so a higher ceiling is worth the bytes on the hero-scale plates.
    qualities: [60, 75, 90],
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
