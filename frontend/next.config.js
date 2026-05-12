/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://185.202.239.239:8080/api/:path*',
      },
    ]
  },
}
module.exports = nextConfig
