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
  exec su - ec2-user -c "cd $REPO_DIR && git pull origin main && bash scripts/deploy.sh"
fi

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

PORT=$(get_ssm "$SSM_PREFIX/PORT")
FIRECRAWL_API_KEY=$(get_ssm "$SSM_PREFIX/FIRECRAWL_API_KEY")
FIRECRAWL_API_URL=$(get_ssm "$SSM_PREFIX/FIRECRAWL_API_URL")
ANTHROPIC_API_KEY=$(get_ssm "/ethikslabs/anthropic/api-key")
ABUSEIPDB_API_KEY=$(get_ssm "$SSM_PREFIX/ABUSEIPDB_API_KEY")
HIBP_API_KEY=$(get_ssm "$SSM_PREFIX/HIBP_API_KEY")
VECTOR_URL=$(get_ssm "$SSM_PREFIX/VECTOR_URL")
VERITAS_URL=$(get_ssm "$SSM_PREFIX/VERITAS_URL")
VERITAS_API_KEY=$(get_ssm "$SSM_PREFIX/VERITAS_API_KEY")

# Write .env for pm2 to pick up
cat > "$API_DIR/.env" <<EOF
PORT=${PORT:-3002}
FIRECRAWL_API_KEY=$FIRECRAWL_API_KEY
FIRECRAWL_API_URL=$FIRECRAWL_API_URL
ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY
ABUSEIPDB_API_KEY=$ABUSEIPDB_API_KEY
HIBP_API_KEY=$HIBP_API_KEY
VECTOR_URL=$VECTOR_URL
VERITAS_URL=$VERITAS_URL
VERITAS_API_KEY=$VERITAS_API_KEY
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
  pm2 startOrRestart $API_DIR/ecosystem.config.cjs --update-env
else
  pm2 start $API_DIR/ecosystem.config.cjs
fi
pm2 save

echo "==> Applying nginx config"
sudo cp $REPO_DIR/scripts/nginx-proof360.conf /etc/nginx/conf.d/proof360.conf
sudo nginx -t
sudo systemctl reload nginx

echo "==> Done"
pm2 status $PM2_NAME

echo "==> Verifying API health"
sleep 3
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:${PORT:-3002}/api/health 2>/dev/null)
if [ "$STATUS" = "200" ]; then
  echo "API healthy"
else
  echo "WARNING: /health returned $STATUS — check pm2 logs $PM2_NAME"
fi
