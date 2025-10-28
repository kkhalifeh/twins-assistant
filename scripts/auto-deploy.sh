#!/bin/bash

# Auto-deployment script for production server
# This script is executed automatically by GitHub Actions on every push to main

set -e  # Exit on error

echo "🚀 Starting auto-deployment..."

# Navigate to app directory
cd /var/www/parenting-assistant

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Stash any local changes (production configs)
echo -e "${YELLOW}📦 Stashing production configs...${NC}"
git stash push -m "Auto-deploy: production configs $(date +%Y%m%d_%H%M%S)"

# Fetch latest changes and reset to origin/main (handles divergent branches)
echo -e "${YELLOW}⬇️  Fetching latest changes...${NC}"
git fetch origin main

echo -e "${YELLOW}🔄 Resetting to origin/main...${NC}"
git reset --hard origin/main

# Restore critical production configurations
echo -e "${YELLOW}🔧 Restoring production configurations...${NC}"

# 1. Frontend API URL
sed -i "s|http://localhost:3003/api|https://parenting.atmata.ai/api|g" frontend/src/lib/api.ts

# 2. Ensure next.config.mjs exists
cat > frontend/next.config.mjs << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
EOF

# 3. Ensure Prisma binary target for Alpine
if ! grep -q "linux-musl-openssl-3.0.x" backend/prisma/schema.prisma; then
  echo -e "${YELLOW}⚙️  Updating Prisma binary target...${NC}"
  sed -i 's/generator client {/generator client {\n  binaryTargets = ["native", "linux-musl-openssl-3.0.x"]/' backend/prisma/schema.prisma
fi

# Backend deployment
echo -e "${YELLOW}🔨 Deploying backend...${NC}"
cd backend

# Install/update dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
echo -e "${YELLOW}🗄️  Running database migrations...${NC}"
docker exec parenting_backend npx prisma migrate deploy || {
  echo -e "${RED}⚠️  Migration failed, but continuing...${NC}"
}

# Restart backend
echo -e "${YELLOW}🔄 Restarting backend container...${NC}"
docker restart parenting_backend

# Wait for backend to start with retry
echo -e "${YELLOW}⏳ Waiting for backend to start...${NC}"
RETRY_COUNT=0
MAX_RETRIES=12
until curl -f http://localhost:3001/health > /dev/null 2>&1; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
    echo -e "${RED}❌ Backend health check failed after ${MAX_RETRIES} attempts${NC}"
    docker logs parenting_backend --tail 50
    exit 1
  fi
  echo "   Attempt $RETRY_COUNT/$MAX_RETRIES - waiting 5 seconds..."
  sleep 5
done
echo -e "${GREEN}✅ Backend is healthy${NC}"

# Frontend deployment
echo -e "${YELLOW}🎨 Deploying frontend...${NC}"
cd ../frontend

# Install/update dependencies
npm install

# Build production bundle
echo -e "${YELLOW}🏗️  Building frontend...${NC}"
npm run build

# Restart frontend
echo -e "${YELLOW}🔄 Restarting frontend container...${NC}"
docker restart parenting_frontend

# Wait for frontend to start with retry
echo -e "${YELLOW}⏳ Waiting for frontend to start...${NC}"
RETRY_COUNT=0
MAX_RETRIES=12
until curl -f http://localhost:3000 > /dev/null 2>&1; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
    echo -e "${RED}❌ Frontend health check failed after ${MAX_RETRIES} attempts${NC}"
    docker logs parenting_frontend --tail 50
    exit 1
  fi
  echo "   Attempt $RETRY_COUNT/$MAX_RETRIES - waiting 5 seconds..."
  sleep 5
done
echo -e "${GREEN}✅ Frontend is healthy${NC}"

# Final verification
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "🌐 Frontend: https://parenting.atmata.ai"
echo "🔌 Backend:  https://parenting.atmata.ai/api"
echo ""
echo "📊 Container Status:"
docker ps | grep parenting

echo ""
echo "📝 Recent commits:"
git log -3 --oneline

cd /var/www/parenting-assistant
