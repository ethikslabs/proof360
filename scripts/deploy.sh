#!/bin/bash
set -e

REPO_DIR="/home/ec2-user/proof360"
API_DIR="$REPO_DIR/api"
FRONTEND_DIR="$REPO_DIR/frontend"
PM2_NAME="proof360-api"

echo "==> Pulling latest"
cd $REPO_DIR
git pull origin main

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
