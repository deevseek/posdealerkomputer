// PM2 Configuration for Production Deployment
module.exports = {
  apps: [{
    name: 'laptoppos',
    script: 'dist/index.js',
    cwd: '/path/to/your/laptoppos',
    instances: 'max',
    exec_mode: 'cluster',
    
    // Environment variables
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    
    // Restart conditions
    max_memory_restart: '1G',
    restart_delay: 4000,
    max_restarts: 5,
    min_uptime: '10s',
    
    // Logs
    log_file: 'logs/combined.log',
    out_file: 'logs/out.log',
    error_file: 'logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Auto restart
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'uploads', 'temp'],
    
    // Advanced
    kill_timeout: 5000,
    listen_timeout: 8000,
    
    // Health monitoring
    health_check_grace_period: 3000,
  }]
};