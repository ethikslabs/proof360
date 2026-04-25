module.exports = {
  apps: [{
    name: 'proof360',
    script: 'src/server.js',
    cwd: '/home/ec2-user/proof360/api',
    node_args: '--env-file=.env',
    instances: 1,
    autorestart: true,
    max_memory_restart: '256M',
    exp_backoff_restart_delay: 1000,
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    max_size: '10M',
    retain: 5,
    env: {
      NODE_ENV: 'production',
      PORT: '3002'
    }
  }]
}
