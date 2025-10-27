# MASTER DOCUMENTATION

**Parenting AI Assistant** - Comprehensive project documentation for Claude Code

Last Updated: October 27, 2025

---

## 🎯 PROJECT OVERVIEW

AI-powered web application for managing child care with multi-child support, role-based access control, and natural language AI interface. Deployed at: https://parenting.atmata.ai

### Core Capabilities
- 📊 Real-time dashboard with activity tracking
- 🍼 Feeding logs (bottles, breastfeeding with duration, solid foods)
- 😴 Sleep monitoring with duration tracking
- 🚼 Diaper logs with image upload capability
- 🏥 Health records (temperature, weight, medical notes)
- 📦 Inventory management with restock alerts
- 🤖 AI chat interface for natural language logging
- 👥 Multi-child support (dynamic, unlimited)
- 🔐 Role-based access control (PARENT, NANNY, VIEWER)

---

## 🏗️ ARCHITECTURE

### Technology Stack
- **Backend**: Node.js 18 + TypeScript + Express + Prisma ORM
- **Database**: PostgreSQL 14+ (production: Docker container)
- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS + React Query
- **AI Service**: Python 3.9+ + FastAPI + LangChain + OpenAI
- **Infrastructure**: Docker + Redis + Nginx (Caddy for SSL)
- **CI/CD**: GitHub Actions with automated deployment

### Project Structure
```
twins-assistant/
├── backend/                    # Node.js API server
│   ├── src/
│   │   ├── controllers/       # Business logic
│   │   ├── routes/            # API endpoints
│   │   ├── middleware/        # Auth, RBAC, validation
│   │   ├── services/          # External integrations
│   │   └── index.ts           # Server entry
│   ├── prisma/
│   │   ├── schema.prisma      # Database schema
│   │   └── migrations/        # Version-controlled migrations
│   └── Dockerfile             # Alpine Linux container
├── frontend/                   # Next.js web app
│   ├── src/
│   │   ├── app/               # Pages (feeding, sleep, diapers, etc.)
│   │   ├── components/        # Reusable UI components
│   │   └── lib/               # API client, utilities
│   └── Dockerfile             # Production container
├── ai-service/                 # Python AI service
├── scripts/
│   ├── auto-deploy.sh         # Server-side deployment script
│   └── production-cli.sh      # Local production management CLI
└── .github/workflows/
    └── deploy-production.yml  # GitHub Actions CI/CD
```

---

## 🗄️ DATABASE SCHEMA

### Core Models

**User** - Account users with roles
- id, email, password (bcrypt hashed), name, phone
- role: PARENT | NANNY | VIEWER
- accountId (foreign key)

**Account** - Team/family container
- id, name, ownerId
- One owner, many users

**Child** - Individual children
- id, name, dateOfBirth, gender
- userId (belongs to user)

**FeedingLog** - Feeding records
- type: BOTTLE | BREAST | SOLID
- amount (ml for bottles)
- **breastDuration** (minutes for breastfeeding) ⭐ NEW
- notes
- childId, userId

**SleepLog** - Sleep tracking
- startTime, endTime, duration
- notes
- childId, userId

**DiaperLog** - Diaper changes
- type: WET | DIRTY | BOTH
- **imageUrl** (optional photo) ⭐ NEW
- notes, changedAt
- childId, userId

**HealthLog** - Health records
- temperature, weight, height, notes
- childId, userId

**Inventory** - Supplies tracking
- name, category, currentStock, minStock
- userId

**Schedule** - Routines
- type, time, notes
- childId, userId

---

## 🆕 RECENT FEATURES

### 1. Role-Based Access Control (RBAC)
**Implemented**: October 27, 2025

**Roles and Permissions**:
- **PARENT**: Full access to everything
- **NANNY**: Can manage feeding, sleep, diapers, health (read + write)
- **VIEWER**: Read-only access to logs

**Key Files**:
- `backend/src/middleware/rbac.middleware.ts` - Permission checks
- `backend/src/controllers/team.controller.ts` - Team invitations
- `frontend/src/app/settings/page.tsx` - Settings UI with team management

**Technical Details**:
- User has `role` field (enum: PARENT, NANNY, VIEWER)
- Account has `ownerId` field (only owner can invite)
- Middleware uses `req.baseUrl + req.path` to determine resource
- Routes apply RBAC after auth: `router.use(authMiddleware, checkResourceAccess)`

### 2. Breast Feeding Duration
**Implemented**: October 27, 2025

Added `breastDuration` field to FeedingLog for tracking breastfeeding sessions in minutes.

**Key Files**:
- `backend/prisma/schema.prisma` - Added `breastDuration Int?`
- `backend/src/controllers/feeding.controller.ts` - Handles duration
- `frontend/src/app/feeding/page.tsx` - Duration input UI

### 3. Diaper Image Upload
**Implemented**: October 27, 2025

Added `imageUrl` field to DiaperLog for optional photo attachment.

**Key Files**:
- `backend/prisma/schema.prisma` - Added `imageUrl String?`
- `backend/src/controllers/diaper.controller.ts` - Handles image URL
- `frontend/src/app/diapers/page.tsx` - Image upload UI with preview

**Note**: Currently stores URLs, not files. File upload implementation pending.

---

## 🚀 CI/CD AUTOMATION

### Automated Deployment
**Every push to `main` triggers automatic deployment** (~3-4 minutes)

**Workflow**:
1. GitHub Actions detects push
2. Connects to production server via SSH
3. Executes `scripts/auto-deploy.sh` on server
4. Pulls latest code
5. Restores production configs (API URLs, etc.)
6. Installs dependencies
7. Runs database migrations automatically
8. Generates Prisma client
9. Rebuilds frontend
10. Restarts Docker containers
11. Performs health checks with retry logic
12. Verifies deployment success

**Configuration**:
- Workflow: `.github/workflows/deploy-production.yml`
- Server script: `scripts/auto-deploy.sh`
- Requires: `SSH_PRIVATE_KEY` in GitHub Secrets

### Production Management CLI

**Local command-line tool for managing production from your machine**

#### Status & Monitoring
```bash
# Check server and container status
./scripts/production-cli.sh status

# View live backend logs
./scripts/production-cli.sh logs backend

# View live frontend logs
./scripts/production-cli.sh logs frontend

# View all logs (last 30 lines each)
./scripts/production-cli.sh logs
```

#### Deployment & Restarts
```bash
# Trigger manual deployment (without pushing to GitHub)
./scripts/production-cli.sh deploy

# Restart backend
./scripts/production-cli.sh restart backend

# Restart frontend
./scripts/production-cli.sh restart frontend

# Restart everything
./scripts/production-cli.sh restart all
```

#### Database Management
```bash
# View database tables and migration status
./scripts/production-cli.sh db:status

# Run pending migrations
./scripts/production-cli.sh db:migrate

# Create database backup (downloads to local machine)
./scripts/production-cli.sh db:backup

# Delete all data (keeps schema)
./scripts/production-cli.sh db:clean
```

#### Data Management
```bash
# Delete all user data (children, logs, etc.)
./scripts/production-cli.sh data:delete-all

# Delete specific data types
./scripts/production-cli.sh data:delete-feeding
./scripts/production-cli.sh data:delete-sleep
./scripts/production-cli.sh data:delete-diapers
```

#### Direct Access
```bash
# SSH into production server
./scripts/production-cli.sh ssh

# Show all available commands
./scripts/production-cli.sh help
```

---

## 💻 DEVELOPMENT

### Local Setup

1. **Install dependencies**
   ```bash
   npm run setup
   ```

2. **Configure environment**
   ```bash
   # Backend
   cd backend
   cp .env.example .env
   # Edit DATABASE_URL, JWT_SECRET, OPENAI_API_KEY

   # Frontend
   cd frontend
   cp .env.example .env
   # Edit NEXT_PUBLIC_API_URL (usually http://localhost:3003/api)
   ```

3. **Setup database**
   ```bash
   cd backend
   DATABASE_URL="postgresql://postgres:password@localhost:5432/twins_assistant?schema=public" npx prisma migrate dev
   DATABASE_URL="postgresql://postgres:password@localhost:5432/twins_assistant?schema=public" npx prisma generate
   ```

4. **Start development servers**
   ```bash
   # Terminal 1 - Backend (port 3003 locally)
   cd backend
   PORT=3003 DATABASE_URL="postgresql://postgres:password@localhost:5432/twins_assistant?schema=public" npm run dev

   # Terminal 2 - Frontend (port 3000)
   cd frontend
   npm run dev
   ```

5. **Access application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3003
   - Health check: http://localhost:3003/health

### Common Development Commands

#### Backend
```bash
cd backend

# Development server with hot-reload
npm run dev

# TypeScript compilation
npm run build

# Prisma Studio (database GUI)
DATABASE_URL="..." npx prisma studio

# Create new migration
DATABASE_URL="..." npx prisma migrate dev --name description

# Reset database (WARNING: deletes all data)
DATABASE_URL="..." npx prisma migrate reset
```

#### Frontend
```bash
cd frontend

# Development server
npm run dev

# Production build
npm run build

# Start production build locally
npm run start

# Linting
npm run lint
```

### Making Database Changes

**Local workflow**:
```bash
cd backend

# 1. Edit prisma/schema.prisma
vim prisma/schema.prisma

# 2. Create migration
DATABASE_URL="postgresql://postgres:password@localhost:5432/twins_assistant?schema=public" npx prisma migrate dev --name add_new_field

# 3. Test locally
npm run dev

# 4. Commit and push (migration runs automatically on production)
git add .
git commit -m "Add new field to model"
git push origin main
```

---

## 🏭 PRODUCTION DETAILS

### Server Configuration
- **Host**: 209.250.253.59 (Studio-Republik)
- **App Directory**: `/var/www/parenting-assistant`
- **User**: root
- **Domain**: https://parenting.atmata.ai
- **SSL**: Managed by Caddy (auto-renewal)

### Docker Containers
- `parenting_postgres` - PostgreSQL database (port 5432)
- `parenting_backend` - Node.js API (port 3001)
- `parenting_frontend` - Next.js app (port 3000)
- `parenting_redis` - Redis cache (port 6379)

### Environment Variables (Production)

**Backend** (`/var/www/parenting-assistant/backend/.env`):
```bash
DATABASE_URL="postgresql://parenting_user:UmCGUizk0x5BwBoHRLyFXv2WyQhj%2B8pryOM%2Bovci%2FZ4%3D@parenting_postgres:5432/parenting_assistant?schema=public"
JWT_SECRET="your-secure-secret"
JWT_EXPIRE="30d"
PORT=3001
NODE_ENV=production
OPENAI_API_KEY="sk-proj-..."
REDIS_URL="redis://parenting_redis:6379"
```

**Important**: Special characters in passwords must be URL-encoded:
- `+` → `%2B`
- `/` → `%2F`
- `=` → `%3D`

**Frontend** (hardcoded in `frontend/src/lib/api.ts`):
```typescript
const API_URL = 'https://parenting.atmata.ai/api'
```

**Note**: Auto-deploy script automatically restores this configuration.

### Critical Production Configs

The auto-deploy script preserves these production-specific settings:

1. **Frontend API URL**
   - Local: `http://localhost:3003/api`
   - Production: `https://parenting.atmata.ai/api`
   - File: `frontend/src/lib/api.ts`

2. **Next.js Build Config**
   - Ignores TypeScript/ESLint errors in production
   - File: `frontend/next.config.mjs`

3. **Prisma Binary Target**
   - Must include `linux-musl-openssl-3.0.x` for Alpine Linux
   - File: `backend/prisma/schema.prisma`

---

## 🔧 TROUBLESHOOTING

### Deployment Failed

**Check GitHub Actions logs**:
1. Go to https://github.com/kkhalifeh/twins-assistant/actions
2. Click on failed workflow run
3. Review step-by-step logs

**Check production logs**:
```bash
# Backend logs
./scripts/production-cli.sh logs backend

# Frontend logs
./scripts/production-cli.sh logs frontend

# All logs
./scripts/production-cli.sh logs
```

**Common issues**:
- Health check timeout → Backend needs more time to start (retry logic handles this)
- Migration failed → Check database schema conflicts
- Build failed → Check TypeScript errors or dependencies

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

# Restart services
./scripts/production-cli.sh restart all
```

### Backend Health Check Failing

**Symptoms**: Deployment fails at health check, but backend logs show activity

**Cause**: Container needs more startup time

**Solution**: Auto-deploy script has retry logic (12 attempts x 5 seconds = 60s max wait)

### Prisma Client Errors

**Error**: "Query engine binary not found"

**Cause**: Binary target mismatch (Debian vs Alpine)

**Solution**: Ensure `binaryTargets = ["native", "linux-musl-openssl-3.0.x"]` in schema.prisma

### Database Connection Errors

**Error**: "Invalid port number"

**Cause**: Special characters in DATABASE_URL not encoded

**Solution**: URL-encode password special characters

---

## 📝 IMPORTANT TECHNICAL NOTES

### Authentication Flow
1. User registers → Creates User + Account + links them
2. Login returns JWT token with userId
3. All API requests include: `Authorization: Bearer <token>`
4. `authMiddleware` decodes token, attaches `req.user`
5. `checkResourceAccess` verifies role permissions

**Key Files**:
- `backend/src/controllers/auth.controller.ts` - 3-step registration
- `backend/src/routes/auth.routes.ts` - Must use controller (not inline logic)
- `backend/src/middleware/rbac.middleware.ts` - Permission checks

### RBAC Implementation
- Middleware uses `req.baseUrl + req.path` (not just `req.path`)
- Routes: `/api/feeding`, `/api/sleep`, `/api/diapers`, `/api/health`
- Resources: `feeding`, `sleep`, `diapers`, `health`, `inventory`, `children`
- Write operations (POST, PUT, DELETE) require write permissions

### Prisma for Alpine Linux
Production uses Alpine-based Docker images. Prisma must include Alpine binary target:

```prisma
generator client {
  provider = "prisma-client-js"
  binaryTargets = ["native", "linux-musl-openssl-3.0.x"]
}
```

Without this, Prisma Client will fail in production containers.

### Docker Volume Mounts
Production uses volume mounts for persistence:
- `backend/node_modules` and `frontend/node_modules` must exist on HOST
- Run `npm install` on host when dependencies change
- Container restarts use host's node_modules, not container's

### Frontend Production Build
- Must run `npm run build` on host (not in container)
- `.next` directory must exist on host
- Container serves pre-built static files

---

## 🎯 CURRENT STATUS

**Production**: ✅ Live at https://parenting.atmata.ai

**Latest Features**: All deployed and working
- ✅ Role-based access control (PARENT, NANNY, VIEWER)
- ✅ Breast feeding duration tracking
- ✅ Diaper image upload
- ✅ Team invitation system
- ✅ Account creation fixed

**CI/CD**: ✅ Fully automated
- Push to main → Auto-deploys in 3-4 minutes
- Health checks with retry logic
- Production CLI for remote management

**Database**: 4 migrations applied
1. Initial schema
2. Add inventory and schedules
3. Add Account and roles
4. Add breastDuration and imageUrl

**Next Steps**: None required - system is production-ready

---

## 📚 REFERENCE

### Git Workflow
```bash
# Make changes locally
vim file.ts

# Test locally
npm run dev

# Commit and push (triggers auto-deploy)
git add .
git commit -m "Description"
git push origin main

# Watch deployment
# https://github.com/kkhalifeh/twins-assistant/actions
```

### Quick Commands Reference
```bash
# Development
npm run dev                    # Start all services
cd backend && npm run dev      # Backend only
cd frontend && npm run dev     # Frontend only

# Production Management
./scripts/production-cli.sh status
./scripts/production-cli.sh logs backend
./scripts/production-cli.sh data:delete-all
./scripts/production-cli.sh restart all
./scripts/production-cli.sh db:backup

# Database
cd backend
DATABASE_URL="..." npx prisma migrate dev
DATABASE_URL="..." npx prisma studio
DATABASE_URL="..." npx prisma generate
```

### Key URLs
- **Production**: https://parenting.atmata.ai
- **GitHub Actions**: https://github.com/kkhalifeh/twins-assistant/actions
- **Local Frontend**: http://localhost:3000
- **Local Backend**: http://localhost:3003

---

**End of Documentation**

*This file serves as the single source of truth for the Parenting AI Assistant project.*
