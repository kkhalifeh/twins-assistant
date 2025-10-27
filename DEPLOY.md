# Deployment Guide

This guide explains how to deploy changes from your local development environment to the production server.

## Overview

The production server runs at `parenting.atmata.ai` (209.250.253.59) with Docker containers for:
- **Backend**: Node.js/Express API with Prisma ORM
- **Frontend**: Next.js application
- **PostgreSQL**: Database
- **Redis**: Cache

---

## Local Development & Testing

### 1. Make Your Changes Locally

Work in your local environment at `/Users/khaledkhalifeh/Documents/Coding/twins-assistant`

### 2. Test Locally

```bash
# Start local backend
cd backend
PORT=3003 DATABASE_URL="postgresql://postgres:password@localhost:5432/twins_assistant?schema=public" npm run dev

# Start local frontend (in another terminal)
cd frontend
npm run dev
```

### 3. Run Tests (if you have a test suite)

```bash
# Run the comprehensive test script
./test-new-features.sh
```

### 4. Commit Your Changes

```bash
# Check what changed
git status
git diff

# Add all changes
git add -A

# Create commit
git commit -m "Your descriptive commit message

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Push to GitHub
git push origin main
```

---

## Production Deployment

### Step 1: SSH into Production Server

```bash
ssh root@209.250.253.59
```

You should see: `root@Studio-Republik:~#`

### Step 2: Navigate to Application Directory

```bash
cd /var/www/parenting-assistant
```

### Step 3: Check Current Status

```bash
# Check running containers
docker ps | grep parenting

# Check current git status
git status
git log -1 --oneline
```

### Step 4: Pull Latest Changes

```bash
# Stash any production-specific changes
git stash push -m "Production configs before update"

# Pull latest code
git pull origin main
```

### Step 5: Restore Production Configurations

**Critical Production Settings:**

```bash
# 1. Update frontend API URL for production
sed -i "s|http://localhost:3003/api|https://parenting.atmata.ai/api|g" frontend/src/lib/api.ts

# 2. Ensure next.config.mjs exists with build settings
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

# 3. Verify production configs
grep "API_BASE_URL" frontend/src/lib/api.ts
```

### Step 6: Backend Updates

#### If package.json changed:

```bash
cd backend
npm install
```

#### If Prisma schema changed:

```bash
cd backend

# Update Prisma client with Alpine Linux binary target
# (Required because Docker uses Alpine Linux)
npx prisma generate

# Run migrations
docker exec parenting_backend npx prisma migrate deploy
```

#### If source code changed:

```bash
# Restart backend container
docker restart parenting_backend

# Check logs
docker logs parenting_backend --tail 30
```

### Step 7: Frontend Updates

#### If package.json changed:

```bash
cd frontend
npm install
```

#### If source code changed:

```bash
cd frontend

# Build the production bundle
npm run build

# Restart frontend container
docker restart parenting_frontend

# Check logs
docker logs parenting_frontend --tail 30
```

### Step 8: Verify Deployment

```bash
# Check all containers are running
docker ps | grep parenting

# Test backend health
curl -s http://localhost:3001/health | jq

# Check backend logs for any errors
docker logs parenting_backend --tail 50

# Check frontend logs for any errors
docker logs parenting_frontend --tail 50
```

### Step 9: Test in Browser

Open `https://parenting.atmata.ai` and verify:
- ✅ Application loads
- ✅ Login/Registration works
- ✅ New features are visible
- ✅ No console errors in browser DevTools

---

## Common Scenarios

### Scenario 1: Only Code Changes (No Dependencies)

```bash
cd /var/www/parenting-assistant
git pull origin main

# Restore production API URL
sed -i "s|http://localhost:3003/api|https://parenting.atmata.ai/api|g" frontend/src/lib/api.ts

# Backend: just restart
docker restart parenting_backend

# Frontend: rebuild and restart
cd frontend && npm run build
docker restart parenting_frontend
```

### Scenario 2: Database Schema Changes

```bash
cd /var/www/parenting-assistant
git pull origin main

# Backend: install deps and regenerate Prisma
cd backend
npm install
npx prisma generate

# Run migration
docker exec parenting_backend npx prisma migrate deploy

# Restart backend
docker restart parenting_backend
```

### Scenario 3: New npm Dependencies

```bash
cd /var/www/parenting-assistant
git pull origin main

# Backend
cd backend
npm install
docker restart parenting_backend

# Frontend
cd ../frontend
npm install
npm run build
docker restart parenting_frontend
```

### Scenario 4: Complete Container Rebuild (Rare)

Only if Docker configuration or Alpine binaries changed:

```bash
cd /var/www/parenting-assistant

# Stop and remove containers
docker stop parenting_backend parenting_frontend
docker rm parenting_backend parenting_frontend

# Backend
cd backend
npm install
npx prisma generate

docker run -d \
  --name parenting_backend \
  --network parenting_network \
  -p 127.0.0.1:3001:3001 \
  -e NODE_ENV=production \
  -e DATABASE_URL="postgresql://parenting_user:UmCGUizk0x5BwBoHRLyFXv2WyQhj%2B8pryOM%2Bovci%2FZ4%3D@parenting_postgres:5432/parenting_assistant?schema=public" \
  -e JWT_SECRET="8d7c8a7d495b749a83dbfeec4bc521c7bf121d3307784cb2e07e2f6d2aff420c" \
  -e OPENAI_API_KEY="your-openai-api-key-here" \
  -v /var/www/parenting-assistant/backend:/app \
  --restart always \
  parenting-assistant-backend

# Frontend
cd ../frontend
npm install
npm run build

docker run -d \
  --name parenting_frontend \
  --network parenting_network \
  -p 127.0.0.1:3000:3000 \
  -e NEXT_PUBLIC_API_URL="https://parenting.atmata.ai/api" \
  -v /var/www/parenting-assistant/frontend:/app \
  --restart always \
  parenting-assistant-frontend
```

---

## Troubleshooting

### Backend Won't Start

```bash
# Check logs
docker logs parenting_backend --tail 100

# Common issues:
# 1. Prisma binary mismatch - regenerate
cd backend && npx prisma generate

# 2. Database connection - check URL encoding
# Special characters in password must be URL encoded:
#   + becomes %2B
#   / becomes %2F
#   = becomes %3D

# 3. Missing dependencies
cd backend && npm install
```

### Frontend Won't Start

```bash
# Check logs
docker logs parenting_frontend --tail 100

# Common issue: No build found
cd frontend && npm run build

# Then restart
docker restart parenting_frontend
```

### Migration Fails

```bash
# Check migration status
docker exec parenting_backend npx prisma migrate status

# Check database schema
docker exec -it parenting_postgres psql -U parenting_user -d parenting_assistant -c "\dt"

# Reset migration (DANGER: loses data)
docker exec parenting_backend npx prisma migrate reset --force
```

### Container Not Visible

```bash
# Check if container exists but stopped
docker ps -a | grep parenting

# Start stopped container
docker start parenting_backend
docker start parenting_frontend

# Check logs for why it stopped
docker logs parenting_backend --tail 100
```

---

## Database Management

### Clean Database (Careful!)

```bash
# Delete all data but keep schema
docker exec -it parenting_postgres psql -U parenting_user -d parenting_assistant -c "
DELETE FROM \"FeedingLog\";
DELETE FROM \"SleepLog\";
DELETE FROM \"DiaperLog\";
DELETE FROM \"HealthLog\";
DELETE FROM \"Child\";
DELETE FROM \"Account\";
DELETE FROM \"User\";
"
```

### View Database Tables

```bash
docker exec -it parenting_postgres psql -U parenting_user -d parenting_assistant -c "\dt"
```

### Backup Database

```bash
docker exec parenting_postgres pg_dump -U parenting_user parenting_assistant > backup_$(date +%Y%m%d).sql
```

---

## Quick Reference Commands

```bash
# SSH to server
ssh root@209.250.253.59

# Navigate to app
cd /var/www/parenting-assistant

# Pull latest
git pull origin main

# Quick backend update
cd backend && npm install && docker restart parenting_backend

# Quick frontend update
cd frontend && npm install && npm run build && docker restart parenting_frontend

# View all containers
docker ps | grep parenting

# View logs
docker logs parenting_backend --tail 50 -f
docker logs parenting_frontend --tail 50 -f
```

---

## Important Notes

1. **Always stash production configs** before pulling to avoid conflicts
2. **Restore API URL** after every pull - it must point to `https://parenting.atmata.ai/api`
3. **Rebuild frontend** after any code changes - Next.js requires build step
4. **Generate Prisma client** after schema changes
5. **URL encode passwords** in DATABASE_URL (+ → %2B, / → %2F, = → %3D)
6. **Volume mounts** mean host `node_modules` are used - always run `npm install` on host
7. **Alpine Linux** requires special Prisma binary target in schema.prisma

## Production Environment Variables

These are set in the Docker containers and retrieved from `/var/www/parenting-assistant/.env` on the server:

**Backend:**
- `NODE_ENV=production`
- `DATABASE_URL` - Get from production server's `.env` file (password must be URL encoded)
- `JWT_SECRET` - Get from production server's `.env` file
- `OPENAI_API_KEY` - Get from production server's `.env` file

**Frontend:**
- `NEXT_PUBLIC_API_URL=https://parenting.atmata.ai/api`

**To get production environment variables:**
```bash
# SSH to server
ssh root@209.250.253.59

# View .env file
cat /var/www/parenting-assistant/.env
```

---

## Safety Checklist

Before deploying:
- [ ] Tested changes locally
- [ ] All tests passing
- [ ] Git committed and pushed
- [ ] Database migrations tested locally
- [ ] No breaking changes to API

After deploying:
- [ ] Backend container running
- [ ] Frontend container running
- [ ] No errors in logs
- [ ] Website loads in browser
- [ ] New features working
- [ ] Existing features still working
