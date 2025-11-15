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

    // Calculate average amount/duration intelligently
    // For bottle/formula: use amount in ml
    // For breast: estimate based on duration (rough estimate: 30ml per 5 minutes)
    const bottleFeedings = feedingLogs.filter(log => log.type === 'BOTTLE' || log.type === 'FORMULA');
    const breastFeedings = feedingLogs.filter(log => log.type === 'BREAST');

    let totalIntake = 0;
    let feedingCount = 0;

    // Add bottle/formula amounts
    bottleFeedings.forEach(log => {
      if (log.amount && log.amount > 0) {
        totalIntake += log.amount;
        feedingCount++;
      }
    });

    // Estimate breast feeding amounts from duration
    breastFeedings.forEach(log => {
      if (log.duration && log.duration > 0) {
        // Rough estimate: 30ml per 5 minutes of breastfeeding
        const estimatedAmount = (log.duration / 5) * 30;
        totalIntake += estimatedAmount;
        feedingCount++;
      }
    });

    const avgAmount = feedingCount > 0 ? Math.round(totalIntake / feedingCount) : 0;

    // Detect trending patterns
    const recentInterval = intervals.slice(-5).reduce((a, b) => a + b, 0) / Math.min(5, intervals.slice(-5).length);
    const trend = recentInterval > avgInterval ? 'increasing' : recentInterval < avgInterval ? 'decreasing' : 'stable';

    return {
      averageInterval: avgInterval.toFixed(1),
      averageAmount: Math.round(avgAmount),
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
      }
    });

    const napLogs = sleepLogs.filter(log => log.type === 'NAP');
    const nightLogs = sleepLogs.filter(log => log.type === 'NIGHT');

    const totalSleepMinutes = sleepLogs.reduce((sum, log) => sum + (log.duration || 0), 0);
    const avgSleepPerDay = totalSleepMinutes / days;
    
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
      typicalWakeTime: mostCommonWakeHour ? `${mostCommonWakeHour}:00` : 'Variable',
      sleepQuality: this.calculateSleepQuality(sleepLogs)
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
        if (feedingPattern.breastCount > 0 && feedingPattern.bottleCount > 0) {
          feedingDetails = ` (${feedingPattern.breastCount} breast, ${feedingPattern.bottleCount} bottle/formula)`;
        } else if (feedingPattern.breastCount > 0) {
          feedingDetails = ' (breastfed)';
        } else if (feedingPattern.bottleCount > 0) {
          feedingDetails = ' (bottle/formula)';
        }

        insights.push({
          childId: child.id,
          childName: child.name,
          type: 'feeding',
          title: 'Feeding Pattern Analysis',
          description: `${child.name} feeds every ${feedingPattern.averageInterval} hours on average, consuming about ${feedingPattern.averageAmount}ml per feeding${feedingDetails}. Total: ${feedingPattern.totalFeedings} feedings in past week.`,
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
        const daysAnalyzed = 7;
        const avgNapsPerDay = (napCount / daysAnalyzed).toFixed(1);

        let description = `${child.name} sleeps ${sleepPattern.totalSleepHours} hours per day on average`;

        // Add nap details if there are naps
        if (napCount > 0) {
          description += ` (including ${avgNapsPerDay} naps/day averaging ${napHours}h each)`;
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
