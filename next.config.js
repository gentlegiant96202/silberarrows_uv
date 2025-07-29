/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    esmExternals: true
  },
  // Optimize build traces collection
  outputFileTracing: true,
  // Reduce bundle size and improve build performance
  swcMinify: true,
  // Configure webpack to avoid circular dependencies
  webpack: (config, { dev, isServer }) => {
    // Optimize for production builds
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        moduleIds: 'deterministic',
      };
    }
    
    // Exclude problematic files from build traces
    config.watchOptions = {
      ...config.watchOptions,
      ignored: [
        '**/node_modules/**',
        '**/.next/**',
        '**/.git/**',
        '**/database/**',
        '**/*.sql',
        '**/*.log',
        '**/docs/**'
      ]
    };
    
    return config;
  },
};

module.exports = nextConfig; 