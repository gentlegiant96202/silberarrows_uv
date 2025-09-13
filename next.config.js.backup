/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    esmExternals: true
  },
  // Disable problematic output file tracing to prevent stack overflow
  outputFileTracing: false,
  // Reduce bundle size and improve build performance
  swcMinify: true,
  // Optimize images and static files
  images: {
    unoptimized: true // Prevents build issues on Vercel
  },
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
    
    // Prevent circular dependency issues
    config.resolve = {
      ...config.resolve,
      alias: {
        ...config.resolve.alias,
      },
    };
    
    return config;
  },
};

module.exports = nextConfig; 