# Deployment Checklist - Parenting Assistant to ATMATA Server

## 📋 Pre-Deployment Checklist

### ✅ Files Created (All Complete)

- [x] `docker-compose.prod.yml` - Production Docker configuration
- [x] `backend/Dockerfile` - Backend container configuration
- [x] `frontend/Dockerfile` - Frontend container configuration
- [x] `backend/.dockerignore` - Docker build optimization
- [x] `frontend/.dockerignore` - Docker build optimization
- [x] `.env.example` - Environment template
- [x] `ATMATA_DEPLOYMENT.md` - Complete deployment guide
- [x] `QUICK_START.md` - Quick deployment guide
- [x] `DEPLOYMENT_CHECKLIST.md` - This file
- [x] `scripts/server-setup.sh` - Automated server setup
- [x] `.github/workflows/deploy.yml` - GitHub Actions CI/CD

### ✅ Application Ready

- [x] Database schema clean and migrated
- [x] All test data removed
- [x] Environment example files created
- [x] Documentation updated
- [x] Health check endpoint working
- [x] Git repository clean
- [x] Production readiness score: 9.0/10

---

## 🚀 Deployment Steps

### Step 1: Create GitHub Repository

- [ ] Create repository at https://github.com/new
  - Repository name: `parenting-assistant`
  - Visibility: Private
  - Do NOT initialize with README

- [ ] Push code to GitHub:
  ```bash
  cd /Users/khaledkhalifeh/Documents/Coding/twins-assistant
  git add .
  git commit -m "Production deployment ready"
  git remote add origin https://github.com/YOUR_USERNAME/parenting-assistant.git
  git branch -M main
  git push -u origin main
  ```

### Step 2: Configure DNS (If Not Done)

- [ ] Ensure `parenting.atmata.ai` DNS A record points to `209.250.253.59`
- [ ] Wait for DNS propagation (check with `nslookup parenting.atmata.ai`)

### Step 3: Setup ATMATA Server

- [ ] SSH to server:
  ```bash
  ssh root@209.250.253.59
  ```

- [ ] Upload setup script:
  ```bash
  # From your Mac (different terminal):
  scp /Users/khaledkhalifeh/Documents/Coding/twins-assistant/scripts/server-setup.sh root@209.250.253.59:/tmp/
  ```

- [ ] Run setup script on server:
  ```bash
  chmod +x /tmp/server-setup.sh
  /tmp/server-setup.sh
  ```

- [ ] Get SSL certificate:
  ```bash
  certbot --nginx -d parenting.atmata.ai
  ```

### Step 4: Add Production Git Remote (Local Machine)

- [ ] Add production remote:
  ```bash
  cd /Users/khaledkhalifeh/Documents/Coding/twins-assistant
  git remote add production ssh://www-data@209.250.253.59/opt/git/parenting-assistant.git
  ```

- [ ] Verify remote:
  ```bash
  git remote -v
  ```

### Step 5: Initial Deployment

- [ ] Deploy to production:
  ```bash
  git push production main
  ```

- [ ] Watch deployment logs (on server):
  ```bash
  # This will show the post-receive hook output
  ```

### Step 6: Configure Environment Variables

- [ ] Generate secure credentials:
  ```bash
  # SSH to server
  ssh root@209.250.253.59

  # Generate passwords
  echo "PostgreSQL Password: $(openssl rand -base64 32)"
  echo "JWT Secret: $(openssl rand -hex 32)"
  ```

- [ ] Update `.env` file on server:
  ```bash
  cd /var/www/parenting-assistant
  nano .env
  ```

  Update these values:
  ```env
  POSTGRES_PASSWORD=<generated-password>
  JWT_SECRET=<generated-jwt-secret>
  OPENAI_API_KEY=<your-actual-key>
  ```

- [ ] Restart containers after .env update:
  ```bash
  cd /var/www/parenting-assistant
  docker-compose -f docker-compose.prod.yml down
  docker-compose -f docker-compose.prod.yml up -d
  ```

### Step 7: Verify Deployment

- [ ] Check container status:
  ```bash
  docker-compose -f docker-compose.prod.yml ps
  ```

  All containers should show "Up" status.

- [ ] Check logs:
  ```bash
  docker-compose -f docker-compose.prod.yml logs --tail=50
  ```

- [ ] Test health endpoint:
  ```bash
  curl http://localhost:3001/health
  ```

  Should return: `{"status":"healthy",...}`

- [ ] Test external access:
  ```bash
  curl -I https://parenting.atmata.ai
  ```

  Should return: `HTTP/2 200`

- [ ] Open in browser:
  - [ ] https://parenting.atmata.ai (should load frontend)
  - [ ] Try to register a new account
  - [ ] Try to login
  - [ ] Navigate through app

### Step 8: Setup Automated Backups

- [ ] Create backup script on server:
  ```bash
  cat > /root/backup_parenting.sh << 'EOF'
  #!/bin/bash
  DATE=$(date +%Y%m%d_%H%M%S)
  BACKUP_DIR="/root/backups/parenting"
  mkdir -p $BACKUP_DIR

  # Backup database
  docker exec parenting_postgres pg_dump -U parenting_user parenting_assistant > "$BACKUP_DIR/db_$DATE.sql"

  # Backup .env
  cp /var/www/parenting-assistant/.env "$BACKUP_DIR/env_$DATE"

  # Keep only last 7 backups
  ls -t $BACKUP_DIR/db_*.sql | tail -n +8 | xargs rm -f
  ls -t $BACKUP_DIR/env_* | tail -n +8 | xargs rm -f

  echo "Backup completed: $BACKUP_DIR/db_$DATE.sql"
  EOF

  chmod +x /root/backup_parenting.sh
  ```

- [ ] Add to crontab:
  ```bash
  crontab -e
  # Add this line:
  # 0 3 * * * /root/backup_parenting.sh
  ```

### Step 9: (Optional) Setup GitHub Actions

- [ ] Generate SSH key for GitHub Actions:
  ```bash
  # On server
  ssh-keygen -t ed25519 -C "github-actions-parenting" -f /tmp/github_deploy

  # Add public key to authorized_keys for www-data user
  # Copy private key for GitHub Secrets
  ```

- [ ] Add SSH private key to GitHub Secrets:
  - Go to GitHub repository → Settings → Secrets and variables → Actions
  - Add new secret: `ATMATA_SSH_KEY`
  - Paste the private key content

---

## ✅ Post-Deployment Checklist

### Functionality Testing

- [ ] User registration works
- [ ] User login works
- [ ] Add child works
- [ ] Log feeding works
- [ ] Log sleep works
- [ ] Log diaper change works
- [ ] Log health record works
- [ ] Inventory management works
- [ ] AI chat responds correctly
- [ ] Dashboard loads with data
- [ ] Analytics generate insights

### Performance Testing

- [ ] Site loads in < 3 seconds
- [ ] API responses < 1 second
- [ ] No console errors in browser
- [ ] Mobile responsive
- [ ] SSL certificate valid

### Security Testing

- [ ] HTTPS enforced
- [ ] Direct IP access blocked
- [ ] Internal ports not accessible externally
- [ ] Environment variables not exposed
- [ ] Database only accessible from localhost

### Monitoring Setup

- [ ] Nginx logs being written:
  ```bash
  tail -f /var/log/nginx/parenting-access.log
  tail -f /var/log/nginx/parenting-error.log
  ```

- [ ] Container logs accessible:
  ```bash
  docker-compose -f docker-compose.prod.yml logs -f
  ```

- [ ] Health check responding:
  ```bash
  curl https://parenting.atmata.ai/health
  ```

---

## 📊 Maintenance Commands

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

### Update Deployment
```bash
git add .
git commit -m "Your updates"
git push production main
```

### Backup Database
```bash
ssh root@209.250.253.59 "docker exec parenting_postgres pg_dump -U parenting_user parenting_assistant > /root/backups/parenting/manual_$(date +%Y%m%d).sql"
```

---

## 🐛 Troubleshooting Guide

### Issue: Containers not starting

**Check:**
```bash
cd /var/www/parenting-assistant
docker-compose -f docker-compose.prod.yml logs
```

**Solution:**
```bash
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d
```

### Issue: Database connection failed

**Check:**
```bash
docker exec -it parenting_postgres psql -U parenting_user -d parenting_assistant -c "SELECT 1;"
```

**Solution:**
- Verify .env DATABASE_URL is correct
- Ensure PostgreSQL container is running
- Check PostgreSQL logs

### Issue: Site returns 502 Bad Gateway

**Check:**
```bash
docker-compose -f docker-compose.prod.yml ps
curl http://localhost:3000  # Frontend
curl http://localhost:3001/health  # Backend
```

**Solution:**
- Ensure both frontend and backend containers are "Up"
- Check container logs for errors
- Restart containers if needed

### Issue: SSL certificate issues

**Check:**
```bash
certbot certificates
```

**Solution:**
```bash
certbot --nginx -d parenting.atmata.ai --force-renewal
```

---

## 📞 Support

For issues, refer to:
- `ATMATA_DEPLOYMENT.md` - Complete deployment guide
- `QUICK_START.md` - Quick start guide
- `README.md` - Application documentation

---

## ✅ Deployment Complete!

Once all items are checked, your Parenting Assistant is successfully deployed to:

🌐 **https://parenting.atmata.ai**

---

**Deployment Date:** _______________
**Deployed By:** _______________
**Version:** 1.0.0
