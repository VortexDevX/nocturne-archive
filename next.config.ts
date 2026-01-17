import type { NextConfig } from "next";
// Wrap using the config factory exported by @ducanh2912/next-pwa
import pwa from "./next.config.pwa.mjs";

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default pwa(nextConfig);
