#!/bin/bash
set -e

REPO_DIR="/home/ec2-user/proof360"
API_DIR="$REPO_DIR/api"
FRONTEND_DIR="$REPO_DIR/frontend"
PM2_NAME="proof360"
SSM_PREFIX="/proof360"

# If running as root (e.g. via SSM), re-invoke as ec2-user so git ownership checks pass
if [ "$(id -u)" = "0" ]; then
  chown -R ec2-user:ec2-user $REPO_DIR 2>/dev/null || true
  exec su - ec2-user -c "cd $REPO_DIR && bash scripts/deploy.sh"
fi

echo "==> Pulling latest"
cd $REPO_DIR
git config --global --add safe.directory $REPO_DIR 2>/dev/null || true
git pull origin main

echo "==> Loading secrets from SSM"
get_ssm() {
  local value
  if ! value=$(aws ssm get-parameter \
    --region ap-southeast-2 \
    --name "$1" \
    --with-decryption \
    --query "Parameter.Value" \
    --output text 2>&1); then
    echo "ERROR: SSM parameter '$1' could not be retrieved: $value" >&2
    exit 1
  fi
  if [ -z "$value" ]; then
    echo "ERROR: SSM parameter '$1' is empty" >&2
    exit 1
  fi
  echo "$value"
}

FIRECRAWL_API_KEY=$(get_ssm "$SSM_PREFIX/FIRECRAWL_API_KEY")
FIRECRAWL_API_URL=$(get_ssm "$SSM_PREFIX/FIRECRAWL_API_URL")
ANTHROPIC_API_KEY=$(get_ssm "/ethikslabs/anthropic/api-key")
ABUSEIPDB_API_KEY=$(get_ssm "$SSM_PREFIX/ABUSEIPDB_API_KEY")
PORT=$(get_ssm "$SSM_PREFIX/PORT")

PG_HOST=$(get_ssm "$SSM_PREFIX/postgres/host")
PG_PORT=$(get_ssm "$SSM_PREFIX/postgres/port")
PG_DATABASE=$(get_ssm "$SSM_PREFIX/postgres/database")
PG_USER=$(get_ssm "$SSM_PREFIX/postgres/user")
PG_PASSWORD=$(get_ssm "$SSM_PREFIX/postgres/password")
PG_PORT=${PG_PORT:-5432}
PG_DATABASE=${PG_DATABASE:-proof360}

HIBP_API_KEY=$(get_ssm "$SSM_PREFIX/HIBP_API_KEY")
AI_GATEWAY_URL=$(get_ssm "$SSM_PREFIX/AI_GATEWAY_URL")
NIM_MODEL=$(get_ssm "$SSM_PREFIX/NIM_MODEL")
VERITAS_URL=$(get_ssm "$SSM_PREFIX/VERITAS_URL")
VERITAS_API_KEY=$(get_ssm "$SSM_PREFIX/VERITAS_API_KEY")
TRUST360_URL=$(get_ssm "$SSM_PREFIX/TRUST360_URL")
DASHBOARD_API_URL=$(get_ssm "$SSM_PREFIX/DASHBOARD_API_URL")
PROOF360_ADMIN_KEY=$(get_ssm "$SSM_PREFIX/PROOF360_ADMIN_KEY")
SES_REGION=$(get_ssm "$SSM_PREFIX/SES_REGION")
SES_FROM_ADDRESS=$(get_ssm "$SSM_PREFIX/SES_FROM_ADDRESS")
REPORT_BASE_URL=$(get_ssm "$SSM_PREFIX/REPORT_BASE_URL")
TELEGRAM_BOT_TOKEN=$(get_ssm "$SSM_PREFIX/TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID=$(get_ssm "$SSM_PREFIX/TELEGRAM_CHAT_ID")

# Write .env for pm2 to pick up
cat > "$API_DIR/.env" <<EOF
PORT=$PORT
FIRECRAWL_API_KEY=$FIRECRAWL_API_KEY
FIRECRAWL_API_URL=$FIRECRAWL_API_URL
ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY
ABUSEIPDB_API_KEY=$ABUSEIPDB_API_KEY
HIBP_API_KEY=$HIBP_API_KEY
AI_GATEWAY_URL=$AI_GATEWAY_URL
NIM_MODEL=$NIM_MODEL
VERITAS_URL=$VERITAS_URL
VERITAS_API_KEY=$VERITAS_API_KEY
TRUST360_URL=$TRUST360_URL
DASHBOARD_API_URL=$DASHBOARD_API_URL
PROOF360_ADMIN_KEY=$PROOF360_ADMIN_KEY
SES_REGION=$SES_REGION
SES_FROM_ADDRESS=$SES_FROM_ADDRESS
REPORT_BASE_URL=$REPORT_BASE_URL
TELEGRAM_BOT_TOKEN=$TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID=$TELEGRAM_CHAT_ID
PG_HOST=$PG_HOST
PG_PORT=$PG_PORT
PG_DATABASE=$PG_DATABASE
PG_USER=$PG_USER
PG_PASSWORD=$PG_PASSWORD
LOG_LEVEL=info
EOF

echo "==> Installing API dependencies"
cd $API_DIR
npm install --production

echo "==> Running database migrations"
node --env-file="$API_DIR/.env" scripts/run-migrations.js

echo "==> Building frontend"
cd $FRONTEND_DIR
npm install
npm run build

echo "==> Restarting API"
if pm2 describe $PM2_NAME > /dev/null 2>&1; then
  pm2 startOrRestart $API_DIR/ecosystem.config.cjs --update-env
else
  pm2 start $API_DIR/ecosystem.config.cjs
fi
pm2 save

echo "==> Reloading nginx"
sudo systemctl reload nginx

echo "==> Done"
pm2 status $PM2_NAME

echo "==> Verifying API health"
sleep 3
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT/api/health 2>/dev/null)
if [ "$STATUS" = "200" ]; then
  echo "API healthy"
else
  echo "WARNING: /health returned $STATUS — check pm2 logs $PM2_NAME"
fi
