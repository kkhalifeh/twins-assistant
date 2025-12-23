import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../utils/auth';
import { prisma } from '../index';
import { startOfDay, endOfDay, format } from 'date-fns';
import { TimezoneService } from '../utils/timezone';

const router = Router();

router.use(authMiddleware);

// Get daily journal data
router.get('/daily', async (req: AuthRequest, res: Response) => {
  try {
    const { date, childId, timezone } = req.query;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get user's accountId and timezone preference
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { accountId: true, timezone: true }
    });

    if (!user?.accountId) {
      return res.status(400).json({ error: 'User not part of an account' });
    }

    // Use provided timezone or fall back to user's timezone preference
    const viewTimezone = (timezone as string) || user.timezone || 'America/New_York';

    // Get date string (default to today in user's timezone)
    const dateStr = (date && typeof date === 'string') ? date : format(new Date(), 'yyyy-MM-dd');

    // Use TimezoneService to get proper date range
    const { startDate, endDate } = TimezoneService.getDateRangeInTimezone(
      dateStr,
      viewTimezone,
      'day'
    );

    const [year, month, day] = dateStr.split('-').map(Number);

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
      // Even with no children, we can still show pumping stats for the user
      const users = await prisma.user.findMany({
        where: { accountId: user.accountId },
        select: { id: true }
      });
      const userIds = users.map(u => u.id);

      const pumpingLogs = await prisma.pumpingLog.findMany({
        where: {
          userId: { in: userIds },
          startTime: {
            gte: startDate,
            lte: endDate
          }
        }
      });

      const totalPumpedVolume = pumpingLogs.reduce((sum, log) => sum + (log.amount || 0), 0);

      return res.json({
        date: dateStr,
        timezone: viewTimezone,
        activities: [],
        stats: {
          totalFeedings: 0,
          totalSleepHours: 0,
          totalDiaperChanges: 0,
          healthChecks: 0,
          totalPumpingSessions: pumpingLogs.length,
          totalPumpedVolume
        }
      });
    }

    // Build where clause
    const whereClause: any = { childId: { in: childIds } };
    if (childId && childId !== 'all') {
      whereClause.childId = childId as string;
    }

    // Get all users in account for pumping logs
    const users = await prisma.user.findMany({
      where: { accountId: user.accountId },
      select: { id: true }
    });
    const userIds = users.map(u => u.id);

    // Fetch all activities for the day (with ±1 day buffer)
    const [allFeedingLogs, allSleepLogs, allDiaperLogs, allHealthLogs, allPumpingLogs, allHygieneLogs] = await Promise.all([
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
      }),
      prisma.pumpingLog.findMany({
        where: {
          userId: { in: userIds },
          startTime: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          user: {
            select: { name: true, email: true }
          }
        },
        orderBy: { startTime: 'desc' }
      }),
      prisma.hygieneLog.findMany({
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

    // Filter logs using TimezoneService
    const feedingLogs = allFeedingLogs.filter(log =>
      TimezoneService.isInDateRange(
        log.startTime,
        log.entryTimezone || viewTimezone,
        dateStr,
        viewTimezone,
        'day'
      )
    );

    const sleepLogs = allSleepLogs.filter(log =>
      TimezoneService.isInDateRange(
        log.startTime,
        log.entryTimezone || viewTimezone,
        dateStr,
        viewTimezone,
        'day'
      )
    );

    const diaperLogs = allDiaperLogs.filter(log =>
      TimezoneService.isInDateRange(
        log.timestamp,
        log.entryTimezone || viewTimezone,
        dateStr,
        viewTimezone,
        'day'
      )
    );

    const healthLogs = allHealthLogs.filter(log =>
      TimezoneService.isInDateRange(
        log.timestamp,
        log.entryTimezone || viewTimezone,
        dateStr,
        viewTimezone,
        'day'
      )
    );

    const pumpingLogs = allPumpingLogs.filter(log =>
      TimezoneService.isInDateRange(
        log.startTime,
        log.entryTimezone || viewTimezone,
        dateStr,
        viewTimezone,
        'day'
      )
    );

    const hygieneLogs = allHygieneLogs.filter(log =>
      TimezoneService.isInDateRange(
        log.timestamp,
        log.entryTimezone || viewTimezone,
        dateStr,
        viewTimezone,
        'day'
      )
    );

    // Convert to activity format
    const activities = [
      ...feedingLogs.map(log => ({
        type: 'feeding',
        childName: log.child.name,
        description: log.amount
          ? `${log.amount}ml ${log.type?.toLowerCase() || 'feeding'}`
          : log.duration
            ? `${log.type?.toLowerCase() || 'feeding'} - ${log.duration} min`
            : (log.type?.toLowerCase() || 'feeding'),
        timestamp: log.startTime,
        entryTimezone: log.entryTimezone,
        displayTime: TimezoneService.formatInTimezone(
          log.startTime,
          log.entryTimezone || viewTimezone,
          viewTimezone
        ),
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
        entryTimezone: log.entryTimezone,
        displayTime: TimezoneService.formatInTimezone(
          log.startTime,
          log.entryTimezone || viewTimezone,
          viewTimezone
        ),
        userName: log.user?.name,
        notes: log.notes,
        duration: log.duration ? `${log.duration}min` : null
      })),
      ...diaperLogs.map(log => ({
        type: 'diaper',
        childName: log.child.name,
        description: log.type?.toLowerCase() || 'diaper change',
        timestamp: log.timestamp,
        entryTimezone: log.entryTimezone,
        displayTime: TimezoneService.formatInTimezone(
          log.timestamp,
          log.entryTimezone || viewTimezone,
          viewTimezone
        ),
        userName: log.user?.name,
        notes: log.notes,
        duration: null
      })),
      ...healthLogs.map(log => ({
        type: 'health',
        childName: log.child.name,
        description: `${log.type?.toLowerCase() || 'health check'}: ${log.value}${log.unit ? log.unit : ''}`,
        timestamp: log.timestamp,
        entryTimezone: log.entryTimezone,
        displayTime: TimezoneService.formatInTimezone(
          log.timestamp,
          log.entryTimezone || viewTimezone,
          viewTimezone
        ),
        userName: log.user?.name,
        notes: log.notes,
        duration: null
      })),
      ...pumpingLogs.map(log => ({
        type: 'pumping',
        childName: null,
        description: `Pumped ${log.amount}ml in ${log.duration} min`,
        timestamp: log.startTime,
        entryTimezone: log.entryTimezone,
        displayTime: TimezoneService.formatInTimezone(
          log.startTime,
          log.entryTimezone || viewTimezone,
          viewTimezone
        ),
        userName: log.user?.name,
        notes: log.notes,
        duration: `${log.duration}min`
      })),
      ...hygieneLogs.map(log => {
        let description = '';

        switch (log.type) {
          case 'BATH':
            description = 'Bath';
            break;
          case 'NAIL_TRIMMING':
            description = 'Nail trimming';
            break;
          case 'ORAL_CARE':
            description = 'Oral care';
            break;
          default:
            description = 'hygiene';
        }

        return {
          type: 'hygiene',
          childName: log.child.name,
          description,
          timestamp: log.timestamp,
          entryTimezone: log.entryTimezone,
          displayTime: TimezoneService.formatInTimezone(
            log.timestamp,
            log.entryTimezone || viewTimezone,
            viewTimezone
          ),
          userName: log.user?.name,
          notes: log.notes,
          duration: null
        };
      })
    ];

    // Sort by timestamp (most recent first)
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Calculate pumping stats
    const totalPumpedVolume = pumpingLogs.reduce((sum, log) => sum + (log.amount || 0), 0);

    // Calculate stats
    const stats = {
      totalFeedings: feedingLogs.length,
      totalSleepHours: Math.round((sleepLogs.reduce((sum, log) => sum + (log.duration || 0), 0) / 60) * 10) / 10,
      totalDiaperChanges: diaperLogs.length,
      healthChecks: healthLogs.length,
      totalPumpingSessions: pumpingLogs.length,
      totalPumpedVolume,
      totalHygieneLogs: hygieneLogs.length
    };

    res.json({
      date: dateStr,
      timezone: viewTimezone,
      activities,
      stats
    });
  } catch (error) {
    console.error('Error fetching journal data:', error);
    res.status(500).json({ error: 'Failed to fetch journal data' });
  }
});

export default router;