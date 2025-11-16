import { PrismaClient } from '@prisma/client';
import { subDays, differenceInHours, differenceInMinutes, format, startOfDay, endOfDay } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

const prisma = new PrismaClient();

export class AnalyticsService {
  // Helper method to verify child belongs to user's account and get account's child IDs
  private async getAccountChildIds(userId: string): Promise<string[]> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { accountId: true }
    });

    if (!user?.accountId) {
      throw new Error('User not part of an account');
    }

    const children = await prisma.child.findMany({
      where: {
        user: {
          accountId: user.accountId
        }
      },
      select: { id: true }
    });

    return children.map(c => c.id);
  }

  // Helper method to verify a specific child belongs to user's account
  private async verifyChildAccess(childId: string, userId: string): Promise<void> {
    const childIds = await this.getAccountChildIds(userId);
    if (!childIds.includes(childId)) {
      throw new Error('Child not found or access denied');
    }
  }

  // Helper method to get user's timezone
  private async getUserTimezone(userId: string): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true }
    });
    return user?.timezone || 'America/New_York';
  }

  // Analyze feeding patterns
  async analyzeFeedingPatterns(childId: string, days: number = 7, userId: string) {
    await this.verifyChildAccess(childId, userId);
    const since = subDays(new Date(), days);

    const feedingLogs = await prisma.feedingLog.findMany({
      where: {
        childId,
        startTime: { gte: since }
      },
      orderBy: { startTime: 'asc' }
    });

    if (feedingLogs.length < 2) return null;

    // Calculate intervals between feedings
    const intervals: number[] = [];
    for (let i = 1; i < feedingLogs.length; i++) {
      const interval = differenceInHours(
        feedingLogs[i].startTime,
        feedingLogs[i - 1].startTime
      );
      intervals.push(interval);
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

    // Calculate average amount ONLY for bottle/formula (measured amounts)
    // For breast: calculate average duration separately - don't estimate volume
    const bottleFeedings = feedingLogs.filter(log => log.type === 'BOTTLE' || log.type === 'FORMULA');
    const breastFeedings = feedingLogs.filter(log => log.type === 'BREAST');

    // Calculate average for bottle/formula feedings (actual measured amounts)
    let totalBottleAmount = 0;
    let bottleCount = 0;
    bottleFeedings.forEach(log => {
      if (log.amount && log.amount > 0) {
        totalBottleAmount += log.amount;
        bottleCount++;
      }
    });

    const avgBottleAmount = bottleCount > 0 ? Math.round(totalBottleAmount / bottleCount) : 0;

    // Calculate average duration for breastfeedings
    let totalBreastDuration = 0;
    let breastCount = 0;
    breastFeedings.forEach(log => {
      if (log.duration && log.duration > 0) {
        totalBreastDuration += log.duration;
        breastCount++;
      }
    });

    const avgBreastDuration = breastCount > 0 ? Math.round(totalBreastDuration / breastCount) : 0;

    // Detect trending patterns
    const recentInterval = intervals.slice(-5).reduce((a, b) => a + b, 0) / Math.min(5, intervals.slice(-5).length);
    const trend = recentInterval > avgInterval ? 'increasing' : recentInterval < avgInterval ? 'decreasing' : 'stable';

    return {
      averageInterval: avgInterval.toFixed(1),
      averageBottleAmount: avgBottleAmount, // Only bottle/formula (measured)
      averageBreastDuration: avgBreastDuration, // Breast duration in minutes
      totalFeedings: feedingLogs.length,
      breastCount: breastFeedings.length,
      bottleCount: bottleFeedings.length,
      trend,
      lastFeeding: feedingLogs[feedingLogs.length - 1],
      nextFeedingEstimate: new Date(feedingLogs[feedingLogs.length - 1].startTime.getTime() + avgInterval * 60 * 60 * 1000)
    };
  }

  // Analyze sleep patterns
  async analyzeSleepPatterns(childId: string, days: number = 7, userId: string) {
    await this.verifyChildAccess(childId, userId);
    const since = subDays(new Date(), days);

    const sleepLogs = await prisma.sleepLog.findMany({
      where: {
        childId,
        startTime: { gte: since },
        endTime: { not: null }
      },
      include: {
        child: { select: { name: true } }
      }
    });

    if (sleepLogs.length === 0) {
      return null;
    }

    const napLogs = sleepLogs.filter(log => log.type === 'NAP');
    const nightLogs = sleepLogs.filter(log => log.type === 'NIGHT');

    // Group by day to calculate actual days with data
    const sleepByDay = new Map<string, number>();
    sleepLogs.forEach(log => {
      const dayKey = format(log.startTime, 'yyyy-MM-dd');
      const currentTotal = sleepByDay.get(dayKey) || 0;
      sleepByDay.set(dayKey, currentTotal + (log.duration || 0));
    });

    const daysWithData = sleepByDay.size;
    const totalSleepMinutes = sleepLogs.reduce((sum, log) => sum + (log.duration || 0), 0);
    const avgSleepPerDay = daysWithData > 0 ? totalSleepMinutes / daysWithData : 0;

    console.log(`[Sleep Analysis] ${sleepLogs[0]?.child?.name || 'Child'}:`, {
      totalLogs: sleepLogs.length,
      napLogs: napLogs.length,
      nightLogs: nightLogs.length,
      totalSleepMinutes,
      daysWithData,
      avgSleepPerDay,
      avgSleepHours: (avgSleepPerDay / 60).toFixed(1)
    });
    
    const avgNapDuration = napLogs.length > 0 
      ? napLogs.reduce((sum, log) => sum + (log.duration || 0), 0) / napLogs.length
      : 0;

    const avgNightDuration = nightLogs.length > 0
      ? nightLogs.reduce((sum, log) => sum + (log.duration || 0), 0) / nightLogs.length
      : 0;

    // Find most common wake time
    const wakeTimes = nightLogs
      .filter(log => log.endTime)
      .map(log => log.endTime!.getHours());
    
    const mostCommonWakeHour = wakeTimes.length > 0
      ? wakeTimes.sort((a, b) =>
          wakeTimes.filter(v => v === a).length - wakeTimes.filter(v => v === b).length
        ).pop()
      : null;

    return {
      totalSleepHours: (avgSleepPerDay / 60).toFixed(1),
      averageNapDuration: avgNapDuration,
      averageNightDuration: avgNightDuration,
      totalNaps: napLogs.length,
      totalNightSleeps: nightLogs.length,
      daysWithData: daysWithData,
      typicalWakeTime: mostCommonWakeHour ? `${mostCommonWakeHour}:00` : 'Variable',
      sleepQuality: this.calculateSleepQuality(sleepLogs)
    };
  }

  // Analyze diaper patterns
  async analyzeDiaperPatterns(childId: string, days: number = 7, userId: string) {
    await this.verifyChildAccess(childId, userId);
    const since = subDays(new Date(), days);

    const diaperLogs = await prisma.diaperLog.findMany({
      where: {
        childId,
        timestamp: { gte: since }
      },
      orderBy: { timestamp: 'asc' }
    });

    if (diaperLogs.length === 0) {
      return null;
    }

    // Group by day to count actual days with data
    const diapersByDay = new Map<string, any[]>();
    diaperLogs.forEach(log => {
      const dayKey = format(log.timestamp, 'yyyy-MM-dd');
      const currentLogs = diapersByDay.get(dayKey) || [];
      currentLogs.push(log);
      diapersByDay.set(dayKey, currentLogs);
    });

    const daysWithData = diapersByDay.size;

    // Count by type
    const wetCount = diaperLogs.filter(log => log.type === 'WET').length;
    const dirtyCount = diaperLogs.filter(log => log.type === 'DIRTY').length;
    const mixedCount = diaperLogs.filter(log => log.type === 'MIXED').length;

    // Calculate average changes per day
    const avgChangesPerDay = daysWithData > 0 ? (diaperLogs.length / daysWithData).toFixed(1) : '0';

    // Calculate intervals between changes
    const intervals: number[] = [];
    for (let i = 1; i < diaperLogs.length; i++) {
      const interval = differenceInHours(
        diaperLogs[i].timestamp,
        diaperLogs[i - 1].timestamp
      );
      if (interval > 0 && interval < 12) { // Filter out unrealistic intervals
        intervals.push(interval);
      }
    }

    const avgInterval = intervals.length > 0
      ? (intervals.reduce((a, b) => a + b, 0) / intervals.length).toFixed(1)
      : '0';

    return {
      totalChanges: diaperLogs.length,
      daysWithData,
      avgChangesPerDay,
      avgInterval,
      wetCount,
      dirtyCount,
      mixedCount,
      lastChange: diaperLogs[diaperLogs.length - 1]
    };
  }

  // Analyze pumping patterns for mom
  async analyzePumpingPatterns(days: number = 7, userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { accountId: true }
    });

    if (!user?.accountId) {
      return null;
    }

    const since = subDays(new Date(), days);

    // Get all users in account (to get all pumping logs)
    const users = await prisma.user.findMany({
      where: { accountId: user.accountId },
      select: { id: true }
    });

    const userIds = users.map(u => u.id);

    const pumpingLogs = await prisma.pumpingLog.findMany({
      where: {
        userId: { in: userIds },
        timestamp: { gte: since }
      },
      orderBy: { timestamp: 'asc' }
    });

    if (pumpingLogs.length === 0) return null;

    // Group by day to count actual days with data
    const pumpingByDay = new Map<string, any[]>();
    pumpingLogs.forEach(log => {
      const dayKey = format(log.timestamp, 'yyyy-MM-dd');
      const currentLogs = pumpingByDay.get(dayKey) || [];
      currentLogs.push(log);
      pumpingByDay.set(dayKey, currentLogs);
    });

    const daysWithData = pumpingByDay.size;

    // Calculate totals and averages
    const totalVolume = pumpingLogs.reduce((sum, log) => sum + (log.amount || 0), 0);
    const totalDuration = pumpingLogs.reduce((sum, log) => sum + (log.duration || 0), 0);
    const totalSessions = pumpingLogs.length;
    const avgVolume = totalSessions > 0 ? Math.round(totalVolume / totalSessions) : 0;
    const avgDuration = totalSessions > 0 ? Math.round(totalDuration / totalSessions) : 0;
    const avgSessionsPerDay = daysWithData > 0 ? (totalSessions / daysWithData).toFixed(1) : '0';
    const avgVolumePerDay = daysWithData > 0 ? Math.round(totalVolume / daysWithData) : 0;

    // Analyze pump efficiency (volume per minute)
    const pumpData: Record<string, { totalVolume: number; totalDuration: number; sessions: number }> = {};
    pumpingLogs.forEach(log => {
      const pump = log.pumpType || 'OTHER';
      if (!pumpData[pump]) {
        pumpData[pump] = { totalVolume: 0, totalDuration: 0, sessions: 0 };
      }
      pumpData[pump].totalVolume += log.amount || 0;
      pumpData[pump].totalDuration += log.duration || 0;
      pumpData[pump].sessions += 1;
    });

    // Find most efficient pump
    let mostEfficientPump = 'N/A';
    let highestEfficiency = 0;
    Object.entries(pumpData).forEach(([pump, data]) => {
      const efficiency = data.totalDuration > 0 ? data.totalVolume / data.totalDuration : 0;
      if (efficiency > highestEfficiency) {
        highestEfficiency = efficiency;
        mostEfficientPump = pump;
      }
    });

    // Usage distribution
    const stored = pumpingLogs.filter(log => log.usage === 'STORED').length;
    const used = pumpingLogs.filter(log => log.usage === 'USED').length;
    const storedPercent = totalSessions > 0 ? Math.round((stored / totalSessions) * 100) : 0;

    // Calculate trend (compare first half vs second half)
    const midPoint = Math.floor(pumpingLogs.length / 2);
    const firstHalf = pumpingLogs.slice(0, midPoint);
    const secondHalf = pumpingLogs.slice(midPoint);

    const firstHalfAvg = firstHalf.length > 0
      ? firstHalf.reduce((sum, log) => sum + (log.amount || 0), 0) / firstHalf.length
      : 0;
    const secondHalfAvg = secondHalf.length > 0
      ? secondHalf.reduce((sum, log) => sum + (log.amount || 0), 0) / secondHalf.length
      : 0;

    let trend = 'stable';
    if (secondHalfAvg > firstHalfAvg * 1.1) trend = 'increasing';
    if (secondHalfAvg < firstHalfAvg * 0.9) trend = 'decreasing';

    return {
      totalVolume,
      totalSessions,
      daysWithData,
      avgVolume,
      avgDuration,
      avgSessionsPerDay,
      avgVolumePerDay,
      mostEfficientPump,
      highestEfficiency: Math.round(highestEfficiency * 100) / 100,
      storedPercent,
      trend,
      lastSession: pumpingLogs[pumpingLogs.length - 1]
    };
  }

  // Calculate sleep quality score
  private calculateSleepQuality(sleepLogs: any[]) {
    if (sleepLogs.length === 0) return 'No data';

    const qualityScores = {
      'DEEP': 3,
      'RESTLESS': 1,
      'INTERRUPTED': 0
    };

    const totalScore = sleepLogs.reduce((sum, log) => {
      return sum + (qualityScores[log.quality as keyof typeof qualityScores] || 2);
    }, 0);

    const avgScore = totalScore / sleepLogs.length;

    if (avgScore >= 2.5) return 'Excellent';
    if (avgScore >= 1.5) return 'Good';
    return 'Needs attention';
  }

  // Detect correlations between activities
  async detectCorrelations(childId: string, days: number = 14, userId: string) {
    await this.verifyChildAccess(childId, userId);
    const since = subDays(new Date(), days);
    const correlations: any[] = [];

    // Get all activity logs
    const [feedingLogs, sleepLogs, diaperLogs] = await Promise.all([
      prisma.feedingLog.findMany({
        where: { childId, startTime: { gte: since } },
        orderBy: { startTime: 'asc' }
      }),
      prisma.sleepLog.findMany({
        where: { childId, startTime: { gte: since } },
        orderBy: { startTime: 'asc' }
      }),
      prisma.diaperLog.findMany({
        where: { childId, timestamp: { gte: since } },
        orderBy: { timestamp: 'asc' }
      })
    ]);

    // Correlation: Feeding to Sleep
    for (const sleep of sleepLogs) {
      const feedingBefore = feedingLogs
        .filter(f => f.startTime < sleep.startTime)
        .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())[0];
      
      if (feedingBefore) {
        const timeDiff = differenceInMinutes(sleep.startTime, feedingBefore.startTime);
        if (timeDiff < 60 && sleep.quality === 'DEEP') {
          correlations.push({
            type: 'FEEDING_SLEEP',
            confidence: 0.75,
            description: 'Better sleep quality when fed within 1 hour before sleep'
          });
          break;
        }
      }
    }

    // Correlation: Diaper changes frequency after feeding
    const feedingToDiaperIntervals: number[] = [];
    for (const feeding of feedingLogs) {
      const nextDiaper = diaperLogs
        .find(d => d.timestamp > feeding.startTime && 
                   differenceInHours(d.timestamp, feeding.startTime) < 3);
      
      if (nextDiaper) {
        feedingToDiaperIntervals.push(
          differenceInMinutes(nextDiaper.timestamp, feeding.startTime)
        );
      }
    }

    if (feedingToDiaperIntervals.length > 5) {
      const avgInterval = feedingToDiaperIntervals.reduce((a, b) => a + b, 0) / feedingToDiaperIntervals.length;
      correlations.push({
        type: 'FEEDING_DIAPER',
        confidence: 0.80,
        description: `Typically needs diaper change ${Math.round(avgInterval)} minutes after feeding`
      });
    }

    return correlations;
  }

  // Compare children patterns
  async compareChildren(days: number = 7, userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { accountId: true }
    });

    if (!user?.accountId) {
      throw new Error('User not part of an account');
    }

    const children = await prisma.child.findMany({
      where: {
        user: {
          accountId: user.accountId
        }
      }
    });
    if (children.length < 2) return null;

    const [child1Patterns, child2Patterns] = await Promise.all([
      this.analyzeFeedingPatterns(children[0].id, days, userId),
      this.analyzeFeedingPatterns(children[1].id, days, userId)
    ]);

    const [child1Sleep, child2Sleep] = await Promise.all([
      this.analyzeSleepPatterns(children[0].id, days, userId),
      this.analyzeSleepPatterns(children[1].id, days, userId)
    ]);

    const feedingSync = await this.calculateSynchronization(children[0].id, children[1].id, 'feeding', days, userId);
    const sleepSync = await this.calculateSynchronization(children[0].id, children[1].id, 'sleep', days, userId);

    return {
      feeding: {
        [children[0].name]: child1Patterns,
        [children[1].name]: child2Patterns,
        synchronization: feedingSync
      },
      sleep: {
        [children[0].name]: child1Sleep,
        [children[1].name]: child2Sleep,
        synchronization: sleepSync
      }
    };
  }

  // Calculate synchronization percentage
  private async calculateSynchronization(
    child1Id: string,
    child2Id: string,
    type: 'feeding' | 'sleep',
    days: number,
    userId: string
  ): Promise<number> {
    const since = subDays(new Date(), days);

    if (type === 'feeding') {
      const [child1Logs, child2Logs] = await Promise.all([
        prisma.feedingLog.findMany({
          where: { childId: child1Id, startTime: { gte: since } }
        }),
        prisma.feedingLog.findMany({
          where: { childId: child2Id, startTime: { gte: since } }
        })
      ]);

      let synchronized = 0;
      for (const log1 of child1Logs) {
        const closeLog = child2Logs.find(log2 =>
          Math.abs(differenceInMinutes(log1.startTime, log2.startTime)) < 30
        );
        if (closeLog) synchronized++;
      }

      return Math.round((synchronized / Math.max(child1Logs.length, 1)) * 100);
    } else {
      const [child1Logs, child2Logs] = await Promise.all([
        prisma.sleepLog.findMany({
          where: { childId: child1Id, startTime: { gte: since } }
        }),
        prisma.sleepLog.findMany({
          where: { childId: child2Id, startTime: { gte: since } }
        })
      ]);

      let synchronized = 0;
      for (const log1 of child1Logs) {
        const closeLog = child2Logs.find(log2 =>
          Math.abs(differenceInMinutes(log1.startTime, log2.startTime)) < 30
        );
        if (closeLog) synchronized++;
      }

      return Math.round((synchronized / Math.max(child1Logs.length, 1)) * 100);
    }
  }

  // Generate AI insights
  async generateInsights(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { accountId: true }
    });

    if (!user?.accountId) {
      throw new Error('User not part of an account');
    }

    // Get user's timezone for formatting times
    const timezone = await this.getUserTimezone(userId);

    const children = await prisma.child.findMany({
      where: {
        user: {
          accountId: user.accountId
        }
      }
    });
    const insights: any[] = [];

    for (const child of children) {
      // Feeding insights
      const feedingPattern = await this.analyzeFeedingPatterns(child.id, 7, userId);
      if (feedingPattern) {
        // Create a more detailed description based on feeding types
        let feedingDetails = '';
        let amountDetails = '';

        if (feedingPattern.breastCount > 0 && feedingPattern.bottleCount > 0) {
          feedingDetails = ` (${feedingPattern.breastCount} breast, ${feedingPattern.bottleCount} bottle/formula)`;
          // Show both bottle amount and breast duration
          if (feedingPattern.averageBottleAmount > 0) {
            amountDetails += `averaging ${feedingPattern.averageBottleAmount}ml per bottle/formula feed`;
          }
          if (feedingPattern.averageBreastDuration > 0) {
            if (amountDetails) amountDetails += ' and ';
            amountDetails += `${feedingPattern.averageBreastDuration} minutes per breastfeed`;
          }
        } else if (feedingPattern.breastCount > 0) {
          feedingDetails = ' (breastfed)';
          if (feedingPattern.averageBreastDuration > 0) {
            amountDetails = `averaging ${feedingPattern.averageBreastDuration} minutes per feed`;
          }
        } else if (feedingPattern.bottleCount > 0) {
          feedingDetails = ' (bottle/formula)';
          if (feedingPattern.averageBottleAmount > 0) {
            amountDetails = `averaging ${feedingPattern.averageBottleAmount}ml per feed`;
          }
        }

        const description = amountDetails
          ? `${child.name} feeds every ${feedingPattern.averageInterval} hours on average, ${amountDetails}${feedingDetails}. Total: ${feedingPattern.totalFeedings} feedings in past week.`
          : `${child.name} feeds every ${feedingPattern.averageInterval} hours on average${feedingDetails}. Total: ${feedingPattern.totalFeedings} feedings in past week.`;

        insights.push({
          childId: child.id,
          childName: child.name,
          type: 'feeding',
          title: 'Feeding Pattern Analysis',
          description,
          trend: feedingPattern.trend,
          confidence: 0.85,
          recommendation: feedingPattern.trend === 'increasing'
            ? 'Feeding intervals are getting longer, which is normal as baby grows.'
            : feedingPattern.trend === 'decreasing'
            ? 'Baby may be going through a growth spurt. This is normal.'
            : 'Maintain current feeding schedule.',
          nextAction: `Next feeding expected around ${formatInTimeZone(feedingPattern.nextFeedingEstimate, timezone, 'h:mm a')}`
        });
      }

      // Sleep insights
      const sleepPattern = await this.analyzeSleepPatterns(child.id, 7, userId);
      if (sleepPattern) {
        const napHours = (sleepPattern.averageNapDuration / 60).toFixed(1);
        const nightHours = (sleepPattern.averageNightDuration / 60).toFixed(1);
        const napCount = sleepPattern.totalNaps;
        const daysWithData = sleepPattern.daysWithData || 1; // Prevent division by zero
        const avgNapsPerDay = (napCount / daysWithData).toFixed(1);

        let description = `${child.name} sleeps ${sleepPattern.totalSleepHours} hours per day on average (based on ${daysWithData} day${daysWithData > 1 ? 's' : ''} of data)`;

        // Add nap details if there are naps
        if (napCount > 0) {
          description += ` including ${avgNapsPerDay} nap${parseFloat(avgNapsPerDay) !== 1 ? 's' : ''}/day averaging ${napHours}h each`;
        }

        // Add night sleep details
        if (sleepPattern.totalNightSleeps > 0) {
          description += `. Night sleep averages ${nightHours}h`;
        }

        description += '.';

        insights.push({
          childId: child.id,
          childName: child.name,
          type: 'sleep',
          title: 'Sleep Pattern Analysis',
          description,
          quality: sleepPattern.sleepQuality,
          confidence: 0.80,
          recommendation: sleepPattern.sleepQuality === 'Excellent'
            ? 'Sleep patterns are healthy and consistent.'
            : sleepPattern.sleepQuality === 'No data'
            ? 'Not enough sleep data to evaluate quality.'
            : 'Consider adjusting bedtime routine for better sleep quality.',
          typicalWakeTime: sleepPattern.typicalWakeTime,
          nextAction: napCount > 0
            ? `Monitor wake windows - babies typically need a nap after ${Math.round(sleepPattern.averageNapDuration / 60 * 2)}-3 hours awake`
            : 'Track naps to identify sleep patterns'
        });
      }

      // Diaper insights
      const diaperPattern = await this.analyzeDiaperPatterns(child.id, 7, userId);
      if (diaperPattern) {
        const daysWithData = diaperPattern.daysWithData;
        let description = `${child.name} has ${diaperPattern.avgChangesPerDay} diaper changes per day on average (based on ${daysWithData} day${daysWithData > 1 ? 's' : ''} of data)`;

        // Add breakdown by type
        const types: string[] = [];
        if (diaperPattern.wetCount > 0) types.push(`${diaperPattern.wetCount} wet`);
        if (diaperPattern.dirtyCount > 0) types.push(`${diaperPattern.dirtyCount} dirty`);
        if (diaperPattern.mixedCount > 0) types.push(`${diaperPattern.mixedCount} mixed`);

        if (types.length > 0) {
          description += ` - ${types.join(', ')}`;
        }

        description += `. Average interval: ${diaperPattern.avgInterval} hours.`;

        // Determine if the pattern is healthy
        const changesPerDay = parseFloat(diaperPattern.avgChangesPerDay);
        let recommendation = '';
        if (changesPerDay < 4) {
          recommendation = 'Monitor closely - babies typically need 6-10 diaper changes per day. Ensure adequate feeding and hydration.';
        } else if (changesPerDay >= 6 && changesPerDay <= 12) {
          recommendation = 'Diaper change frequency is healthy and normal.';
        } else if (changesPerDay > 12) {
          recommendation = 'High frequency of changes. This is normal, but monitor for signs of diarrhea or discomfort.';
        }

        insights.push({
          childId: child.id,
          childName: child.name,
          type: 'diaper',
          title: 'Diaper Pattern Analysis',
          description,
          confidence: 0.85,
          recommendation,
          nextAction: `Last change was ${formatInTimeZone(diaperPattern.lastChange.timestamp, timezone, 'h:mm a')}`
        });
      }

      // Correlations
      const correlations = await this.detectCorrelations(child.id, 14, userId);
      for (const correlation of correlations) {
        insights.push({
          childId: child.id,
          childName: child.name,
          type: 'correlation',
          title: 'Pattern Discovered',
          description: correlation.description,
          confidence: correlation.confidence,
          recommendation: 'Use this pattern to optimize daily routine.'
        });
      }
    }

    // Pumping insights (for mom/parents)
    const pumpingPattern = await this.analyzePumpingPatterns(7, userId);
    if (pumpingPattern) {
      const pumpTypeLabels: Record<string, string> = {
        'BABY_BUDDHA': 'Baby Buddha',
        'MADELA_SYMPHONY': 'Madela Symphony',
        'SPECTRA_S1': 'Spectra S1',
        'OTHER': 'Other'
      };

      let description = `Pumping ${pumpingPattern.avgSessionsPerDay} sessions per day on average, producing ${pumpingPattern.avgVolumePerDay}ml daily (${pumpingPattern.avgVolume}ml per session). `;
      description += `${pumpingPattern.storedPercent}% of milk is being stored. `;

      if (pumpingPattern.mostEfficientPump !== 'N/A') {
        description += `Most efficient pump: ${pumpTypeLabels[pumpingPattern.mostEfficientPump] || pumpingPattern.mostEfficientPump} (${pumpingPattern.highestEfficiency}ml/min).`;
      }

      let recommendation = '';
      if (pumpingPattern.trend === 'increasing') {
        recommendation = 'Great! Milk supply is increasing. Continue current routine and stay hydrated.';
      } else if (pumpingPattern.trend === 'decreasing') {
        recommendation = 'Milk supply appears to be decreasing. Ensure adequate hydration, nutrition, and rest. Consider pumping more frequently.';
      } else {
        recommendation = 'Milk supply is stable. Maintain current pumping schedule.';
      }

      // Provide next action based on last session time
      const lastSessionTime = formatInTimeZone(pumpingPattern.lastSession.timestamp, timezone, 'h:mm a');

      insights.push({
        type: 'pumping',
        title: 'Pumping & Milk Supply Analysis',
        description,
        trend: pumpingPattern.trend,
        confidence: 0.85,
        recommendation,
        nextAction: `Last session was at ${lastSessionTime}. Typical interval is every ${Math.round(24 / parseFloat(pumpingPattern.avgSessionsPerDay))} hours.`
      });
    }

    // Children comparison insights (only if multiple children)
    const comparison = await this.compareChildren(7, userId);
    if (comparison) {
      const feedingSync = comparison.feeding.synchronization;
      const sleepSync = comparison.sleep.synchronization;

      insights.push({
        type: 'comparison',
        title: 'Children Synchronization',
        description: `Feeding synchronization: ${feedingSync}%, Sleep synchronization: ${sleepSync}%`,
        confidence: 0.90,
        recommendation: feedingSync > 70
          ? `Great job keeping ${children.map(c => c.name).join(' and ')} on similar schedules!`
          : 'Try to align feeding times for easier management.'
      });
    }

    return insights;
  }

  // Generate predictions
  async generatePredictions(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { accountId: true }
    });

    if (!user?.accountId) {
      throw new Error('User not part of an account');
    }

    // Get user's timezone for formatting times
    const timezone = await this.getUserTimezone(userId);

    const children = await prisma.child.findMany({
      where: {
        user: {
          accountId: user.accountId
        }
      }
    });
    const predictions: any[] = [];

    for (const child of children) {
      const feedingPattern = await this.analyzeFeedingPatterns(child.id, 7, userId);
      if (feedingPattern) {
        predictions.push({
          type: 'feeding',
          childName: child.name,
          prediction: `Next feeding`,
          time: formatInTimeZone(feedingPattern.nextFeedingEstimate, timezone, 'h:mm a'),
          confidence: 'High'
        });
      }

      // Predict nap time based on wake windows
      const lastSleep = await prisma.sleepLog.findFirst({
        where: { childId: child.id, endTime: { not: null } },
        orderBy: { endTime: 'desc' }
      });

      if (lastSleep && lastSleep.endTime) {
        const timeSinceWake = differenceInHours(new Date(), lastSleep.endTime);
        if (timeSinceWake > 2 && timeSinceWake < 4) {
          predictions.push({
            type: 'sleep',
            childName: child.name,
            prediction: 'May be ready for nap',
            time: 'Soon',
            confidence: 'Medium'
          });
        }
      }

      // Predict diaper change
      const lastDiaper = await prisma.diaperLog.findFirst({
        where: { childId: child.id },
        orderBy: { timestamp: 'desc' }
      });

      if (lastDiaper) {
        const hoursSince = differenceInHours(new Date(), lastDiaper.timestamp);
        if (hoursSince > 2) {
          predictions.push({
            type: 'diaper',
            childName: child.name,
            prediction: 'Diaper check recommended',
            time: 'Now',
            confidence: hoursSince > 3 ? 'High' : 'Medium'
          });
        }
      }
    }

    return predictions;
  }
}

export const analyticsService = new AnalyticsService();
