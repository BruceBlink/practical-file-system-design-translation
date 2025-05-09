/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',  // 用于静态导出
  images: {
    unoptimized: true
  }
}

module.exports = nextConfig