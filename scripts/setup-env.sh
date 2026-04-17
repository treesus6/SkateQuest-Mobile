#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_EXAMPLE_FILE="$ROOT_DIR/.env.example"
ENV_LOCAL_FILE="$ROOT_DIR/.env.local"

if [[ ! -f "$ENV_EXAMPLE_FILE" ]]; then
  echo "❌ Missing $ENV_EXAMPLE_FILE"
  exit 1
fi

if [[ ! -f "$ENV_LOCAL_FILE" ]]; then
  cp "$ENV_EXAMPLE_FILE" "$ENV_LOCAL_FILE"
  echo "✅ Created .env.local from .env.example"
else
  echo "ℹ️ .env.local already exists"
fi

required_local_keys=(
  EXPO_PUBLIC_SUPABASE_URL
  EXPO_PUBLIC_SUPABASE_ANON_KEY
  EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN
  EXPO_PUBLIC_SENTRY_DSN
  MAPBOX_DOWNLOADS_TOKEN
)

missing_local_keys=()
for key in "${required_local_keys[@]}"; do
  if ! grep -q "^${key}=" "$ENV_LOCAL_FILE"; then
    missing_local_keys+=("$key")
  fi
done

if [[ ${#missing_local_keys[@]} -gt 0 ]]; then
  echo ""
  echo "⚠️ Missing keys in .env.local:"
  for key in "${missing_local_keys[@]}"; do
    echo "  - $key"
    echo "${key}=" >> "$ENV_LOCAL_FILE"
  done
  echo "✅ Added placeholders for missing keys to .env.local"
fi

cat <<'EOF'

Next steps:
1) Fill real values in .env.local
2) Configure GitHub repository secrets:
   - EXPO_TOKEN
   - EXPO_PUBLIC_SUPABASE_URL
   - EXPO_PUBLIC_SUPABASE_ANON_KEY
   - EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN
   - EXPO_PUBLIC_SENTRY_DSN
   - MAPBOX_DOWNLOADS_TOKEN
   - SLACK_WEBHOOK_URL (optional notifications)
3) Replace REPLACE_WITH_ASC_APP_ID and REPLACE_WITH_APPLE_TEAM_ID in eas.json for production submit
4) Run: node scripts/validate-build.js --skip-env
EOF
