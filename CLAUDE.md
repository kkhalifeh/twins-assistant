# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Architecture

This is a monorepo for a Twin Parenting AI Assistant with three main services:

- **Frontend**: Next.js 14 app with TypeScript and Tailwind CSS (port 3000)
- **Backend**: Node.js/Express API with TypeScript, Prisma ORM, and PostgreSQL (port 3001)
- **AI Service**: Python FastAPI service using LangChain and OpenAI for WhatsApp integration (port 8000)

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

### Database Migrations Workflow

When you need to run migrations during development:

```bash
cd backend
DATABASE_URL="postgresql://postgres:password@localhost:5432/twins_assistant?schema=public" npx prisma migrate dev
```

For production migrations, see SERVERDETAILS.md.

### Key Database Models

The Prisma schema (backend/prisma/schema.prisma) includes:

- **User**: Parent/nanny/viewer accounts with role-based access control (RBAC)
- **Account**: Family accounts that own children and track members
- **Child**: Individual child profiles with date of birth, gender, photo, medical notes
- **FeedingLog**: Bottle, breast, formula, mixed, and solid food tracking with amounts and duration
- **PumpingLog**: Breast pump tracking with pump type, amount, duration, and usage type
- **SleepLog**: Nap and night sleep with quality, head tilt tracking
- **DiaperLog**: Wet/dirty/mixed diapers with consistency, color, optional photo upload
- **HealthLog**: Temperature, medicine, weight, height, vaccination, symptoms, doctor visits
- **HygieneLog**: Bath, nail trimming, oral care tracking
- **Schedule**: Event scheduling with recurrence for feeding, naps, medicine, etc.
- **Inventory**: Supply tracking (formula, diapers, wipes, etc.) with restock alerts
- **Milestone**: Motor, language, social, cognitive milestones
- **Insight**: AI-generated pattern analysis and suggestions

All logs include `entryTimezone` field (IANA timezone format) to properly track events in the user's local timezone.

## Technology Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, React Query, React Hook Form, Zod
- **Backend**: Express, TypeScript, Prisma, PostgreSQL, JWT auth, bcryptjs, OpenAI API
- **AI Service**: FastAPI, LangChain, OpenAI API, Meta WhatsApp Business API
- **Infrastructure**: Docker, Redis for caching, AWS S3 for image storage
- **CI/CD**: GitHub Actions for auto-deploy on push to main

## Key Directories

### Backend Structure
- `backend/src/routes/` - API route definitions (auth, children, feeding, sleep, diapers, health, etc.)
- `backend/src/controllers/` - Business logic for each module
- `backend/src/services/` - Core services (ai-chat, analytics, dashboard, storage)
- `backend/src/middleware/` - RBAC and authentication middleware
- `backend/src/utils/` - Utilities (auth, validation, timezone, upload)
- `backend/prisma/` - Database schema and migrations

### Frontend Structure
- `frontend/src/app/` - Next.js app router pages:
  - `page.tsx` - Main dashboard
  - `feeding/` - Feeding tracker
  - `pumping/` - Breast pump tracking
  - `sleep/` - Sleep monitor
  - `diapers/` - Diaper log
  - `health/` - Health records
  - `hygiene/` - Hygiene tracking
  - `inventory/` - Supply inventory
  - `chat/` - AI chat interface
  - `journal/` - Daily journal
  - `milestones/` - Milestone tracking
  - `insights/` - AI insights
  - `settings/` - User settings
- `frontend/src/components/` - Reusable React components

### AI Service Structure
- `ai-service/src/main.py` - FastAPI app with webhook and message processing endpoints
- `ai-service/src/message_processor.py` - LangChain-based NLP message processor
- `ai-service/src/webhook_handler.py` - WhatsApp webhook handler
- `ai-service/src/user_service.py` - User authentication and context
- `ai-service/src/storage_service.py` - Data persistence layer

## Backend API Architecture

The backend uses a layered architecture:

1. **Routes** (`src/routes/*.routes.ts`) - Define API endpoints
2. **Middleware** (`src/middleware/rbac.middleware.ts`) - RBAC checks and authentication
3. **Controllers** (`src/controllers/*.controller.ts`) - Handle request/response logic
4. **Services** (`src/services/*.service.ts`) - Complex business logic
5. **Prisma ORM** - Database access layer

All protected routes use:
- `authMiddleware` - JWT validation
- `checkResourceAccess` - Role-based access control (PARENT, NANNY, VIEWER)

## Authentication & Authorization

- JWT-based authentication with bcrypt password hashing
- Three user roles: PARENT (full access), NANNY (limited write), VIEWER (read-only)
- Multi-account support: users belong to accounts, children belong to accounts
- User data isolation enforced at database and API level

## AI Chat Integration

The backend includes an OpenAI-based chat service (`src/services/ai-chat-openai.service.ts`) that:
- Processes natural language commands
- Logs activities (feeding, sleep, diapers) via conversation
- Retrieves recent activity summaries
- Provides inventory checks and suggestions

The Python AI service handles WhatsApp integration separately via FastAPI.

## Image Upload

Images (child photos, diaper photos) are uploaded to AWS S3 via:
- `backend/src/services/storage.service.ts` - S3 integration
- `backend/src/utils/upload.ts` - Multer middleware with S3 storage
- Required env vars: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET_NAME`, `AWS_REGION`

## Timezone Handling

All timestamps are stored in UTC but tracked with user-specific timezone:
- Users have a `timezone` field (IANA format, default: "America/New_York")
- All logs have an `entryTimezone` field to record when the event occurred in the user's timezone
- `backend/src/utils/timezone.ts` provides timezone conversion utilities
- Frontend displays times in the user's local timezone

## Production Deployment

The app is deployed on a VPS at https://parenting.atmata.ai

Deployment is fully automated via GitHub Actions:
- Push to `main` branch triggers auto-deploy
- Backend and frontend run in Docker containers
- See SERVERDETAILS.md for manual deployment instructions and troubleshooting

Production management:
```bash
./scripts/production-cli.sh status      # Check service status
./scripts/production-cli.sh logs backend  # View logs
./scripts/production-cli.sh restart all  # Restart services
```

## Testing

Test scripts are available in the root directory for various scenarios:
- User flows (single child, multiple children)
- AI chat integration
- Dashboard data retrieval
- Feature testing

Run tests with:
```bash
./test-single-child.sh
./test-multiple-children.sh
./test-ai-single.sh
```

## Important Implementation Notes

### When Adding New Features

1. **Database Changes**:
   - Update `backend/prisma/schema.prisma`
   - Run `npm run prisma:migrate` to create migration
   - Run `npm run prisma:generate` to update Prisma client

2. **Backend API**:
   - Create controller in `backend/src/controllers/`
   - Create route in `backend/src/routes/`
   - Register route in `backend/src/index.ts` with appropriate middleware
   - Ensure RBAC is applied if needed

3. **Frontend**:
   - Create page in `frontend/src/app/[module]/page.tsx`
   - Add navigation link in the layout
   - Use React Query for data fetching
   - Use React Hook Form + Zod for forms

### Multi-Child Support

The app dynamically supports unlimited children per account. When implementing features:
- Always filter data by `childId` when applicable
- Use child selectors in the UI for multi-child accounts
- Aggregate data across children for family-level views

### Data Limits

Recent changes removed all data limits:
- Backend APIs return unlimited records
- Frontend displays all available data
- Pagination may be added later if performance becomes an issue
