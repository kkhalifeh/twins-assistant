Here's the complete updated ATMATA_SERVER_UPDATED.md file with the WhatsApp SaaS additions integrated without removing any existing content:

```markdown
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
1. ammantv.atmata.ai - AI Debate Show (FastAPI/Uvicorn on port 8001, files in /var/www/ammantv/ai-debate-show/, service: ammantv.service)
2. brau.atmata.ai - Brau Chatbot (Flask on port 5001, files in /var/www/brau-chatbot/, service: brau.service) 
3. studiorepublik.atmata.ai - Dashboard with Zayn Agent (Static dashboard in /var/www/dashboards/studiorepublik/, Zayn Flask app in /root/studio_app/studiorepublik/ on port 5000, service: zayn-agent.service)
4. alalpha.atmata.ai - AlAlpha Chatbot (Flask on port 5002, files in /var/www/alalpha-chatbot/, service: alalpha.service, auto-deploy from Git bare repo in /opt/git/alalpha-chatbot.git via post-receive hook)
5. almamlaka.atmata.ai - Arabic RAG System (Streamlit on port 8003, files in /var/www/almamlaka-rag/, service: almamlaka.service, auto-deploy from Git bare repo in /opt/git/almamlaka-rag.git via post-receive hook)
6. whatsappsaas.atmata.ai - WhatsApp Attribution Tracker (React dashboard + FastAPI backend on port 8004, PostgreSQL in Docker, auto-deploy via Git, tracks marketing attribution from ads to WhatsApp conversations)
- Auto-deploy: Git bare repos with post-receive hooks for AlAlpha, Almamlaka, and WhatsApp SaaS

TECH STACK:
- Web Server: Nginx with SSL (Let's Encrypt/Certbot)
- Python Apps: Flask, FastAPI & Streamlit with Gunicorn/Uvicorn
- AI: OpenAI GPT-4/5, LangChain, Chroma vector databases, Weaviate
- Vector Databases: Weaviate (Docker) for Arabic RAG system
- Databases: PostgreSQL (Docker) for WhatsApp SaaS
- Process Management: systemd services
- Storage: 75GB total, ~52GB free, 2GB RAM (upgraded)
- Security: UFW firewall, fail2ban, blocked direct IP access

NGINX SITES:
- /etc/nginx/sites-available/ (ammantv, brau, studiorepublik-atmata, alalpha, almamlaka, whatsappsaas, default)
- /etc/nginx/sites-enabled/ (ammantv, brau, studiorepublik-atmata, alalpha, almamlaka, whatsappsaas, default)
- Default config blocks all direct IP access (return 444)

SSL CERTIFICATES:
- ammantv.atmata.ai, brau.atmata.ai, studiorepublik.atmata.ai, alalpha.atmata.ai, almamlaka.atmata.ai, whatsappsaas.atmata.ai (Let's Encrypt)

SERVICES:
- ammantv.service (Active) - /var/www/ammantv/ai-debate-show/backend/venv/bin/gunicorn -w 2 -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:8001
- brau.service (Active) - /var/www/brau-chatbot/venv/bin/gunicorn -w 1 -b 127.0.0.1:5001 --timeout 120 web_test:app
- zayn-agent.service (Active) - /root/studio_app/studiorepublik/venv/bin/python web_test.py
- alalpha.service (Active) - /var/www/alalpha-chatbot/venv/bin/gunicorn -w 1 -b 127.0.0.1:5002 --timeout 120 web_test:app
- almamlaka.service (Active) - /var/www/almamlaka-rag/venv/bin/streamlit run launch_enhanced_chatbot_v2.py --server.port 8003 --server.address 0.0.0.0 --server.headless true
- whatsappsaas.service (Active) - /var/www/whatsappsaas/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8004

VECTOR DATABASES:
- Weaviate (Docker): Port 8080, 500 Arabic documents with embeddings
- Chroma databases: brau_db/, studio_db/ (in .gitignore)

DOCKER CONTAINERS:
- weaviate: Port 8080 for Arabic RAG
- whatsapp_postgres: Port 5432 for WhatsApp SaaS

SECURITY:
- UFW firewall blocking external access to ports 5000, 5001, 5002, 8001, 8003, 8004, 8080
- Fail2ban protecting SSH
- Direct IP access blocked (returns 444)
- Automated backup system in /root/backup_server.sh

All apps use virtual environments, Git repositories, and have .env files with API keys. The server hosts AI chatbots for business lead qualification, customer service, Arabic document search with RAG capabilities, and marketing attribution tracking.
```

---

## 🌐 ACTIVE DOMAINS & APPLICATIONS

### 1. **ammantv.atmata.ai** (AI Debate Show)
- **URL:** https://ammantv.atmata.ai
- **Location:** `/var/www/ammantv/ai-debate-show/`
- **Port:** 8001 (internal)
- **Service:** `ammantv.service`
- **SSL:** ✅ Active (Let's Encrypt)
- **Type:** FastAPI/Uvicorn app with frontend

### 2. **brau.atmata.ai** (Brau Chatbot)
- **URL:** https://brau.atmata.ai
- **Location:** `/var/www/brau-chatbot/`
- **Port:** 5001 (internal)
- **Service:** `brau.service`
- **SSL:** ✅ Active (Let's Encrypt)
- **Type:** Flask chatbot application

### 3. **studiorepublik.atmata.ai** (React Dashboard + Zayn Agent)
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

### 4. **alalpha.atmata.ai** (AlAlpha Chatbot)
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

### 5. **almamlaka.atmata.ai** (Arabic RAG System)
- **URL:** https://almamlaka.atmata.ai
- **Location:** `/var/www/almamlaka-rag/`
- **Port:** 8003 (internal)
- **Service:** `almamlaka.service`
- **SSL:** ✅ Active (Let's Encrypt)
- **Type:** Streamlit Arabic RAG application with Weaviate vector database
- **Deployment Method:** Auto-deploy via Git bare repo (`/opt/git/almamlaka-rag.git`) with `post-receive` hook
- **Working Tree:** `/var/www/almamlaka-rag/`
- **Virtual Environment:** `/var/www/almamlaka-rag/venv/`
- **Vector Database:** Weaviate (Docker container on port 8080) with 500 Arabic documents
- **Features:** Arabic text search, semantic search, content display, metadata filtering
- **Dependencies:** Streamlit, Weaviate, SentenceTransformers, OpenAI API
- **Post-Receive Hook Tasks:**
  1. Checks out latest code into working tree
  2. Ensures Python venv exists with full ML dependencies
  3. Installs requirements including sentence-transformers, torch, etc.
  4. Creates .env file from template if missing
  5. Restarts `almamlaka.service` via `systemctl`
- **Local Deployment Command (from Mac):**
  ```bash
  git add .
  git commit -m "Your message"
  git push origin main  # Updates GitHub
  git push prod main    # Auto-deploys to server
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

---

## 🛡️ SECURITY STATUS

### Current Security Measures
- ✅ **Direct IP Access:** BLOCKED (returns 444)
- ✅ **UFW Firewall:** Active (blocks external access to 5000, 5001, 5002, 8001, 8003, 8004, 8080)
- ✅ **Fail2ban:** Protecting SSH from brute force
- ✅ **SSL Certificates:** Valid
- ✅ **Automated Backups:** `/root/backup_server.sh`

### Firewall Rules
```bash
# Current UFW Status
22/tcp    ALLOW    SSH access
80/443    ALLOW    Web traffic (HTTP/HTTPS)
5000      DENY     External access (Zayn agent - localhost only)
5001      DENY     External access (Brau - localhost only)
5002      DENY     External access (AlAlpha - localhost only)
8001      DENY     External access (AmmanTV - localhost only)
8003      DENY     External access (Almamlaka RAG - localhost only)
8004      DENY     External access (WhatsApp SaaS - localhost only)
8080      DENY     External access (Weaviate - localhost only)
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

### Service Status & Control
```bash
# Check all app services
systemctl status ammantv.service
systemctl status brau.service
systemctl status zayn-agent.service
systemctl status alalpha.service
systemctl status almamlaka.service
systemctl status whatsappsaas.service

# Start/Stop/Restart services
systemctl start|stop|restart ammantv.service
systemctl start|stop|restart brau.service
systemctl start|stop|restart zayn-agent.service
systemctl start|stop|restart alalpha.service
systemctl start|stop|restart almamlaka.service
systemctl start|stop|restart whatsappsaas.service

# Enable/Disable auto-start
systemctl enable|disable ammantv.service
systemctl enable|disable brau.service
systemctl enable|disable zayn-agent.service
systemctl enable|disable alalpha.service
systemctl enable|disable almamlaka.service
systemctl enable|disable whatsappsaas.service

# Reload after config changes
systemctl daemon-reload

# Check if all services are running
systemctl is-active ammantv.service brau.service zayn-agent.service alalpha.service almamlaka.service whatsappsaas.service
```

### Service Files & Configurations
- **ammantv:** `/etc/systemd/system/ammantv.service`  
  - Command: `/var/www/ammantv/ai-debate-show/backend/venv/bin/gunicorn -w 2 -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:8001`
- **brau:** `/etc/systemd/system/brau.service`  
  - Command: `/var/www/brau-chatbot/venv/bin/gunicorn -w 1 -b 127.0.0.1:5001 --timeout 120 web_test:app`
- **zayn-agent:** `/etc/systemd/system/zayn-agent.service`  
  - Command: `/root/studio_app/studiorepublik/venv/bin/python web_test.py`
- **alalpha:** `/etc/systemd/system/alalpha.service`  
  *(recreate exactly as below)*
  ```ini
  # /etc/systemd/system/alalpha.service
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
- **almamlaka:** `/etc/systemd/system/almamlaka.service`  
  *(recreate exactly as below)*
  ```ini
  # /etc/systemd/system/almamlaka.service
  [Unit]
  Description=Almamlaka Arabic RAG Streamlit Service
  After=network.target

  [Service]
  User=deploy
  Group=deploy
  WorkingDirectory=/var/www/almamlaka-rag
  ExecStart=/var/www/almamlaka-rag/venv/bin/streamlit run launch_enhanced_chatbot_v2.py --server.port 8003 --server.address 0.0.0.0 --server.headless true --browser.gatherUsageStats false
  Restart=always
  Environment="PATH=/var/www/almamlaka-rag/venv/bin"
  Environment="PYTHONPATH=/var/www/almamlaka-rag"

  [Install]
  WantedBy=multi-user.target
  ```
- **whatsappsaas:** `/etc/systemd/system/whatsappsaas.service`  
  *(recreate exactly as below)*
  ```ini
  # /etc/systemd/system/whatsappsaas.service
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
journalctl -u almamlaka.service -f
journalctl -u whatsappsaas.service -f

# Monitor nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Check last 50 lines of service logs
journalctl -u ammantv.service --lines=50
journalctl -u brau.service --lines=50
journalctl -u zayn-agent.service --lines=50
journalctl -u alalpha.service --lines=50
journalctl -u almamlaka.service --lines=50
journalctl -u whatsappsaas.service --lines=50
```

### AlAlpha Quick Checks
```bash
# Follow AlAlpha logs
journalctl -u alalpha.service -f

# Last 50 log lines
journalctl -u alalpha.service --lines=50

# Test site health
curl -I https://alalpha.atmata.ai
```

### Almamlaka RAG Quick Checks
```bash
# Follow Almamlaka logs
journalctl -u almamlaka.service -f

# Last 50 log lines
journalctl -u almamlaka.service --lines=50

# Test site health
curl -I https://almamlaka.atmata.ai

# Check Weaviate database
curl http://localhost:8080/v1/meta
docker ps | grep weaviate
```

### WhatsApp SaaS Quick Checks
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

### System Monitoring
```bash
# Check running processes
ps aux | grep -E "(python|gunicorn|uvicorn|streamlit)" | grep -v grep

# Check port usage
netstat -tlnp | grep -E ":80|:443|:5000|:5001|:5002|:8001|:8003|:8004|:8080"

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
- `ammantv` → ammantv.atmata.ai (port 8001)
- `brau` → brau.atmata.ai (port 5001)
- `studiorepublik-atmata` → studiorepublik.atmata.ai (dashboard + zayn proxy to port 5000)
- `alalpha` → alalpha.atmata.ai (proxy to 127.0.0.1:5002)
- `almamlaka` → almamlaka.atmata.ai (proxy to 127.0.0.1:8003)
- `whatsappsaas` → whatsappsaas.atmata.ai (proxy to 127.0.0.1:8004)
- `zayn-agent` → IP-based access (209.250.253.59) - legacy config

### Site-Specific Nginx Configs
```nginx
# AmmanTV config
# (see /etc/nginx/sites-available/ammantv)

# Brau config
# (see /etc/nginx/sites-available/brau)

# Studio Republik config (includes Zayn proxy)
# (see /etc/nginx/sites-available/studiorepublik-atmata)

# AlAlpha config
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
}

# Almamlaka RAG config
server {
    listen 80;
    server_name almamlaka.atmata.ai;

    location / {
        proxy_pass http://127.0.0.1:8003;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support for Streamlit
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
    }
}

# WhatsApp SaaS config
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
    # SSL config managed by Certbot
}
```

---

## 🔒 SSL CERTIFICATE MANAGEMENT

### Current Certificates
- **ammantv.atmata.ai** ✅
- **brau.atmata.ai** ✅  
- **studiorepublik.atmata.ai** ✅
- **alalpha.atmata.ai** ✅
- **almamlaka.atmata.ai** ✅
- **whatsappsaas.atmata.ai** ✅

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

### Studio Republik Auto-Deploy Script
```bash
# Create the deploy script (one-time setup)
cat > /var/www/dashboards/studiorepublik/deploy.sh << 'EOF'
#!/bin/bash
cd /var/www/dashboards/studiorepublik
echo "🔄 Pulling latest changes..."
git stash && git pull origin main
echo "📦 Installing dependencies..."
npm install --legacy-peer-deps
echo "🗂️ Building project..."
npm run build
echo "🔒 Setting permissions..."
chown -R www-data:www-data dist/
echo "🔄 Reloading nginx..."
systemctl reload nginx
echo "✅ Studio Republik dashboard updated!"
echo "🌐 Visit: https://studiorepublik.atmata.ai"
EOF
chmod +x deploy.sh

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

### Deploy Almamlaka RAG Updates (Auto-Deploy Enabled)
**From local machine:**
```bash
git add .
git commit -m "Update message"
git push origin main  # Updates GitHub
git push prod main    # Auto-deploys to server
```

**Server `post-receive` hook** (lives at `/opt/git/almamlaka-rag.git/hooks/post-receive`):
```bash
#!/usr/bin/env bash
set -e

APP_DIR="/var/www/almamlaka-rag"
VENV="$APP_DIR/venv"
SERVICE="almamlaka.service"

read oldrev newrev ref

echo "[post-receive] Deploying Almamlaka RAG to $APP_DIR"

# Checkout the latest code to working directory
GIT_WORK_TREE="$APP_DIR" git --work-tree="$APP_DIR" --git-dir="/opt/git/almamlaka-rag.git" checkout -f

# Create virtual environment if it doesn't exist
if [ ! -d "$VENV" ]; then
  echo "[post-receive] Creating virtual environment"
  python3 -m venv "$VENV"
fi

# Install/update requirements
if [ -f "$APP_DIR/requirements.txt" ]; then
  echo "[post-receive] Installing requirements"
  "$VENV/bin/pip" install --upgrade pip
  "$VENV/bin/pip" install -r "$APP_DIR/requirements.txt"
fi

# Create .env file if it doesn't exist (template)
if [ ! -f "$APP_DIR/.env" ]; then
  echo "[post-receive] Creating .env file from template"
  cp "$APP_DIR/.env.template" "$APP_DIR/.env"
  echo "[post-receive] WARNING: Please update .env file with actual API keys"
fi

# Set proper permissions
chown -R deploy:deploy "$APP_DIR"

# Restart the service
echo "[post-receive] Restarting $SERVICE"
sudo -n /usr/bin/systemctl restart "$SERVICE"
sudo -n /usr/bin/systemctl status "$SERVICE" --no-pager -l || true

echo "[post-receive] Deployment complete."
echo "[post-receive] Remember to update .env file with your API keys!"
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

---

## 🗄️ VECTOR DATABASE MANAGEMENT (Weaviate)

### Weaviate Docker Management
```bash
# Check Weaviate container status
docker ps | grep weaviate

# Start Weaviate container
docker run -d \
  --name weaviate \
  -p 8080:8080 \
  -e QUERY_DEFAULTS_LIMIT=25 \
  -e AUTHENTICATION_ANONYMOUS_ACCESS_ENABLED=true \
  -e PERSISTENCE_DATA_PATH=/var/lib/weaviate \
  -e DEFAULT_VECTORIZER_MODULE=none \
  -e ENABLE_MODULES="" \
  -e CLUSTER_HOSTNAME=node1 \
  -v weaviate_data:/var/lib/weaviate \
  semitechnologies/weaviate:1.21.8

# Stop Weaviate container
docker stop weaviate

# Remove Weaviate container
docker rm weaviate

# Check Weaviate logs
docker logs weaviate

# Check Weaviate health
curl http://localhost:8080/v1/meta
```

### Database Operations
```bash
# Check document count
curl "http://localhost:8080/v1/schema/ArabicDocument" | grep count

# Query sample documents
curl -X POST "http://localhost:8080/v1/graphql" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ Get { ArabicDocument(limit: 3) { document_id title_ar } } }"}'

# Search for specific content
curl -X POST "http://localhost:8080/v1/graphql" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ Get { ArabicDocument(where: {path: [\"title_ar\"], operator: Like, valueText: \"*مؤسسة*\"}, limit: 1) { document_id title_ar } } }"}'

# Check schema
curl "http://localhost:8080/v1/schema" | python3 -m json.tool
```

### Database Rebuild (if needed)
```bash
cd /var/www/almamlaka-rag

# Run database rebuild script
venv/bin/python fix_database_issues.py

# Or manually rebuild with clean data
venv/bin/python -c "
# [Manual rebuild script content would go here]
"
```

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

---

## 📁 IMPORTANT FILE LOCATIONS  
```text
# AlAlpha Chatbot
/var/www/alalpha-chatbot/                           # AlAlpha working directory
/etc/systemd/system/alalpha.service                 # AlAlpha service file
/etc/nginx/sites-available/alalpha                  # Nginx site config for AlAlpha
/opt/git/alalpha-chatbot.git/hooks/post-receive     # Auto-deploy hook
/etc/sudoers.d/deploy-alalpha                       # Sudo permissions for deployment

# Almamlaka RAG System
/var/www/almamlaka-rag/                             # Almamlaka working directory
/var/www/almamlaka-rag/data/                        # Arabic articles data
/var/www/almamlaka-rag/data/processed/              # Processed CSV files
/var/www/almamlaka-rag/data/embeddings/             # Pre-computed embeddings
/etc/systemd/system/almamlaka.service               # Almamlaka service file
/etc/nginx/sites-available/almamlaka                # Nginx site config for Almamlaka
/opt/git/almamlaka-rag.git/hooks/post-receive       # Auto-deploy hook
/etc/sudoers.d/deploy-almamlaka                     # Sudo permissions for deployment

# WhatsApp SaaS
/var/www/whatsappsaas/                              # Main application directory
/var/www/whatsappsaas/backend/.env                  # Backend environment variables
/var/www/whatsappsaas/frontend/dist/                # Built frontend files
/etc/systemd/system/whatsappsaas.service            # Service file
/etc/nginx/sites-available/whatsappsaas             # Nginx configuration
/opt/git/whatsappsaas.git/hooks/post-receive        # Auto-deploy hook
/etc/sudoers.d/deploy-whatsappsaas                  # Sudo permissions for deployment
```

### Sudoers (Auto-restart permissions)
```bash
# /etc/sudoers.d/deploy-alalpha
deploy ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart alalpha.service, /usr/bin/systemctl status alalpha.service

# /etc/sudoers.d/deploy-almamlaka
deploy ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart almamlaka.service, /usr/bin/systemctl status almamlaka.service

# /etc/sudoers.d/deploy-whatsappsaas
www-data ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart whatsappsaas.service, /usr/bin/systemctl status whatsappsaas.service
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

### React Dashboard Issues (Studio Republik)
```bash
# White screen or build errors
cd /var/www/dashboards/studiorepublik
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
npm run build
chown -R www-data:www-data dist/

# Check nginx is serving from dist/
grep -A 5 "location /" /etc/nginx/sites-available/studiorepublik-atmata
# Should show: root /var/www/dashboards/studiorepublik/dist;

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

### Almamlaka RAG Issues
```bash
# Streamlit app not loading
systemctl status almamlaka.service
journalctl -u almamlaka.service --lines=50

# Weaviate connection issues
docker ps | grep weaviate
curl http://localhost:8080/v1/meta

# Search not working
curl -I https://almamlaka.atmata.ai
# Check if returns proper response

# Dependencies issues
cd /var/www/almamlaka-rag
venv/bin/pip list | grep -E "(streamlit|weaviate|sentence)"

# Restart everything
docker restart weaviate
systemctl restart almamlaka.service

# Check data integrity
curl -X POST "http://localhost:8080/v1/graphql" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ Get { ArabicDocument(limit: 1) { document_id title_ar } } }"}'
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

### Permission Issues
```bash
# Fix common permission problems
chown -R www-data:www-data /var/www/brau-chatbot/
chown -R www-data:www-data /var/www/dashboards/studiorepublik/dist/
chown -R root:root /root/studio_app/studiorepublik/
chown -R deploy:deploy /var/www/alalpha-chatbot/
chown -R deploy:deploy /var/www/almamlaka-rag/
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
systemctl restart almamlaka.service
systemctl restart whatsappsaas.service

# Check if Weaviate using too much memory
docker stats weaviate

# Check if PostgreSQL using too much memory
docker stats whatsapp_postgres
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

## 📂 EXTRA: OTHER FILE LOCATIONS

### Application Directories
```text
/var/www/ammantv/ai-debate-show/          # AmmanTV app (FastAPI + frontend)
/var/www/brau-chatbot/                    # Brau chatbot (Flask, beauty salon)
/var/www/dashboards/studiorepublik/       # Studio Republik dashboard (static)
/root/studio_app/studiorepublik/          # Zayn agent app (Flask, gym sales bot)
/var/www/alalpha-chatbot/                 # AlAlpha chatbot (Flask)
/var/www/almamlaka-rag/                   # Almamlaka RAG system (Streamlit + Weaviate)
/var/www/whatsappsaas/                    # WhatsApp SaaS (React + FastAPI)
/var/www/kinz/                            # Kinz app (inactive)
```

### Configuration Files
```text
/etc/nginx/sites-available/               # Nginx site configs
/etc/systemd/system/                      # Service files
/etc/letsencrypt/live/                    # SSL certificates
```

### Log Files
```text
/var/log/nginx/access.log                 # Nginx access logs
/var/log/nginx/error.log                  # Nginx error logs
journalctl -u servicename                 # Service-specific logs
```

---

## 📋 BACKUP RECOMMENDATIONS

### Critical Files to Backup
```text
# Application code
/var/www/                                 # All web apps
/root/studio_app/studiorepublik/          # Zayn agent app

# Configurations
/etc/nginx/sites-available/               # Nginx site configs
/etc/systemd/system/*.service             # Service files

# SSL certificates  
/etc/letsencrypt/                         # SSL certificates

# Databases and data
/var/www/brau-chatbot/brau_db/            # Brau vector database
/root/studio_app/studiorepublik/studio_db/  # Zayn vector database
/var/www/almamlaka-rag/data/              # Arabic articles and embeddings

# Vector database backups
weaviate_data                             # Docker volume for Weaviate

# PostgreSQL backup
docker exec whatsapp_postgres pg_dump -U whatsapp_user whatsapp_saas  # WhatsApp SaaS database

# Environment files
/var/www/brau-chatbot/.env                # Brau API keys
/root/studio_app/studiorepublik/.env      # Zayn API keys
/var/www/ammantv/ai-debate-show/backend/.env  # AmmanTV API keys
/var/www/alalpha-chatbot/.env             # AlAlpha API keys
/var/www/almamlaka-rag/.env               # Almamlaka API keys
/var/www/whatsappsaas/backend/.env        # WhatsApp SaaS API keys
```

### Enhanced Backup Script
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)

# Backup Weaviate data
docker exec weaviate /bin/sh -c "tar czf - /var/lib/weaviate" > "/root/weaviate_backup_$DATE.tar.gz"

# Backup PostgreSQL data
docker exec whatsapp_postgres pg_dump -U whatsapp_user whatsapp_saas > "/root/whatsapp_db_$DATE.sql"

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
echo "Weaviate backup: /root/weaviate_backup_$DATE.tar.gz"
echo "WhatsApp DB backup: /root/whatsapp_db_$DATE.sql"

# Cleanup old backups (keep last 5)
ls -t /root/backup_*.tar.gz | tail -n +6 | xargs rm -f
ls -t /root/weaviate_backup_*.tar.gz | tail -n +6 | xargs rm -f
ls -t /root/whatsapp_db_*.sql | tail -n +6 | xargs rm -f
```

---

## 📊 SERVER SPECS SUMMARY

- **CPU:** x86_64 architecture
- **RAM:** 2GB total (upgraded from 951MB)
- **Storage:** 75GB total (~52GB free, upgraded from 23GB)
- **Swap:** 2.3GB
- **OS:** Ubuntu 22.04.5 LTS
- **Web Server:** Nginx
- **Python Apps:** Gunicorn + Flask/FastAPI/Streamlit/Uvicorn
- **Vector Databases:** Weaviate (Docker), Chroma (local)
- **Relational Database:** PostgreSQL (Docker)
- **SSL:** Let's Encrypt (Certbot managed)
- **Docker:** Weaviate container for Arabic RAG system, PostgreSQL for WhatsApp SaaS

---

*Last Updated: September 16, 2025*
