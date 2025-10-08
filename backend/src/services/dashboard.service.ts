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
  async getDashboardData(date: Date, viewMode: 'day' | 'week' | 'month' = 'day', userId: string) {
    // Get date range based on view mode
    let startDate: Date;
    let endDate: Date;
    
    switch (viewMode) {
      case 'day':
        startDate = startOfDay(date);
        endDate = endOfDay(date);
        break;
      case 'week':
        startDate = startOfWeek(date, { weekStartsOn: 0 });
        endDate = endOfWeek(date, { weekStartsOn: 0 });
        break;
      case 'month':
        startDate = startOfMonth(date);
        endDate = endOfMonth(date);
        break;
    }

    const [children, feedingLogs, sleepLogs, diaperLogs] = await Promise.all([
      prisma.child.findMany({
        where: { userId }
      }),
      prisma.feedingLog.findMany({
        where: {
          userId,
          startTime: {
            gte: startDate,
            lte: endDate
          }
        },
        include: { child: true },
        orderBy: { startTime: 'desc' }
      }),
      prisma.sleepLog.findMany({
        where: {
          userId,
          startTime: {
            gte: startDate,
            lte: endDate
          }
        },
        include: { child: true },
        orderBy: { startTime: 'desc' }
      }),
      prisma.diaperLog.findMany({
        where: {
          userId,
          timestamp: {
            gte: startDate,
            lte: endDate
          }
        },
        include: { child: true },
        orderBy: { timestamp: 'desc' }
      })
    ]);

    // Get active sleep sessions
    const activeSleepSessions = await prisma.sleepLog.findMany({
      where: {
        userId,
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
      lastFeedings: await this.getLastFeedingsPerChild(userId),
      lastDiaperChanges: await this.getLastDiaperChangesPerChild(userId)
    };

    // Generate real-time insights
    const insights = await this.generateRealTimeInsights(
      children,
      feedingLogs,
      sleepLogs,
      diaperLogs,
      activeSleepSessions,
      date,
      viewMode
    );

    return {
      date: date.toISOString(),
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

  private async getLastFeedingsPerChild(userId: string) {
    const children = await prisma.child.findMany({
      where: { userId }
    });
    const lastFeedings: Record<string, any> = {};

    for (const child of children) {
      const lastFeeding = await prisma.feedingLog.findFirst({
        where: {
          childId: child.id,
          userId
        },
        orderBy: { startTime: 'desc' }
      });
      lastFeedings[child.id] = lastFeeding;
    }

    return lastFeedings;
  }

  private async getLastDiaperChangesPerChild(userId: string) {
    const children = await prisma.child.findMany({
      where: { userId }
    });
    const lastChanges: Record<string, any> = {};

    for (const child of children) {
      const lastChange = await prisma.diaperLog.findFirst({
        where: {
          childId: child.id,
          userId
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

    // Twin synchronization insights
    if (children.length === 2 && feedingLogs.length >= 2) {
      const twin1Feedings = feedingLogs.filter(f => f.childId === children[0].id);
      const twin2Feedings = feedingLogs.filter(f => f.childId === children[1].id);
      
      if (twin1Feedings.length > 0 && twin2Feedings.length > 0) {
        const timeDiff = Math.abs(differenceInMinutes(
          twin1Feedings[0].startTime,
          twin2Feedings[0].startTime
        ));
        
        if (timeDiff < 30) {
          insights.push({
            type: 'sync_good',
            priority: 'info',
            title: 'Twins are well synchronized',
            description: 'Both fed within 30 minutes of each other',
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
        icon: log.type === 'NAP' ? 'sun' : 'moon',
        color: 'purple'
      })),
      ...diaperLogs.map(log => ({
        type: 'diaper',
        childName: log.child.name,
        description: log.type.toLowerCase(),
        timestamp: log.timestamp,
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
