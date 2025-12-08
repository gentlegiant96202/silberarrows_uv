module.exports = {
  apps: [{
    name: 'portal-server',
    script: 'npm',
    args: 'run dev:local',
    cwd: '/Volumes/SilberArrows/CODEBASE/PORTAL NEW NEW',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development',
      PORT: 3000,
      HOST: '127.0.0.1'
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    // Auto-restart on connection drops and crashes
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 4000,
    // Kill timeout for graceful shutdown
    kill_timeout: 5000,
    // Listen for connection drops
    listen_timeout: 10000,
    // Auto-restart if process exits
    exp_backoff_restart_delay: 100
  }]
};



