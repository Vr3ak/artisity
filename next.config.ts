import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Supabase's local site_url is 127.0.0.1, which Next dev otherwise blocks
  allowedDevOrigins: ["127.0.0.1"],
  // Public profile URLs: /@username renders /artists/[id], which also accepts a username
  async rewrites() {
    return [{ source: "/@:username", destination: "/artists/:username" }];
  },
};

export default nextConfig;
