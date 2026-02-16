#!/bin/bash

# SkateQuest Environment Switcher
# Usage: ./switch-env.sh [development|production]

set -e

ENV="${1:-development}"

if [ "$ENV" != "development" ] && [ "$ENV" != "production" ]; then
  echo "❌ Invalid environment: $ENV"
  echo "Usage: ./switch-env.sh [development|production]"
  exit 1
fi

ENV_FILE=".env.$ENV"

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ Environment file not found: $ENV_FILE"
  echo ""
  echo "Please create it first:"
  echo "  cp .env.example $ENV_FILE"
  echo "  # Then edit $ENV_FILE with your credentials"
  exit 1
fi

# Backup current .env if it exists
if [ -f ".env" ]; then
  cp .env .env.backup
  echo "📦 Backed up current .env to .env.backup"
fi

# Copy the environment file
cp "$ENV_FILE" .env

echo "✅ Switched to $ENV environment"
echo ""
echo "Environment variables loaded from: $ENV_FILE"
echo ""
echo "⚠️  Remember to restart your Expo development server:"
echo "   expo start -c"
echo ""

# Display some info about the environment
if [ "$ENV" = "production" ]; then
  echo "🚀 PRODUCTION MODE"
  echo "   - Using production Supabase credentials"
  echo "   - Sentry error tracking enabled"
  echo "   - Ready for production builds"
else
  echo "🔧 DEVELOPMENT MODE"
  echo "   - Using development Supabase credentials"
  echo "   - Debug mode enabled"
  echo "   - Safe for testing"
fi
