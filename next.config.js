/** @type {import('next').NextConfig} */
const nextConfig = {
  // 移除 output: 'export'，因为 Vercel 会自动处理构建输出
  images: {
    unoptimized: true
  },
  // 添加性能优化配置
  swcMinify: true,
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
}

module.exports = nextConfig