/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  reactStrictMode: false,
  swcMinify: true,
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
