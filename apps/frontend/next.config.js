/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@qagent/ui'],
  reactStrictMode: true,
  images: {
    remotePatterns: [],
  },
}

module.exports = nextConfig
