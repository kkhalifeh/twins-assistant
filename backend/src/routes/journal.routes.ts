import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../utils/auth';
import { prisma } from '../index';
import { startOfDay, endOfDay } from 'date-fns';

const router = Router();

router.use(authMiddleware);

// Get daily journal data
router.get('/daily', async (req: AuthRequest, res: Response) => {
  try {
    const { date, childId } = req.query;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Parse date string (YYYY-MM-DD format) to avoid timezone issues
    let targetDate: Date;
    if (date) {
      // Create date in UTC to avoid timezone conversion issues
      const [year, month, day] = (date as string).split('-').map(Number);
      targetDate = new Date(Date.UTC(year, month - 1, day));
    } else {
      targetDate = new Date();
    }

    const startDate = startOfDay(targetDate);
    const endDate = endOfDay(targetDate);

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

    // Fetch all activities for the day
    const [feedingLogs, sleepLogs, diaperLogs, healthLogs] = await Promise.all([
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