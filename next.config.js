/** @type {import('next').NextConfig} */
// Trigger fresh deployment - ensure latest commit is built
const nextConfig = {
  // Turbopack configuration (stable in Next.js 15)
  turbopack: {
    resolveAlias: {
      // Add any custom resolve aliases if needed
    }
  },
  // Optimize for external drive - reduce file system calls
  onDemandEntries: {
    // Keep pages in memory longer (reduce recompilation)
    maxInactiveAge: 60 * 60 * 1000, // 1 hour
    // More pages in memory
    pagesBufferLength: 5,
  },
  // Enable modern image optimization with Sharp
  images: {
    formats: ['image/webp', 'image/avif'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'database.silberarrows.com',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
    domains: ['localhost'],
    // Remove unoptimized: true to use Sharp optimization
  },
  // Configure for better build performance
  // Note: swcMinify is now enabled by default in Next.js 15
  
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