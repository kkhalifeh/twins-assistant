# Parenting Assistant - ATMATA Server Deployment Guide

## Deployment to parenting.atmata.ai

This guide will walk you through deploying the Parenting Assistant application to your ATMATA server (209.250.253.59) with automatic CI/CD deployment via Git.

---

## 🎯 Deployment Overview

**Domain:** parenting.atmata.ai
**Server:** 209.250.253.59 (Studio-Republik)
**Location:** `/var/www/parenting-assistant/`
**Deployment Method:** Git bare repository with post-receive hook
**Tech Stack:** Docker Compose (PostgreSQL + Redis + Node.js)
**Ports:**
- Backend API: 3001 (internal)
- Frontend: 3000 (internal)
- PostgreSQL: 5433 (internal)
- Redis: 6380 (internal)

---

## 📋 Prerequisites

Before starting, ensure you have:
1. SSH access to ATMATA server (209.250.253.59)
2. GitHub account and repository access
3. OpenAI API key
4. Domain `parenting.atmata.ai` DNS configured to point to 209.250.253.59

---

## 🚀 Step-by-Step Deployment

### Step 1: Connect to ATMATA Server

```bash
ssh root@209.250.253.59
```

### Step 2: Create Application Directory

```bash
# Create main application directory
mkdir -p /var/www/parenting-assistant
chown -R www-data:www-data /var/www/parenting-assistant

# Create logs directory
mkdir -p /var/log/parenting-assistant
chown -R www-data:www-data /var/log/parenting-assistant
```

### Step 3: Setup Git Bare Repository for Auto-Deploy

```bash
# Create bare repository
mkdir -p /opt/git/parenting-assistant.git
cd /opt/git/parenting-assistant.git
git init --bare

# Set permissions
chown -R www-data:www-data /opt/git/parenting-assistant.git
```

### Step 4: Create Post-Receive Hook

```bash
# Create post-receive hook
cat > /opt/git/parenting-assistant.git/hooks/post-receive << 'EOF'
#!/usr/bin/env bash
set -e

APP_DIR="/var/www/parenting-assistant"
SERVICE="parenting.service"

read oldrev newrev ref

echo "[post-receive] Deploying Parenting Assistant to $APP_DIR"
echo "[post-receive] Branch: $ref"

# Checkout latest code
GIT_WORK_TREE="$APP_DIR" git --work-tree="$APP_DIR" --git-dir="/opt/git/parenting-assistant.git" checkout -f

# Navigate to app directory
cd "$APP_DIR"

# Create .env file if it doesn't exist
if [ ! -f "$APP_DIR/.env" ]; then
  echo "[post-receive] Creating .env file - UPDATE WITH ACTUAL VALUES"
  cat > "$APP_DIR/.env" << 'ENVEOF'
# PostgreSQL
POSTGRES_USER=parenting_user
POSTGRES_PASSWORD=CHANGE_THIS_SECURE_PASSWORD
POSTGRES_DB=parenting_assistant

# Backend
JWT_SECRET=CHANGE_THIS_TO_SECURE_RANDOM_STRING_32_CHARS_MIN
JWT_EXPIRE=7d
OPENAI_API_KEY=sk-your-openai-api-key
NODE_ENV=production

# Frontend
NEXT_PUBLIC_API_URL=https://parenting.atmata.ai/api
ENVEOF
  echo "[post-receive] ⚠️  WARNING: Please update .env file with actual values!"
fi

# Stop existing containers
echo "[post-receive] Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down || true

# Build and start containers
echo "[post-receive] Building and starting containers..."
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# Wait for database to be ready
echo "[post-receive] Waiting for database..."
sleep 10

# Run database migrations
echo "[post-receive] Running database migrations..."
docker-compose -f docker-compose.prod.yml exec -T backend npx prisma migrate deploy || true

# Check container status
echo "[post-receive] Checking container status..."
docker-compose -f docker-compose.prod.yml ps

echo "[post-receive] ✅ Deployment complete!"
echo "[post-receive] 🌐 Visit: https://parenting.atmata.ai"
echo "[post-receive] 📊 Check logs: docker-compose -f docker-compose.prod.yml logs -f"
EOF

# Make hook executable
chmod +x /opt/git/parenting-assistant.git/hooks/post-receive
chown www-data:www-data /opt/git/parenting-assistant.git/hooks/post-receive
```

### Step 5: Setup Sudoers for Auto-Restart

```bash
# Create sudoers file for www-data user
cat > /etc/sudoers.d/deploy-parenting << 'EOF'
www-data ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart parenting.service
www-data ALL=(ALL) NOPASSWD: /usr/bin/systemctl status parenting.service
www-data ALL=(ALL) NOPASSWD: /usr/bin/docker-compose
www-data ALL=(ALL) NOPASSWD: /usr/bin/docker
EOF

# Set correct permissions
chmod 0440 /etc/sudoers.d/deploy-parenting
```

### Step 6: Create Nginx Configuration

```bash
cat > /etc/nginx/sites-available/parenting << 'EOF'
server {
    listen 80;
    server_name parenting.atmata.ai;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logging
    access_log /var/log/nginx/parenting-access.log;
    error_log /var/log/nginx/parenting-error.log;

    # Frontend (Next.js)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts for API
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://127.0.0.1:3001/health;
        proxy_set_header Host $host;
        access_log off;
    }
}
EOF

# Enable site
ln -s /etc/nginx/sites-available/parenting /etc/nginx/sites-enabled/

# Test nginx configuration
nginx -t

# Reload nginx
systemctl reload nginx
```

### Step 7: Setup SSL Certificate

```bash
# Get SSL certificate from Let's Encrypt
certbot --nginx -d parenting.atmata.ai

# Test auto-renewal
certbot renew --dry-run
```

### Step 8: Configure UFW Firewall

The firewall is already configured to allow ports 80 and 443. Internal ports (3000, 3001, 5433, 6380) are only accessible locally.

```bash
# Verify firewall status
ufw status verbose
```

---

## 💻 Local Setup - Push to Deploy

### Step 1: Add ATMATA Server as Git Remote

On your local machine (Mac), in the project directory:

```bash
cd /Users/khaledkhalifeh/Documents/Coding/twins-assistant

# Add production remote
git remote add production ssh://www-data@209.250.253.59/opt/git/parenting-assistant.git

# Verify remote
git remote -v
```

### Step 2: Push to Deploy

```bash
# Add all changes
git add .

# Commit changes
git commit -m "Deploy to production"

# Push to production (triggers auto-deploy)
git push production main
```

---

## 🔧 Configuration on Server

### Update Environment Variables

After first deployment, SSH to server and update `.env`:

```bash
ssh root@209.250.253.59
cd /var/www/parenting-assistant
nano .env
```

Update these critical values:
```env
POSTGRES_PASSWORD=<generate-secure-password>
JWT_SECRET=<generate-secure-random-32-char-string>
OPENAI_API_KEY=<your-actual-openai-api-key>
```

Generate secure values:
```bash
# Generate secure password
openssl rand -base64 32

# Generate JWT secret
openssl rand -hex 32
```

### Restart After Config Changes

```bash
cd /var/www/parenting-assistant
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d
```

---

## 📊 Monitoring & Management

### View Logs

```bash
# All containers
cd /var/www/parenting-assistant
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend

# Nginx logs
tail -f /var/log/nginx/parenting-access.log
tail -f /var/log/nginx/parenting-error.log
```

### Check Status

```bash
# Container status
cd /var/www/parenting-assistant
docker-compose -f docker-compose.prod.yml ps

# Health checks
curl http://localhost:3001/health
curl http://localhost:3000

# External check
curl -I https://parenting.atmata.ai
```

### Restart Services

```bash
cd /var/www/parenting-assistant

# Restart all
docker-compose -f docker-compose.prod.yml restart

# Restart specific service
docker-compose -f docker-compose.prod.yml restart backend
docker-compose -f docker-compose.prod.yml restart frontend
```

### Database Management

```bash
# Access PostgreSQL
docker exec -it parenting_postgres psql -U parenting_user -d parenting_assistant

# Backup database
docker exec parenting_postgres pg_dump -U parenting_user parenting_assistant > backup_$(date +%Y%m%d).sql

# Run migrations
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy

# Access Prisma Studio (temporarily)
docker-compose -f docker-compose.prod.yml exec backend npx prisma studio
```

---

## 🔄 CI/CD Workflow

### Automated Deployment Process

1. **Local Development:**
   ```bash
   # Make changes locally
   # Test changes
   npm run dev
   ```

2. **Commit and Push:**
   ```bash
   git add .
   git commit -m "Your commit message"
   git push production main
   ```

3. **Automatic Server Actions:**
   - Post-receive hook triggers
   - Code checked out to /var/www/parenting-assistant
   - Docker images rebuilt
   - Containers restarted
   - Database migrations applied
   - Health checks performed

4. **Verify Deployment:**
   ```bash
   # Check logs
   ssh root@209.250.253.59 "cd /var/www/parenting-assistant && docker-compose -f docker-compose.prod.yml logs --tail=50"

   # Test application
   curl -I https://parenting.atmata.ai
   ```

### Push to Both GitHub and Production

```bash
# Push to GitHub (backup)
git push origin main

# Push to production (auto-deploy)
git push production main

# Or both at once
git push origin main && git push production main
```

---

## 🐛 Troubleshooting

### Deployment Failed

```bash
# Check hook logs
ssh root@209.250.253.59 "cat /opt/git/parenting-assistant.git/hooks/post-receive"

# Check if containers are running
ssh root@209.250.253.59 "cd /var/www/parenting-assistant && docker-compose -f docker-compose.prod.yml ps"

# View error logs
ssh root@209.250.253.59 "cd /var/www/parenting-assistant && docker-compose -f docker-compose.prod.yml logs"
```

### Database Connection Issues

```bash
# Check PostgreSQL container
docker ps | grep parenting_postgres

# Test database connection
docker exec parenting_postgres psql -U parenting_user -d parenting_assistant -c "SELECT 1;"

# Check migrations
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate status
```

### Site Not Loading

```bash
# Check nginx config
nginx -t

# Check nginx logs
tail -f /var/log/nginx/parenting-error.log

# Check containers
docker-compose -f docker-compose.prod.yml ps

# Test internal endpoints
curl http://localhost:3000
curl http://localhost:3001/health
```

### Rebuild from Scratch

```bash
cd /var/www/parenting-assistant

# Stop and remove everything
docker-compose -f docker-compose.prod.yml down -v

# Rebuild and restart
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# Run migrations
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
```

---

## 🔒 Security Notes

1. **.env file** contains sensitive credentials - never commit to Git
2. **Firewall** blocks external access to internal ports (3000, 3001, 5433, 6380)
3. **SSL certificate** auto-renews via certbot
4. **Database** only accessible from localhost
5. **Redis** only accessible from localhost
6. All services run behind Nginx reverse proxy

---

## 📦 Backup Strategy

### Automated Backup Script

Create `/root/backup_parenting.sh`:

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/root/backups/parenting"

mkdir -p $BACKUP_DIR

# Backup database
docker exec parenting_postgres pg_dump -U parenting_user parenting_assistant > "$BACKUP_DIR/db_$DATE.sql"

# Backup environment file
cp /var/www/parenting-assistant/.env "$BACKUP_DIR/env_$DATE"

# Backup application code (optional, since it's in Git)
tar -czf "$BACKUP_DIR/code_$DATE.tar.gz" -C /var/www parenting-assistant

# Keep only last 7 backups
ls -t $BACKUP_DIR/db_*.sql | tail -n +8 | xargs rm -f
ls -t $BACKUP_DIR/env_* | tail -n +8 | xargs rm -f
ls -t $BACKUP_DIR/code_*.tar.gz | tail -n +8 | xargs rm -f

echo "Backup completed: $BACKUP_DIR/db_$DATE.sql"
```

Make executable and add to crontab:

```bash
chmod +x /root/backup_parenting.sh

# Add to crontab (daily at 3 AM)
crontab -e
# Add: 0 3 * * * /root/backup_parenting.sh
```

---

## 🎉 Deployment Complete!

Your Parenting Assistant is now deployed at **https://parenting.atmata.ai**

**Quick Commands:**

```bash
# Deploy
git push production main

# Check status
ssh root@209.250.253.59 "cd /var/www/parenting-assistant && docker-compose -f docker-compose.prod.yml ps"

# View logs
ssh root@209.250.253.59 "cd /var/www/parenting-assistant && docker-compose -f docker-compose.prod.yml logs -f"

# Restart
ssh root@209.250.253.59 "cd /var/www/parenting-assistant && docker-compose -f docker-compose.prod.yml restart"
```

---

**Last Updated:** October 9, 2025
