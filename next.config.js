/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["192.168.1.166"],
  outputFileTracingIncludes: {
    "/api/subway-vehicles": ["./data/transit/subway-index.json"],
  },
};

module.exports = nextConfig;
