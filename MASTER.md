# MASTER DOCUMENTATION

**Parenting AI Assistant** - Complete Technical Reference

Last Updated: November 16, 2025

---

## 🎯 PROJECT OVERVIEW

AI-powered parenting assistant with comprehensive child care tracking, multi-child support, role-based access control, AI chat interface, and timezone-aware logging.

**Production URL**: https://parenting.atmata.ai
**Repository**: https://github.com/kkhalifeh/twins-assistant

### Core Features

#### 👶 Child Care Modules
- **Feeding Logs** - Breast, bottle, formula, solids with duration/amount tracking
- **Pumping/Breastmilk** - Track pumping sessions, volumes, storage, and usage
- **Sleep Monitoring** - Naps/night sleep with quality, duration, head tilt tracking
- **Diaper Logs** - Wet/dirty/mixed with optional photo upload and consistency tracking
- **Health Records** - Temperature, weight, height, medicine, symptoms, doctor visits
- **Milestones** - Motor, language, social, cognitive development tracking

#### 📊 Analytics & Insights
- **Real-time Dashboard** - Activity overview with day/week/month views
- **AI-Generated Insights** - Pattern analysis for feeding, sleep, health behaviors
- **Predictive Analytics** - Next feeding/sleep time predictions
- **Correlation Analysis** - Discover relationships between activities
- **Daily Journal** - Chronological timeline of all activities
- **Comparative Reports** - Week-over-week, child-to-child comparisons

#### 🤖 AI & Automation
- **Natural Language Chat** - Log activities via conversational AI
- **WhatsApp Integration** - Voice & text logging through WhatsApp (AI service)
- **Smart Scheduling** - Recurring events with auto-reminders
- **Pattern Detection** - Automatic behavior pattern identification

#### 👥 Multi-User & Access Control
- **Account-Based Architecture** - Shared data across family/team
- **Role-Based Permissions** (RBAC):
  - **PARENT**: Full access to all features
  - **NANNY**: Manage feeding, sleep, diapers, health (no deletion)
  - **VIEWER**: Read-only access
- **Team Invitations** - Email-based member invites
- **Timezone Support** - Per-user timezone settings (IANA format)

#### 📦 Inventory Management
- **Stock Tracking** - Formula, diapers, wipes, medicine, supplies
- **Low Stock Alerts** - Automatic reorder notifications
- **Consumption Rate** - AI-powered usage predictions

---

## 🏗️ TECHNOLOGY STACK

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express + TypeScript
- **Database**: PostgreSQL 14+ (Alpine container)
- **ORM**: Prisma Client
- **Authentication**: JWT (bcrypt password hashing)
- **Cache**: Redis 7
- **File Storage**: Local filesystem with URL references

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Query (TanStack Query)
- **Forms**: React Hook Form + Zod validation
- **Icons**: Lucide React
- **HTTP Client**: Axios

### AI Service
- **Framework**: Python FastAPI
- **AI**: LangChain + OpenAI GPT
- **Integration**: Meta WhatsApp Business API

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Reverse Proxy**: Caddy (auto-SSL)
- **CI/CD**: GitHub Actions
- **Server**: VPS at 209.250.253.59 (Studio-Republik)

---

## 📁 PROJECT STRUCTURE

```
twins-assistant/
├── backend/                         # Node.js API Server
│   ├── src/
│   │   ├── controllers/            # Business logic layer
│   │   │   ├── auth.controller.ts
│   │   │   ├── children.controller.ts
│   │   │   ├── feeding.controller.ts
│   │   │   ├── pumping.controller.ts
│   │   │   ├── sleep.controller.ts
│   │   │   ├── diaper.controller.ts
│   │   │   ├── health.controller.ts
│   │   │   ├── inventory.controller.ts
│   │   │   ├── user.controller.ts
│   │   │   └── data.controller.ts
│   │   ├── routes/                  # API endpoints
│   │   │   ├── auth.routes.ts       # /api/auth
│   │   │   ├── children.routes.ts   # /api/children
│   │   │   ├── feeding.routes.ts    # /api/feeding
│   │   │   ├── pumping.routes.ts    # /api/pumping
│   │   │   ├── sleep.routes.ts      # /api/sleep
│   │   │   ├── diaper.routes.ts     # /api/diapers
│   │   │   ├── health.routes.ts     # /api/health
│   │   │   ├── inventory.routes.ts  # /api/inventory
│   │   │   ├── user.routes.ts       # /api/users
│   │   │   ├── dashboard.routes.ts  # /api/dashboard
│   │   │   ├── journal.routes.ts    # /api/journal
│   │   │   ├── analytics.routes.ts  # /api/analytics
│   │   │   ├── chat.routes.ts       # /api/chat
│   │   │   └── data.routes.ts       # /api/data
│   │   ├── services/                # External integrations
│   │   │   ├── dashboard.service.ts
│   │   │   ├── analytics.service.ts
│   │   │   ├── ai-chat-openai.service.ts
│   │   │   ├── ai-chat.service.ts
│   │   │   └── storage.service.ts
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts   # JWT verification
│   │   │   ├── rbac.middleware.ts   # Role-based access
│   │   │   ├── validation.middleware.ts
│   │   │   └── error.middleware.ts
│   │   ├── utils/
│   │   │   └── auth.ts              # AuthRequest type
│   │   └── index.ts                 # Server entry
│   ├── prisma/
│   │   ├── schema.prisma            # Database schema
│   │   └── migrations/              # Version-controlled migrations
│   ├── uploads/                     # File upload directory
│   ├── Dockerfile                   # Alpine Linux production image
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                        # Next.js Web Application
│   ├── src/
│   │   ├── app/                     # Next.js App Router pages
│   │   │   ├── page.tsx             # Dashboard (/)
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   ├── onboarding/
│   │   │   ├── feeding/
│   │   │   ├── pumping/
│   │   │   ├── sleep/
│   │   │   ├── diapers/
│   │   │   ├── health/
│   │   │   ├── milestones/
│   │   │   ├── inventory/
│   │   │   ├── chat/
│   │   │   ├── journal/
│   │   │   ├── insights/
│   │   │   ├── settings/
│   │   │   └── layout.tsx           # Root layout
│   │   ├── components/              # Reusable UI components
│   │   │   ├── FloatingActionButton.tsx
│   │   │   ├── Navbar.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── contexts/
│   │   │   └── TimezoneContext.tsx  # Timezone conversion
│   │   └── lib/
│   │       └── api.ts               # Axios client + API methods
│   ├── public/                      # Static assets
│   ├── Dockerfile                   # Production image
│   ├── next.config.mjs
│   ├── tailwind.config.ts
│   └── package.json
│
├── ai-service/                      # Python AI Service
│   ├── src/
│   │   ├── main.py                  # FastAPI server
│   │   ├── webhook_handler.py       # WhatsApp webhook
│   │   └── message_processor.py     # NLP processing
│   ├── requirements.txt
│   └── Dockerfile
│
├── scripts/                         # Automation scripts
│   ├── auto-deploy.sh               # Server-side CI/CD script
│   ├── deploy-frontend.sh           # Frontend-only deploy
│   ├── production-cli.sh            # Local production management
│   └── server-setup.sh              # Initial server setup
│
├── .github/workflows/
│   └── deploy-production.yml        # GitHub Actions CI/CD
│
├── docker-compose.dev.yml           # Local development
├── docker-compose.prod.yml          # Production containers
├── MASTER.md                        # This file
└── CLAUDE.md                        # Claude Code instructions
```

---

## 🗄️ DATABASE SCHEMA

### Core Models

#### **Account**
Multi-user family/team container

```prisma
model Account {
  id        String   @id @default(cuid())
  name      String   // Account/family name
  ownerId   String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  owner   User   @relation("AccountOwner", fields: [ownerId], references: [id])
  members User[]
}
```

**Key Points**:
- One owner, multiple members
- All users in account share data
- Owner can invite team members

---

#### **User**
Account users with roles and timezone

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  password  String   // bcrypt hashed
  role      UserRole @default(PARENT)
  phone     String?
  accountId String?
  timezone  String   @default("America/New_York") // IANA timezone
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  account      Account?     @relation(fields: [accountId], references: [id])
  ownedAccount Account?     @relation("AccountOwner")
  children     Child[]
  feedingLogs  FeedingLog[]
  pumpingLogs  PumpingLog[]
  sleepLogs    SleepLog[]
  diaperLogs   DiaperLog[]
  healthLogs   HealthLog[]
  schedules    Schedule[]
  inventory    Inventory[]
}

enum UserRole {
  PARENT   // Full access
  NANNY    // Limited write access
  VIEWER   // Read-only
}
```

**Key Points**:
- Each user has unique email + password
- Role determines permissions (RBAC)
- Timezone affects timestamp display (not storage)
- Password hashed with bcrypt

---

#### **Child**
Individual children in the account

```prisma
model Child {
  id          String    @id @default(cuid())
  userId      String
  name        String
  dateOfBirth DateTime  @db.Date
  gender      Gender
  photoUrl    String?
  medicalNotes String?  @db.Text
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  user         User @relation(fields: [userId], references: [id])
  feedingLogs  FeedingLog[]
  sleepLogs    SleepLog[]
  diaperLogs   DiaperLog[]
  healthLogs   HealthLog[]
  milestones   Milestone[]
  schedules    Schedule[]
  insights     Insight[]
}

enum Gender {
  MALE
  FEMALE
  OTHER
}
```

**Key Points**:
- Created by one user but shared across account
- All queries use accountId pattern (not userId)

---

#### **FeedingLog**
Breast, bottle, formula, solid feeding records

```prisma
model FeedingLog {
  id            String       @id @default(cuid())
  childId       String
  userId        String
  startTime     DateTime
  endTime       DateTime?
  type          FeedingType
  amount        Float?       // in ml (bottle/formula)
  duration      Int?         // in minutes (breast)
  notes         String?
  entryTimezone String       @default("America/New_York")
  createdAt     DateTime     @default(now())

  child Child @relation(fields: [childId], references: [id])
  user  User  @relation(fields: [userId], references: [id])
}

enum FeedingType {
  BREAST     // Duration only
  BOTTLE     // Amount in ml
  FORMULA    // Amount in ml
  MIXED      // Both
  SOLID      // Food
}
```

**Key Points**:
- `amount` for bottle/formula (measured ml)
- `duration` for breastfeeding (minutes)
- Analytics never estimates breast volume
- `entryTimezone` records user's timezone at log creation

---

#### **PumpingLog**
Breastmilk pumping sessions

```prisma
model PumpingLog {
  id            String       @id @default(cuid())
  userId        String       // Parent, not child
  timestamp     DateTime
  pumpType      PumpType
  duration      Int          // in minutes
  amount        Float        // in ml
  usage         UsageType    // STORED or USED
  notes         String?
  entryTimezone String       @default("America/New_York")
  createdAt     DateTime     @default(now())

  user  User  @relation(fields: [userId], references: [id])
}

enum PumpType {
  BABY_BUDDHA
  MADELA_SYMPHONY
  SPECTRA_S1
  OTHER
}

enum UsageType {
  STORED    // Put in fridge/freezer
  USED      // Fed directly to baby
}
```

**Key Points**:
- Belongs to user (parent), not child
- Tracks pump sessions and milk inventory
- Integrated into dashboard, journal, insights

---

#### **SleepLog**
Sleep tracking with quality and head tilt

```prisma
model SleepLog {
  id            String     @id @default(cuid())
  childId       String
  userId        String
  startTime     DateTime
  endTime       DateTime?
  duration      Int?       // in minutes (calculated)
  type          SleepType
  quality       SleepQuality?
  headTilt      HeadTilt?
  notes         String?
  entryTimezone String     @default("America/New_York")
  createdAt     DateTime   @default(now())

  child Child @relation(fields: [childId], references: [id])
  user  User  @relation(fields: [userId], references: [id])
}

enum SleepType {
  NAP
  NIGHT
}

enum SleepQuality {
  DEEP
  RESTLESS
  INTERRUPTED
}

enum HeadTilt {
  LEFT
  RIGHT
  STRAIGHT
}
```

**Key Points**:
- Track active sleep sessions (endTime = null)
- Duration auto-calculated on end
- Head tilt for plagiocephaly monitoring

---

#### **DiaperLog**
Diaper changes with photo upload

```prisma
model DiaperLog {
  id            String        @id @default(cuid())
  childId       String
  userId        String
  timestamp     DateTime
  type          DiaperType
  consistency   Consistency?
  color         String?
  imageUrl      String?       // Photo upload
  notes         String?
  entryTimezone String        @default("America/New_York")
  createdAt     DateTime      @default(now())

  child Child @relation(fields: [childId], references: [id])
  user  User  @relation(fields: [userId], references: [id])
}

enum DiaperType {
  WET
  DIRTY
  MIXED
}

enum Consistency {
  NORMAL
  WATERY
  HARD
}
```

**Key Points**:
- Optional photo for health monitoring
- Color and consistency tracking
- NANNY role has full access (RBAC fixed)

---

#### **HealthLog**
Medical records and vitals

```prisma
model HealthLog {
  id            String      @id @default(cuid())
  childId       String
  userId        String
  timestamp     DateTime
  type          HealthType
  value         String      // temperature, medicine name, etc.
  unit          String?     // °C, ml, kg, etc.
  notes         String?
  entryTimezone String      @default("America/New_York")
  createdAt     DateTime    @default(now())

  child Child @relation(fields: [childId], references: [id])
  user  User  @relation(fields: [userId], references: [id])
}

enum HealthType {
  TEMPERATURE
  MEDICINE
  WEIGHT
  HEIGHT
  VACCINATION
  SYMPTOM
  DOCTOR_VISIT
}
```

**Key Points**:
- Flexible value/unit system
- Track growth charts, vaccinations, symptoms

---

#### **Inventory**
Supplies and stock management

```prisma
model Inventory {
  id               String   @id @default(cuid())
  userId           String
  category         ItemCategory
  brand            String?
  itemName         String
  unitSize         String   // "30 diapers", "800g powder"
  currentStock     Float
  minimumStock     Float
  consumptionRate  Float?   // units per day
  lastRestocked    DateTime?
  nextReorderDate  DateTime?
  notes            String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  user User @relation(fields: [userId], references: [id])
}

enum ItemCategory {
  FORMULA
  DIAPERS
  WIPES
  CLOTHES
  MEDICINE
  TOYS
  FEEDING_SUPPLIES
  OTHER
}
```

**Key Points**:
- AI predicts consumption rates
- Auto-calculate next reorder date
- Low stock alerts

---

#### **Schedule**
Recurring events and reminders

```prisma
model Schedule {
  id         String        @id @default(cuid())
  childId    String?
  userId     String
  eventType  EventType
  dueTime    DateTime
  recurrence RecurrenceType?
  frequency  String?       // "every 3 hours", "daily"
  status     ScheduleStatus @default(PENDING)
  notes      String?
  createdAt  DateTime      @default(now())
  updatedAt  DateTime      @updatedAt

  child Child? @relation(fields: [childId], references: [id])
  user  User   @relation(fields: [userId], references: [id])
}

enum EventType {
  FEEDING
  NAP
  MEDICINE
  VACCINATION
  APPOINTMENT
  OTHER
}

enum ScheduleStatus {
  PENDING
  COMPLETED
  SKIPPED
  CANCELLED
}

enum RecurrenceType {
  ONCE
  DAILY
  WEEKLY
  CUSTOM
}
```

---

#### **Milestone**
Developmental milestones

```prisma
model Milestone {
  id          String        @id @default(cuid())
  childId     String
  type        MilestoneType
  name        String
  dateAchieved DateTime
  notes       String?
  mediaUrl    String?
  createdAt   DateTime      @default(now())

  child Child @relation(fields: [childId], references: [id])
}

enum MilestoneType {
  MOTOR      // Crawling, walking
  LANGUAGE   // First words
  SOCIAL     // Smiling, waving
  COGNITIVE  // Problem solving
}
```

---

#### **Insight**
AI-generated pattern insights

```prisma
model Insight {
  id           String      @id @default(cuid())
  childId      String?
  patternType  PatternType
  description  String      @db.Text
  confidence   Float       // 0-1
  suggestion   String?     @db.Text
  validFrom    DateTime
  validUntil   DateTime?
  createdAt    DateTime    @default(now())

  child Child? @relation(fields: [childId], references: [id])
}

enum PatternType {
  FEEDING
  SLEEP
  HEALTH
  BEHAVIOR
  CORRELATION
}
```

---

## 🔒 AUTHENTICATION & AUTHORIZATION

### Authentication Flow

1. **Registration** (`POST /api/auth/register`)
   ```typescript
   // 3-step atomic transaction:
   // 1. Hash password with bcrypt
   const hashedPassword = await bcrypt.hash(password, 10);

   // 2. Create Account
   const account = await prisma.account.create({
     data: { name: `${name}'s Account` }
   });

   // 3. Create User with accountId and ownerId
   const user = await prisma.user.create({
     data: {
       email, name, password: hashedPassword,
       role: 'PARENT',
       accountId: account.id,
       timezone: userTimezone || 'America/New_York'
     }
   });

   // 4. Update Account with ownerId
   await prisma.account.update({
     where: { id: account.id },
     data: { ownerId: user.id }
   });

   // 5. Generate JWT token
   const token = jwt.sign({ userId: user.id, id: user.id }, JWT_SECRET, { expiresIn: '30d' });
   ```

2. **Login** (`POST /api/auth/login`)
   ```typescript
   // Verify credentials
   const user = await prisma.user.findUnique({ where: { email } });
   const valid = await bcrypt.compare(password, user.password);

   // Generate JWT
   const token = jwt.sign({ userId: user.id, id: user.id }, JWT_SECRET, { expiresIn: '30d' });
   ```

3. **Protected Routes**
   ```typescript
   // All API routes use authMiddleware
   router.use(authMiddleware); // Decodes JWT, attaches req.user

   // Access user info in controllers
   export const getData = async (req: AuthRequest, res: Response) => {
     const userId = req.user?.id; // From JWT
     // ...
   };
   ```

### Authorization (RBAC)

**Middleware**: `backend/src/middleware/rbac.middleware.ts`

**Permission Matrix**:

| Resource      | PARENT | NANNY | VIEWER |
|--------------|--------|-------|--------|
| children     | CRUD   | R     | R      |
| feeding      | CRUD   | CRU   | R      |
| pumping      | CRUD   | -     | -      |
| sleep        | CRUD   | CRU   | R      |
| diapers      | CRUD   | CRU   | R      |
| health       | CRUD   | CRU   | R      |
| inventory    | CRUD   | R     | R      |
| analytics    | R      | R     | R      |
| dashboard    | R      | R     | R      |
| journal      | R      | R     | R      |
| users/team   | CRUD   | -     | -      |

**Implementation**:
```typescript
// Route setup
router.use(authMiddleware);           // JWT verification
router.use(checkResourceAccess);      // RBAC check

// RBAC logic
const permissions = {
  PARENT: ['*'],  // All access
  NANNY: ['feeding', 'sleep', 'diapers', 'health', 'children'], // Write access
  VIEWER: []      // Read-only (handled separately)
};

const resource = req.baseUrl.replace('/api/', ''); // Extract resource name
const method = req.method; // GET, POST, PUT, DELETE

// Check permission
if (role === 'VIEWER' && method !== 'GET') {
  return res.status(403).json({ error: 'Viewers have read-only access' });
}
```

**Critical Fix** (October 2025):
- Changed `'diaper'` → `'diapers'` in Nanny permissions
- Fixed resource extraction to use `req.baseUrl + req.path`

---

## 🌍 TIMEZONE ARCHITECTURE

### Strategy: Store UTC, Display User Timezone

**Why**: Ensures data consistency across users in different timezones.

### Implementation

#### Backend
```typescript
// All timestamps stored in UTC (Prisma default)
model FeedingLog {
  startTime     DateTime  // UTC in database
  entryTimezone String    // User's timezone at creation (for reference)
}

// Return timestamps as ISO 8601 strings
res.json({
  startTime: log.startTime.toISOString(), // "2025-11-16T18:30:00.000Z"
  entryTimezone: log.entryTimezone        // "America/New_York"
});
```

#### Frontend
```typescript
// TimezoneContext provides conversion
import { useTimezone } from '@/contexts/TimezoneContext';

const { formatTime } = useTimezone();

// Converts UTC ISO string to user's browser timezone
formatTime("2025-11-16T18:30:00.000Z")
// → "Nov 16, 1:30 PM" (if user in EST)
```

#### Date Queries
```typescript
// When fetching daily data, send timezone offset
const params = {
  date: '2025-11-16',            // YYYY-MM-DD
  timezoneOffset: new Date().getTimezoneOffset() // in minutes
};

// Backend converts to UTC range
const startOfDayLocal = new Date(`${date}T00:00:00`);
const startOfDayUTC = new Date(startOfDayLocal.getTime() + timezoneOffset * 60000);
const endOfDayUTC = new Date(startOfDayUTC.getTime() + 24 * 60 * 60 * 1000);

const logs = await prisma.feedingLog.findMany({
  where: {
    startTime: {
      gte: startOfDayUTC,
      lt: endOfDayUTC
    }
  }
});
```

---

## 🏛️ ACCOUNT-BASED ARCHITECTURE

### Critical Pattern: AccountId-Based Queries

**Problem Solved**: Users in same account must see shared data (not just their own).

**All controllers follow this pattern**:

```typescript
export const getData = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;

  // Step 1: Get user's accountId
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { accountId: true }
  });

  if (!user?.accountId) {
    return res.status(400).json({ error: 'User not part of an account' });
  }

  // Step 2: Get all children in account
  const children = await prisma.child.findMany({
    where: {
      user: { accountId: user.accountId }
    }
  });

  const childIds = children.map(c => c.id);

  // Step 3: Query logs for all children
  const logs = await prisma.feedingLog.findMany({
    where: { childId: { in: childIds } }
  });

  res.json(logs);
};
```

**Controllers using this pattern**:
- ✅ `children.controller.ts`
- ✅ `feeding.controller.ts`
- ✅ `pumping.controller.ts`
- ✅ `sleep.controller.ts`
- ✅ `diaper.controller.ts`
- ✅ `health.controller.ts`
- ✅ `inventory.controller.ts`
- ✅ `data.controller.ts` (delete all data)
- ✅ `dashboard.service.ts`
- ✅ `analytics.service.ts`

**Why**: Ensures parents and nannies in same account see all children and logs.

---

## 📊 ANALYTICS ENGINE

### Key Services

#### Dashboard Service
**File**: `backend/src/services/dashboard.service.ts`

**Capabilities**:
- Day/week/month statistics
- Active sleep session detection
- Real-time insights generation
- Recent activity timeline

**Key Metrics**:
```typescript
{
  stats: {
    totalFeedings: number,
    totalSleepHours: number,
    totalSleepSessions: number,
    totalDiaperChanges: number,
    totalPumpingSessions: number,
    totalPumpedVolume: number,
    avgFeedingInterval: number
  },
  insights: Array<{
    type: 'feeding' | 'sleep' | 'health',
    title: string,
    description: string,
    icon: string,
    color: 'red' | 'amber' | 'green' | 'blue'
  }>,
  recentActivities: Array<{
    type: string,
    childName: string,
    description: string,
    timestamp: string
  }>,
  activeSleepSessions: Array<...>
}
```

---

#### Analytics Service
**File**: `backend/src/services/analytics.service.ts`

**Key Methods**:

1. **`analyzeFeedingPatterns(childId, days, userId)`**
   ```typescript
   return {
     averageInterval: "2.4",           // hours between feeds
     averageBottleAmount: 29,          // ml per bottle/formula
     averageBreastDuration: 28,        // minutes per breastfeed
     totalFeedings: 13,
     breastCount: 6,
     bottleCount: 7,
     trend: 'increasing' | 'stable' | 'decreasing',
     lastFeeding: FeedingLog,
     nextFeedingEstimate: Date
   }
   ```

   **Critical Fix (Nov 2025)**: Removed breastfeeding volume estimation
   - Before: `(duration / 5) * 30ml` (inaccurate)
   - After: Separate `averageBottleAmount` (ml) and `averageBreastDuration` (min)

2. **`analyzeSleepPatterns(childId, days, userId)`**
   ```typescript
   return {
     averageSleepPerDay: 520,          // minutes
     averageNapDuration: 45,           // minutes
     averageNightSleepHours: 7.2,
     totalNaps: 12,
     totalNightSessions: 5,
     longestSleep: 480,
     trend: 'improving' | 'stable' | 'concerning'
   }
   ```

3. **`generateInsights(userId, days)`**
   - Feeding pattern insights
   - Sleep pattern insights
   - Diaper pattern insights
   - Cross-pattern correlations

---

## 🚀 CI/CD & DEPLOYMENT

### GitHub Actions Workflow

**File**: `.github/workflows/deploy-production.yml`

**Trigger**: Push to `main` branch (or manual dispatch)

**Steps**:
1. Checkout code
2. Setup SSH with `ATMATA_SSH_KEY` secret
3. Add server to known hosts
4. Execute `scripts/auto-deploy.sh` on server
5. Verify health checks

**Secrets Required**:
- `ATMATA_SSH_KEY`: SSH private key for root@209.250.253.59

---

### Auto-Deploy Script

**File**: `scripts/auto-deploy.sh`

**Location**: `/var/www/parenting-assistant/scripts/auto-deploy.sh`

**Workflow**:

```bash
# 1. Stash local changes
git stash push -m "Auto-deploy: production configs $(date)"

# 2. Pull latest code
git fetch origin main
git reset --hard origin/main

# 3. Restore production configs
# - Frontend API URL: localhost → parenting.atmata.ai
sed -i "s|http://localhost:3003/api|https://parenting.atmata.ai/api|g" frontend/src/lib/api.ts

# - Next.js config (ignore TS/ESLint errors)
cat > frontend/next.config.mjs << 'EOF'
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true }
};
export default nextConfig;
EOF

# - Prisma binary target for Alpine
# Ensures linux-musl-openssl-3.0.x is present

# 4. Backend deployment
cd backend
npm install
npx prisma generate
docker exec parenting_backend npx prisma migrate deploy
docker restart parenting_backend

# Wait for health check (12 retries × 5s)
until curl -f http://localhost:3001/health; do
  sleep 5
done

# 5. Frontend deployment
cd ../frontend
npm install
npm run build

# Kill existing process
pkill -f "next start" || true

# Start with PM2 (or nohup fallback)
if command -v pm2; then
  pm2 delete parenting-frontend || true
  pm2 start npm --name "parenting-frontend" -- start
  pm2 save
else
  nohup npm start > /tmp/frontend.log 2>&1 &
fi

# Wait for health check (12 retries × 5s)
until curl -f http://localhost:3000; do
  sleep 5
done

# 6. Verification
echo "✅ Deployment completed!"
docker ps | grep parenting
git log -3 --oneline
```

**Duration**: ~3-4 minutes

---

### Production CLI Tool

**File**: `scripts/production-cli.sh`

**Usage**: Run from local machine to manage production

**Commands**:

```bash
# Status & Monitoring
./scripts/production-cli.sh status           # Container status
./scripts/production-cli.sh logs backend     # Live backend logs
./scripts/production-cli.sh logs frontend    # Live frontend logs
./scripts/production-cli.sh logs            # All logs

# Deployment & Restarts
./scripts/production-cli.sh deploy          # Manual deployment
./scripts/production-cli.sh restart backend # Restart backend only
./scripts/production-cli.sh restart frontend
./scripts/production-cli.sh restart all

# Database Management
./scripts/production-cli.sh db:status       # Migration status
./scripts/production-cli.sh db:migrate      # Run migrations
./scripts/production-cli.sh db:backup       # Download backup
./scripts/production-cli.sh db:clean        # Delete all data

# Data Management
./scripts/production-cli.sh data:delete-all # Delete user data
./scripts/production-cli.sh data:delete-feeding
./scripts/production-cli.sh data:delete-sleep

# Direct Access
./scripts/production-cli.sh ssh             # SSH into server
./scripts/production-cli.sh help            # Show all commands
```

---

## 🏭 PRODUCTION ENVIRONMENT

### Server Details
- **Host**: 209.250.253.59 (Studio-Republik VPS)
- **User**: root
- **App Directory**: `/var/www/parenting-assistant`
- **Domain**: https://parenting.atmata.ai
- **SSL**: Caddy (auto-renewal)

### Docker Containers

```yaml
# docker-compose.prod.yml
services:
  postgres:
    image: postgres:14-alpine
    container_name: parenting_postgres
    ports: [127.0.0.1:5433:5432]
    volumes: [postgres_data:/var/lib/postgresql/data]
    environment:
      POSTGRES_USER: parenting_user
      POSTGRES_PASSWORD: <encoded>
      POSTGRES_DB: parenting_assistant

  redis:
    image: redis:7-alpine
    container_name: parenting_redis
    ports: [127.0.0.1:6380:6379]

  backend:
    build: ./backend
    container_name: parenting_backend
    ports: [127.0.0.1:3001:3001]
    environment:
      DATABASE_URL: postgresql://parenting_user:<encoded>@parenting_postgres:5432/parenting_assistant
      JWT_SECRET: <secret>
      JWT_EXPIRE: 30d
      NODE_ENV: production
      PORT: 3001
      REDIS_URL: redis://parenting_redis:6379
      OPENAI_API_KEY: sk-proj-...
    depends_on: [postgres, redis]

  frontend:
    build: ./frontend
    container_name: parenting_frontend
    ports: [127.0.0.1:3000:3000]
    environment:
      NODE_ENV: production
    depends_on: [backend]
```

**Container Status**:
```bash
NAME                 STATUS
parenting_postgres   Up 3 hours (healthy)
parenting_redis      Up 3 hours (healthy)
parenting_backend    Up 2 minutes (unhealthy*)
parenting_frontend   Up 2 hours (unhealthy*)
```

*Note: "unhealthy" status is due to health check config, but services are functional.

---

### Environment Variables

#### Backend (`/var/www/parenting-assistant/backend/.env`)
```bash
DATABASE_URL="postgresql://parenting_user:<URL_ENCODED_PASSWORD>@parenting_postgres:5432/parenting_assistant?schema=public"
JWT_SECRET="your-secure-secret"
JWT_EXPIRE="30d"
PORT=3001
NODE_ENV=production
OPENAI_API_KEY="sk-proj-..."
REDIS_URL="redis://parenting_redis:6379"
```

**Critical**: URL-encode special characters in password:
- `+` → `%2B`
- `/` → `%2F`
- `=` → `%3D`

#### Frontend (hardcoded in `frontend/src/lib/api.ts`)
```typescript
// Auto-deploy script changes this line:
// Local:      http://localhost:3003/api
// Production: https://parenting.atmata.ai/api

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003/api';
```

**Note**: Auto-deploy automatically replaces localhost with production URL.

---

## 🛠️ LOCAL DEVELOPMENT

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ (or Docker)
- Redis (optional, for caching)
- Git

### Setup

1. **Clone repository**
   ```bash
   git clone https://github.com/kkhalifeh/twins-assistant.git
   cd twins-assistant
   ```

2. **Install dependencies**
   ```bash
   # All services
   npm run setup

   # Or individually
   cd backend && npm install
   cd frontend && npm install
   ```

3. **Configure environment**

   **Backend** (`backend/.env`):
   ```bash
   DATABASE_URL="postgresql://postgres:password@localhost:5432/twins_assistant?schema=public"
   JWT_SECRET="local-dev-secret"
   JWT_EXPIRE="30d"
   PORT=3003
   NODE_ENV=development
   OPENAI_API_KEY="sk-proj-..."
   REDIS_URL="redis://localhost:6379"
   ```

   **Frontend** (`frontend/.env.local`):
   ```bash
   NEXT_PUBLIC_API_URL=http://localhost:3003/api
   ```

4. **Setup database**
   ```bash
   cd backend

   # Run migrations
   DATABASE_URL="postgresql://postgres:password@localhost:5432/twins_assistant?schema=public" \
     npx prisma migrate dev

   # Generate Prisma client
   DATABASE_URL="postgresql://postgres:password@localhost:5432/twins_assistant?schema=public" \
     npx prisma generate

   # Optional: Open Prisma Studio
   DATABASE_URL="postgresql://postgres:password@localhost:5432/twins_assistant?schema=public" \
     npx prisma studio
   ```

5. **Start development servers**

   **Terminal 1 - Backend**:
   ```bash
   cd backend
   PORT=3003 DATABASE_URL="postgresql://postgres:password@localhost:5432/twins_assistant?schema=public" \
     npm run dev
   ```

   **Terminal 2 - Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

6. **Access application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3003
   - Health check: http://localhost:3003/health
   - Prisma Studio: http://localhost:5555

---

### Common Commands

#### Backend
```bash
cd backend

# Development with hot-reload
npm run dev

# TypeScript compilation
npm run build

# Database management
DATABASE_URL="..." npx prisma migrate dev --name description  # New migration
DATABASE_URL="..." npx prisma migrate reset                    # Reset DB
DATABASE_URL="..." npx prisma studio                           # GUI
DATABASE_URL="..." npx prisma generate                         # Regen client

# Linting
npm run lint
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

---

### Making Database Changes

**Workflow**:

1. Edit `backend/prisma/schema.prisma`
   ```prisma
   model Child {
     id          String    @id @default(cuid())
     // ... existing fields
     newField    String?   // Add new field
   }
   ```

2. Create migration
   ```bash
   cd backend
   DATABASE_URL="postgresql://postgres:password@localhost:5432/twins_assistant?schema=public" \
     npx prisma migrate dev --name add_new_field
   ```

3. Test locally
   ```bash
   npm run dev
   ```

4. Commit and push (migration runs automatically on production)
   ```bash
   git add .
   git commit -m "Add newField to Child model"
   git push origin main
   ```

**Production**: Migration runs via `npx prisma migrate deploy` in auto-deploy script.

---

## 🔧 TROUBLESHOOTING

### Deployment Failed

**Check GitHub Actions**:
1. https://github.com/kkhalifeh/twins-assistant/actions
2. Click failed workflow
3. Review step logs

**Check Production Logs**:
```bash
./scripts/production-cli.sh logs backend
./scripts/production-cli.sh logs frontend
```

**Common Issues**:
- Health check timeout → Backend needs more startup time (auto-retry handles this)
- Migration failed → Check schema conflicts
- Build failed → Check TypeScript errors

---

### Container Issues

**Check status**:
```bash
./scripts/production-cli.sh status
```

**Restart services**:
```bash
./scripts/production-cli.sh restart all
./scripts/production-cli.sh restart backend
./scripts/production-cli.sh restart frontend
```

**View logs**:
```bash
ssh root@209.250.253.59
cd /var/www/parenting-assistant
docker-compose -f docker-compose.prod.yml logs backend --tail=100
docker-compose -f docker-compose.prod.yml logs frontend --tail=100
```

---

### Database Issues

**Prisma Client Errors**:
- **Error**: "Query engine binary not found"
- **Cause**: Binary target mismatch (Debian vs Alpine)
- **Solution**: Ensure `schema.prisma` has:
  ```prisma
  generator client {
    provider = "prisma-client-js"
    binaryTargets = ["native", "linux-musl-openssl-3.0.x"]
  }
  ```

**Connection Errors**:
- **Error**: "Invalid port number"
- **Cause**: Special characters in DATABASE_URL not encoded
- **Solution**: URL-encode password (`+` → `%2B`, `/` → `%2F`, `=` → `%3D`)

**Migration Failed**:
```bash
./scripts/production-cli.sh db:status   # Check status
./scripts/production-cli.sh db:migrate  # Run manually
```

---

### Multi-User Issues

**Problem**: Users in same account can't see each other's data
- **Cause**: Controller using userId instead of accountId
- **Solution**: Verify controller uses accountId pattern (see Architecture section)

**Problem**: Nanny can't create logs (403 errors)
- **Cause**: RBAC resource name mismatch
- **Solution**: Check `rbac.middleware.ts` - ensure resource names match routes

**Problem**: Delete operations return 401
- **Cause**: Wrong Request type or user ID access
- **Solution**: Use `AuthRequest` type, access via `req.user?.id`

---

### Frontend Not Updating

**Manual rebuild**:
```bash
./scripts/production-cli.sh deploy
```

**Or direct SSH**:
```bash
ssh root@209.250.253.59
cd /var/www/parenting-assistant/frontend
npm run build
pm2 restart parenting-frontend
```

---

## 📝 API REFERENCE

### Base URL
- **Production**: `https://parenting.atmata.ai/api`
- **Local Dev**: `http://localhost:3003/api`

### Authentication
All protected routes require:
```
Authorization: Bearer <JWT_TOKEN>
```

---

### Auth Endpoints

#### `POST /api/auth/register`
Register new user and create account

**Request**:
```json
{
  "email": "parent@example.com",
  "password": "secure123",
  "name": "Jane Doe",
  "phone": "+1234567890"
}
```

**Response**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "cm...",
    "email": "parent@example.com",
    "name": "Jane Doe",
    "role": "PARENT",
    "accountId": "cm..."
  }
}
```

---

#### `POST /api/auth/login`
Login existing user

**Request**:
```json
{
  "email": "parent@example.com",
  "password": "secure123"
}
```

**Response**: Same as register

---

### Children Endpoints

#### `GET /api/children`
Get all children in account

**Response**:
```json
[
  {
    "id": "cm...",
    "name": "Emma",
    "dateOfBirth": "2025-01-15",
    "gender": "FEMALE",
    "photoUrl": null,
    "userId": "cm...",
    "createdAt": "2025-11-16T..."
  }
]
```

---

#### `POST /api/children`
Create new child

**Request**:
```json
{
  "name": "Emma",
  "dateOfBirth": "2025-01-15",
  "gender": "FEMALE",
  "photoUrl": null,
  "medicalNotes": "No allergies"
}
```

---

### Feeding Endpoints

#### `GET /api/feeding?childId=<id>&startDate=<date>&endDate=<date>`
Get feeding logs

**Response**:
```json
[
  {
    "id": "cm...",
    "childId": "cm...",
    "startTime": "2025-11-16T18:30:00.000Z",
    "endTime": "2025-11-16T18:50:00.000Z",
    "type": "BREAST",
    "amount": null,
    "duration": 20,
    "notes": "Left breast",
    "child": { "name": "Emma" },
    "user": { "name": "Jane Doe" }
  }
]
```

---

#### `POST /api/feeding`
Create feeding log

**Request**:
```json
{
  "childId": "cm...",
  "startTime": "2025-11-16T18:30:00.000Z",
  "type": "BOTTLE",
  "amount": 120,
  "notes": "Formula"
}
```

---

### Pumping Endpoints

#### `GET /api/pumping?startDate=<date>&endDate=<date>`
Get pumping logs

#### `POST /api/pumping`
Create pumping log

**Request**:
```json
{
  "timestamp": "2025-11-16T14:00:00.000Z",
  "pumpType": "SPECTRA_S1",
  "duration": 15,
  "amount": 150,
  "usage": "STORED",
  "notes": "Morning pump"
}
```

---

### Sleep Endpoints

#### `GET /api/sleep?childId=<id>`
Get sleep logs

#### `POST /api/sleep`
Start sleep session

**Request**:
```json
{
  "childId": "cm...",
  "startTime": "2025-11-16T13:00:00.000Z",
  "type": "NAP",
  "headTilt": "RIGHT"
}
```

#### `PUT /api/sleep/:id/end`
End active sleep session

**Request**:
```json
{
  "quality": "DEEP",
  "notes": "Slept well"
}
```

---

### Dashboard Endpoints

#### `GET /api/dashboard?date=2025-11-16&viewMode=day`
Get dashboard statistics

**Query Params**:
- `date`: YYYY-MM-DD
- `timezoneOffset`: Browser offset in minutes
- `viewMode`: day | week | month

**Response**:
```json
{
  "stats": {
    "totalFeedings": 8,
    "totalSleepHours": 12.5,
    "totalSleepSessions": 5,
    "totalDiaperChanges": 6,
    "totalPumpingSessions": 3,
    "totalPumpedVolume": 420,
    "avgFeedingInterval": 3.2
  },
  "insights": [
    {
      "type": "feeding",
      "title": "Feeding Pattern",
      "description": "Emma feeds every 3.2 hours on average",
      "icon": "clock",
      "color": "green"
    }
  ],
  "recentActivities": [...],
  "activeSleepSessions": [...]
}
```

---

### Analytics Endpoints

#### `GET /api/analytics/insights?days=7`
Get AI-generated insights

**Response**:
```json
{
  "insights": [
    {
      "childId": "cm...",
      "childName": "Emma",
      "type": "feeding",
      "title": "Feeding Pattern Analysis",
      "description": "Emma feeds every 2.4 hours on average, averaging 29ml per bottle/formula feed and 28 minutes per breastfeed (6 breast, 7 bottle/formula). Total: 13 feedings in past week.",
      "trend": "stable",
      "confidence": 85,
      "lastUpdated": "2025-11-16T..."
    }
  ]
}
```

---

## 🎯 CURRENT STATUS

### Production
✅ **Live**: https://parenting.atmata.ai

### Latest Deployments (November 2025)
- ✅ **Pumping Module** - Full tracking, dashboard integration, analytics (Nov 16)
- ✅ **Accurate Feeding Analytics** - Removed volume estimation, separated bottle/breast metrics (Nov 16)
- ✅ **Timezone Support** - Per-user IANA timezones, UTC storage (Nov 14)
- ✅ **Head Tilt Tracking** - Plagiocephaly monitoring for sleep (Nov 14)
- ✅ **Multi-User Account Sharing** - AccountId-based queries (Oct 27)
- ✅ **RBAC** - Parent/Nanny/Viewer roles (Oct 27)

### Database Migrations Applied
1. `20251006111158_init` - Initial schema
2. `20251008082340_add_userid_to_child` - Child ownership
3. `20251009073508_add_userid_to_inventory` - Inventory ownership
4. `20251027112614_add_account_and_features` - Accounts + RBAC
5. `20251110162734_change_dateofbirth_to_date` - Date type fix
6. `20251114042718_add_timezone_support` - Timezone fields
7. `20251114145002_add_head_tilt_to_sleep` - Head tilt enum
8. `20251116153106_add_pumping_log` - Pumping module

### CI/CD
✅ Fully automated via GitHub Actions
- Push to `main` → Auto-deploys in ~3-4 minutes
- Health checks with retry logic
- Production CLI for remote management

### Test Coverage
✅ Comprehensive test suite: `comprehensive-test.sh`
- 47/48 tests passing (97.9%)
- Multi-user scenarios
- RBAC permissions
- Cross-user data visibility
- Real-time synchronization

---

## 📚 QUICK REFERENCE

### Git Workflow
```bash
# Make changes
git add .
git commit -m "Description"
git push origin main  # Triggers auto-deploy

# Watch deployment
# https://github.com/kkhalifeh/twins-assistant/actions
```

### Production Management
```bash
# Status
./scripts/production-cli.sh status

# Logs
./scripts/production-cli.sh logs backend

# Restart
./scripts/production-cli.sh restart all

# Database
./scripts/production-cli.sh db:backup
./scripts/production-cli.sh db:migrate

# SSH
./scripts/production-cli.sh ssh
```

### Local Development
```bash
# Start all services
npm run dev

# Backend only (port 3003)
cd backend && PORT=3003 DATABASE_URL="postgresql://postgres:password@localhost:5432/twins_assistant?schema=public" npm run dev

# Frontend only (port 3000)
cd frontend && npm run dev

# Database GUI
cd backend && DATABASE_URL="..." npx prisma studio
```

### Key URLs
- **Production**: https://parenting.atmata.ai
- **GitHub**: https://github.com/kkhalifeh/twins-assistant
- **Actions**: https://github.com/kkhalifeh/twins-assistant/actions
- **Local Frontend**: http://localhost:3000
- **Local Backend**: http://localhost:3003

---

**END OF DOCUMENTATION**

*This file is the single source of truth for the Parenting AI Assistant project.*
