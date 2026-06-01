/**
 * MediCard 医杀 — PM2 Cluster Config
 * Target: Ubuntu 22.04, 2-core 2GB RAM
 * Usage:  pm2 start ecosystem.config.js
 *         pm2 save && pm2 startup
 */
module.exports = {
  apps: [{
    name: 'medicard',
    script: 'server.js',
    cwd: '/home/ubuntu/medcardgame',
    instances: 2,              // Cluster mode — 1 per CPU core
    exec_mode: 'cluster',
    max_memory_restart: '1500M', // Restart if > 1.5 GB
    max_restarts: 10,
    restart_delay: 5000,
    min_uptime: '10s',
    listen_timeout: 10000,
    kill_timeout: 8000,

    // Environment
    env: {
      NODE_ENV: 'production',
      PORT: 8080,
      PEER_PORT: 9000,
      UV_THREADPOOL_SIZE: 4
    },

    // Logging
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: '/home/ubuntu/medcardgame/logs/pm2-error.log',
    out_file: '/home/ubuntu/medcardgame/logs/pm2-out.log',
    merge_logs: true,
    log_type: 'json',

    // Rotate logs (keep 10 files of 5MB each = 50MB max)
    max_size: '5M',
    retain: 10,

    // Auto-restart on file change (dev only — set to false in production)
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'data', '.git'],

    // Graceful shutdown
    kill_retry_time: 100,
    wait_ready: true,

    // Node arguments
    node_args: '--max-old-space-size=1536 --optimize-for-size'
  }]
};
