#!/bin/bash
set -e

REPO_DIR="/home/ec2-user/proof360"
API_DIR="$REPO_DIR/api"
FRONTEND_DIR="$REPO_DIR/frontend"
PM2_NAME="proof360-api"
SSM_PREFIX="/proof360"

echo "==> Pulling latest"
cd $REPO_DIR
git config --global --add safe.directory $REPO_DIR 2>/dev/null || true
git pull origin main

echo "==> Loading secrets from SSM"
get_ssm() {
  aws ssm get-parameter \
    --region ap-southeast-2 \
    --name "$1" \
    --with-decryption \
    --query "Parameter.Value" \
    --output text 2>/dev/null || echo ""
}

FIRECRAWL_API_KEY=$(get_ssm "$SSM_PREFIX/FIRECRAWL_API_KEY")
FIRECRAWL_API_URL=$(get_ssm "$SSM_PREFIX/FIRECRAWL_API_URL")
ANTHROPIC_API_KEY=$(get_ssm "/ethikslabs/anthropic/api-key")
PORT=$(get_ssm "$SSM_PREFIX/PORT")
PORT=${PORT:-3002}

# Write .env for pm2 to pick up
cat > "$API_DIR/.env" <<EOF
PORT=$PORT
FIRECRAWL_API_KEY=$FIRECRAWL_API_KEY
FIRECRAWL_API_URL=$FIRECRAWL_API_URL
ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY
LOG_LEVEL=info
EOF

echo "==> Installing API dependencies"
cd $API_DIR
npm install --production

echo "==> Building frontend"
cd $FRONTEND_DIR
npm install
npm run build

echo "==> Restarting API"
if pm2 describe $PM2_NAME > /dev/null 2>&1; then
  pm2 restart $PM2_NAME --update-env
else
  pm2 start src/server.js --name $PM2_NAME --cwd $API_DIR
fi
pm2 save

echo "==> Reloading nginx"
sudo systemctl reload nginx

echo "==> Done"
pm2 status $PM2_NAME

echo "==> Verifying API health"
sleep 3
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT/api/v1/session/__healthcheck__/infer-status 2>/dev/null)
if [ "$STATUS" = "404" ]; then
  echo "API responding (404 = session not found = healthy)"
else
  echo "WARNING: Unexpected status $STATUS — check pm2 logs $PM2_NAME"
fi
