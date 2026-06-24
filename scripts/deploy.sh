#!/bin/bash
set -e

REPO_DIR="/home/ec2-user/proof360"
API_DIR="$REPO_DIR/api"
FRONTEND_DIR="$REPO_DIR/frontend"
PM2_NAME="proof360"
SSM_PREFIX="/proof360"

# Canonical production pm2 daemon is the ROOT daemon at /etc/.pm2 — NOT ec2-user's ~/.pm2.
# This script runs as ec2-user (re-invoked at top for git ownership), so every pm2 call MUST
# target the root daemon explicitly. Otherwise pm2 spawns a rogue ec2-user daemon whose
# proof360 can never bind :3002 (root daemon holds it) and EADDRINUSE-loops forever, while
# the live API silently runs stale code. See memory project_ec2_dual_pm2_daemon.
PM2="sudo env PM2_HOME=/etc/.pm2 pm2"

# If running as root (e.g. via SSM), re-invoke as ec2-user so git ownership checks pass
if [ "$(id -u)" = "0" ]; then
  chown -R ec2-user:ec2-user $REPO_DIR 2>/dev/null || true
  exec su - ec2-user -c "cd $REPO_DIR && git pull origin main && bash scripts/deploy.sh"
fi

echo "==> Pulling latest"
cd $REPO_DIR
git config --global --add safe.directory $REPO_DIR 2>/dev/null || true
git pull origin main

echo "==> Loading secrets from SSM"
# Optional secret: empty is allowed, but always log a visible WARN so a
# missing/failed fetch never silently writes a blank key into .env.
get_ssm() {
  local val
  val=$(aws ssm get-parameter \
    --region ap-southeast-2 \
    --name "$1" \
    --with-decryption \
    --query "Parameter.Value" \
    --output text 2>/dev/null) || val=""
  if [ -z "$val" ] || [ "$val" = "None" ]; then
    echo "WARN: SSM param $1 is empty or missing — value left blank" >&2
    val=""
  fi
  echo "$val"
}

# Required secret: deploy aborts if absent. The API is non-functional without these.
require_ssm() {
  local val
  val=$(get_ssm "$1")
  if [ -z "$val" ]; then
    echo "FATAL: required SSM param $1 is missing — aborting deploy" >&2
    exit 1
  fi
  echo "$val"
}

PORT=$(get_ssm "$SSM_PREFIX/PORT")
FIRECRAWL_API_KEY=$(get_ssm "$SSM_PREFIX/FIRECRAWL_API_KEY")
FIRECRAWL_API_URL=$(get_ssm "$SSM_PREFIX/FIRECRAWL_API_URL")
ANTHROPIC_API_KEY=$(require_ssm "/ethikslabs/anthropic/api-key")
ABUSEIPDB_API_KEY=$(get_ssm "$SSM_PREFIX/ABUSEIPDB_API_KEY")
HIBP_API_KEY=$(get_ssm "$SSM_PREFIX/HIBP_API_KEY")
VERITAS_URL=$(get_ssm "$SSM_PREFIX/VERITAS_URL")
VERITAS_API_KEY=$(get_ssm "$SSM_PREFIX/VERITAS_API_KEY")
TELEGRAM_BOT_TOKEN=$(get_ssm "$SSM_PREFIX/TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID=$(get_ssm "$SSM_PREFIX/TELEGRAM_CHAT_ID")
# Centralised keys (no per-repo duplication): read from /ethikslabs/* like ANTHROPIC above.
# The old /proof360/{perplexity,gemini}-api-key paths were never populated.
PERPLEXITY_API_KEY=$(get_ssm "/ethikslabs/perplexity/api-key")
GEMINI_API_KEY=$(get_ssm "/ethikslabs/gemini/api-key")
AUTH0_DOMAIN=$(require_ssm "$SSM_PREFIX/AUTH0_DOMAIN")
AUTH0_AUDIENCE=$(require_ssm "$SSM_PREFIX/AUTH0_AUDIENCE")
MEMORY_STORE_DIR="/home/ec2-user/.ethikslabs/proof360/memory"
mkdir -p "$MEMORY_STORE_DIR"
# TODO: v3 Postgres handlers (override/recompute/publish/engage) read PG_HOST/
# PG_PORT/PG_DATABASE/PG_USER/PG_PASSWORD from env but these are NOT fetched here.
# Add require_ssm fetches once the /proof360/postgres/* SSM paths are confirmed.

# Write .env for pm2 to pick up
cat > "$API_DIR/.env" <<EOF
PORT=${PORT:-3002}
FIRECRAWL_API_KEY=$FIRECRAWL_API_KEY
FIRECRAWL_API_URL=$FIRECRAWL_API_URL
ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY
ABUSEIPDB_API_KEY=$ABUSEIPDB_API_KEY
HIBP_API_KEY=$HIBP_API_KEY
VERITAS_URL=$VERITAS_URL
VERITAS_API_KEY=$VERITAS_API_KEY
TELEGRAM_BOT_TOKEN=$TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID=$TELEGRAM_CHAT_ID
PERPLEXITY_API_KEY=$PERPLEXITY_API_KEY
GEMINI_API_KEY=$GEMINI_API_KEY
AUTH0_DOMAIN=$AUTH0_DOMAIN
AUTH0_AUDIENCE=$AUTH0_AUDIENCE
MEMORY_STORE_DIR=$MEMORY_STORE_DIR
LOG_LEVEL=info
EOF

echo "==> Installing API dependencies"
cd $API_DIR
npm install --production

echo "==> Building frontend"
cd $FRONTEND_DIR
npm install
npm run build

echo "==> Restarting API (root daemon /etc/.pm2)"
if $PM2 describe $PM2_NAME > /dev/null 2>&1; then
  $PM2 startOrRestart $API_DIR/ecosystem.config.cjs --update-env
else
  $PM2 start $API_DIR/ecosystem.config.cjs
fi
$PM2 save

echo "==> Applying nginx config"
sudo cp $REPO_DIR/scripts/nginx-proof360.conf /etc/nginx/conf.d/proof360.conf
sudo nginx -t
sudo systemctl reload nginx

echo "==> Done"
$PM2 status $PM2_NAME

echo "==> Verifying API health"
sleep 3
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:${PORT:-3002}/api/health 2>/dev/null)
if [ "$STATUS" = "200" ]; then
  echo "API healthy"
else
  echo "WARNING: /health returned $STATUS — check pm2 logs $PM2_NAME"
fi
