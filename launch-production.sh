#!/bin/bash

echo "🛹 SkateQuest Global Production Launch Setup"
echo "==========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# 1. Configure Git Identity
echo -e "${YELLOW}Step 1: Configuring Git Identity${NC}"
git config --global user.email "treevanderveer@gmail.com"
git config --global user.name "treesus6"
echo -e "${GREEN}✓ Git identity configured (treesus6 / treevanderveer@gmail.com)${NC}"
echo ""

# 2. Sync secrets from GitHub to EAS
echo -e "${YELLOW}Step 2: Syncing secrets from GitHub to EAS${NC}"
echo -e "${BLUE}Your secrets are stored in GitHub. We need to set them as EAS secrets for builds.${NC}"
echo ""

read -p "Enter your Mapbox Download Token (from GitHub secrets): " MAPBOX_TOKEN
read -p "Enter your Supabase URL (from GitHub secrets): " SUPABASE_URL
read -p "Enter your Supabase Anon Key (from GitHub secrets): " SUPABASE_ANON_KEY
read -p "Enter your Sentry DSN (from GitHub secrets): " SENTRY_DSN
read -p "Enter your Sentry Org (from GitHub secrets): " SENTRY_ORG
read -p "Enter your Sentry Project (from GitHub secrets): " SENTRY_PROJECT
read -p "Enter your Sentry Auth Token (from GitHub secrets): " SENTRY_AUTH_TOKEN

echo ""
echo -e "${YELLOW}Setting EAS secrets...${NC}"

# Set all EAS secrets
eas secret:create --name RNMAPBOX_MAPS_DOWNLOAD_TOKEN --value "$MAPBOX_TOKEN" --force
eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value "$SUPABASE_URL" --force
eas secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "$SUPABASE_ANON_KEY" --force
eas secret:create --name SENTRY_DSN --value "$SENTRY_DSN" --force
eas secret:create --name SENTRY_ORG --value "$SENTRY_ORG" --force
eas secret:create --name SENTRY_PROJECT --value "$SENTRY_PROJECT" --force
eas secret:create --name SENTRY_AUTH_TOKEN --value "$SENTRY_AUTH_TOKEN" --force

echo -e "${GREEN}✓ All EAS secrets configured from GitHub${NC}"
echo ""

# 3. Create local .env for development
echo -e "${YELLOW}Step 3: Creating local .env file${NC}"
if [ -f .env ]; then
    echo -e "${RED}Warning: .env already exists. Backing up to .env.backup${NC}"
    cp .env .env.backup
fi

cat > .env << EOF
# Supabase Production
EXPO_PUBLIC_SUPABASE_URL=$SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY

# Mapbox
RNMAPBOX_MAPS_DOWNLOAD_TOKEN=$MAPBOX_TOKEN

# Sentry Production Monitoring
SENTRY_DSN=$SENTRY_DSN
SENTRY_ORG=$SENTRY_ORG
SENTRY_PROJECT=$SENTRY_PROJECT
SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN
EOF

echo -e "${GREEN}✓ Local .env file created${NC}"
echo ""

# Verification
echo -e "${YELLOW}Verification:${NC}"
echo "Git config:"
git config --list | grep user
echo ""
echo ".env file exists:"
ls -la .env
echo ""
echo "EAS secrets:"
eas secret:list
echo ""

echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}🚀 PRODUCTION LAUNCH READY!${NC}"
echo -e "${GREEN}==========================================${NC}"
echo ""
echo "Next step - Build for global production release:"
echo "  eas build --platform android --profile production --non-interactive"
echo ""
echo "After build completes:"
echo "  - APK ready for Google Play Store submission"
echo "  - Sentry monitoring active for all users"
echo "  - 27,000+ skateparks mapped globally"
echo "  - Real-time error tracking and user analytics"
echo ""
echo "🛹 Let's get SkateQuest in the hands of skaters worldwide! 🛹"
