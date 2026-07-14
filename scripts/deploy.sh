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
# ANTHROPIC_API_KEY intentionally NOT fetched — the runtime is Bedrock-direct and never reads
# it; a require here hard-failed deploys on a key nothing consumes (edge-hunt #4/DEPLOY-HARDEN-001).
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
AUTH0_CLIENT_ID=$(require_ssm "/ethikslabs/auth0/client-id")
TURNSTILE_SECRET=$(require_ssm "$SSM_PREFIX/TURNSTILE_SECRET")
TURNSTILE_SITEKEY=$(require_ssm "$SSM_PREFIX/TURNSTILE_SITEKEY")
# Founder-memory + v3 Postgres handlers read these. Without them a manual deploy shipped a
# memory surface pointed at a ghost localhost Postgres and 500'd (edge-hunt #6/DEPLOY-HARDEN-001).
# require_ssm mirrors deploy.yml, whose get_ssm hard-fails on empty — the /proof360/postgres/*
# paths are the same ones CI already depends on.
PG_HOST=$(require_ssm "$SSM_PREFIX/postgres/host")
PG_PORT=$(require_ssm "$SSM_PREFIX/postgres/port")
PG_DATABASE=$(require_ssm "$SSM_PREFIX/postgres/database")
PG_USER=$(require_ssm "$SSM_PREFIX/postgres/user")
PG_PASSWORD=$(require_ssm "$SSM_PREFIX/postgres/password")
# Optional service config CI already bakes — mirror it so the manual deploy is not a
# functionally-thinner build (DEPLOY-SH-MIGRATIONS-001). get_ssm: absent → blank + WARN, never fatal.
# DEMO_FOUNDER_MODE is deliberately NOT mirrored: pushing it into the manual deploy would carry the
# demo-founder prod posture that D3 exists to kill; unset defaults to the real (non-demo) path.
TRUST360_URL=$(get_ssm "$SSM_PREFIX/TRUST360_URL")
DASHBOARD_API_URL=$(get_ssm "$SSM_PREFIX/DASHBOARD_API_URL")
PROOF360_ADMIN_KEY=$(get_ssm "$SSM_PREFIX/PROOF360_ADMIN_KEY")
SES_REGION=$(get_ssm "$SSM_PREFIX/SES_REGION")
SES_FROM_ADDRESS=$(get_ssm "$SSM_PREFIX/SES_FROM_ADDRESS")
REPORT_BASE_URL=$(get_ssm "$SSM_PREFIX/REPORT_BASE_URL")
MEMORY_STORE_DIR="/home/ec2-user/.ethikslabs/proof360/memory"
mkdir -p "$MEMORY_STORE_DIR"

# Write .env for pm2 to pick up
cat > "$API_DIR/.env" <<EOF
PORT=${PORT:-3002}
BEDROCK_REGION=us-east-1
FIRECRAWL_API_KEY=$FIRECRAWL_API_KEY
FIRECRAWL_API_URL=$FIRECRAWL_API_URL
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
TURNSTILE_SECRET=$TURNSTILE_SECRET
TRUST360_URL=$TRUST360_URL
DASHBOARD_API_URL=$DASHBOARD_API_URL
PROOF360_ADMIN_KEY=$PROOF360_ADMIN_KEY
SES_REGION=$SES_REGION
SES_FROM_ADDRESS=$SES_FROM_ADDRESS
REPORT_BASE_URL=$REPORT_BASE_URL
PG_HOST=$PG_HOST
PG_PORT=$PG_PORT
PG_DATABASE=$PG_DATABASE
PG_USER=$PG_USER
PG_PASSWORD=$PG_PASSWORD
PG_MEMORY_DATABASE=proof360_memory
MEMORY_STORE_DIR=$MEMORY_STORE_DIR
LOG_LEVEL=info
EOF

echo "==> Installing API dependencies"
cd $API_DIR
npm install --production

echo "==> Building frontend"
cd $FRONTEND_DIR
npm install
# Bake the same public config the GitHub Actions build bakes — without these the
# built login page renders a config fault and sign-in is disabled by design.
VITE_AUTH0_DOMAIN="$AUTH0_DOMAIN" \
VITE_AUTH0_AUDIENCE="$AUTH0_AUDIENCE" \
VITE_AUTH0_CLIENT_ID="$AUTH0_CLIENT_ID" \
VITE_CF_TURNSTILE_SITEKEY="$TURNSTILE_SITEKEY" \
npm run build

# Run DB + memory-store migrations before restart, mirroring deploy.yml — DEPLOY-HARDEN-001 gave
# the manual deploy real PG creds, so it must also migrate the schema or founder-memory / v3
# handlers 500 on missing tables (DEPLOY-SH-MIGRATIONS-001). Non-fatal: an unprovisioned DB skips.
echo "==> Running database migrations"
cd $API_DIR
node --env-file=$API_DIR/.env $API_DIR/scripts/run-migrations.js || echo "Migrations skipped (Postgres not configured)"
echo "==> Running memory-store migrations (journey atom spine)"
node --env-file=$API_DIR/.env $API_DIR/scripts/run-memory-migrations.js || echo "Memory migrations skipped (proof360_memory not provisioned)"

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
# Retry + non-fatal: the curl can race pm2's restart. Under `set -e` a connection-refused
# (curl exit 7) in the assignment aborts the whole script and false-reds a deploy that
# actually succeeded — so the substitution is guarded with `|| STATUS=000` and polled
# (edge-hunt #5/DEPLOY-HARDEN-001).
STATUS="000"
for attempt in $(seq 1 10); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PORT:-3002}/api/health" 2>/dev/null) || STATUS="000"
  [ "$STATUS" = "200" ] && break
  sleep 2
done
if [ "$STATUS" = "200" ]; then
  echo "API healthy"
else
  echo "WARNING: /api/health returned $STATUS after 10 attempts — check pm2 logs ($PM2 logs $PM2_NAME)"
fi
