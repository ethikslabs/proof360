module.exports = {
  apps: [{
    name: 'proof360',
    script: 'src/server.js',
    exec_mode: 'fork',
    instances: 1,
    autorestart: true,
    max_memory_restart: '256M',
    exp_backoff_restart_delay: 1000,
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    max_size: '10M',
    retain: 5,
    env: {
      NODE_ENV: 'production',
      PORT: '3002',
      AWS_REGION: 'ap-southeast-2'
    }
  }]
}
