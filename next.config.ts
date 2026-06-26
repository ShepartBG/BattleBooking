import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // BattleBooking Beta: keep production builds unblocked by ESLint warnings/errors.
    // We still fix critical issues in code, but deploy should not stop on lint-only rules.
    ignoreDuringBuilds: true,
  },
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
