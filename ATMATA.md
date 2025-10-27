# Studio-Republik Server Management Cheat Sheet
**Server:** Studio-Republik (209.250.253.59)  
**OS:** Ubuntu 22.04.5 LTS  
**Storage:** 75GB total, ~52GB free (upgraded from 23GB)  
**Memory:** 2GB total (upgraded from 951MB)  

---

## 🤖 AI PROMPT FOR FUTURE SESSIONS

Copy and paste this into Claude to give complete server context:

```
I have a Ubuntu 22.04.5 LTS server (209.250.253.59) called Studio-Republik with the following setup:

ACTIVE DOMAINS:
1. atmata.ai - Main Company Website (React/Vite static site, files in /var/www/atmata-site/)
2. ammantv.atmata.ai - AI Debate Show (FastAPI/Uvicorn on port 8001, files in /var/www/ammantv/ai-debate-show/, service: ammantv.service)
3. brau.atmata.ai - Brau Chatbot (Flask on port 5001, files in /var/www/brau-chatbot/, service: brau.service)
4. studiorepublik.atmata.ai - Dashboard with Zayn Agent (Static dashboard in /var/www/dashboards/studiorepublik/, Zayn Flask app in /root/studio_app/studiorepublik/ on port 5000, service: zayn-agent.service)
5. alalpha.atmata.ai - AlAlpha Chatbot (Flask on port 5002, files in /var/www/alalpha-chatbot/, service: alalpha.service, auto-deploy from Git bare repo in /opt/git/alalpha-chatbot.git via post-receive hook)
6. whatsappsaas.atmata.ai - WhatsApp Attribution Tracker (React dashboard + FastAPI backend on port 8004, PostgreSQL in Docker, auto-deploy via Git, tracks marketing attribution from ads to WhatsApp conversations)
7. parenting.atmata.ai - Twin Parenting Assistant (Next.js frontend on port 3000, Node.js/Express backend on port 3001, PostgreSQL on 5433, Redis on 6380, AI-powered chatbot for twin baby care, auto-deploy from Git bare repo in /opt/git/parenting-assistant.git via post-receive hook)

Auto-deploy: Git bare repos with post-receive hooks for AlAlpha, WhatsApp SaaS, and Parenting Assistant

TECH STACK:
- Web Server: Nginx with SSL (Let's Encrypt/Certbot)
- Python Apps: Flask, FastAPI with Gunicorn/Uvicorn
- Node.js Apps: Express with TypeScript, Next.js 14
- AI: OpenAI GPT-4/5, LangChain, Chroma vector databases
- Vector Databases: Chroma (local)
- Databases: PostgreSQL (Docker) for WhatsApp SaaS and Parenting Assistant, Redis (Docker) for Parenting Assistant caching
- Process Management: systemd services, Docker containers
- Storage: 75GB total, ~52GB free, 2GB RAM (upgraded)
- Security: UFW firewall, fail2ban, blocked direct IP access

NGINX SITES:
- /etc/nginx/sites-available/ (atmata, ammantv, brau, studiorepublik-atmata, alalpha, whatsappsaas, parenting, default)
- /etc/nginx/sites-enabled/ (atmata, ammantv, brau, studiorepublik-atmata, alalpha, whatsappsaas, parenting, default)
- Default config blocks all direct IP access (return 444)

SSL CERTIFICATES:
- atmata.ai, ammantv.atmata.ai, brau.atmata.ai, studiorepublik.atmata.ai, alalpha.atmata.ai, whatsappsaas.atmata.ai, parenting.atmata.ai (Let's Encrypt)

SERVICES:
- ammantv.service (Active) - /var/www/ammantv/ai-debate-show/backend/venv/bin/gunicorn -w 2 -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:8001
- brau.service (Active) - /var/www/brau-chatbot/venv/bin/gunicorn -w 1 -b 127.0.0.1:5001 --timeout 120 web_test:app
- zayn-agent.service (Active) - /root/studio_app/studiorepublik/venv/bin/python web_test.py
- alalpha.service (Active) - /var/www/alalpha-chatbot/venv/bin/gunicorn -w 1 -b 127.0.0.1:5002 --timeout 120 web_test:app
- whatsappsaas.service (Active) - /var/www/whatsappsaas/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8004

VECTOR DATABASES:
- Chroma databases: brau_db/, studio_db/ (in .gitignore)

DOCKER CONTAINERS:
- whatsapp_postgres: Port 5432 for WhatsApp SaaS
- parenting_postgres: Port 5433 for Parenting Assistant (PostgreSQL 14)
- parenting_redis: Port 6380 for Parenting Assistant (Redis 7)
- parenting_backend: Port 3001 for Parenting Assistant API (Node.js/Express)
- parenting_frontend: Port 3000 for Parenting Assistant UI (Next.js 14)

SECURITY:
- UFW firewall blocking external access to ports 3000, 3001, 5000, 5001, 5002, 5433, 6380, 8001, 8004
- Fail2ban protecting SSH
- Direct IP access blocked (returns 444)
- Automated backup system in /root/backup_server.sh

All apps use virtual environments, Git repositories, and have .env files with API keys. The server hosts AI chatbots for business lead qualification, customer service, marketing attribution tracking, and twin parenting assistance with activity logging and AI-powered recommendations.
```

---

## 🌐 ACTIVE DOMAINS & APPLICATIONS

### 1. **atmata.ai** (Main Company Website)
- **URL:** https://atmata.ai (and https://www.atmata.ai)
- **Source Location:** `/var/www/atmata-site-src/`
- **Build Output:** `/var/www/atmata-site/`
- **SSL:** ✅ Active (Let's Encrypt)
- **Type:** React/Vite static site with TypeScript
- **Build Process:** `npm install --legacy-peer-deps && npm run build`
- **Deploy Script:** `/var/www/deploy_atmata.sh`
- **Contact Form:** Formspree integration (https://formspree.io/f/xnnglaod)

### 2. **ammantv.atmata.ai** (AI Debate Show)
- **URL:** https://ammantv.atmata.ai
- **Location:** `/var/www/ammantv/ai-debate-show/`
- **Port:** 8001 (internal)
- **Service:** `ammantv.service`
- **SSL:** ✅ Active (Let's Encrypt)
- **Type:** FastAPI/Uvicorn app with frontend

### 3. **brau.atmata.ai** (Brau Chatbot)
- **URL:** https://brau.atmata.ai
- **Location:** `/var/www/brau-chatbot/`
- **Port:** 5001 (internal)
- **Service:** `brau.service`
- **SSL:** ✅ Active (Let's Encrypt)
- **Type:** Flask chatbot application

### 4. **studiorepublik.atmata.ai** (React Dashboard + Zayn Agent)
- **URL:** https://studiorepublik.atmata.ai
- **Zayn Agent:** https://studiorepublik.atmata.ai/zayn/
- **Dashboard Location:** `/var/www/dashboards/studiorepublik/` (source)
- **Served From:** `/var/www/dashboards/studiorepublik/dist/` (built files)
- **Zayn App Location:** `/root/studio_app/studiorepublik/`
- **Ports:** 80/443 (dashboard), 5000 (Zayn agent)
- **Services:** Static files served by nginx, `zayn-agent.service`
- **SSL:** ✅ Active (Let's Encrypt)
- **Type:** React/Vite dashboard + Flask agent (Studio Republik gym sales qualifying bot)
- **Build Process:** `npm install --legacy-peer-deps && npm run build`

### 5. **alalpha.atmata.ai** (AlAlpha Chatbot)
- **URL:** https://alalpha.atmata.ai
- **Location:** `/var/www/alalpha-chatbot/`
- **Port:** 5002 (internal)
- **Service:** `alalpha.service`
- **SSL:** ✅ Active (Let's Encrypt)
- **Type:** Flask chatbot application
- **Deployment Method:** Auto-deploy via Git bare repo (`/opt/git/alalpha-chatbot.git`) with `post-receive` hook
- **Working Tree:** `/var/www/alalpha-chatbot/`
- **Virtual Environment:** `/var/www/alalpha-chatbot/venv/`
- **Post-Receive Hook Tasks:**
  1. Checks out latest code into working tree
  2. Ensures Python venv exists
  3. Installs dependencies from `requirements.txt`
  4. Restarts `alalpha.service` via `systemctl`
- **Local Deployment Command (from Mac):**
  ```bash
  git add .
  git commit -m "Your message"
  git push prod main
  ```

### 6. **whatsappsaas.atmata.ai** (WhatsApp Attribution Tracker)
- **URL:** https://whatsappsaas.atmata.ai
- **Demo Page:** https://whatsappsaas.atmata.ai/demo.html
- **Location:** `/var/www/whatsappsaas/`
- **Backend Port:** 8004 (internal)
- **Service:** `whatsappsaas.service`
- **SSL:** ✅ Active (Let's Encrypt)
- **Type:** FastAPI backend + React dashboard + Embeddable widget
- **Database:** PostgreSQL (Docker container: whatsapp_postgres)
- **Deployment Method:** Auto-deploy via Git bare repo (`/opt/git/whatsappsaas.git`) with `post-receive` hook
- **Working Tree:** `/var/www/whatsappsaas/`
- **Backend Virtual Environment:** `/var/www/whatsappsaas/backend/venv/`
- **Features:**
  - Marketing attribution tracking from ads to WhatsApp conversations
  - Embeddable widget for websites
  - Unique code generation for session linking
  - Analytics dashboard with full customer journey visibility
  - WhatsApp Business API integration
  - 40+ data points tracked per session
- **Post-Receive Hook Tasks:**
  1. Checks out latest code into working tree
  2. Updates backend Python dependencies
  3. Builds frontend React app (main then widget)
  4. Sets proper permissions
  5. Restarts `whatsappsaas.service`
- **Important Build Note:** Frontend must be built in correct order:
  ```bash
  npm run build:widget  # First build widget
  npm run build        # Then build main app (preserves widget files)
  ```
- **Local Deployment Command (from Mac):**
  ```bash
  git add .
  git commit -m "Your message"
  git push origin main     # Updates GitHub
  git push production main # Auto-deploys to server
  ```

### 7. **parenting.atmata.ai** (Twin Parenting Assistant)
- **URL:** https://parenting.atmata.ai
- **GitHub:** https://github.com/kkhalifeh/twins-assistant
- **Location:** `/var/www/parenting-assistant/`
- **Frontend Port:** 3000 (internal)
- **Backend Port:** 3001 (internal)
- **SSL:** ✅ Active (Let's Encrypt)
- **Type:** Next.js 14 frontend + Node.js/Express backend with TypeScript
- **Databases:**
  - PostgreSQL 14 (Docker container: parenting_postgres, port 5433)
  - Redis 7 (Docker container: parenting_redis, port 6380)
- **Deployment Method:** Docker containers, auto-deploy via Git bare repo (`/opt/git/parenting-assistant.git`) with `post-receive` hook
- **Working Tree:** `/var/www/parenting-assistant/`
- **Docker Containers:**
  - `parenting_postgres` - PostgreSQL database
  - `parenting_redis` - Redis cache
  - `parenting_backend` - Node.js/Express API with TypeScript (runs via ts-node)
  - `parenting_frontend` - Next.js 14 SSR application
- **Docker Network:** `parenting_network` (isolated from other services)
- **Features:**
  - Twin baby care tracking (feeding, sleep, diapers, health)
  - Inventory management for baby supplies
  - AI-powered chat assistant using OpenAI GPT
  - JWT authentication with bcrypt password hashing
  - Prisma ORM for database management
  - Real-time activity logging and analytics
  - Dashboard with statistics and insights
  - Schedule management for baby routines
- **Post-Receive Hook Tasks:**
  1. Checks out latest code into working tree
  2. Builds Docker images for backend and frontend
  3. Stops and removes old containers
  4. Starts new containers with proper networking
  5. Runs database migrations via Prisma
  6. Health check verification
- **Manual Container Management:**
  ```bash
  # View all Parenting Assistant containers
  docker ps | grep parenting_

  # View logs
  docker logs -f parenting_backend
  docker logs -f parenting_frontend
  docker logs -f parenting_postgres
  docker logs -f parenting_redis

  # Restart containers
  docker restart parenting_backend
  docker restart parenting_frontend

  # Access PostgreSQL
  docker exec -it parenting_postgres psql -U parenting_user -d parenting_assistant

  # Access Redis
  docker exec -it parenting_redis redis-cli
  ```
- **Important Notes:**
  - Backend uses ts-node (not compiled TypeScript) to avoid compilation errors
  - Frontend API URL hardcoded to https://parenting.atmata.ai/api (baked at build time)
  - Database password is URL-encoded in connection string (contains special characters)
  - OpenAI API key must be on single line in .env (no line breaks)
  - All ports bound to 127.0.0.1 only (not exposed externally)
- **Local Deployment Command (from Mac):**
  ```bash
  git add .
  git commit -m "Your message"
  git push origin main      # Updates GitHub
  git push production main  # Auto-deploys to server
  ```

---

## 🛡️ SECURITY STATUS

### Current Security Measures
- ✅ **Direct IP Access:** BLOCKED (returns 444)
- ✅ **UFW Firewall:** Active (blocks external access to 5000, 5001, 5002, 8001, 8004)
- ✅ **Fail2ban:** Protecting SSH from brute force
- ✅ **SSL Certificates:** Valid for all domains
- ✅ **Automated Backups:** `/root/backup_server.sh`

### Firewall Rules
```bash
# Current UFW Status
22/tcp    ALLOW    SSH access
80/443    ALLOW    Web traffic (HTTP/HTTPS)
3000      DENY     External access (Parenting frontend - localhost only)
3001      DENY     External access (Parenting backend - localhost only)
5000      DENY     External access (Zayn agent - localhost only)
5001      DENY     External access (Brau - localhost only)
5002      DENY     External access (AlAlpha - localhost only)
5433      DENY     External access (Parenting PostgreSQL - localhost only)
6380      DENY     External access (Parenting Redis - localhost only)
8001      DENY     External access (AmmanTV - localhost only)
8004      DENY     External access (WhatsApp SaaS - localhost only)
```

### Security Commands
```bash
# Check firewall status
ufw status verbose

# Check fail2ban status
fail2ban-client status

# Block direct IP access test
curl -I http://209.250.253.59/  # Should fail or return 444

# Monitor attacks (should be minimal now)
tail -f /var/log/nginx/error.log
```

---

## 🔧 SERVICE MANAGEMENT

### Service Status & Control
```bash
# Check all app services
systemctl status ammantv.service
systemctl status brau.service
systemctl status zayn-agent.service
systemctl status alalpha.service
systemctl status whatsappsaas.service

# Start/Stop/Restart services
systemctl start|stop|restart ammantv.service
systemctl start|stop|restart brau.service
systemctl start|stop|restart zayn-agent.service
systemctl start|stop|restart alalpha.service
systemctl start|stop|restart whatsappsaas.service

# Enable/Disable auto-start
systemctl enable|disable ammantv.service
systemctl enable|disable brau.service
systemctl enable|disable zayn-agent.service
systemctl enable|disable alalpha.service
systemctl enable|disable whatsappsaas.service

# Reload after config changes
systemctl daemon-reload

# Check if all services are running
systemctl is-active ammantv.service brau.service zayn-agent.service alalpha.service whatsappsaas.service
```

### Service Files & Configurations

**ammantv.service** - `/etc/systemd/system/ammantv.service`
```ini
[Unit]
Description=AmmanTV AI Debate Show Service
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/ammantv/ai-debate-show/backend
ExecStart=/var/www/ammantv/ai-debate-show/backend/venv/bin/gunicorn -w 2 -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:8001
Restart=always
Environment="PATH=/var/www/ammantv/ai-debate-show/backend/venv/bin"

[Install]
WantedBy=multi-user.target
```

**brau.service** - `/etc/systemd/system/brau.service`
```ini
[Unit]
Description=Brau Chatbot Service
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/brau-chatbot
ExecStart=/var/www/brau-chatbot/venv/bin/gunicorn -w 1 -b 127.0.0.1:5001 --timeout 120 web_test:app
Restart=always
Environment="PATH=/var/www/brau-chatbot/venv/bin"

[Install]
WantedBy=multi-user.target
```

**zayn-agent.service** - `/etc/systemd/system/zayn-agent.service`
```ini
[Unit]
Description=Zayn Agent Service (Studio Republik)
After=network.target

[Service]
User=root
Group=root
WorkingDirectory=/root/studio_app/studiorepublik
ExecStart=/root/studio_app/studiorepublik/venv/bin/python web_test.py
Restart=always
Environment="PATH=/root/studio_app/studiorepublik/venv/bin"

[Install]
WantedBy=multi-user.target
```

**alalpha.service** - `/etc/systemd/system/alalpha.service`
```ini
[Unit]
Description=AlAlpha Chatbot Service
After=network.target

[Service]
User=deploy
Group=deploy
WorkingDirectory=/var/www/alalpha-chatbot
ExecStart=/var/www/alalpha-chatbot/venv/bin/gunicorn -w 1 -b 127.0.0.1:5002 --timeout 120 web_test:app
Restart=always
Environment="PATH=/var/www/alalpha-chatbot/venv/bin"

[Install]
WantedBy=multi-user.target
```

**whatsappsaas.service** - `/etc/systemd/system/whatsappsaas.service`
```ini
[Unit]
Description=WhatsApp SaaS Backend Service
After=network.target postgresql.service

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/whatsappsaas/backend
Environment="PATH=/var/www/whatsappsaas/backend/venv/bin"
ExecStart=/var/www/whatsappsaas/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8004
Restart=always

[Install]
WantedBy=multi-user.target
```

---

## 📊 MONITORING & LOGS

### Real-time Log Monitoring
```bash
# Monitor specific service logs
journalctl -u ammantv.service -f
journalctl -u brau.service -f
journalctl -u zayn-agent.service -f
journalctl -u alalpha.service -f
journalctl -u whatsappsaas.service -f

# Monitor nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Check last 50 lines of service logs
journalctl -u ammantv.service --lines=50
journalctl -u brau.service --lines=50
journalctl -u zayn-agent.service --lines=50
journalctl -u alalpha.service --lines=50
journalctl -u whatsappsaas.service --lines=50
```

### Application-Specific Quick Checks

**Atmata.ai Website**
```bash
# Test site health
curl -I https://atmata.ai
curl -I https://www.atmata.ai

# Check contact form endpoint
curl -I https://formspree.io/f/xnnglaod
```

**AlAlpha Chatbot**
```bash
# Follow AlAlpha logs
journalctl -u alalpha.service -f

# Last 50 log lines
journalctl -u alalpha.service --lines=50

# Test site health
curl -I https://alalpha.atmata.ai
```

**WhatsApp SaaS**
```bash
# Follow WhatsApp SaaS logs
journalctl -u whatsappsaas.service -f

# Monitor webhook activity
journalctl -u whatsappsaas.service -f | grep webhook

# Test API health
curl https://whatsappsaas.atmata.ai/api/v1/health

# Check PostgreSQL
docker exec -it whatsapp_postgres psql -U whatsapp_user -d whatsapp_saas -c "SELECT COUNT(*) FROM tracking_sessions;"

# Manual rebuild if needed
cd /var/www/whatsappsaas/frontend
npm run build:widget && npm run build
chown -R www-data:www-data dist/
```

**Parenting Assistant**
```bash
# Check all Parenting containers
docker ps | grep parenting_

# Follow backend logs
docker logs -f parenting_backend

# Follow frontend logs
docker logs -f parenting_frontend

# Test API health
curl https://parenting.atmata.ai/health
curl https://parenting.atmata.ai/api/health

# Check database
docker exec -it parenting_postgres psql -U parenting_user -d parenting_assistant -c "SELECT COUNT(*) FROM \"User\";"
docker exec -it parenting_postgres psql -U parenting_user -d parenting_assistant -c "SELECT COUNT(*) FROM \"Child\";"

# Check Redis
docker exec -it parenting_redis redis-cli ping

# Restart containers if needed
docker restart parenting_backend
docker restart parenting_frontend

# Stop and rebuild (if needed)
cd /var/www/parenting-assistant
docker stop parenting_backend parenting_frontend
docker rm parenting_backend parenting_frontend
docker build -t parenting-backend:latest backend/
docker build -t parenting-frontend:latest frontend/
# Then run containers (see deployment docs)
```

### System Monitoring
```bash
# Check running processes
ps aux | grep -E "(python|gunicorn|uvicorn|node)" | grep -v grep

# Check port usage
netstat -tlnp | grep -E ":80|:443|:3000|:3001|:5000|:5001|:5002|:5433|:6380|:8001|:8004"

# Check memory/disk usage
free -h
df -h

# Check system load
htop
```

---

## 🌐 NGINX MANAGEMENT

### Site Management
```bash
# Enable a site
ln -s /etc/nginx/sites-available/sitename /etc/nginx/sites-enabled/

# Disable a site
rm /etc/nginx/sites-enabled/sitename

# Test nginx configuration
nginx -t

# Reload nginx (after config changes)
systemctl reload nginx

# Restart nginx
systemctl restart nginx
```

### Site Configuration Files
- **Available:** `/etc/nginx/sites-available/`
- **Enabled:** `/etc/nginx/sites-enabled/`
- **Main config:** `/etc/nginx/nginx.conf`

### Current Active Sites
- `atmata` → atmata.ai (static site)
- `ammantv` → ammantv.atmata.ai (port 8001)
- `brau` → brau.atmata.ai (port 5001)
- `studiorepublik-atmata` → studiorepublik.atmata.ai (dashboard + zayn proxy to port 5000)
- `alalpha` → alalpha.atmata.ai (proxy to 127.0.0.1:5002)
- `whatsappsaas` → whatsappsaas.atmata.ai (proxy to 127.0.0.1:8004)
- `parenting` → parenting.atmata.ai (frontend on 127.0.0.1:3000, API on 127.0.0.1:3001)
- `default` → Blocks direct IP access

### Site-Specific Nginx Configs

**Atmata.ai Main Website**
```nginx
server {
    listen 80;
    server_name atmata.ai www.atmata.ai;

    root /var/www/atmata-site;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/atmata.ai/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/atmata.ai/privkey.pem;
}
```

**AlAlpha Chatbot**
```nginx
server {
    listen 80;
    server_name alalpha.atmata.ai;

    location / {
        proxy_pass http://127.0.0.1:5002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/alalpha.atmata.ai/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/alalpha.atmata.ai/privkey.pem;
}
```

**WhatsApp SaaS**
```nginx
server {
    server_name whatsappsaas.atmata.ai;

    root /var/www/whatsappsaas/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8004/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /widget/ {
        alias /var/www/whatsappsaas/frontend/dist/;
        add_header Access-Control-Allow-Origin *;
    }

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/whatsappsaas.atmata.ai/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/whatsappsaas.atmata.ai/privkey.pem;
}
```

**Parenting Assistant**
```nginx
server {
    listen 80;
    server_name parenting.atmata.ai;

    location /api/ {
        proxy_pass http://127.0.0.1:3001/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/parenting.atmata.ai/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/parenting.atmata.ai/privkey.pem;
}
```

---

## 🔒 SSL CERTIFICATE MANAGEMENT

### Current Certificates
- **atmata.ai** (and www.atmata.ai) ✅
- **ammantv.atmata.ai** ✅
- **brau.atmata.ai** ✅  
- **studiorepublik.atmata.ai** ✅
- **alalpha.atmata.ai** ✅
- **whatsappsaas.atmata.ai** ✅
- **parenting.atmata.ai** ✅

### SSL Commands
```bash
# Renew all certificates
certbot renew

# Get new certificate for domain
certbot --nginx -d your-domain.atmata.ai

# Check certificate expiry
certbot certificates

# Test auto-renewal
certbot renew --dry-run
```

---

## 🚀 DEPLOYMENT WORKFLOWS

### Deploy Atmata.ai Website
```bash
# Manual deployment
bash /var/www/deploy_atmata.sh

# Or step by step:
cd /var/www/atmata-site-src
git fetch --all
git reset --hard origin/main
npm install --legacy-peer-deps
npm run build
rsync -av --delete dist/ /var/www/atmata-site/
chown -R www-data:www-data /var/www/atmata-site
```

**Developer Workflow (from local machine):**
```bash
git add .
git commit -m "Update site"
git pull --rebase origin main
git push origin main

ssh root@209.250.253.59 'bash /var/www/deploy_atmata.sh'
```

### Deploy Brau Chatbot Updates
```bash
cd /var/www/brau-chatbot
git pull origin main
systemctl restart brau.service
systemctl status brau.service
journalctl -u brau.service -f  # Monitor logs
```

### Deploy AmmanTV Updates
```bash
cd /var/www/ammantv/ai-debate-show
git pull origin main
systemctl restart ammantv.service
systemctl status ammantv.service
```

### Deploy Zayn Agent Updates
```bash
cd /root/studio_app/studiorepublik
git pull origin main
systemctl restart zayn-agent.service
systemctl status zayn-agent.service
journalctl -u zayn-agent.service -f  # Monitor logs
```

### Deploy Studio Republik Dashboard (React/Vite)
```bash
cd /var/www/dashboards/studiorepublik
git stash
git pull origin main
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
npm run build
chown -R www-data:www-data dist/
systemctl reload nginx
# Test: curl -I https://studiorepublik.atmata.ai
```

**Studio Republik Auto-Deploy Script:**
```bash
# Use the deploy script
/var/www/dashboards/studiorepublik/deploy.sh
```

### Deploy AlAlpha Updates (Auto-Deploy Enabled)
**From local machine:**
```bash
git add .
git commit -m "Update message"
git push prod main
```

**Server `post-receive` hook** (lives at `/opt/git/alalpha-chatbot.git/hooks/post-receive`):
```bash
#!/usr/bin/env bash
set -e

APP_DIR="/var/www/alalpha-chatbot"
VENV="$APP_DIR/venv"
SERVICE="alalpha.service"

read oldrev newrev ref

echo "[post-receive] Deploying to $APP_DIR"

GIT_WORK_TREE="$APP_DIR" git --work-tree="$APP_DIR" --git-dir="/opt/git/alalpha-chatbot.git" checkout -f

if [ ! -d "$VENV" ]; then
  echo "[post-receive] Creating virtual environment"
  python3 -m venv "$VENV"
fi

if [ -f "$APP_DIR/requirements.txt" ]; then
  echo "[post-receive] Installing requirements"
  "$VENV/bin/pip" install --upgrade pip
  "$VENV/bin/pip" install -r "$APP_DIR/requirements.txt"
fi

echo "[post-receive] Restarting $SERVICE"
sudo -n /usr/bin/systemctl restart "$SERVICE"
sudo -n /usr/bin/systemctl status "$SERVICE" --no-pager -l || true

echo "[post-receive] Deployment complete."
```

### Deploy WhatsApp SaaS Updates (Auto-Deploy Enabled)
**From local machine:**
```bash
git add .
git commit -m "Update message"
git push origin main     # Updates GitHub
git push production main # Auto-deploys to server
```

**Server `post-receive` hook** (lives at `/opt/git/whatsappsaas.git/hooks/post-receive`):
```bash
#!/usr/bin/env bash
set -e

APP_DIR="/var/www/whatsappsaas"
BACKEND_VENV="$APP_DIR/backend/venv"
SERVICE="whatsappsaas.service"

read oldrev newrev ref

echo "[post-receive] Deploying WhatsApp SaaS to $APP_DIR"

# Checkout latest code
GIT_WORK_TREE="$APP_DIR" git --work-tree="$APP_DIR" --git-dir="/opt/git/whatsappsaas.git" checkout -f

# Backend setup
if [ ! -d "$BACKEND_VENV" ]; then
  echo "[post-receive] Creating backend virtual environment"
  python3 -m venv "$BACKEND_VENV"
fi

echo "[post-receive] Installing backend requirements"
"$BACKEND_VENV/bin/pip" install --upgrade pip
"$BACKEND_VENV/bin/pip" install -r "$APP_DIR/backend/requirements.txt"

# Frontend build
echo "[post-receive] Building frontend"
cd "$APP_DIR/frontend"
npm install
npm run build:widget  # Build widget first
npm run build        # Then build main app

# Set permissions
sudo chown -R www-data:www-data "$APP_DIR/frontend/dist"

# Restart service
echo "[post-receive] Restarting $SERVICE"
sudo systemctl restart "$SERVICE"
sudo systemctl status "$SERVICE" --no-pager -l || true

echo "[post-receive] Deployment complete!"
```

### Deploy Parenting Assistant Updates (Auto-Deploy Enabled)
**From local machine:**
```bash
git add .
git commit -m "Update message"
git push origin main      # Updates GitHub
git push production main  # Auto-deploys to server
```

**Post-receive hook handles:**
- Docker image building
- Container recreation
- Database migrations
- Health checks

---

## 🐳 DOCKER CONTAINERS

### PostgreSQL for WhatsApp SaaS
```bash
# Start PostgreSQL container
docker start whatsapp_postgres

# Stop PostgreSQL container
docker stop whatsapp_postgres

# Access PostgreSQL
docker exec -it whatsapp_postgres psql -U whatsapp_user -d whatsapp_saas

# Backup database
docker exec whatsapp_postgres pg_dump -U whatsapp_user whatsapp_saas > backup.sql

# Check logs
docker logs whatsapp_postgres
```

### PostgreSQL for Parenting Assistant
```bash
# Start PostgreSQL container
docker start parenting_postgres

# Stop PostgreSQL container
docker stop parenting_postgres

# Access PostgreSQL
docker exec -it parenting_postgres psql -U parenting_user -d parenting_assistant

# Backup database
docker exec parenting_postgres pg_dump -U parenting_user parenting_assistant > backup.sql

# Check logs
docker logs parenting_postgres
```

### Redis for Parenting Assistant
```bash
# Start Redis container
docker start parenting_redis

# Stop Redis container
docker stop parenting_redis

# Access Redis CLI
docker exec -it parenting_redis redis-cli

# Check logs
docker logs parenting_redis
```

### Container Overview
```bash
# View all containers
docker ps -a

# View only running containers
docker ps

# View container resource usage
docker stats

# Remove stopped containers
docker container prune
```

---

## 📁 IMPORTANT FILE LOCATIONS

### Application Directories
```text
/var/www/atmata-site-src/                           # Atmata.ai website source
/var/www/atmata-site/                               # Atmata.ai website build output
/var/www/ammantv/ai-debate-show/                    # AmmanTV app
/var/www/brau-chatbot/                              # Brau chatbot
/var/www/dashboards/studiorepublik/                 # Studio Republik dashboard
/root/studio_app/studiorepublik/                    # Zayn agent app
/var/www/alalpha-chatbot/                           # AlAlpha chatbot
/var/www/whatsappsaas/                              # WhatsApp SaaS
/var/www/parenting-assistant/                       # Parenting Assistant
```

### Configuration Files
```text
/etc/nginx/sites-available/                         # Nginx site configs
/etc/nginx/sites-enabled/                           # Active site configs
/etc/systemd/system/                                # Service files
/etc/letsencrypt/live/                              # SSL certificates
/etc/sudoers.d/                                     # Deployment permissions
```

### Git Repositories (Bare)
```text
/opt/git/alalpha-chatbot.git                        # AlAlpha auto-deploy repo
/opt/git/whatsappsaas.git                           # WhatsApp SaaS auto-deploy repo
/opt/git/parenting-assistant.git                    # Parenting Assistant auto-deploy repo
```

### Deployment Scripts
```text
/var/www/deploy_atmata.sh                           # Atmata.ai deployment script
/var/www/dashboards/studiorepublik/deploy.sh        # Studio Republik deployment script
```

### Environment Files
```text
/var/www/atmata-site-src/.env                       # Atmata.ai env (if needed)
/var/www/brau-chatbot/.env                          # Brau API keys
/root/studio_app/studiorepublik/.env                # Zayn API keys
/var/www/ammantv/ai-debate-show/backend/.env        # AmmanTV API keys
/var/www/alalpha-chatbot/.env                       # AlAlpha API keys
/var/www/whatsappsaas/backend/.env                  # WhatsApp SaaS API keys
/var/www/parenting-assistant/.env                   # Parenting Assistant API keys
```

### Sudoers Files (Auto-restart permissions)
```text
/etc/sudoers.d/deploy-alalpha                       # AlAlpha deployment permissions
/etc/sudoers.d/deploy-whatsappsaas                  # WhatsApp SaaS deployment permissions
```

---

## 🔧 TROUBLESHOOTING GUIDE

### App Won't Start
```bash
# Check service status and errors
systemctl status servicename.service
journalctl -u servicename.service --lines=20

# Check if port is in use
netstat -tlnp | grep :PORT

# Check file permissions
ls -la /var/www/your-app/
chown -R www-data:www-data /var/www/your-app/
```

### React/Vite Build Issues (Atmata.ai, Studio Republik)
```bash
# White screen or build errors
cd /var/www/atmata-site-src  # or /var/www/dashboards/studiorepublik
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
npm run build
chown -R www-data:www-data dist/

# Check nginx is serving from dist/
grep -A 5 "location /" /etc/nginx/sites-available/atmata
# Should show: root /var/www/atmata-site; (or respective path)

# Clear browser cache: Ctrl+F5 or incognito mode
```

### Database Issues (Brau/Zayn Chatbots)
```bash
# Vector database corruption
cd /var/www/brau-chatbot  # or /root/studio_app/studiorepublik
source venv/bin/activate
rm -rf brau_db/  # or studio_db/
python create_db.py
chown -R www-data:www-data brau_db/  # or studio_db/
systemctl restart brau.service  # or zayn-agent.service
```

### WhatsApp SaaS Issues
```bash
# 403 Forbidden on root path
cd /var/www/whatsappsaas/frontend
npm run build  # Rebuild main app
chown -R www-data:www-data dist/
ls -la dist/index.html  # Verify index.html exists

# Widget not loading
npm run build:widget
npm run build  # Must build main after widget
chown -R www-data:www-data dist/

# Database connection issues
docker ps | grep postgres
docker start whatsapp_postgres

# WhatsApp webhook not receiving
# Check Meta Dashboard webhook URL: https://whatsappsaas.atmata.ai/api/v1/webhook/whatsapp
grep WHATSAPP_VERIFY_TOKEN /var/www/whatsappsaas/backend/.env
journalctl -u whatsappsaas.service -f

# Sessions not linking
# Ensure webhook is properly configured in Meta Dashboard
# Check that messages contain the tracking code
```

### Parenting Assistant Issues
```bash
# Containers not starting
cd /var/www/parenting-assistant
docker ps | grep parenting_
docker logs parenting_backend
docker logs parenting_frontend

# Backend API not responding
docker logs -f parenting_backend
# Check for TypeScript errors or database connection issues

# Frontend not loading
docker logs -f parenting_frontend
# Check if Next.js built successfully

# Database connection errors
docker ps | grep parenting_postgres
docker logs parenting_postgres
# Verify DATABASE_URL in .env has URL-encoded password

# OpenAI API errors
docker exec parenting_backend printenv OPENAI_API_KEY
# Key must be on single line, no spaces or line breaks
# Edit .env and restart: docker restart parenting_backend

# Database migration issues
docker exec -it parenting_backend npx prisma migrate deploy
docker exec -it parenting_backend npx prisma generate

# Complete rebuild
cd /var/www/parenting-assistant
docker stop parenting_backend parenting_frontend
docker rm parenting_backend parenting_frontend
docker build -t parenting-backend:latest backend/
docker build -t parenting-frontend:latest frontend/
# Then run containers (see deployment docs)

# Check Nginx proxying
curl http://localhost:3000  # Frontend
curl http://localhost:3001/health  # Backend
nginx -t
systemctl reload nginx

# Database queries
docker exec -it parenting_postgres psql -U parenting_user -d parenting_assistant
# psql> SELECT * FROM "User";
# psql> SELECT * FROM "Child";
# psql> \dt  -- list tables
```

### Permission Issues
```bash
# Fix common permission problems
chown -R www-data:www-data /var/www/atmata-site/
chown -R www-data:www-data /var/www/brau-chatbot/
chown -R www-data:www-data /var/www/dashboards/studiorepublik/dist/
chown -R root:root /root/studio_app/studiorepublik/
chown -R deploy:deploy /var/www/alalpha-chatbot/
chown -R www-data:www-data /var/www/whatsappsaas/
```

### SSL Issues
```bash
# Check certificate status
certbot certificates

# Renew specific domain
certbot --nginx -d domain.atmata.ai --force-renewal

# Check nginx SSL config
nginx -t
```

### High Memory Usage
```bash
# Check memory usage
free -h
ps aux --sort=-%mem | head -10

# Restart heavy services
systemctl restart ammantv.service
systemctl restart brau.service
systemctl restart zayn-agent.service
systemctl restart alalpha.service
systemctl restart whatsappsaas.service

# Check Docker containers memory
docker stats

# Restart containers if needed
docker restart whatsapp_postgres parenting_postgres parenting_redis
```

### Site Not Loading
```bash
# Check nginx status
systemctl status nginx

# Check site is enabled
ls -la /etc/nginx/sites-enabled/

# Check DNS
nslookup your-domain.atmata.ai

# Check logs
tail -f /var/log/nginx/error.log
```

---

## 📋 BACKUP RECOMMENDATIONS

### Critical Files to Backup
```text
# Application code
/var/www/                                           # All web apps
/root/studio_app/studiorepublik/                    # Zayn agent app

# Configurations
/etc/nginx/sites-available/                         # Nginx site configs
/etc/systemd/system/*.service                       # Service files

# SSL certificates  
/etc/letsencrypt/                                   # SSL certificates

# Databases and data
/var/www/brau-chatbot/brau_db/                      # Brau vector database
/root/studio_app/studiorepublik/studio_db/          # Zayn vector database

# PostgreSQL backups
docker exec whatsapp_postgres pg_dump -U whatsapp_user whatsapp_saas     # WhatsApp SaaS
docker exec parenting_postgres pg_dump -U parenting_user parenting_assistant  # Parenting

# Environment files
/var/www/atmata-site-src/.env                       # Atmata.ai env
/var/www/brau-chatbot/.env                          # Brau API keys
/root/studio_app/studiorepublik/.env                # Zayn API keys
/var/www/ammantv/ai-debate-show/backend/.env        # AmmanTV API keys
/var/www/alalpha-chatbot/.env                       # AlAlpha API keys
/var/www/whatsappsaas/backend/.env                  # WhatsApp SaaS API keys
/var/www/parenting-assistant/.env                   # Parenting API keys
```

### Enhanced Backup Script
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)

# Backup PostgreSQL databases
docker exec whatsapp_postgres pg_dump -U whatsapp_user whatsapp_saas > "/root/whatsapp_db_$DATE.sql"
docker exec parenting_postgres pg_dump -U parenting_user parenting_assistant > "/root/parenting_db_$DATE.sql"

# Backup application code and configs
tar -czf "/root/backup_$DATE.tar.gz" \
  /var/www/ \
  /root/studio_app/ \
  /etc/nginx/sites-available/ \
  /etc/systemd/system/*.service \
  /etc/letsencrypt/ \
  /etc/sudoers.d/deploy-* \
  /opt/git/

echo "Backup created: /root/backup_$DATE.tar.gz"
echo "WhatsApp DB backup: /root/whatsapp_db_$DATE.sql"
echo "Parenting DB backup: /root/parenting_db_$DATE.sql"

# Cleanup old backups (keep last 5)
ls -t /root/backup_*.tar.gz | tail -n +6 | xargs rm -f
ls -t /root/whatsapp_db_*.sql | tail -n +6 | xargs rm -f
ls -t /root/parenting_db_*.sql | tail -n +6 | xargs rm -f
```

---

## 📊 SERVER SPECS SUMMARY

- **CPU:** x86_64 architecture
- **RAM:** 2GB total (upgraded from 951MB) - Note: ~2.3GB in use with all services
- **Storage:** 75GB total (~52GB free, upgraded from 23GB)
- **Swap:** 2.3GB
- **OS:** Ubuntu 22.04.5 LTS
- **Web Server:** Nginx
- **Python Apps:** Gunicorn + Flask/FastAPI/Uvicorn
- **Node.js Apps:** Express with TypeScript (ts-node), Next.js 14
- **Vector Databases:** Chroma (local)
- **Relational Databases:** PostgreSQL (Docker) - 2 instances (WhatsApp SaaS, Parenting Assistant)
- **Caching:** Redis (Docker) for Parenting Assistant
- **SSL:** Let's Encrypt (Certbot managed)
- **Docker Containers:**
  - whatsapp_postgres (WhatsApp SaaS database)
  - parenting_postgres (Parenting Assistant database)
  - parenting_redis (Parenting Assistant cache)
  - parenting_backend (Parenting Assistant API)
  - parenting_frontend (Parenting Assistant UI)

---

*Last Updated: October 14, 2025 - Almamlaka RAG System Removed*