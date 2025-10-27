# Parenting AI Assistant

AI-powered web application for managing child care with comprehensive tracking, multi-child support, and natural language interface.

🌐 **Live**: https://parenting.atmata.ai

---

## Features

- 📊 **Real-time Dashboard** - Overview of all children's activities
- 🍼 **Feeding Tracker** - Bottles, breastfeeding with duration, solid foods
- 😴 **Sleep Monitor** - Track naps and nighttime sleep patterns
- 🚼 **Diaper Log** - Record changes with optional photo upload
- 🏥 **Health Records** - Temperature, weight, medical notes
- 📦 **Inventory Management** - Track supplies with restock alerts
- 🤖 **AI Chat Interface** - Natural language logging
- 👥 **Multi-Child Support** - Dynamic tracking for unlimited children
- 🔐 **Role-Based Access** - PARENT, NANNY, and VIEWER roles
- 📈 **Analytics & Insights** - Pattern recognition and comparisons

---

## Tech Stack

- **Backend**: Node.js 18 + TypeScript + Express + Prisma ORM
- **Database**: PostgreSQL 14+
- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **AI Service**: Python 3.9+ + FastAPI + LangChain + OpenAI
- **Infrastructure**: Docker + Redis
- **CI/CD**: GitHub Actions (auto-deploy on push)

---

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Docker (optional)

### Installation

```bash
# Clone repository
git clone <repository-url>
cd twins-assistant

# Install dependencies
npm run setup

# Configure environment
cd backend && cp .env.example .env
cd ../frontend && cp .env.example .env
# Edit .env files with your configuration

# Setup database
cd backend
npm run prisma:migrate
npm run prisma:generate

# Start development servers
npm run dev
```

### Access
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001

---

## Development

```bash
# Start all services
npm run dev

# Backend only
cd backend && npm run dev

# Frontend only
cd frontend && npm run dev

# Database GUI
cd backend && npm run prisma:studio
```

---

## Production Deployment

**Fully automated** - Just push to main:

```bash
git add .
git commit -m "Your changes"
git push origin main

# ✅ Auto-deploys to production in ~3-4 minutes
```

### Production Management

```bash
# Check status
./scripts/production-cli.sh status

# View logs
./scripts/production-cli.sh logs backend

# Delete data
./scripts/production-cli.sh data:delete-all

# Restart services
./scripts/production-cli.sh restart all

# See all commands
./scripts/production-cli.sh help
```

---

## Documentation

📖 **[MASTER.md](MASTER.md)** - Complete documentation including:
- Architecture details
- Recent features and implementation
- Database schema
- CI/CD automation
- Production configuration
- Troubleshooting guide

📝 **[CLAUDE.md](CLAUDE.md)** - Development guidelines for Claude Code

---

## Project Structure

```
twins-assistant/
├── backend/           # Node.js API (Express + Prisma)
├── frontend/          # Next.js web app
├── ai-service/        # Python AI service (FastAPI)
├── scripts/           # Automation scripts
│   ├── auto-deploy.sh         # Server-side deployment
│   └── production-cli.sh      # Local production management
└── .github/workflows/ # CI/CD automation
```

---

## Security

- JWT-based authentication
- Password hashing (bcrypt)
- Role-based access control
- User data isolation
- CORS configuration
- Input validation

---

## Status

✅ **Production-ready and deployed**

- All core features working
- CI/CD fully automated
- Role-based access control
- Multi-child dynamic support
- Comprehensive testing completed

---

## License

Private - All rights reserved

---

## Support

For detailed documentation, see [MASTER.md](MASTER.md)

For development guidelines, see [CLAUDE.md](CLAUDE.md)
