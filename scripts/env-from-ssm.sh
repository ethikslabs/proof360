#!/usr/bin/env bash
#
# env-from-ssm.sh — generate proof360's api/.env from AWS SSM Parameter Store.
#
# SSM Parameter Store is the vault (the single source of truth for secrets).
# api/.env is a LOCAL, GENERATED copy — never hand-edit it, never commit it.
# Lost or stale .env? Delete it and re-run this. The vault is authoritative.
#
# The variable names and their SSM source paths below are kept in lockstep with
# .github/workflows/deploy.yml (the same mapping the live server uses), so a
# locally-generated .env matches exactly what production runs.
#
# PREREQUISITES (one-time):
#   1. AWS CLI installed and logged in:  aws sts get-caller-identity   (must succeed)
#   2. IAM permission to read /proof360/* and /ethikslabs/{perplexity,gemini}/* and
#      to KMS-decrypt them (ssm:GetParameter + kms:Decrypt).
#
# USAGE:
#   bash scripts/env-from-ssm.sh           # writes api/.env (backs up any existing one)
#
set -uo pipefail

REGION="${AWS_REGION:-ap-southeast-2}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT/api/.env"

# --- helpers ---------------------------------------------------------------
fail() { echo "ERROR: $*" >&2; exit 1; }

# get_ssm <path>  -> prints decrypted value, hard-fails if missing/empty.
get_ssm() {
  local value
  value=$(aws ssm get-parameter --region "$REGION" --name "$1" \
            --with-decryption --query 'Parameter.Value' --output text 2>/dev/null) \
    || fail "required SSM parameter '$1' not found (check AWS login + IAM permission)"
  [ -n "$value" ] && [ "$value" != "None" ] || fail "required SSM parameter '$1' is empty"
  printf '%s' "$value"
}

# get_ssm_opt <path>  -> prints value if present, else empty + a warning. Never fails.
get_ssm_opt() {
  local value
  value=$(aws ssm get-parameter --region "$REGION" --name "$1" \
            --with-decryption --query 'Parameter.Value' --output text 2>/dev/null) || true
  if [ -z "$value" ] || [ "$value" = "None" ]; then
    echo "  (optional) $1 not in SSM yet — leaving blank" >&2
    printf ''
  else
    printf '%s' "$value"
  fi
}

# --- preflight -------------------------------------------------------------
command -v aws >/dev/null 2>&1 || fail "aws CLI not installed — install it and run 'aws configure' first"
aws sts get-caller-identity >/dev/null 2>&1 \
  || fail "not logged in to AWS — run 'aws configure' (or 'aws sso login') first"

echo "Reading secrets from SSM (region: $REGION) ..."

# Back up an existing .env so a review never clobbers your own working copy.
if [ -f "$ENV_FILE" ]; then
  cp "$ENV_FILE" "$ENV_FILE.bak.$(date +%Y%m%d-%H%M%S)"
  echo "Backed up existing api/.env -> $(basename "$ENV_FILE").bak.*"
fi

# --- write api/.env (mapping mirrors deploy.yml) ---------------------------
cat > "$ENV_FILE" << EOF
PORT=$(get_ssm "/proof360/PORT")
BEDROCK_REGION=us-east-1
FIRECRAWL_API_KEY=$(get_ssm "/proof360/FIRECRAWL_API_KEY")
FIRECRAWL_API_URL=$(get_ssm "/proof360/FIRECRAWL_API_URL")
PERPLEXITY_API_KEY=$(get_ssm "/ethikslabs/perplexity/api-key")
GEMINI_API_KEY=$(get_ssm "/ethikslabs/gemini/api-key")
ABUSEIPDB_API_KEY=$(get_ssm "/proof360/ABUSEIPDB_API_KEY")
HIBP_API_KEY=$(get_ssm "/proof360/HIBP_API_KEY")
# INFERENCE_URL must point at a direct provider endpoint. VECTOR was removed
# (it is a future product, not a runtime dependency). Set this once the direct
# target is chosen; proof360 fails loud at startup until it is set.
# INFERENCE_URL=
VERITAS_URL=$(get_ssm "/proof360/VERITAS_URL")
VERITAS_API_KEY=$(get_ssm "/proof360/VERITAS_API_KEY")
TRUST360_URL=$(get_ssm "/proof360/TRUST360_URL")
DASHBOARD_API_URL=$(get_ssm "/proof360/DASHBOARD_API_URL")
PROOF360_ADMIN_KEY=$(get_ssm "/proof360/PROOF360_ADMIN_KEY")
SES_REGION=$(get_ssm "/proof360/SES_REGION")
SES_FROM_ADDRESS=$(get_ssm "/proof360/SES_FROM_ADDRESS")
REPORT_BASE_URL=$(get_ssm "/proof360/REPORT_BASE_URL")
TELEGRAM_BOT_TOKEN=$(get_ssm "/proof360/TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID=$(get_ssm "/proof360/TELEGRAM_CHAT_ID")
PG_HOST=$(get_ssm "/proof360/postgres/host")
PG_PORT=$(get_ssm "/proof360/postgres/port")
PG_DATABASE=$(get_ssm "/proof360/postgres/database")
PG_USER=$(get_ssm "/proof360/postgres/user")
PG_PASSWORD=$(get_ssm "/proof360/postgres/password")
AUTH0_DOMAIN=$(get_ssm_opt "/proof360/AUTH0_DOMAIN")
AUTH0_AUDIENCE=$(get_ssm_opt "/proof360/AUTH0_AUDIENCE")
MEMORY_STORE_DIR=$ROOT/api/data/memory
LOG_LEVEL=info
EOF

echo "Wrote $ENV_FILE"
echo
echo "NOTE on Postgres for LOCAL runs:"
echo "  PG_HOST/PG_PASSWORD above are the server's database credentials."
echo "  To run proof360 locally you need a reachable Postgres with that schema."
echo "  Either point PG_HOST at your own local Postgres (and re-run 'npm run migrate'),"
echo "  or run the app without a DB — the cold-read features will degrade gracefully."
echo
echo "Next:  cd api && npm install && npm run dev"
