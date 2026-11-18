import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // A shared invite link (/join/PKX4QZ) opens the office door with the code filled in.
  redirects() {
    return [{ source: "/join/:code", destination: "/office?code=:code", permanent: false }];
  },
  // Keep the dev badge away from the sidebar's profile link.
  devIndicators: { position: "bottom-right" },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
