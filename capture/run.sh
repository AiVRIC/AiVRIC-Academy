#!/usr/bin/env bash
# AiVRIC Academy — Screenshot capture runner
# Reads credentials from ../cloudsignals-app-testing.MD and runs capture.js
#
# Usage:
#   bash run.sh            # capture all environments
#   bash run.sh main       # only main CloudSignals app
#   bash run.sh provider   # only provider console + portal
#   bash run.sh clips      # only animated WebM clips

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MD_FILE="$SCRIPT_DIR/../cloudsignals-app-testing.MD"

# ── Parse credentials from MD ────────────────────────────────────────────────
if [ ! -f "$MD_FILE" ]; then
  echo "Error: credentials file not found at $MD_FILE"
  exit 1
fi

# Extract from the FIRST User Name / Password pair (main app)
export CS_EMAIL=$(grep -m1 "User Name:" "$MD_FILE" | sed 's/.*User Name: *//')
export CS_PASS=$(grep -m1  "Password:"  "$MD_FILE" | sed 's/.*Password: *//')

if [ -z "$CS_EMAIL" ] || [ -z "$CS_PASS" ]; then
  echo "Error: could not parse credentials from $MD_FILE"
  exit 1
fi

echo "AiVRIC Academy Screenshot Runner"
echo "================================="
echo "Email: $CS_EMAIL"
echo "Pass:  [set from MD file]"
echo ""

# ── Install dependencies if needed ───────────────────────────────────────────
cd "$SCRIPT_DIR"
if [ ! -d "node_modules/playwright" ]; then
  echo "Installing dependencies..."
  npm install --save playwright
  npx playwright install chromium
fi

# ── Run capture ───────────────────────────────────────────────────────────────
ENV_ARG="${1:-all}"
echo "Running capture for env: $ENV_ARG"
node capture.js --env="$ENV_ARG"
