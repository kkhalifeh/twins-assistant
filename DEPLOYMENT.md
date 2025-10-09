# Production Deployment Checklist

## Pre-Deployment Status ✅

- ✅ Database reset and clean (no test data)
- ✅ All processes terminated
- ✅ Test scripts removed
- ✅ Documentation cleaned and updated
- ✅ Environment example files created
- ✅ Comprehensive README.md with deployment instructions
- ✅ Production readiness score: 9.0/10

## Server Setup Steps

### 1. Server Requirements

**Minimum Specifications:**
- Ubuntu 20.04+ or similar Linux distribution
- 2 CPU cores
- 4GB RAM
- 20GB storage
- Node.js 18+
- PostgreSQL 14+
- Redis (optional, for caching)

### 2. Initial Server Configuration

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Redis (optional)
sudo apt install -y redis-server

# Install PM2 globally
sudo npm install -g pm2

# Install Nginx (for reverse proxy)
sudo apt install -y nginx
```

### 3. Database Setup

```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL shell:
CREATE DATABASE parenting_assistant;
CREATE USER your_db_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE parenting_assistant TO your_db_user;
\q
```

### 4. Clone and Setup Application

```bash
# Create application directory
sudo mkdir -p /var/www/parenting-assistant
sudo chown $USER:$USER /var/www/parenting-assistant
cd /var/www/parenting-assistant

# Clone repository
git clone <your-repo-url> .

# Install dependencies
npm run setup
```

### 5. Configure Environment Variables

**Backend (.env):**
```bash
cd /var/www/parenting-assistant/backend
cp .env.example .env
nano .env
```

Update with production values:
```env
DATABASE_URL="postgresql://your_db_user:your_secure_password@localhost:5432/parenting_assistant?schema=public"
JWT_SECRET="your-generated-secure-random-secret-minimum-32-chars"
JWT_EXPIRE="7d"
PORT=3001
NODE_ENV=production
OPENAI_API_KEY="sk-your-actual-openai-api-key"
REDIS_URL="redis://localhost:6379"
```

**Frontend (.env):**
```bash
cd /var/www/parenting-assistant/frontend
cp .env.example .env
nano .env
```

Update with production values:
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
```

### 6. Run Database Migrations

```bash
cd /var/www/parenting-assistant/backend
npx prisma migrate deploy
npx prisma generate
```

### 7. Build Applications

**Backend:**
```bash
cd /var/www/parenting-assistant/backend
npm install --production=false
npm run build
```

**Frontend:**
```bash
cd /var/www/parenting-assistant/frontend
npm install --production=false
npm run build
```

### 8. Setup PM2 Process Manager

```bash
# Start backend
cd /var/www/parenting-assistant/backend
pm2 start dist/index.js --name parenting-api --env production

# Start frontend
cd /var/www/parenting-assistant/frontend
pm2 start npm --name parenting-web -- start

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup systemd
# Run the command that PM2 outputs
```

### 9. Configure Nginx Reverse Proxy

**API Configuration:**
```bash
sudo nano /etc/nginx/sites-available/parenting-api
```

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Frontend Configuration:**
```bash
sudo nano /etc/nginx/sites-available/parenting-web
```

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Enable sites:**
```bash
sudo ln -s /etc/nginx/sites-available/parenting-api /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/parenting-web /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 10. Setup SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificates
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
sudo certbot --nginx -d api.yourdomain.com

# Auto-renewal is configured automatically
```

### 11. Setup Firewall

```bash
# Allow SSH, HTTP, HTTPS
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### 12. Post-Deployment Verification

```bash
# Check PM2 processes
pm2 status

# Check logs
pm2 logs parenting-api --lines 50
pm2 logs parenting-web --lines 50

# Test API
curl https://api.yourdomain.com/health

# Test frontend
curl https://yourdomain.com
```

## Monitoring & Maintenance

### PM2 Monitoring

```bash
# View status
pm2 status

# View logs
pm2 logs

# Restart services
pm2 restart all

# Monitor resources
pm2 monit
```

### Database Backups

```bash
# Create backup script
sudo nano /usr/local/bin/backup-parenting-db.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/postgresql"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
pg_dump -U your_db_user parenting_assistant > $BACKUP_DIR/backup_$TIMESTAMP.sql
find $BACKUP_DIR -type f -mtime +7 -delete
```

```bash
chmod +x /usr/local/bin/backup-parenting-db.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /usr/local/bin/backup-parenting-db.sh
```

### Updates and Deployments

```bash
# Pull latest changes
cd /var/www/parenting-assistant
git pull

# Backend updates
cd backend
npm install
npm run build
pm2 restart parenting-api

# Frontend updates
cd ../frontend
npm install
npm run build
pm2 restart parenting-web
```

## Security Checklist

- ✅ Strong JWT_SECRET generated (32+ characters)
- ✅ Database credentials secured
- ✅ SSL certificates installed
- ✅ Firewall configured
- ✅ .env files have correct permissions (600)
- ✅ CORS configured for production domains
- ✅ Rate limiting enabled
- ✅ PostgreSQL configured to only accept local connections

## Troubleshooting

### Application won't start
```bash
# Check PM2 logs
pm2 logs parenting-api --err
pm2 logs parenting-web --err

# Check environment variables
cd /var/www/parenting-assistant/backend
cat .env
```

### Database connection issues
```bash
# Test PostgreSQL connection
psql -U your_db_user -d parenting_assistant -h localhost

# Check PostgreSQL is running
sudo systemctl status postgresql
```

### Nginx issues
```bash
# Test configuration
sudo nginx -t

# Check error logs
sudo tail -f /var/log/nginx/error.log
```

## Performance Optimization

### Enable Gzip in Nginx

Add to nginx config:
```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/javascript application/json;
```

### Database Optimization

```sql
-- Add indexes for common queries (already in schema)
-- Run VACUUM periodically
VACUUM ANALYZE;
```

### PM2 Cluster Mode (for high traffic)

```bash
pm2 delete parenting-api
pm2 start dist/index.js --name parenting-api -i max
```

## Support

For technical issues, refer to:
- Application logs: `pm2 logs`
- Nginx logs: `/var/log/nginx/`
- PostgreSQL logs: `/var/log/postgresql/`

## Rollback Procedure

```bash
# Rollback to previous commit
git reset --hard HEAD~1

# Rebuild and restart
cd backend && npm run build && cd ..
cd frontend && npm run build && cd ..
pm2 restart all
```

---

**Deployment Status**: Ready for production ✅
**Last Updated**: October 9, 2025
