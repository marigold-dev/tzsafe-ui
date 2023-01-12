/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  async rewrites() {
    return [
      {
        source: '/releases/:path*',
        destination: 'http://api.github.com/repos/marigold-dev/multisig/releases/download/:path*',
      },
      {
        source: '/api/:slug*',
        destination: 'http://localhost:3001/api/:slug*',
      },
    ]
  },
}

module.exports = nextConfig
