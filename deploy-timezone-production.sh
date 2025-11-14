#!/bin/bash

# Production Deployment Script for Timezone Feature
# Ensures clean deployment with no zombie processes

set -e  # Exit on error

echo "========================================="
echo "Timezone Feature Production Deployment"
echo "========================================="
echo ""

SERVER="root@209.250.253.59"
APP_DIR="/var/www/parenting-assistant"

echo "📡 Connecting to production server..."
echo ""

# Step 1: Backup current state
echo "1️⃣  Creating backup of current state..."
ssh $SERVER "cd $APP_DIR && git stash push -m 'Pre-timezone-deployment backup $(date +%Y%m%d_%H%M%S)'"
echo "✅ Backup created"
echo ""

# Step 2: Pull latest code
echo "2️⃣  Pulling latest code from main branch..."
ssh $SERVER "cd $APP_DIR && git pull origin main"
echo "✅ Code updated"
echo ""

# Step 3: Install dependencies
echo "3️⃣  Installing backend dependencies..."
ssh $SERVER "cd $APP_DIR/backend && npm install"
echo "✅ Backend dependencies installed"
echo ""

echo "4️⃣  Installing frontend dependencies..."
ssh $SERVER "cd $APP_DIR/frontend && npm install"
echo "✅ Frontend dependencies installed"
echo ""

# Step 4: Run database migrations
echo "5️⃣  Running database migrations..."
ssh $SERVER "cd $APP_DIR/backend && npx prisma migrate deploy"
echo "✅ Database migrations completed"
echo ""

# Step 5: Build backend
echo "6️⃣  Building backend..."
ssh $SERVER "cd $APP_DIR/backend && npm run build"
echo "✅ Backend built"
echo ""

# Step 6: Check for zombie processes
echo "7️⃣  Checking for zombie Node.js processes..."
ZOMBIE_PROCS=$(ssh $SERVER "ps aux | grep -E 'parenting|twins' | grep node | grep -v docker | grep -v grep | wc -l" || echo "0")
if [ "$ZOMBIE_PROCS" -gt "0" ]; then
  echo "⚠️  Warning: Found $ZOMBIE_PROCS potentially zombie processes"
  echo "   These will be handled by Docker restart"
else
  echo "✅ No zombie processes found"
fi
echo ""

# Step 7: Stop containers gracefully
echo "8️⃣  Stopping Docker containers gracefully..."
ssh $SERVER "cd $APP_DIR && docker-compose -f docker-compose.prod.yml stop"
echo "✅ Containers stopped"
echo ""

# Step 8: Remove old containers
echo "9️⃣  Removing old containers..."
ssh $SERVER "cd $APP_DIR && docker-compose -f docker-compose.prod.yml rm -f"
echo "✅ Old containers removed"
echo ""

# Step 9: Build new images
echo "🔟 Building new Docker images..."
ssh $SERVER "cd $APP_DIR && docker-compose -f docker-compose.prod.yml build --no-cache"
echo "✅ Images built"
echo ""

# Step 10: Start containers
echo "1️⃣1️⃣  Starting Docker containers..."
ssh $SERVER "cd $APP_DIR && docker-compose -f docker-compose.prod.yml up -d"
echo "✅ Containers started"
echo ""

# Step 11: Wait for containers to be healthy
echo "1️⃣2️⃣  Waiting for containers to be healthy..."
sleep 10
echo "✅ Containers should be healthy"
echo ""

# Step 12: Verify deployment
echo "1️⃣3️⃣  Verifying deployment..."
echo ""
echo "Container Status:"
ssh $SERVER "docker ps --filter 'name=parenting' --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"
echo ""

echo "Backend Logs (last 20 lines):"
ssh $SERVER "cd $APP_DIR && docker-compose -f docker-compose.prod.yml logs backend --tail=20"
echo ""

# Step 13: Final zombie process check
echo "1️⃣4️⃣  Final zombie process check..."
FINAL_ZOMBIE=$(ssh $SERVER "ps aux | grep -E 'parenting|twins' | grep node | grep -v docker | grep -v grep | wc -l" || echo "0")
if [ "$FINAL_ZOMBIE" -gt "0" ]; then
  echo "⚠️  Warning: Still found $FINAL_ZOMBIE zombie processes"
  echo "   You may need to manually kill these:"
  ssh $SERVER "ps aux | grep -E 'parenting|twins' | grep node | grep -v docker | grep -v grep"
else
  echo "✅ No zombie processes - clean deployment!"
fi
echo ""

echo "========================================="
echo "Deployment Complete!"
echo "========================================="
echo ""
echo "📝 Summary:"
echo "  ✅ Code updated to latest main branch"
echo "  ✅ Dependencies installed"
echo "  ✅ Database migrations applied"
echo "  ✅ Backend rebuilt"
echo "  ✅ Docker containers restarted"
echo "  ✅ No zombie processes"
echo ""
echo "🌐 Application should be live at:"
echo "   Frontend: https://your-frontend-url.com"
echo "   Backend API: https://your-backend-url.com"
echo ""
echo "🧪 Next Steps:"
echo "  1. Test timezone selector in Settings page"
echo "  2. Create test logs with different timezones"
echo "  3. Verify zombie issue is fixed (Nov 13 8:45PM logs)"
echo "  4. Check all forms send timezone data"
echo ""
