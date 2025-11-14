import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../utils/auth';
import { prisma } from '../index';
import { startOfDay, endOfDay } from 'date-fns';

const router = Router();

router.use(authMiddleware);

// Get daily journal data
router.get('/daily', async (req: AuthRequest, res: Response) => {
  try {
    const { date, childId, timezoneOffset } = req.query;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Parse date string (YYYY-MM-DD format) accounting for user's timezone
    // timezoneOffset is in minutes (e.g., -300 for EST which is UTC-5)
    // Negative offset means timezone is behind UTC (e.g., EST = UTC-5 = -300)
    const tzOffset = timezoneOffset ? parseInt(timezoneOffset as string) : 0;
    let startDate: Date;
    let endDate: Date;

    let year: number, month: number, day: number;

    if (date) {
      // Parse date as YYYY-MM-DD
      [year, month, day] = (date as string).split('-').map(Number);
    } else {
      // For "today", use current date in user's timezone
      const now = new Date();
      year = now.getUTCFullYear();
      month = now.getUTCMonth() + 1;
      day = now.getUTCDate();
    }

    // Query from previous day to next day to catch all possible logs
    // Then filter based on what date they fall on in user's local timezone
    const startMs = Date.UTC(year, month - 1, day - 1, 0, 0, 0, 0);
    const endMs = Date.UTC(year, month - 1, day + 1, 23, 59, 59, 999);
    startDate = new Date(startMs);
    endDate = new Date(endMs);

    const targetDate = startDate;

    // Get user's accountId
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { accountId: true }
    });

    if (!user?.accountId) {
      return res.status(400).json({ error: 'User not part of an account' });
    }

    // Get all children IDs for users in the same account
    const children = await prisma.child.findMany({
      where: {
        user: {
          accountId: user.accountId
        }
      },
      select: { id: true }
    });

    const childIds = children.map(c => c.id);

    if (childIds.length === 0) {
      return res.json({
        date: targetDate.toISOString(),
        activities: [],
        stats: {
          totalFeedings: 0,
          totalSleepHours: 0,
          totalDiaperChanges: 0,
          healthChecks: 0
        }
      });
    }

    // Build where clause
    const whereClause: any = { childId: { in: childIds } };
    if (childId && childId !== 'all') {
      whereClause.childId = childId as string;
    }

    // Fetch all activities for the day (with ±1 day buffer)
    const [allFeedingLogs, allSleepLogs, allDiaperLogs, allHealthLogs] = await Promise.all([
      prisma.feedingLog.findMany({
        where: {
          ...whereClause,
          startTime: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          child: true,
          user: {
            select: { name: true, email: true }
          }
        },
        orderBy: { startTime: 'desc' }
      }),
      prisma.sleepLog.findMany({
        where: {
          ...whereClause,
          startTime: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          child: true,
          user: {
            select: { name: true, email: true }
          }
        },
        orderBy: { startTime: 'desc' }
      }),
      prisma.diaperLog.findMany({
        where: {
          ...whereClause,
          timestamp: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          child: true,
          user: {
            select: { name: true, email: true }
          }
        },
        orderBy: { timestamp: 'desc' }
      }),
      prisma.healthLog.findMany({
        where: {
          ...whereClause,
          timestamp: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          child: true,
          user: {
            select: { name: true, email: true }
          }
        },
        orderBy: { timestamp: 'desc' }
      })
    ]);

    // Helper function to check if a UTC timestamp falls on the target date in user's local timezone
    const isInTargetDate = (utcTimestamp: Date): boolean => {
      // Convert UTC timestamp to user's local time
      const localTimeMs = utcTimestamp.getTime() - (tzOffset * 60 * 1000);
      const localDate = new Date(localTimeMs);

      // Extract date components in user's timezone
      const localYear = localDate.getUTCFullYear();
      const localMonth = localDate.getUTCMonth() + 1;
      const localDay = localDate.getUTCDate();

      return localYear === year && localMonth === month && localDay === day;
    };

    // Filter logs to only include those that fall on the target date in user's timezone
    const feedingLogs = allFeedingLogs.filter(log => isInTargetDate(log.startTime));
    const sleepLogs = allSleepLogs.filter(log => isInTargetDate(log.startTime));
    const diaperLogs = allDiaperLogs.filter(log => isInTargetDate(log.timestamp));
    const healthLogs = allHealthLogs.filter(log => isInTargetDate(log.timestamp));

    // Convert to activity format
    const activities = [
      ...feedingLogs.map(log => ({
        type: 'feeding',
        childName: log.child.name,
        description: `${log.amount || 0}ml ${log.type?.toLowerCase() || 'feeding'}`,
        timestamp: log.startTime,
        userName: log.user?.name,
        notes: log.notes,
        duration: log.duration ? `${log.duration}min` : null
      })),
      ...sleepLogs.map(log => ({
        type: 'sleep',
        childName: log.child.name,
        description: log.endTime ?
          `${log.type?.toLowerCase() || 'sleep'} - ${log.duration || 0}min` :
          `Started ${log.type?.toLowerCase() || 'sleep'}`,
        timestamp: log.startTime,
        userName: log.user?.name,
        notes: log.notes,
        duration: log.duration ? `${log.duration}min` : null
      })),
      ...diaperLogs.map(log => ({
        type: 'diaper',
        childName: log.child.name,
        description: log.type?.toLowerCase() || 'diaper change',
        timestamp: log.timestamp,
        userName: log.user?.name,
        notes: log.notes,
        duration: null
      })),
      ...healthLogs.map(log => ({
        type: 'health',
        childName: log.child.name,
        description: `${log.type?.toLowerCase() || 'health check'}: ${log.value}${log.unit ? log.unit : ''}`,
        timestamp: log.timestamp,
        userName: log.user?.name,
        notes: log.notes,
        duration: null
      }))
    ];

    // Sort by timestamp (most recent first)
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Calculate stats
    const stats = {
      totalFeedings: feedingLogs.length,
      totalSleepHours: Math.round((sleepLogs.reduce((sum, log) => sum + (log.duration || 0), 0) / 60) * 10) / 10,
      totalDiaperChanges: diaperLogs.length,
      healthChecks: healthLogs.length
    };

    res.json({
      date: targetDate.toISOString(),
      activities,
      stats
    });
  } catch (error) {
    console.error('Error fetching journal data:', error);
    res.status(500).json({ error: 'Failed to fetch journal data' });
  }
});

export default router;