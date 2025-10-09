#!/bin/bash

# Parenting Assistant - ATMATA Server Setup Script
# Run this script on the ATMATA server as root

set -e

echo "========================================="
echo "Parenting Assistant - Server Setup"
echo "========================================="
echo ""

# Variables
APP_DIR="/var/www/parenting-assistant"
GIT_REPO="/opt/git/parenting-assistant.git"
LOG_DIR="/var/log/parenting-assistant"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Step 1: Creating directories...${NC}"
mkdir -p "$APP_DIR"
mkdir -p "$LOG_DIR"
chown -R www-data:www-data "$APP_DIR"
chown -R www-data:www-data "$LOG_DIR"
echo -e "${GREEN}✓ Directories created${NC}"
echo ""

echo -e "${YELLOW}Step 2: Setting up Git bare repository...${NC}"
mkdir -p "$GIT_REPO"
cd "$GIT_REPO"
git init --bare
chown -R www-data:www-data "$GIT_REPO"
echo -e "${GREEN}✓ Git repository initialized${NC}"
echo ""

echo -e "${YELLOW}Step 3: Creating post-receive hook...${NC}"
cat > "$GIT_REPO/hooks/post-receive" << 'EOF'
#!/usr/bin/env bash
set -e

APP_DIR="/var/www/parenting-assistant"

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

chmod +x "$GIT_REPO/hooks/post-receive"
chown www-data:www-data "$GIT_REPO/hooks/post-receive"
echo -e "${GREEN}✓ Post-receive hook created${NC}"
echo ""

echo -e "${YELLOW}Step 4: Creating sudoers file...${NC}"
cat > /etc/sudoers.d/deploy-parenting << 'EOF'
www-data ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart parenting.service
www-data ALL=(ALL) NOPASSWD: /usr/bin/systemctl status parenting.service
www-data ALL=(ALL) NOPASSWD: /usr/bin/docker-compose
www-data ALL=(ALL) NOPASSWD: /usr/bin/docker
EOF

chmod 0440 /etc/sudoers.d/deploy-parenting
echo -e "${GREEN}✓ Sudoers file created${NC}"
echo ""

echo -e "${YELLOW}Step 5: Creating Nginx configuration...${NC}"
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
ln -sf /etc/nginx/sites-available/parenting /etc/nginx/sites-enabled/

# Test nginx configuration
if nginx -t; then
    echo -e "${GREEN}✓ Nginx configuration valid${NC}"
    systemctl reload nginx
    echo -e "${GREEN}✓ Nginx reloaded${NC}"
else
    echo -e "${RED}✗ Nginx configuration error${NC}"
    exit 1
fi
echo ""

echo -e "${YELLOW}Step 6: Setting up SSL certificate...${NC}"
echo -e "${YELLOW}Run this command to get SSL certificate:${NC}"
echo -e "${GREEN}certbot --nginx -d parenting.atmata.ai${NC}"
echo ""

echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}Server Setup Complete!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Get SSL certificate: certbot --nginx -d parenting.atmata.ai"
echo "2. On your local machine, add git remote:"
echo "   git remote add production ssh://www-data@209.250.253.59/opt/git/parenting-assistant.git"
echo "3. Deploy: git push production main"
echo "4. Update .env file on server with actual credentials"
echo ""
echo -e "${GREEN}Git remote (add to local machine):${NC}"
echo "ssh://www-data@209.250.253.59/opt/git/parenting-assistant.git"
