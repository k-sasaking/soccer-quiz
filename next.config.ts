import type { NextConfig } from "next";

// GitHub Pages のようにサブパス配下で公開するときは BASE_PATH を指定する
// 例: BASE_PATH=/soccer-quiz npm run build
const basePath = process.env.BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
