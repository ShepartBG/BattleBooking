import path from "path";
import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "").hostname;
  } catch {
    return "";
  }
})();

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(__dirname),
  // Used through lib/imageUrl.ts (optimizedImage) for <img> and CSS backgrounds.
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 31,
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseHost || "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
    localPatterns: [{ pathname: "/api/field-media/**" }, { pathname: "/**", search: "" }],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
