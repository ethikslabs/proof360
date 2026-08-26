module.exports = {
  apps: [{
    name: 'proof360',
    script: 'src/server.js',
    cwd: '/home/ec2-user/proof360/api',
    node_args: '--env-file=/home/ec2-user/proof360/api/.env',
    exec_mode: 'fork',
    instances: 1,
    autorestart: true,
    kill_timeout: 5000,
    // 256M killed the API mid-read, repeatedly, on 2026-08-26. pm2's own log:
    // "restarted because it exceeds --max-memory-restart value
    //  (current_memory=685162496 max_memory_limit=268435456)". A single read
    // peaks ~103MB against a 94MB baseline, so one is nowhere near the line —
    // but two or three concurrent reads clear it and pm2 executes the process
    // mid-scan. The founder then gets nginx's HTML error page parsed as JSON:
    // "Unexpected token '<', \"<!DOCTYPE \"... is not valid JSON".
    // 1G sits above the highest spike measured (685MB) with room for several
    // concurrent reads, and still catches a genuine runaway on a 3.8GB box.
    max_memory_restart: '1G',
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
