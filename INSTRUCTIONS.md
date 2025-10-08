# Local Development Setup Instructions

This guide will help you set up and test the Twin Parenting Assistant application locally.

## Prerequisites

Before starting, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Docker** and **Docker Compose**
- **Python** (v3.8 or higher)
- **Git**

## Quick Start (Recommended)

### 1. Clone and Setup

```bash
# Clone the repository (if not already done)
git clone <your-repo-url>
cd twins-assistant

# Install dependencies for all services
npm run setup
```

### 2. Start All Services with Docker

```bash
# Start all services (PostgreSQL, Redis, Backend, Frontend, AI Service)
npm run dev

# Alternative: Start services individually if Docker has issues
npm run docker:build  # Build containers first
npm run dev           # Then start all services
```

### 3. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **AI Service**: http://localhost:8000
- **Database Admin (Adminer)**: http://localhost:8080
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## Manual Setup (Alternative)

If Docker doesn't work, you can run services individually:

### 1. Start Database Services

```bash
# Start only PostgreSQL and Redis
docker-compose -f docker-compose.dev.yml up postgres redis -d
```

### 2. Setup Backend

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env file with your database credentials

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Seed initial data (optional)
npm run prisma:seed

# Start backend development server
npm run dev
```

### 3. Setup Frontend

```bash
# Open new terminal, navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Setup environment variables
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > .env.local

# Start frontend development server
npm run dev
```

### 4. Setup AI Service

```bash
# Open new terminal, navigate to ai-service directory
cd ai-service

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Setup environment variables
cp .env.example .env
# Add your OpenAI API key and other configs

# Start AI service
python src/main.py
```

## Testing the New Features

### Test 1: User Registration and Onboarding

1. **Open the application**: http://localhost:3000
2. **Register a new user**:
   - Click "Sign up" on the login page
   - Fill in: Name, Email, Password, Phone (optional)
   - Click "Create Account"
3. **Complete onboarding**:
   - You should be redirected to `/onboarding`
   - Add your first child: Name, Date of Birth, Gender
   - Optionally add a second child using "Add Another Child"
   - Click "Complete Setup"
4. **Verify dashboard access**: You should see the main dashboard

### Test 2: Dynamic Data Display

1. **Check navigation sidebar**: Your children's names should appear instead of "Samar & Maryam"
2. **Visit settings page**: Go to Settings → Children tab
3. **Verify dynamic data**: Your added children should be displayed with their information
4. **Check user profile**: Settings → Profile should show your registered information

### Test 3: Journal View

1. **Navigate to Journal**: Click "Journal" in the sidebar
2. **Test date navigation**: Use previous/next day buttons
3. **Test filtering**: Select different children from the filter dropdown
4. **View daily stats**: Check the summary cards at the top
5. **Timeline view**: Should show "No activities" for new accounts

### Test 4: Data Deletion Features

1. **Go to Settings → Privacy**
2. **Test confirmation modals**:
   - Click "Delete All Feeding Data" (or any data type)
   - Verify confirmation modal appears
   - Click "Cancel" to test cancellation
3. **Test reset all data**: Click "Reset All Data" button
4. **Test account deletion**: Click "Delete Account Permanently" (don't complete)

## Database Management

### View Database Content

```bash
# Access Adminer web interface
open http://localhost:8080

# Login credentials:
# Server: postgres
# Username: postgres
# Password: password
# Database: twins_assistant
```

### Reset Database

```bash
cd backend

# Reset and recreate database
npm run prisma:migrate reset

# Re-seed with fresh data
npm run prisma:seed
```

### View Database via CLI

```bash
# Connect to PostgreSQL directly
docker exec -it twins_postgres psql -U postgres -d twins_assistant

# Common queries:
# \dt                    # List tables
# SELECT * FROM "User";  # View users
# SELECT * FROM "Child"; # View children
# \q                     # Quit
```

## Common Issues and Solutions

### Docker Issues

```bash
# If containers won't start
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml up --build

# Check container status
docker-compose -f docker-compose.dev.yml ps

# View logs
docker-compose -f docker-compose.dev.yml logs
```

### Database Issues

```bash
# Reset Prisma client
cd backend
npx prisma generate

# Fix migration issues
npx prisma migrate reset
npx prisma migrate dev
```

### Port Conflicts

If you get port conflict errors:

```bash
# Check what's using the ports
lsof -i :3000  # Frontend
lsof -i :3001  # Backend
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis
lsof -i :8000  # AI Service

# Kill processes if needed
kill -9 <PID>
```

### Environment Variables

Create these files if missing:

**Backend `.env`**:
```
DATABASE_URL="postgresql://postgres:password@localhost:5432/twins_assistant"
JWT_SECRET="your-jwt-secret-key"
OPENAI_API_KEY="your-openai-api-key"
```

**Frontend `.env.local`**:
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**AI Service `.env`**:
```
OPENAI_API_KEY="your-openai-api-key"
DATABASE_URL="postgresql://postgres:password@localhost:5432/twins_assistant"
```

## Testing Checklist

- [ ] ✅ User registration works
- [ ] ✅ Login redirects to onboarding for new users
- [ ] ✅ Onboarding allows adding multiple children
- [ ] ✅ Dashboard shows dynamic user/children data
- [ ] ✅ Settings page displays real user information
- [ ] ✅ Children section shows added children
- [ ] ✅ Journal page loads with date navigation
- [ ] ✅ Data deletion modals appear and can be cancelled
- [ ] ✅ Navigation works for all pages
- [ ] ✅ No "Samar", "Maryam", or hardcoded "Khaled" appear anywhere

## Stopping Services

```bash
# Stop all Docker services
npm run docker:down

# Or stop individual services
cd backend && npm run dev  # Ctrl+C to stop
cd frontend && npm run dev  # Ctrl+C to stop
cd ai-service && python src/main.py  # Ctrl+C to stop
```

## Development Commands Reference

```bash
# Root level commands
npm run dev                    # Start all services via Docker
npm run dev:frontend          # Start only frontend
npm run dev:backend           # Start only backend
npm run dev:ai                # Start only AI service
npm run docker:build          # Build Docker containers
npm run docker:down           # Stop Docker containers
npm run setup                 # Install all dependencies

# Backend specific
cd backend
npm run dev                   # Development server
npm run build                 # TypeScript compilation
npm run start                 # Production server
npm run prisma:generate       # Generate Prisma client
npm run prisma:migrate        # Run database migrations
npm run prisma:studio         # Open Prisma Studio
npm run prisma:seed           # Seed database

# Frontend specific
cd frontend
npm run dev                   # Development server
npm run build                 # Production build
npm run start                 # Start production build
npm run lint                  # ESLint

# AI Service specific
cd ai-service
python src/main.py            # Start FastAPI server
```

## Support

If you encounter issues:

1. Check the console/terminal for error messages
2. Verify all services are running: `docker-compose ps`
3. Check database connection: Access Adminer at http://localhost:8080
4. Restart services: `npm run docker:down && npm run dev`
5. Reset database if needed: `cd backend && npm run prisma:migrate reset`

The application should now be fully functional with all the new features from MODIFY.md! 🎉