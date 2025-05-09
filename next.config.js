/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // 在 Vercel 上部署，如果没有使用自定义 image loader，可以设为 true
    unoptimized: true,
  },
  swcMinify: true,
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  // ⚠️ 确保没有 output: 'export'，也不要使用 next export
}

module.exports = nextConfig
