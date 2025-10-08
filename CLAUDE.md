# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Architecture

This is a monorepo for a Twin Parenting AI Assistant with three main services:

- **Frontend**: Next.js app with TypeScript and Tailwind CSS
- **Backend**: Node.js/Express API with TypeScript, Prisma ORM, and PostgreSQL
- **AI Service**: Python FastAPI service using LangChain and OpenAI for WhatsApp integration

The application provides both a WhatsApp chatbot interface and a web dashboard for managing twin baby care data.

## Development Commands

### Full Stack Development
```bash
npm run dev                    # Start all services via Docker Compose
npm run docker:build          # Build Docker containers
npm run docker:down           # Stop Docker containers
npm run setup                 # Install dependencies for all services
```

### Individual Services
```bash
npm run dev:frontend          # Next.js dev server (port 3000)
npm run dev:backend           # Node.js API server with nodemon
npm run dev:ai                # Python FastAPI service (port 8000)
```

### Frontend (Next.js)
```bash
cd frontend
npm run dev                   # Development server
npm run build                 # Production build
npm run start                 # Start production build
npm run lint                  # ESLint
```

### Backend (Node.js)
```bash
cd backend
npm run dev                   # Development with nodemon
npm run build                 # TypeScript compilation
npm run start                 # Production server
npm run prisma:generate       # Generate Prisma client
npm run prisma:migrate        # Run database migrations
npm run prisma:studio         # Open Prisma Studio
npm run prisma:seed           # Seed database
```

### AI Service (Python)
```bash
cd ai-service
python src/main.py            # Start FastAPI server
```

## Database Setup

The project uses PostgreSQL with Prisma ORM. The Docker setup includes:
- PostgreSQL (port 5432)
- Redis (port 6379)
- Adminer database UI (port 8080)

Key database models include User, Child, FeedingLog, SleepLog, DiaperLog, HealthLog, and Schedule for tracking twin care data.

## Technology Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, React Query, React Hook Form, Zod
- **Backend**: Express, TypeScript, Prisma, PostgreSQL, JWT auth, bcryptjs
- **AI Service**: FastAPI, LangChain, OpenAI API, Meta WhatsApp Business API
- **Infrastructure**: Docker, Redis for caching

## Key Directories

- `frontend/src/app/` - Next.js app router pages (feeding, sleep, diapers, health, etc.)
- `frontend/src/components/` - Reusable React components
- `backend/src/` - Express API routes and middleware
- `backend/prisma/` - Database schema and migrations
- `ai-service/src/` - Python AI service modules (webhook_handler, message_processor)