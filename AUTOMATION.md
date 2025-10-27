# Automation Guide

This guide explains how to set up and use the automated deployment system for seamless updates from your local machine to production.

## 🎯 Overview

Once set up, here's your new workflow:

```bash
# Make changes locally
# ... edit files ...

# Test locally
npm run dev

# Commit and push - DEPLOYMENT HAPPENS AUTOMATICALLY!
git add .
git commit -m "Your changes"
git push origin main

# ✅ Done! Changes are live in ~2 minutes
```

**Plus, manage production from your local machine:**

```bash
# Delete all data on production
./scripts/production-cli.sh data:delete-all

# View production logs
./scripts/production-cli.sh logs backend

# Restart production services
./scripts/production-cli.sh restart all
```

---

## 🚀 One-Time Setup

### Step 1: Generate SSH Key for GitHub Actions

On your **local machine**:

```bash
# Generate a new SSH key (if you don't have one)
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions

# Copy the private key
cat ~/.ssh/github_actions

# Copy the public key
cat ~/.ssh/github_actions.pub
```

### Step 2: Add Public Key to Production Server

```bash
# SSH into production server
ssh root@209.250.253.59

# Add the public key to authorized_keys
echo "YOUR_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys

# Verify permissions
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh

# Exit server
exit
```

### Step 3: Add Private Key to GitHub Secrets

1. Go to your GitHub repository: `https://github.com/kkhalifeh/twins-assistant`
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `SSH_PRIVATE_KEY`
5. Value: Paste the **private key** content from `~/.ssh/github_actions`
6. Click **Add secret**

### Step 4: Upload Auto-Deploy Script to Server

From your **local machine**:

```bash
# Upload the auto-deploy script
scp scripts/auto-deploy.sh root@209.250.253.59:/var/www/parenting-assistant/scripts/

# Make it executable on the server
ssh root@209.250.253.59 "chmod +x /var/www/parenting-assistant/scripts/auto-deploy.sh"
```

### Step 5: Test the Setup

```bash
# Make a small change
echo "# Test automation" >> README.md

# Commit and push
git add README.md
git commit -m "Test automation"
git push origin main

# Go to GitHub and watch the action run:
# https://github.com/kkhalifeh/twins-assistant/actions
```

---

## 📦 How It Works

### Automatic Deployment (GitHub Actions)

**Every time you push to `main`:**

1. ✅ GitHub Actions detects the push
2. ✅ Connects to your production server via SSH
3. ✅ Pulls latest code
4. ✅ Restores production configs
5. ✅ Installs dependencies (if package.json changed)
6. ✅ Runs database migrations (if schema changed)
7. ✅ Rebuilds frontend
8. ✅ Restarts services
9. ✅ Verifies deployment health

**Total time: ~2-3 minutes**

You can watch the deployment in real-time:
- Go to https://github.com/kkhalifeh/twins-assistant/actions
- Click on the latest workflow run

---

## 🎮 Production CLI Commands

Manage your production server from your local machine using the CLI tool:

### Check Status

```bash
# View server and container status
./scripts/production-cli.sh status
```

Shows:
- Container status
- Backend health
- Frontend status
- Database tables

### View Logs

```bash
# View backend logs (live tail)
./scripts/production-cli.sh logs backend

# View frontend logs
./scripts/production-cli.sh logs frontend

# View all logs (last 30 lines each)
./scripts/production-cli.sh logs
```

### Manual Deployment

```bash
# Trigger deployment manually (without pushing to GitHub)
./scripts/production-cli.sh deploy
```

### Restart Services

```bash
# Restart backend
./scripts/production-cli.sh restart backend

# Restart frontend
./scripts/production-cli.sh restart frontend

# Restart everything
./scripts/production-cli.sh restart all
```

### Database Management

```bash
# View database status and migrations
./scripts/production-cli.sh db:status

# Run pending migrations
./scripts/production-cli.sh db:migrate

# Create a backup
./scripts/production-cli.sh db:backup

# Clean all data (DANGER!)
./scripts/production-cli.sh db:clean
```

### Data Management

```bash
# Delete all user data
./scripts/production-cli.sh data:delete-all

# Delete specific data types
./scripts/production-cli.sh data:delete-feeding
./scripts/production-cli.sh data:delete-sleep
./scripts/production-cli.sh data:delete-diapers
```

### Direct SSH Access

```bash
# SSH into production server
./scripts/production-cli.sh ssh
```

### Help

```bash
# Show all available commands
./scripts/production-cli.sh help
```

---

## 🔄 Your New Workflow

### Making Code Changes

```bash
# 1. Make changes locally
vim frontend/src/app/page.tsx

# 2. Test locally
npm run dev

# 3. Commit and push
git add .
git commit -m "Update homepage"
git push origin main

# ✅ Deployment happens automatically!
# Check progress: https://github.com/kkhalifeh/twins-assistant/actions
```

### Making Database Changes

```bash
# 1. Update Prisma schema
vim backend/prisma/schema.prisma

# 2. Create migration locally
cd backend
npx prisma migrate dev --name add_new_field

# 3. Test migration locally
# ... test your changes ...

# 4. Commit and push
git add .
git commit -m "Add new field to User model"
git push origin main

# ✅ Migration runs automatically on production!
```

### Cleaning Production Data

```bash
# Delete all data on production (for testing)
./scripts/production-cli.sh data:delete-all

# Delete specific data
./scripts/production-cli.sh data:delete-feeding
```

### Checking Production Health

```bash
# Quick status check
./scripts/production-cli.sh status

# View live backend logs
./scripts/production-cli.sh logs backend

# Create database backup
./scripts/production-cli.sh db:backup
```

---

## 🛠️ What Gets Automated

### ✅ Automatically Handled

- **Code deployment** - Push to main → deployed in 2 minutes
- **Dependencies** - npm install runs automatically
- **Database migrations** - Detected and applied automatically
- **Prisma client** - Regenerated automatically
- **Frontend builds** - Built and deployed automatically
- **Service restarts** - Containers restarted automatically
- **Production configs** - API URLs and settings restored automatically
- **Health checks** - Deployment verified automatically

### ⚠️ Manual Actions Required

- **Environment variables** - Must be updated on server manually
- **Database rollbacks** - Must be done manually if needed
- **Container rebuilds** - Only if Dockerfile changes (rare)

---

## 🔐 Security Notes

1. **SSH Key**: Keep your GitHub Actions SSH private key secure
2. **Never commit**: .env files, secrets, or API keys
3. **Database backups**: Run before major changes
4. **Test locally**: Always test before pushing to main

---

## 🐛 Troubleshooting

### Deployment Failed

```bash
# 1. Check GitHub Actions logs
# Visit: https://github.com/kkhalifeh/twins-assistant/actions

# 2. Check production logs
./scripts/production-cli.sh logs

# 3. SSH into server manually
./scripts/production-cli.sh ssh
```

### Frontend Not Updating

```bash
# Manually rebuild and restart
./scripts/production-cli.sh deploy
```

### Database Migration Failed

```bash
# Check migration status
./scripts/production-cli.sh db:status

# Try running manually
./scripts/production-cli.sh db:migrate
```

### Container Not Running

```bash
# Check status
./scripts/production-cli.sh status

# Restart all services
./scripts/production-cli.sh restart all
```

---

## 📊 Monitoring Deployments

### GitHub Actions Dashboard

Visit: `https://github.com/kkhalifeh/twins-assistant/actions`

You'll see:
- ✅ Successful deployments (green checkmark)
- ❌ Failed deployments (red X)
- 🟡 In-progress deployments (yellow circle)

Click on any run to see detailed logs.

### Manual Verification

After deployment:

```bash
# Check if everything is running
./scripts/production-cli.sh status

# Test the live site
open https://parenting.atmata.ai
```

---

## 🎯 Quick Reference

```bash
# Most common commands:

# Push changes → auto-deploy
git push origin main

# View status
./scripts/production-cli.sh status

# View logs
./scripts/production-cli.sh logs backend

# Delete production data
./scripts/production-cli.sh data:delete-all

# Restart services
./scripts/production-cli.sh restart all

# SSH to server
./scripts/production-cli.sh ssh

# See all commands
./scripts/production-cli.sh help
```

---

## 🎉 You're All Set!

Your deployment is now **fully automated**:

1. **Make changes locally**
2. **Push to GitHub**
3. **✅ Deployed automatically in 2 minutes**

Plus you have a **powerful CLI** to manage production from your local machine without ever SSHing to the server manually!
