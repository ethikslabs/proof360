module.exports = {
  apps: [{
    name: 'proof360',
    script: 'src/server.js',
    cwd: '/home/ec2-user/proof360/api',
    exec_mode: 'fork',
    instances: 1,
    autorestart: true,
    kill_timeout: 5000,
    max_memory_restart: '256M',
    exp_backoff_restart_delay: 100,
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    node_args: '--env-file=/home/ec2-user/proof360/api/.env',
    env: {
      NODE_ENV: 'production',
    }
  }]
}
