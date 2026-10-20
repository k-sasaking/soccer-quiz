import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 画面（app/page.tsx）と API（app/api/v1）を同じサーバーで提供する
  poweredByHeader: false,
};

export default nextConfig;
