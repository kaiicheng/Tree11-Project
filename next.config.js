/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: true,
  swcMinify: false,

  webpack: (config) => {
    config.module.rules.push({
      test: /\.geojson$/,
      loader: "json-loader",
    });

    return config;
  },
};

module.exports = nextConfig;
