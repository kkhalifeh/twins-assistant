import { PrismaClient } from '@prisma/client';
import { 
  subDays, 
  startOfDay, 
  endOfDay, 
  differenceInHours, 
  differenceInMinutes,
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isToday,
  isYesterday
} from 'date-fns';

const prisma = new PrismaClient();

export class DashboardService {
  async getDashboardData(dateStr: string, viewMode: 'day' | 'week' | 'month' = 'day', userId: string, timezoneOffset: number = 0) {
    // Get user's accountId
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { accountId: true }
    });

    if (!user?.accountId) {
      throw new Error('User not part of an account');
    }

    // Get all children IDs for users in the same account
    const children = await prisma.child.findMany({
      where: {
        user: {
          accountId: user.accountId
        }
      }
    });

    const childIds = children.map(c => c.id);

    // Parse date string (YYYY-MM-DD format)
    const [year, month, day] = dateStr.split('-').map(Number);

    // Get date range based on view mode, accounting for user's timezone
    // timezoneOffset is in minutes (e.g., -300 for EST which is UTC-5)
    // Formula: User's local time - timezoneOffset = UTC time
    // For EST (offset = -300): Local midnight - (-300 min) = UTC 05:00
    let startDate: Date;
    let endDate: Date;

    // For accurate timezone handling, we need to:
    // 1. Query a wider range (±1 day to catch logs that might fall into target date in user's timezone)
    // 2. Filter logs based on what date they fall on in user's local timezone

    switch (viewMode) {
      case 'day':
        // Query from previous day to next day to catch all possible logs
        const dayStartMs = Date.UTC(year, month - 1, day - 1, 0, 0, 0, 0);
        const dayEndMs = Date.UTC(year, month - 1, day + 1, 23, 59, 59, 999);
        startDate = new Date(dayStartMs);
        endDate = new Date(dayEndMs);
        break;
      case 'week':
        // Create a reference date for week calculation
        const refDate = new Date(Date.UTC(year, month - 1, day));
        const weekStart = startOfWeek(refDate, { weekStartsOn: 0 });
        const weekEnd = endOfWeek(refDate, { weekStartsOn: 0 });
        // Query with ±1 day buffer
        const weekStartMs = Date.UTC(weekStart.getUTCFullYear(), weekStart.getUTCMonth(), weekStart.getUTCDate() - 1, 0, 0, 0, 0);
        const weekEndMs = Date.UTC(weekEnd.getUTCFullYear(), weekEnd.getUTCMonth(), weekEnd.getUTCDate() + 1, 23, 59, 59, 999);
        startDate = new Date(weekStartMs);
        endDate = new Date(weekEndMs);
        break;
      case 'month':
        const refDate2 = new Date(Date.UTC(year, month - 1, day));
        const monthStart = startOfMonth(refDate2);
        const monthEnd = endOfMonth(refDate2);
        // Query with ±1 day buffer
        const monthStartMs = Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth(), monthStart.getUTCDate() - 1, 0, 0, 0, 0);
        const monthEndMs = Date.UTC(monthEnd.getUTCFullYear(), monthEnd.getUTCMonth(), monthEnd.getUTCDate() + 1, 23, 59, 59, 999);
        startDate = new Date(monthStartMs);
        endDate = new Date(monthEndMs);
        break;
    }

    const [allFeedingLogs, allSleepLogs, allDiaperLogs] = await Promise.all([
      prisma.feedingLog.findMany({
        where: {
          childId: { in: childIds },
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
          childId: { in: childIds },
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
          childId: { in: childIds },
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
    const isInTargetDateRange = (utcTimestamp: Date): boolean => {
      // Convert UTC timestamp to user's local time
      const localTimeMs = utcTimestamp.getTime() - (timezoneOffset * 60 * 1000);
      const localDate = new Date(localTimeMs);

      // Extract date components in user's timezone
      const localYear = localDate.getUTCFullYear();
      const localMonth = localDate.getUTCMonth() + 1;
      const localDay = localDate.getUTCDate();

      switch (viewMode) {
        case 'day':
          return localYear === year && localMonth === month && localDay === day;
        case 'week': {
          const refDate = new Date(Date.UTC(year, month - 1, day));
          const weekStart = startOfWeek(refDate, { weekStartsOn: 0 });
          const weekEnd = endOfWeek(refDate, { weekStartsOn: 0 });
          const localDateOnly = new Date(Date.UTC(localYear, localMonth - 1, localDay));
          return localDateOnly >= weekStart && localDateOnly <= weekEnd;
        }
        case 'month':
          return localYear === year && localMonth === month;
        default:
          return false;
      }
    };

    // Filter logs to only include those that fall within the target date range in user's timezone
    const feedingLogs = allFeedingLogs.filter(log => isInTargetDateRange(log.startTime));
    const sleepLogs = allSleepLogs.filter(log => isInTargetDateRange(log.startTime));
    const diaperLogs = allDiaperLogs.filter(log => isInTargetDateRange(log.timestamp));

    // Get active sleep sessions
    const activeSleepSessions = await prisma.sleepLog.findMany({
      where: {
        childId: { in: childIds },
        endTime: null
      },
      include: { child: true }
    });

    // Calculate statistics
    const stats = {
      totalFeedings: feedingLogs.length,
      totalSleepSessions: sleepLogs.length,
      totalDiaperChanges: diaperLogs.length,
      activeSleepSessions: activeSleepSessions.length,
      avgFeedingInterval: this.calculateAvgFeedingInterval(feedingLogs),
      totalSleepHours: this.calculateTotalSleepHours(sleepLogs),
      lastFeedings: await this.getLastFeedingsPerChild(children),
      lastDiaperChanges: await this.getLastDiaperChangesPerChild(children)
    };

    // Generate real-time insights
    const dateForInsights = new Date(Date.UTC(year, month - 1, day));
    const insights = await this.generateRealTimeInsights(
      children,
      feedingLogs,
      sleepLogs,
      diaperLogs,
      activeSleepSessions,
      dateForInsights,
      viewMode
    );

    return {
      date: dateStr,
      viewMode,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      children,
      stats,
      insights,
      activeSleepSessions,
      recentActivities: this.getRecentActivities(feedingLogs, sleepLogs, diaperLogs).slice(0, 10)
    };
  }

  private calculateAvgFeedingInterval(feedingLogs: any[]): number {
    if (feedingLogs.length < 2) return 0;
    
    const intervals: number[] = [];
    for (let i = 1; i < feedingLogs.length; i++) {
      const interval = differenceInHours(
        feedingLogs[i - 1].startTime,
        feedingLogs[i].startTime
      );
      if (interval > 0 && interval < 12) { // Filter out unrealistic intervals
        intervals.push(interval);
      }
    }
    
    return intervals.length > 0 
      ? Math.round((intervals.reduce((a, b) => a + b, 0) / intervals.length) * 10) / 10
      : 0;
  }

  private calculateTotalSleepHours(sleepLogs: any[]): number {
    const totalMinutes = sleepLogs.reduce((sum, log) => {
      return sum + (log.duration || 0);
    }, 0);
    return Math.round((totalMinutes / 60) * 10) / 10;
  }

  private async getLastFeedingsPerChild(children: any[]) {
    const lastFeedings: Record<string, any> = {};

    for (const child of children) {
      const lastFeeding = await prisma.feedingLog.findFirst({
        where: {
          childId: child.id
        },
        orderBy: { startTime: 'desc' }
      });
      lastFeedings[child.id] = lastFeeding;
    }

    return lastFeedings;
  }

  private async getLastDiaperChangesPerChild(children: any[]) {
    const lastChanges: Record<string, any> = {};

    for (const child of children) {
      const lastChange = await prisma.diaperLog.findFirst({
        where: {
          childId: child.id
        },
        orderBy: { timestamp: 'desc' }
      });
      lastChanges[child.id] = lastChange;
    }

    return lastChanges;
  }

  private async generateRealTimeInsights(
    children: any[],
    feedingLogs: any[],
    sleepLogs: any[],
    diaperLogs: any[],
    activeSleepSessions: any[],
    date: Date,
    viewMode: string
  ): Promise<any[]> {
    const insights: any[] = [];
    const now = new Date();

    // Check if viewing today's data
    const isCurrentPeriod = viewMode === 'day' ? isToday(date) : 
                           viewMode === 'week' ? (now >= startOfWeek(date) && now <= endOfWeek(date)) :
                           (now >= startOfMonth(date) && now <= endOfMonth(date));

    for (const child of children) {
      const childFeedings = feedingLogs.filter(f => f.childId === child.id);
      const childSleepLogs = sleepLogs.filter(s => s.childId === child.id);
      const childDiapers = diaperLogs.filter(d => d.childId === child.id);

      // Feeding insights
      if (childFeedings.length > 0 && isCurrentPeriod) {
        const lastFeeding = childFeedings[0];
        const hoursSinceLastFeeding = differenceInHours(now, lastFeeding.startTime);
        
        if (hoursSinceLastFeeding >= 3 && hoursSinceLastFeeding < 5) {
          insights.push({
            type: 'feeding_due',
            priority: 'medium',
            childName: child.name,
            title: `${child.name} might be due for feeding soon`,
            description: `Last fed ${hoursSinceLastFeeding} hours ago`,
            icon: 'clock',
            color: 'amber'
          });
        } else if (hoursSinceLastFeeding >= 5) {
          insights.push({
            type: 'feeding_overdue',
            priority: 'high',
            childName: child.name,
            title: `${child.name} is overdue for feeding`,
            description: `Last fed ${hoursSinceLastFeeding} hours ago`,
            icon: 'alert',
            color: 'red'
          });
        }
      }

      // Sleep pattern insights
      if (childSleepLogs.length > 0) {
        const totalSleepToday = childSleepLogs.reduce((sum, log) => sum + (log.duration || 0), 0);
        
        // Compare with yesterday if viewing today
        if (isToday(date)) {
          const yesterdayStart = startOfDay(subDays(now, 1));
          const yesterdayEnd = endOfDay(subDays(now, 1));
          
          const yesterdaySleepLogs = await prisma.sleepLog.findMany({
            where: {
              childId: child.id,
              startTime: {
                gte: yesterdayStart,
                lte: yesterdayEnd
              }
            }
          });
          
          const totalSleepYesterday = yesterdaySleepLogs.reduce((sum, log) => sum + (log.duration || 0), 0);
          const sleepDifference = (totalSleepToday - totalSleepYesterday) / 60;
          
          if (Math.abs(sleepDifference) > 1) {
            insights.push({
              type: 'sleep_comparison',
              priority: 'low',
              childName: child.name,
              title: `${child.name} slept ${Math.abs(Math.round(sleepDifference))} hours ${sleepDifference > 0 ? 'more' : 'less'} than yesterday`,
              description: sleepDifference > 0 ? 'Great improvement in sleep patterns' : 'Consider adjusting bedtime routine',
              icon: sleepDifference > 0 ? 'trending-up' : 'trending-down',
              color: sleepDifference > 0 ? 'green' : 'amber'
            });
          }
        }
        
        // Check for long wake windows
        if (activeSleepSessions.every(s => s.childId !== child.id)) {
          const lastSleep = await prisma.sleepLog.findFirst({
            where: { 
              childId: child.id,
              endTime: { not: null }
            },
            orderBy: { endTime: 'desc' }
          });
          
          if (lastSleep && lastSleep.endTime) {
            const hoursSinceWake = differenceInHours(now, lastSleep.endTime);
            if (hoursSinceWake > 3 && hoursSinceWake < 5) {
              insights.push({
                type: 'nap_due',
                priority: 'low',
                childName: child.name,
                title: `${child.name} may need a nap soon`,
                description: `Has been awake for ${hoursSinceWake} hours`,
                icon: 'moon',
                color: 'purple'
              });
            }
          }
        }
      }

      // Diaper insights
      if (childDiapers.length > 0 && isCurrentPeriod) {
        const lastDiaper = childDiapers[0];
        const hoursSinceChange = differenceInHours(now, lastDiaper.timestamp);
        
        if (hoursSinceChange >= 3) {
          insights.push({
            type: 'diaper_check',
            priority: 'low',
            childName: child.name,
            title: `Check ${child.name}'s diaper`,
            description: `Last changed ${hoursSinceChange} hours ago`,
            icon: 'baby',
            color: 'blue'
          });
        }
      }
    }

    // Children synchronization insights (only for multiple children)
    if (children.length >= 2 && feedingLogs.length >= 2) {
      const child1Feedings = feedingLogs.filter(f => f.childId === children[0].id);
      const child2Feedings = feedingLogs.filter(f => f.childId === children[1].id);

      if (child1Feedings.length > 0 && child2Feedings.length > 0) {
        const timeDiff = Math.abs(differenceInMinutes(
          child1Feedings[0].startTime,
          child2Feedings[0].startTime
        ));

        if (timeDiff < 30) {
          insights.push({
            type: 'sync_good',
            priority: 'info',
            title: 'Children are well synchronized',
            description: `${children[0].name} and ${children[1].name} fed within 30 minutes of each other`,
            icon: 'check-circle',
            color: 'green'
          });
        } else if (timeDiff > 60 && timeDiff < 120) {
          insights.push({
            type: 'sync_opportunity',
            priority: 'info',
            title: 'Synchronization opportunity',
            description: 'Consider aligning feeding times for easier management',
            icon: 'clock',
            color: 'blue'
          });
        }
      }
    }

    // Sort insights by priority
    const priorityOrder = { high: 0, medium: 1, low: 2, info: 3 };
    insights.sort((a, b) => 
      (priorityOrder[a.priority as keyof typeof priorityOrder] || 3) - 
      (priorityOrder[b.priority as keyof typeof priorityOrder] || 3)
    );

    return insights.slice(0, 5); // Return top 5 insights
  }

  private getRecentActivities(feedingLogs: any[], sleepLogs: any[], diaperLogs: any[]) {
    const activities = [
      ...feedingLogs.map(log => ({
        type: 'feeding',
        childName: log.child.name,
        description: `${log.amount}ml ${log.type.toLowerCase()}`,
        timestamp: log.startTime,
        userName: log.user?.name,
        icon: 'bottle',
        color: 'blue'
      })),
      ...sleepLogs.map(log => ({
        type: 'sleep',
        childName: log.child.name,
        description: log.endTime ?
          `${log.type} - ${log.duration}min` :
          `Started ${log.type.toLowerCase()}`,
        timestamp: log.startTime,
        userName: log.user?.name,
        icon: log.type === 'NAP' ? 'sun' : 'moon',
        color: 'purple'
      })),
      ...diaperLogs.map(log => ({
        type: 'diaper',
        childName: log.child.name,
        description: log.type.toLowerCase(),
        timestamp: log.timestamp,
        userName: log.user?.name,
        icon: 'baby',
        color: 'green'
      }))
    ];

    // Sort by timestamp
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    return activities;
  }
}

export const dashboardService = new DashboardService();
