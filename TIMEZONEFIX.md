# Timezone Fix - Complete Refactor Plan

---

## 📋 Implementation Sprints

### Sprint 1: Database Foundation ✅ COMPLETED
- [x] Install Luxon library in backend (`npm install luxon @types/luxon`)
- [x] Update Prisma schema with timezone fields
  - [x] Add `User.timezone` field with default "America/New_York"
  - [x] Add `entryTimezone` to FeedingLog, SleepLog, DiaperLog, HealthLog
- [x] Create and apply database migration `20251114042718_add_timezone_support`

### Sprint 2: Backend Core Services ✅ COMPLETED
- [x] Create TimezoneService utility class (`backend/src/utils/timezone.ts`)
- [x] Create user timezone settings endpoints
  - [x] GET `/users/settings/timezone` - Fetch user's timezone preference
  - [x] PATCH `/users/settings/timezone` - Update user's timezone preference
- [x] Update log creation endpoints to accept and store timezone
  - [x] Update POST `/feeding` endpoint
  - [x] Update POST `/sleep` endpoint
  - [x] Update POST `/diapers` endpoint
  - [x] Update POST `/health` endpoint

### Sprint 3: Backend Data Services ✅ COMPLETED
- [x] Update dashboard service with timezone-aware filtering
  - [x] Modify `getDashboardData()` to accept `viewTimezone` parameter
  - [x] Implement timezone-aware date range calculation using TimezoneService
  - [x] Filter logs based on timezone conversion with `isInDateRange()`
  - [x] Format activity times in user's timezone with `formatInTimezone()`
- [x] Update dashboard routes to use timezone parameter instead of timezoneOffset
- [x] Update journal routes with timezone filtering
  - [x] Modify journal endpoints to use timezone context
  - [x] Update date range queries using TimezoneService
  - [x] Add displayTime formatting for all activities
- [x] Update AI chat service to include timezone when creating logs
  - [x] Get user's timezone preference in handleActivityLogging()
  - [x] Add entryTimezone to all log creations (feeding, sleep, diaper, health)

### Sprint 3.5: Testing & Validation ✅ COMPLETED
- [x] Comprehensive backend tests created (test-timezone-functionality.sh)
- [x] Verified "zombie" issue is fixed
  - ✅ Logs timestamped at 8:45 PM and 8:53 PM EST on Nov 13 now correctly appear on Nov 13
  - ✅ Logs no longer appear on wrong date (Nov 14)
- [x] Verified timezone-aware filtering works correctly
- [x] Verified displayTime formatting shows correct local times
- [x] All modules aligned with timezone changes (inventory, health, AI chat)

### Sprint 4: Frontend Foundation
- [ ] Install Luxon library in frontend (`cd frontend && npm install luxon @types/luxon`)
- [ ] Create TimezoneContext and provider (`frontend/src/contexts/TimezoneContext.tsx`)
  - [ ] Implement timezone state management
  - [ ] Add formatTime() and formatDate() utilities
  - [ ] Add API integration for loading/saving timezone preference
- [ ] Create TimezoneSelector component (`frontend/src/components/TimezoneSelector.tsx`)
  - [ ] Implement dropdown with common timezones
  - [ ] Add timezone display with UTC offset
  - [ ] Handle timezone updates with API calls

### Sprint 5: Frontend Integration
- [ ] Update Settings page with timezone selector
  - [ ] Add Timezone Preferences section
  - [ ] Integrate TimezoneSelector component
- [ ] Update log forms to send timezone
  - [ ] Update FeedingForm to include timezone and show current timezone
  - [ ] Update SleepForm to include timezone and show current timezone
  - [ ] Update DiaperForm to include timezone and show current timezone
  - [ ] Update HealthForm to include timezone and show current timezone
- [ ] Update dashboard to use timezone context
  - [ ] Pass timezone to API queries
  - [ ] Use React Query with timezone dependency
  - [ ] Show timezone indicator
- [ ] Update journal to use timezone context
  - [ ] Pass timezone to API queries
  - [ ] Update activity display
- [ ] Update activity display components
  - [ ] Show converted times in user's timezone
  - [ ] Show indicator when log was entered in different timezone

### Sprint 6: Testing & Validation
- [ ] Test backend timezone conversion logic
  - [ ] Test EST to UTC+5 conversion
  - [ ] Test date range filtering across timezones
  - [ ] Test edge cases (midnight, DST transitions)
- [ ] Test frontend timezone changes
  - [ ] Test timezone selector updates
  - [ ] Test form submissions with timezone
  - [ ] Test dashboard reload after timezone change
- [ ] Integration testing
  - [ ] Create log in EST, view from UTC+5
  - [ ] Create log in UTC+5, view from EST
  - [ ] Change timezone preference, verify all times update
  - [ ] Test the original zombie issue scenario

### Sprint 7: Deployment
- [ ] Run all tests locally on port 5434 database
- [ ] User confirmation for deployment
- [ ] Deploy backend changes to production
- [ ] Deploy frontend changes to production
- [ ] Monitor for errors
- [ ] Verify production timezone functionality

---

## Problem Statement

The current system stores logs as UTC timestamps without timezone metadata. When users travel between timezones or view data from different locations, logs appear on different dates because:
- Logs entered at 8:45 PM EST on Nov 13 → stored as Nov 14 01:45 UTC
- When viewing from UTC+5 on Nov 13 → range is Nov 12 19:00 to Nov 13 18:59 UTC
- The log (Nov 14 01:45 UTC) falls outside this range

## Solution: User Timezone Preference with Full Timezone Support

### Core Principle
**All logs should be stored with their entry timezone and displayed in the user's currently selected timezone preference.**

---

## Database Schema Changes

### 1. Add Timezone Fields to User Table

```prisma
model User {
  id              String    @id @default(cuid())
  email           String    @unique
  password        String
  name            String
  role            Role      @default(PARENT)
  accountId       String?
  timezone        String    @default("America/New_York") // IANA timezone
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  account         Account?  @relation(fields: [accountId], references: [id])
  children        Child[]
  feedingLogs     FeedingLog[]
  sleepLogs       SleepLog[]
  diaperLogs      DiaperLog[]
  healthLogs      HealthLog[]
}
```

### 2. Add Entry Timezone to All Log Tables

```prisma
model FeedingLog {
  id          String   @id @default(cuid())
  childId     String
  userId      String
  type        FeedingType
  amount      Int
  duration    Int?
  startTime   DateTime
  endTime     DateTime?
  notes       String?
  entryTimezone String  // IANA timezone when log was created
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  child       Child    @relation(fields: [childId], references: [id], onDelete: Cascade)
  user        User     @relation(fields: [userId], references: [id])
}

model SleepLog {
  id          String   @id @default(cuid())
  childId     String
  userId      String
  type        SleepType
  startTime   DateTime
  endTime     DateTime?
  duration    Int?
  notes       String?
  entryTimezone String  // IANA timezone when log was created
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  child       Child    @relation(fields: [childId], references: [id], onDelete: Cascade)
  user        User     @relation(fields: [userId], references: [id])
}

model DiaperLog {
  id          String      @id @default(cuid())
  childId     String
  userId      String
  type        DiaperType
  timestamp   DateTime
  notes       String?
  entryTimezone String     // IANA timezone when log was created
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  child       Child       @relation(fields: [childId], references: [id], onDelete: Cascade)
  user        User        @relation(fields: [userId], references: [id])
}

model HealthLog {
  id          String      @id @default(cuid())
  childId     String
  userId      String
  type        HealthType
  value       String
  unit        String?
  timestamp   DateTime
  notes       String?
  entryTimezone String     // IANA timezone when log was created
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  child       Child       @relation(fields: [childId], references: [id], onDelete: Cascade)
  user        User        @relation(fields: [userId], references: [id])
}
```

### 3. Migration Strategy

```typescript
// Migration: Add timezone fields with defaults for existing data
// Step 1: Add columns with default values
ALTER TABLE "User" ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'America/New_York';
ALTER TABLE "FeedingLog" ADD COLUMN "entryTimezone" TEXT NOT NULL DEFAULT 'America/New_York';
ALTER TABLE "SleepLog" ADD COLUMN "entryTimezone" TEXT NOT NULL DEFAULT 'America/New_York';
ALTER TABLE "DiaperLog" ADD COLUMN "entryTimezone" TEXT NOT NULL DEFAULT 'America/New_York';
ALTER TABLE "HealthLog" ADD COLUMN "entryTimezone" TEXT NOT NULL DEFAULT 'America/New_York';

// Step 2: Update existing user timezones based on their account preferences if available
// This would be done via a data migration script
```

---

## Backend Implementation

### 1. Install Timezone Libraries

```bash
npm install luxon
npm install --save-dev @types/luxon
```

### 2. Create Timezone Utility Service

```typescript
// backend/src/utils/timezone.ts
import { DateTime, IANAZone } from 'luxon';

export class TimezoneService {
  /**
   * Convert UTC timestamp to specified timezone
   */
  static toTimezone(utcTimestamp: Date, timezone: string): DateTime {
    return DateTime.fromJSDate(utcTimestamp, { zone: 'utc' })
      .setZone(timezone);
  }

  /**
   * Convert timestamp from source timezone to target timezone
   */
  static convertTimezone(
    timestamp: Date,
    fromTimezone: string,
    toTimezone: string
  ): DateTime {
    return DateTime.fromJSDate(timestamp, { zone: fromTimezone })
      .setZone(toTimezone);
  }

  /**
   * Get date range in specific timezone
   * Returns UTC Date objects for database queries
   */
  static getDateRangeInTimezone(
    dateStr: string, // YYYY-MM-DD
    timezone: string,
    viewMode: 'day' | 'week' | 'month' = 'day'
  ): { startDate: Date; endDate: Date } {
    const [year, month, day] = dateStr.split('-').map(Number);

    let start: DateTime;
    let end: DateTime;

    switch (viewMode) {
      case 'day':
        start = DateTime.fromObject(
          { year, month, day, hour: 0, minute: 0, second: 0 },
          { zone: timezone }
        );
        end = DateTime.fromObject(
          { year, month, day, hour: 23, minute: 59, second: 59 },
          { zone: timezone }
        );
        break;

      case 'week':
        const weekStart = DateTime.fromObject(
          { year, month, day },
          { zone: timezone }
        ).startOf('week');
        const weekEnd = weekStart.endOf('week');
        start = weekStart;
        end = weekEnd;
        break;

      case 'month':
        start = DateTime.fromObject(
          { year, month, day: 1 },
          { zone: timezone }
        ).startOf('month');
        end = start.endOf('month');
        break;
    }

    return {
      startDate: start.toUTC().toJSDate(),
      endDate: end.toUTC().toJSDate()
    };
  }

  /**
   * Check if a log entry falls within a date range in specific timezone
   */
  static isInDateRange(
    logTimestamp: Date,
    logEntryTimezone: string,
    dateStr: string, // YYYY-MM-DD
    viewTimezone: string,
    viewMode: 'day' | 'week' | 'month' = 'day'
  ): boolean {
    // Convert log timestamp to view timezone
    const logInViewTz = DateTime.fromJSDate(logTimestamp, { zone: logEntryTimezone })
      .setZone(viewTimezone);

    const [year, month, day] = dateStr.split('-').map(Number);

    switch (viewMode) {
      case 'day':
        return (
          logInViewTz.year === year &&
          logInViewTz.month === month &&
          logInViewTz.day === day
        );

      case 'week': {
        const weekStart = DateTime.fromObject({ year, month, day }, { zone: viewTimezone })
          .startOf('week');
        const weekEnd = weekStart.endOf('week');
        return logInViewTz >= weekStart && logInViewTz <= weekEnd;
      }

      case 'month':
        return logInViewTz.year === year && logInViewTz.month === month;

      default:
        return false;
    }
  }

  /**
   * Validate IANA timezone string
   */
  static isValidTimezone(timezone: string): boolean {
    return IANAZone.isValidZone(timezone);
  }

  /**
   * Get user-friendly timezone display
   */
  static getTimezoneDisplay(timezone: string): string {
    const dt = DateTime.now().setZone(timezone);
    return `${timezone} (UTC${dt.offsetNameShort})`;
  }

  /**
   * Format timestamp for display in specific timezone
   */
  static formatInTimezone(
    timestamp: Date,
    entryTimezone: string,
    displayTimezone: string,
    format: string = 'MMM dd, yyyy h:mm a'
  ): string {
    return DateTime.fromJSDate(timestamp, { zone: entryTimezone })
      .setZone(displayTimezone)
      .toFormat(format);
  }
}
```

### 3. Update API Endpoints

#### User Settings Endpoint
```typescript
// backend/src/routes/user.routes.ts
router.patch('/settings/timezone', async (req: AuthRequest, res: Response) => {
  try {
    const { timezone } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!TimezoneService.isValidTimezone(timezone)) {
      return res.status(400).json({ error: 'Invalid timezone' });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { timezone }
    });

    res.json({
      success: true,
      timezone: user.timezone,
      display: TimezoneService.getTimezoneDisplay(timezone)
    });
  } catch (error) {
    console.error('Error updating timezone:', error);
    res.status(500).json({ error: 'Failed to update timezone' });
  }
});

router.get('/settings/timezone', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true }
    });

    res.json({
      timezone: user?.timezone || 'America/New_York',
      display: TimezoneService.getTimezoneDisplay(user?.timezone || 'America/New_York')
    });
  } catch (error) {
    console.error('Error fetching timezone:', error);
    res.status(500).json({ error: 'Failed to fetch timezone' });
  }
});
```

#### Update Log Creation Endpoints
```typescript
// backend/src/routes/feeding.routes.ts
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { childId, type, amount, duration, startTime, notes, timezone } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Validate timezone
    const entryTimezone = timezone || req.user?.timezone || 'America/New_York';
    if (!TimezoneService.isValidTimezone(entryTimezone)) {
      return res.status(400).json({ error: 'Invalid timezone' });
    }

    const feedingLog = await prisma.feedingLog.create({
      data: {
        childId,
        userId,
        type,
        amount,
        duration,
        startTime: new Date(startTime),
        entryTimezone, // Store the timezone
        notes
      },
      include: {
        child: true,
        user: {
          select: { name: true, email: true }
        }
      }
    });

    res.status(201).json(feedingLog);
  } catch (error) {
    console.error('Error creating feeding log:', error);
    res.status(500).json({ error: 'Failed to create feeding log' });
  }
});
```

#### Update Dashboard Service
```typescript
// backend/src/services/dashboard.service.ts
async getDashboardData(
  dateStr: string,
  viewMode: 'day' | 'week' | 'month' = 'day',
  userId: string,
  viewTimezone: string // User's current timezone preference
) {
  // Get user's account
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { accountId: true, timezone: true }
  });

  if (!user?.accountId) {
    throw new Error('User not part of an account');
  }

  // Use user's timezone preference if not provided
  const timezone = viewTimezone || user.timezone || 'America/New_York';

  // Get children
  const children = await prisma.child.findMany({
    where: { user: { accountId: user.accountId } }
  });
  const childIds = children.map(c => c.id);

  // Get date range in user's timezone (returns UTC dates for query)
  const { startDate, endDate } = TimezoneService.getDateRangeInTimezone(
    dateStr,
    timezone,
    viewMode
  );

  // Fetch all logs (wider range to catch timezone edge cases)
  const [allFeedingLogs, allSleepLogs, allDiaperLogs] = await Promise.all([
    prisma.feedingLog.findMany({
      where: {
        childId: { in: childIds },
        startTime: { gte: startDate, lte: endDate }
      },
      include: { child: true, user: { select: { name: true } } },
      orderBy: { startTime: 'desc' }
    }),
    prisma.sleepLog.findMany({
      where: {
        childId: { in: childIds },
        startTime: { gte: startDate, lte: endDate }
      },
      include: { child: true, user: { select: { name: true } } },
      orderBy: { startTime: 'desc' }
    }),
    prisma.diaperLog.findMany({
      where: {
        childId: { in: childIds },
        timestamp: { gte: startDate, lte: endDate }
      },
      include: { child: true, user: { select: { name: true } } },
      orderBy: { timestamp: 'desc' }
    })
  ]);

  // Filter logs based on whether they fall in the target date range
  // when viewed in the user's timezone
  const feedingLogs = allFeedingLogs.filter(log =>
    TimezoneService.isInDateRange(
      log.startTime,
      log.entryTimezone,
      dateStr,
      timezone,
      viewMode
    )
  );

  const sleepLogs = allSleepLogs.filter(log =>
    TimezoneService.isInDateRange(
      log.startTime,
      log.entryTimezone,
      dateStr,
      timezone,
      viewMode
    )
  );

  const diaperLogs = allDiaperLogs.filter(log =>
    TimezoneService.isInDateRange(
      log.timestamp,
      log.entryTimezone,
      dateStr,
      timezone,
      viewMode
    )
  );

  // Rest of dashboard logic...
  return {
    date: dateStr,
    viewMode,
    timezone,
    stats: { /* ... */ },
    recentActivities: this.getRecentActivities(
      feedingLogs,
      sleepLogs,
      diaperLogs,
      timezone // Pass timezone for formatting
    )
  };
}

private getRecentActivities(
  feedingLogs: any[],
  sleepLogs: any[],
  diaperLogs: any[],
  displayTimezone: string
) {
  const activities = [
    ...feedingLogs.map(log => ({
      type: 'feeding',
      childName: log.child.name,
      description: `${log.amount}ml ${log.type.toLowerCase()}`,
      timestamp: log.startTime,
      entryTimezone: log.entryTimezone,
      displayTime: TimezoneService.formatInTimezone(
        log.startTime,
        log.entryTimezone,
        displayTimezone
      ),
      userName: log.user?.name
    })),
    // ... similar for sleep and diaper
  ];

  activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  return activities;
}
```

---

## Frontend Implementation

### 1. Install Timezone Libraries

```bash
cd frontend
npm install luxon
npm install --save-dev @types/luxon
```

### 2. Create Timezone Context

```typescript
// frontend/src/contexts/TimezoneContext.tsx
'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { DateTime } from 'luxon'
import api from '@/lib/api'

interface TimezoneContextType {
  timezone: string
  setTimezone: (tz: string) => Promise<void>
  formatTime: (date: Date | string, entryTimezone?: string) => string
  formatDate: (date: Date | string, entryTimezone?: string) => string
  getTimezoneDisplay: () => string
  isLoading: boolean
}

const TimezoneContext = createContext<TimezoneContextType | undefined>(undefined)

export function TimezoneProvider({ children }: { children: ReactNode }) {
  const [timezone, setTimezoneState] = useState<string>('America/New_York')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Load user's timezone preference
    const loadTimezone = async () => {
      try {
        const response = await api.get('/users/settings/timezone')
        setTimezoneState(response.data.timezone)
      } catch (error) {
        console.error('Error loading timezone:', error)
        // Fallback to browser timezone
        setTimezoneState(DateTime.local().zoneName)
      } finally {
        setIsLoading(false)
      }
    }
    loadTimezone()
  }, [])

  const setTimezone = async (tz: string) => {
    try {
      await api.patch('/users/settings/timezone', { timezone: tz })
      setTimezoneState(tz)
    } catch (error) {
      console.error('Error updating timezone:', error)
      throw error
    }
  }

  const formatTime = (date: Date | string, entryTimezone?: string) => {
    const dt = typeof date === 'string' ? DateTime.fromISO(date) : DateTime.fromJSDate(date)
    const sourceZone = entryTimezone || 'utc'
    return dt.setZone(sourceZone).setZone(timezone).toFormat('h:mm a')
  }

  const formatDate = (date: Date | string, entryTimezone?: string) => {
    const dt = typeof date === 'string' ? DateTime.fromISO(date) : DateTime.fromJSDate(date)
    const sourceZone = entryTimezone || 'utc'
    return dt.setZone(sourceZone).setZone(timezone).toFormat('MMM dd, yyyy h:mm a')
  }

  const getTimezoneDisplay = () => {
    const dt = DateTime.now().setZone(timezone)
    return `${timezone} (UTC${dt.offsetNameShort})`
  }

  return (
    <TimezoneContext.Provider value={{
      timezone,
      setTimezone,
      formatTime,
      formatDate,
      getTimezoneDisplay,
      isLoading
    }}>
      {children}
    </TimezoneContext.Provider>
  )
}

export function useTimezone() {
  const context = useContext(TimezoneContext)
  if (!context) {
    throw new Error('useTimezone must be used within TimezoneProvider')
  }
  return context
}
```

### 3. Timezone Selector Component

```typescript
// frontend/src/components/TimezoneSelector.tsx
'use client'

import { useState } from 'react'
import { useTimezone } from '@/contexts/TimezoneContext'
import { Globe } from 'lucide-react'

const COMMON_TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Australia/Sydney',
]

export default function TimezoneSelector({ size = 'default' }: { size?: 'default' | 'compact' }) {
  const { timezone, setTimezone, getTimezoneDisplay, isLoading } = useTimezone()
  const [isChanging, setIsChanging] = useState(false)

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTimezone = e.target.value
    setIsChanging(true)
    try {
      await setTimezone(newTimezone)
    } catch (error) {
      console.error('Failed to update timezone:', error)
      alert('Failed to update timezone. Please try again.')
    } finally {
      setIsChanging(false)
    }
  }

  if (size === 'compact') {
    return (
      <select
        value={timezone}
        onChange={handleChange}
        disabled={isLoading || isChanging}
        className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
      >
        {COMMON_TIMEZONES.map((tz) => (
          <option key={tz} value={tz}>
            {tz.replace(/_/g, ' ')}
          </option>
        ))}
      </select>
    )
  }

  return (
    <div className="flex items-center space-x-3">
      <Globe className="w-5 h-5 text-gray-500" />
      <div className="flex-1">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Timezone
        </label>
        <select
          value={timezone}
          onChange={handleChange}
          disabled={isLoading || isChanging}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
        >
          {COMMON_TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">
          Currently: {getTimezoneDisplay()}
        </p>
      </div>
    </div>
  )
}
```

### 4. Update Settings Page

```typescript
// frontend/src/app/settings/page.tsx
'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import TimezoneSelector from '@/components/TimezoneSelector'
import { User, Bell, Lock, Globe } from 'lucide-react'
import api from '@/lib/api'

export default function SettingsPage() {
  // ... existing settings state

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Settings</h1>

      <div className="space-y-6">
        {/* Profile Section */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <User className="w-5 h-5 mr-2" />
            Profile
          </h2>
          {/* ... existing profile settings ... */}
        </div>

        {/* Timezone Section */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Globe className="w-5 h-5 mr-2" />
            Timezone Preferences
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            All timestamps will be displayed in your selected timezone.
            This setting affects how you view all logs across the application.
          </p>
          <TimezoneSelector />
        </div>

        {/* ... other settings sections ... */}
      </div>
    </div>
  )
}
```

### 5. Update Log Forms to Show Timezone

```typescript
// frontend/src/components/FeedingForm.tsx
'use client'

import { useTimezone } from '@/contexts/TimezoneContext'
import { Clock } from 'lucide-react'

export default function FeedingForm() {
  const { timezone, getTimezoneDisplay } = useTimezone()
  // ... existing form state

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const data = {
      // ... existing form data
      timezone, // Include user's current timezone
    }

    await api.post('/feeding', data)
    // ... rest of submit logic
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* ... existing form fields ... */}

      {/* Timezone Display */}
      <div className="flex items-center space-x-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
        <Clock className="w-4 h-4" />
        <span>Logging in: {getTimezoneDisplay()}</span>
      </div>

      {/* ... submit button ... */}
    </form>
  )
}
```

### 6. Update Activity Display Components

```typescript
// frontend/src/components/ActivityCard.tsx
'use client'

import { useTimezone } from '@/contexts/TimezoneContext'

interface ActivityCardProps {
  activity: {
    type: string
    childName: string
    description: string
    timestamp: string
    entryTimezone?: string
    userName?: string
  }
}

export default function ActivityCard({ activity }: ActivityCardProps) {
  const { formatDate, timezone } = useTimezone()

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center space-x-3">
        {/* ... activity icon ... */}
        <div>
          <p className="font-medium text-sm">{activity.childName}</p>
          <p className="text-xs text-gray-600">{activity.description}</p>
          {activity.userName && (
            <p className="text-xs text-gray-500">Logged by {activity.userName}</p>
          )}
        </div>
      </div>
      <div className="text-right">
        <p className="text-xs text-gray-500">
          {formatDate(activity.timestamp, activity.entryTimezone)}
        </p>
        {activity.entryTimezone && activity.entryTimezone !== timezone && (
          <p className="text-xs text-amber-600">
            Originally: {activity.entryTimezone}
          </p>
        )}
      </div>
    </div>
  )
}
```

### 7. Update Dashboard to Pass Timezone

```typescript
// frontend/src/app/page.tsx
'use client'

import { useTimezone } from '@/contexts/TimezoneContext'

export default function DashboardPage() {
  const { timezone, isLoading: tzLoading } = useTimezone()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day')

  const { data: dashboardData, isLoading, error } = useQuery({
    queryKey: ['dashboard', format(currentDate, 'yyyy-MM-dd'), viewMode, timezone],
    queryFn: async () => {
      const dateStr = format(currentDate, 'yyyy-MM-dd')
      const response = await api.get('/dashboard', {
        params: {
          date: dateStr,
          timezone, // User's timezone preference
          viewMode
        }
      })
      return response.data
    },
    enabled: !tzLoading, // Wait for timezone to load
    refetchInterval: 30000,
    staleTime: 0,
    gcTime: 0
  })

  // ... rest of component
}
```

---

## Migration & Rollout Plan

### Phase 1: Database Migration (No Breaking Changes)
1. Add `timezone` column to `User` table with default `America/New_York`
2. Add `entryTimezone` column to all log tables with default `America/New_York`
3. Run migration on production with defaults for existing data

### Phase 2: Backend Updates
1. Deploy timezone utility service
2. Update all log creation endpoints to accept and store `timezone`
3. Update dashboard/journal services to use timezone-aware queries
4. Keep backward compatibility - if no timezone provided, use defaults

### Phase 3: Frontend Updates
1. Deploy `TimezoneContext` and provider
2. Add timezone selector to settings page
3. Update all log forms to send timezone
4. Update all display components to show converted times
5. Show indicator when viewing log from different timezone

### Phase 4: User Communication
1. Announce new timezone feature
2. Guide users to settings page to set their timezone
3. Explain that existing logs are assumed to be in EST (or account default)

---

## Best Practices Applied

### 1. Use IANA Timezone Names
- ✅ Use `America/New_York` instead of `EST`
- ✅ Handles daylight saving time automatically
- ✅ Recognized standard across all libraries

### 2. Store UTC + Timezone Metadata
- ✅ Database stores UTC timestamps (no change needed)
- ✅ Add timezone metadata to know "entry context"
- ✅ Convert to user's viewing timezone on display

### 3. Luxon Library
- ✅ Modern, well-maintained
- ✅ Better API than moment.js
- ✅ Immutable date objects
- ✅ Excellent timezone support

### 4. User Control
- ✅ User chooses their timezone preference
- ✅ Can change anytime
- ✅ All views update immediately
- ✅ Form shows current timezone context

### 5. Visual Indicators
- ✅ Show when log was entered in different timezone
- ✅ Display timezone offset in settings
- ✅ Show "Logging in: America/New_York (UTC-5)" on forms

---

## Testing Strategy

### Unit Tests
```typescript
// Test timezone conversions
describe('TimezoneService', () => {
  it('should convert EST to UTC+5 correctly', () => {
    const estTime = new Date('2025-11-13T20:45:00-05:00') // 8:45 PM EST
    const result = TimezoneService.convertTimezone(
      estTime,
      'America/New_York',
      'Asia/Karachi' // UTC+5
    )
    expect(result.toFormat('h:mm a')).toBe('6:45 AM') // Next day
  })

  it('should filter logs correctly by date in user timezone', () => {
    const log = {
      timestamp: new Date('2025-11-14T01:45:00Z'), // Nov 14 01:45 UTC
      entryTimezone: 'America/New_York'
    }

    // Should appear on Nov 13 when viewing from EST
    const inRange = TimezoneService.isInDateRange(
      log.timestamp,
      log.entryTimezone,
      '2025-11-13',
      'America/New_York',
      'day'
    )
    expect(inRange).toBe(true)
  })
})
```

### Integration Tests
1. Create log in EST, view from UTC+5
2. Create log in UTC+5, view from EST
3. Change user timezone preference, verify all times update
4. Verify date filtering works across timezone changes

### Manual Testing Scenarios
1. User in EST logs feeding at 11:45 PM Nov 13
2. User travels to UTC+5 next day
3. Changes timezone preference to Asia/Karachi
4. Views Nov 13 dashboard - should see the feeding log converted to 8:45 AM Nov 14
5. Views Nov 14 dashboard - should NOT see that log

---

## Performance Considerations

### Database Queries
- Still query by UTC timestamp (indexed)
- Filter in application layer (minimal overhead)
- Consider adding compound index on `(childId, startTime)` if needed

### Caching Strategy
- Cache timezone conversions for repeated timestamps
- Memoize date range calculations
- Cache user timezone preference in context

### Bundle Size
- Luxon adds ~72KB minified
- Tree-shakeable - only import what you need
- Consider code splitting for settings page

---

## Backwards Compatibility

### For Existing Logs
- Default `entryTimezone` to `America/New_York`
- Or use account-level timezone if available
- Document this assumption clearly

### API Versioning
- `/api/v1/feeding` - new timezone-aware endpoint
- `/api/feeding` - keep for backward compatibility
- Gradually migrate mobile/WhatsApp to v1

---

## Future Enhancements

### 1. Automatic Timezone Detection
- Detect timezone from IP/browser
- Suggest timezone on first login
- Auto-update when traveling (optional)

### 2. Multi-Timezone Households
- Support different timezone per user in same account
- Show "John logged in EST, viewing in PST"
- Household default timezone setting

### 3. Timezone Change History
- Log when user changes timezone
- "Show original times" toggle
- Audit trail for medical records

### 4. Smart Timezone Suggestions
- Detect when user is logging from different timezone
- "Are you traveling? Update timezone?"
- Temporary timezone override for trip duration

---

## Conclusion

This refactor provides:
- ✅ Complete timezone support
- ✅ User-controlled timezone preferences
- ✅ Accurate cross-timezone log viewing
- ✅ Clear visual indicators
- ✅ Backward compatible migration path
- ✅ Follows industry best practices

The zombie timezone issue will be permanently resolved with users having full control over how they view their data, regardless of where they are in the world.
