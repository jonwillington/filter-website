#!/bin/bash
# Nightly D1 Reseed
# Fetches all data from Strapi, then seeds into D1 (remote).
# Designed to run as a cron job to catch any missed webhooks.
#
# Usage:
#   ./scripts/nightly-d1-reseed.sh
#
# Crontab (3am daily):
#   0 3 * * * /Users/jonwillington/filter-website/scripts/nightly-d1-reseed.sh >> /tmp/d1-reseed.log 2>&1

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_PREFIX="[D1-RESEED $(date '+%Y-%m-%d %H:%M:%S')]"

# Load env vars (needed for Strapi token)
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
cd "$PROJECT_DIR"

echo "$LOG_PREFIX Starting nightly D1 reseed..."

# Step 1: Fetch all D1 data from Strapi
echo "$LOG_PREFIX Fetching data from Strapi..."
node -r dotenv/config scripts/fetch-strapi-for-d1.js dotenv_config_path=.env.local

# Step 2: Apply schema (idempotent - CREATE TABLE IF NOT EXISTS; does not drop or clear tables)
echo "$LOG_PREFIX Applying D1 schema..."
npx wrangler@latest d1 execute filter-db --file=db/schema.sql --remote

# Step 3: Seed D1
echo "$LOG_PREFIX Seeding D1..."
node scripts/seed-d1.js --remote

echo "$LOG_PREFIX Done!"
