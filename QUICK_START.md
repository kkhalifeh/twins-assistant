# Parenting Assistant - Quick Start Deployment Guide

## 🚀 Deploy to parenting.atmata.ai in 10 Minutes

This guide will get your application deployed to production quickly.

---

## Step 1: Setup GitHub Repository (2 minutes)

### Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `parenting-assistant`
3. Set to Private
4. **Do NOT initialize with README** (we already have files)
5. Click "Create repository"

### Push to GitHub

On your local machine:

```bash
cd /Users/khaledkhalifeh/Documents/Coding/twins-assistant

# Initialize git (if not already done)
git init
git add .
git commit -m "Initial commit - production ready"

# Add GitHub remote
git remote add origin https://github.com/YOUR_USERNAME/parenting-assistant.git

# Push to GitHub
git branch -M main
git push -u origin main
```

---

## Step 2: Setup Server (3 minutes)

### Connect to ATMATA Server

```bash
ssh root@209.250.253.59
```

### Run Automated Setup Script

```bash
# Download and run setup script
curl -sSL https://raw.githubusercontent.com/YOUR_USERNAME/parenting-assistant/main/scripts/server-setup.sh | bash

# OR if already on server with files:
cd /tmp
# Upload server-setup.sh from your local machine
# scp scripts/server-setup.sh root@209.250.253.59:/tmp/
chmod +x /tmp/server-setup.sh
/tmp/server-setup.sh
```

### Get SSL Certificate

```bash
certbot --nginx -d parenting.atmata.ai
```

---

## Step 3: Configure Environment (2 minutes)

Still on the ATMATA server:

```bash
cd /var/www/parenting-assistant

# Generate secure credentials
echo "PostgreSQL Password: $(openssl rand -base64 32)"
echo "JWT Secret: $(openssl rand -hex 32)"

# Edit .env file (will be created after first deploy)
nano .env
```

Update these values in `.env`:
```env
POSTGRES_PASSWORD=<paste-generated-password>
JWT_SECRET=<paste-generated-jwt-secret>
OPENAI_API_KEY=sk-your-actual-openai-api-key
```

---

## Step 4: Deploy from Local Machine (3 minutes)

Back on your Mac:

```bash
cd /Users/khaledkhalifeh/Documents/Coding/twins-assistant

# Add production remote
git remote add production ssh://www-data@209.250.253.59/opt/git/parenting-assistant.git

# Deploy!
git push production main
```

**Watch the deployment happen!** The post-receive hook will:
- Checkout code
- Build Docker containers
- Start services
- Run database migrations
- Health check

---

## Step 5: Verify Deployment (1 minute)

### Check if it's live

```bash
# From your Mac
curl -I https://parenting.atmata.ai

# Should return: HTTP/2 200
```

### View logs on server

```bash
ssh root@209.250.253.59 "cd /var/www/parenting-assistant && docker-compose -f docker-compose.prod.yml logs -f"
```

### Open in browser

Visit: **https://parenting.atmata.ai**

---

## ✅ You're Done!

Your application is now live at **https://parenting.atmata.ai**

---

## 🔄 Future Deployments (30 seconds)

Every time you want to deploy changes:

```bash
# 1. Make your changes
# 2. Commit
git add .
git commit -m "Your changes"

# 3. Deploy to production
git push production main

# 4. (Optional) Also push to GitHub
git push origin main
```

That's it! The server will automatically rebuild and restart.

---

## 📊 Quick Commands

### View Status
```bash
ssh root@209.250.253.59 "cd /var/www/parenting-assistant && docker-compose -f docker-compose.prod.yml ps"
```

### View Logs
```bash
ssh root@209.250.253.59 "cd /var/www/parenting-assistant && docker-compose -f docker-compose.prod.yml logs -f"
```

### Restart Services
```bash
ssh root@209.250.253.59 "cd /var/www/parenting-assistant && docker-compose -f docker-compose.prod.yml restart"
```

### Backup Database
```bash
ssh root@209.250.253.59 "docker exec parenting_postgres pg_dump -U parenting_user parenting_assistant > /root/backups/parenting_$(date +%Y%m%d).sql"
```

---

## 🐛 Troubleshooting

### Site not loading?
```bash
# Check containers
ssh root@209.250.253.59 "cd /var/www/parenting-assistant && docker-compose -f docker-compose.prod.yml ps"

# Check logs
ssh root@209.250.253.59 "cd /var/www/parenting-assistant && docker-compose -f docker-compose.prod.yml logs"
```

### Database issues?
```bash
# Run migrations manually
ssh root@209.250.253.59 "cd /var/www/parenting-assistant && docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy"
```

### Need to rebuild?
```bash
ssh root@209.250.253.59
cd /var/www/parenting-assistant
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d
```

---

## 📚 Full Documentation

For detailed information, see:
- **ATMATA_DEPLOYMENT.md** - Complete deployment guide
- **README.md** - Application documentation
- **DEPLOYMENT.md** - General deployment guide

---

**Deployed successfully? ** Start using your app at https://parenting.atmata.ai! 🎉
