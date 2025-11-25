# SERVER DEPLOYMENT GUIDE

**Parenting AI Assistant - Production Deployment Reference**

Last Updated: November 25, 2025

---

## 🚀 QUICK DEPLOYMENT CHECKLIST

When deploying changes to production:

1. **Develop Locally** → Make changes and test
2. **Commit & Push** → Push to GitHub main branch
3. **SSH to Server** → Connect to production VPS
4. **Pull & Rebuild** → Update code and rebuild Docker images
5. **Restart Services** → Deploy new containers
6. **Verify** → Check all services are healthy

---

## 📍 SERVER INFORMATION

### Production Environment
- **Host**: `209.250.253.59` (Studio-Republik VPS)
- **User**: `root`
- **App Directory**: `/var/www/parenting-assistant`
- **Production URL**: https://parenting.atmata.ai

### ⚠️ IMPORTANT NOTES
- **Multiple Applications on Server**: This VPS hosts multiple projects. ONLY work in `/var/www/parenting-assistant`
- **No PM2 for Frontend**: Frontend runs in Docker only (PM2 was removed to avoid conflicts)
- **Docker Networking**: All services use `parenting_network` Docker network

---

## 🐳 DOCKER ARCHITECTURE

### Container Overview

| Container Name | Image | Port Binding | Network |
|---------------|-------|--------------|---------|
| `parenting_frontend` | parenting-assistant-frontend | 127.0.0.1:3000 | parenting_network |
| `parenting_backend` | parenting-assistant-backend | 127.0.0.1:3001 | parenting_network |
| `parenting_postgres` | postgres:14-alpine | 127.0.0.1:5433 | parenting_network |
| `parenting_redis` | redis:7-alpine | 127.0.0.1:6380 | parenting_network |

### Network Details
- **Network Name**: `parenting_network`
- **Network Type**: Bridge
- **DNS Aliases**: Each container has its service name (e.g., `backend`, `frontend`, `parenting_postgres`, `parenting_redis`)

---

## 📋 STEP-BY-STEP DEPLOYMENT

### 1️⃣ Local Development & Testing

```bash
# Make your changes locally
cd /path/to/twins-assistant

# Test locally (optional but recommended)
npm run dev

# Commit changes
git add .
git commit -m "Your descriptive commit message"

# Push to GitHub
git push origin main
```

---

### 2️⃣ Connect to Production Server

```bash
# SSH into the server
ssh root@209.250.253.59

# Navigate to app directory
cd /var/www/parenting-assistant

# Verify you're in the correct directory
pwd
# Should output: /var/www/parenting-assistant
```

---

### 3️⃣ Pull Latest Code

```bash
# Pull latest changes from GitHub
git pull origin main

# Verify the changes were pulled
git log -1 --oneline
```

---

### 4️⃣ Backend Deployment

#### Option A: Simple Restart (Code-only changes, no dependencies)

```bash
# Restart backend container
docker restart parenting_backend

# Wait 10 seconds for startup
sleep 10

# Check status
docker ps | grep parenting_backend

# Check logs
docker logs parenting_backend --tail 20
```

#### Option B: Full Rebuild (New dependencies, Prisma changes, etc.)

```bash
# Stop and remove old backend container
docker stop parenting_backend
docker rm parenting_backend

# Rebuild backend image
cd /var/www/parenting-assistant
docker build -t parenting-assistant-backend ./backend

# Start new backend container with proper configuration
docker run -d \
  --name parenting_backend \
  --network parenting_network \
  --network-alias backend \
  -p 127.0.0.1:3001:3001 \
  -e NODE_ENV=production \
  -e DATABASE_URL='postgresql://parenting_user:UmCGUizk0x5BwBoHRLyFXv2WyQhj%2B8pryOM%2Bovci%2FZ4%3D@parenting_postgres:5432/parenting_assistant?schema=public' \
  -e JWT_SECRET='your-secret-key-here-change-in-production' \
  -e PORT=3001 \
  --health-cmd="node -e \"require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})\"" \
  --health-interval=30s \
  --health-timeout=10s \
  --health-start-period=40s \
  --health-retries=3 \
  parenting-assistant-backend

# Wait for healthy status
sleep 15

# Verify
docker ps | grep parenting_backend
curl -s http://localhost:3001/health
```

---

### 5️⃣ Frontend Deployment

#### ⚠️ CRITICAL: Remove PM2 Conflicts First

```bash
# Check if PM2 is running parenting-frontend
pm2 list

# If parenting-frontend is in the list, DELETE it
pm2 delete parenting-frontend
pm2 save

# Verify PM2 no longer has it
pm2 list
```

#### Full Frontend Deployment

```bash
# Stop and remove old frontend container
docker stop parenting_frontend
docker rm parenting_frontend

# Kill any process using port 3000
fuser -k 3000/tcp

# Rebuild frontend image
cd /var/www/parenting-assistant
docker build -t parenting-assistant-frontend ./frontend

# Start new frontend container
docker run -d \
  --name parenting_frontend \
  --network parenting_network \
  --network-alias frontend \
  -p 127.0.0.1:3000:3000 \
  --health-cmd="node -e \"require('http').get('http://localhost:3000', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})\"" \
  --health-interval=30s \
  --health-timeout=10s \
  --health-start-period=40s \
  --health-retries=3 \
  parenting-assistant-frontend

# Wait for healthy status
sleep 15

# Verify
docker ps | grep parenting_frontend
```

---

### 6️⃣ Database Migrations (If Needed)

```bash
# Only run if you have new Prisma migrations

# Enter the backend container
docker exec -it parenting_backend sh

# Run migrations
npx prisma migrate deploy

# Exit container
exit

# Restart backend to apply changes
docker restart parenting_backend
```

---

### 7️⃣ Verification & Health Checks

```bash
# Check all parenting containers are running
docker ps | grep parenting

# Expected output should show 4 healthy containers:
# - parenting_frontend (healthy)
# - parenting_backend (healthy)
# - parenting_postgres (healthy)
# - parenting_redis (healthy)

# Test backend health
curl -s http://localhost:3001/health
# Should return: {"status":"healthy","timestamp":"...","service":"twins-assistant-api"}

# Test frontend
curl -s -I http://localhost:3000 | head -1
# Should return: HTTP/1.1 200 OK

# Check logs for errors
docker logs parenting_backend --tail 50
docker logs parenting_frontend --tail 50

# Test API login endpoint
curl -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email": "test@example.com", "password": "test123"}'
```

---

## 🔧 TROUBLESHOOTING

### Frontend Won't Start - Port 3000 Conflict

**Problem**: Error: `address already in use` on port 3000

**Solution**:
```bash
# Check what's using port 3000
netstat -tlnp | grep :3000

# Check PM2
pm2 list

# If PM2 has parenting-frontend, delete it
pm2 delete parenting-frontend
pm2 save

# Kill the port
fuser -k 3000/tcp

# Remove conflicting container
docker rm -f parenting_frontend

# Now start the container again
```

### Backend Container Exits Immediately

**Problem**: Backend container starts but immediately exits

**Solution**:
```bash
# Check logs
docker logs parenting_backend

# Common issues:
# 1. Database connection - verify DATABASE_URL is correct
# 2. Missing env vars - check all -e flags in docker run
# 3. Port conflict - verify port 3001 is free

# Test database connection
docker exec -it parenting_postgres psql -U parenting_user -d parenting_assistant -c "SELECT 1;"
```

### 502 Bad Gateway Error

**Problem**: Nginx returns 502 error

**Solution**:
```bash
# Check if backend is running
docker ps | grep parenting_backend

# If not running, check why it stopped
docker logs parenting_backend --tail 100

# Restart backend
docker restart parenting_backend

# If still failing, do full rebuild (see section 4️⃣ Option B)
```

### Frontend Shows Old Code After Deployment

**Problem**: Frontend displays old code even after rebuild

**Solution**:
```bash
# Verify image was actually rebuilt
docker images | grep parenting-assistant-frontend

# Check the container is using the new image
docker inspect parenting_frontend | grep Image

# Force rebuild without cache
docker build --no-cache -t parenting-assistant-frontend ./frontend

# Remove and recreate container
docker rm -f parenting_frontend
# ... then run docker run command from section 5️⃣
```

---

## 🗂️ ENVIRONMENT VARIABLES

### Backend (.env location: `/var/www/parenting-assistant/backend/.env`)

```bash
DATABASE_URL="postgresql://parenting_user:UmCGUizk0x5BwBoHRLyFXv2WyQhj%2B8pryOM%2Bovci%2FZ4%3D@parenting_postgres:5432/parenting_assistant?schema=public"
JWT_SECRET="your-secret-key-here-change-in-production"
JWT_EXPIRE="30d"
PORT=3001
NODE_ENV=production
OPENAI_API_KEY="sk-proj-..."
REDIS_URL="redis://parenting_redis:6379"
```

### Frontend Build Args

```bash
# Set during Docker build
NEXT_PUBLIC_API_URL=https://parenting.atmata.ai/api
```

---

## 📊 MONITORING

### View Real-Time Logs

```bash
# Frontend logs
docker logs -f parenting_frontend

# Backend logs
docker logs -f parenting_backend

# Database logs
docker logs -f parenting_postgres

# All containers
docker logs -f parenting_frontend & \
docker logs -f parenting_backend & \
wait
```

### Container Resource Usage

```bash
# See CPU/Memory usage
docker stats parenting_frontend parenting_backend parenting_postgres parenting_redis

# Container details
docker inspect parenting_backend | jq '.[0] | {State, NetworkSettings}'
```

### Check Container Health

```bash
# Health status for all containers
docker ps --format "table {{.Names}}\t{{.Status}}"

# Detailed health check logs
docker inspect parenting_backend | jq '.[0].State.Health'
```

---

## 🔄 COMPLETE DEPLOYMENT SCRIPT

For convenience, here's a single script that does everything:

```bash
#!/bin/bash
# deploy.sh - Complete deployment script

set -e  # Exit on error

echo "🚀 Starting deployment..."

# Navigate to app directory
cd /var/www/parenting-assistant

# Pull latest code
echo "📥 Pulling latest code..."
git pull origin main

# Backend deployment
echo "🔧 Deploying backend..."
docker stop parenting_backend
docker rm parenting_backend
docker build -t parenting-assistant-backend ./backend
docker run -d \
  --name parenting_backend \
  --network parenting_network \
  --network-alias backend \
  -p 127.0.0.1:3001:3001 \
  -e NODE_ENV=production \
  -e DATABASE_URL='postgresql://parenting_user:UmCGUizk0x5BwBoHRLyFXv2WyQhj%2B8pryOM%2Bovci%2FZ4%3D@parenting_postgres:5432/parenting_assistant?schema=public' \
  -e JWT_SECRET='your-secret-key-here-change-in-production' \
  -e PORT=3001 \
  parenting-assistant-backend

# Frontend deployment
echo "🎨 Deploying frontend..."
pm2 delete parenting-frontend 2>/dev/null || true
pm2 save
fuser -k 3000/tcp 2>/dev/null || true
docker stop parenting_frontend 2>/dev/null || true
docker rm parenting_frontend 2>/dev/null || true
docker build -t parenting-assistant-frontend ./frontend
sleep 2
docker run -d \
  --name parenting_frontend \
  --network parenting_network \
  --network-alias frontend \
  -p 127.0.0.1:3000:3000 \
  parenting-assistant-frontend

# Wait for services
echo "⏳ Waiting for services to be healthy..."
sleep 15

# Verify
echo "✅ Verifying deployment..."
docker ps | grep parenting

echo "🎉 Deployment complete!"
echo ""
echo "Services:"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:3001"
echo ""
echo "Run 'docker logs parenting_frontend' or 'docker logs parenting_backend' to check logs"
```

**To use this script:**
```bash
# Create the script
cd /var/www/parenting-assistant
nano deploy.sh
# Paste the script above

# Make executable
chmod +x deploy.sh

# Run it
./deploy.sh
```

---

## ⚡ QUICK REFERENCE COMMANDS

### Essential Docker Commands
```bash
# List all parenting containers
docker ps | grep parenting

# Stop all parenting containers
docker stop parenting_frontend parenting_backend

# Remove all parenting containers
docker rm parenting_frontend parenting_backend

# View logs
docker logs parenting_backend --tail 50 -f

# Execute command in container
docker exec -it parenting_backend sh

# Inspect container
docker inspect parenting_backend

# Restart container
docker restart parenting_backend

# Check container health
docker ps --format "table {{.Names}}\t{{.Status}}"
```

### Port Management
```bash
# See what's using a port
netstat -tlnp | grep :3000

# Kill process on port
fuser -k 3000/tcp

# List all listening ports
netstat -tlnp
```

### Git Operations
```bash
# Pull latest
git pull origin main

# Check current branch
git branch

# View recent commits
git log -5 --oneline

# Discard local changes
git reset --hard origin/main
```

---

## 📝 BEST PRACTICES

### 1. Always Test Locally First
- Never deploy untested code to production
- Run `npm run dev` locally and verify changes work

### 2. Use Descriptive Commit Messages
```bash
# Good
git commit -m "Fix: Remove data limit restrictions from all API endpoints"

# Bad
git commit -m "updates"
```

### 3. Check Container Health After Deploy
```bash
# Always verify after deployment
docker ps | grep parenting
docker logs parenting_backend --tail 20
docker logs parenting_frontend --tail 20
```

### 4. Keep PM2 Away from Docker Services
- Frontend runs in Docker only
- PM2 is used for other apps on the server
- Always check `pm2 list` and delete `parenting-frontend` if it appears

### 5. Monitor Production Logs
- Check logs after deployment
- Watch for errors or warnings
- Use `docker logs -f` for real-time monitoring

### 6. Backup Before Major Changes
```bash
# Backup database before migrations
docker exec parenting_postgres pg_dump -U parenting_user parenting_assistant > backup_$(date +%Y%m%d).sql

# Keep old Docker images temporarily
docker tag parenting-assistant-backend parenting-assistant-backend:backup
docker tag parenting-assistant-frontend parenting-assistant-frontend:backup
```

---

## 🆘 EMERGENCY ROLLBACK

If deployment breaks production:

```bash
# Quick rollback to previous git commit
git log --oneline  # Find previous working commit hash
git reset --hard <previous-commit-hash>

# Rebuild and restart
docker stop parenting_backend parenting_frontend
docker rm parenting_backend parenting_frontend

# Rebuild with old code
docker build -t parenting-assistant-backend ./backend
docker build -t parenting-assistant-frontend ./frontend

# Restart containers (use commands from sections 4 & 5)
```

---

## 📞 SUPPORT & RESOURCES

- **Repository**: https://github.com/kkhalifeh/twins-assistant
- **Production**: https://parenting.atmata.ai
- **Server**: root@209.250.253.59
- **Related Docs**:
  - `MASTER.md` - Complete technical reference
  - `CLAUDE.md` - Claude Code guidance
  - `README.md` - Project overview

---

**Last Deployment**: November 25, 2025
**Deployed By**: Claude Code
**Changes**: Removed all data limits (backend API + frontend display)
