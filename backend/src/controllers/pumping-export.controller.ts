import { Response } from 'express';
import { prisma } from '../index';
import { AuthRequest } from '../utils/auth';
import OpenAI from 'openai';
import { format } from 'date-fns';

const openai = new OpenAI({
  apiKey: (process.env.OPENAI_API_KEY || '').trim(),
});

export const exportPumpingCSV = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    // Get user's accountId
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { accountId: true }
    });

    if (!user?.accountId) {
      return res.status(400).json({ error: 'User not part of an account' });
    }

    // Get all users in the same account
    const users = await prisma.user.findMany({
      where: {
        accountId: user.accountId
      },
      select: { id: true }
    });

    const userIds = users.map(u => u.id);

    if (userIds.length === 0) {
      return res.status(400).json({ error: 'No users found in account' });
    }

    // Fetch pumping logs for the date range
    const logs = await prisma.pumpingLog.findMany({
      where: {
        userId: { in: userIds },
        startTime: {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string)
        }
      },
      include: {
        user: {
          select: { name: true, email: true }
        }
      },
      orderBy: { startTime: 'asc' }
    });

    // Generate CSV
    const csvHeaders = [
      'Date',
      'Start Time',
      'End Time',
      'Duration (min)',
      'Amount (ml)',
      'Pump Type',
      'Usage',
      'User',
      'Notes',
      'Timezone'
    ];

    const csvRows = logs.map(log => [
      format(new Date(log.startTime), 'yyyy-MM-dd'),
      format(new Date(log.startTime), 'HH:mm:ss'),
      log.endTime ? format(new Date(log.endTime), 'HH:mm:ss') : '',
      log.duration?.toString() || '',
      log.amount?.toString() || '',
      log.pumpType,
      log.usage || '',
      log.user?.name || log.user?.email || '',
      log.notes || '',
      log.entryTimezone
    ]);

    const csv = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=pumping-export-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Export pumping CSV error:', error);
    res.status(500).json({
      error: 'Failed to export pumping data'
    });
  }
};

export const generatePumpingInsights = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    // Get user's accountId and name
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { accountId: true, name: true, email: true }
    });

    if (!user?.accountId) {
      return res.status(400).json({ error: 'User not part of an account' });
    }

    // Get all users in the same account
    const users = await prisma.user.findMany({
      where: {
        accountId: user.accountId
      },
      select: { id: true, name: true, email: true }
    });

    const userIds = users.map(u => u.id);

    if (userIds.length === 0) {
      return res.status(400).json({ error: 'No users found in account' });
    }

    // Fetch pumping logs for the date range
    const logs = await prisma.pumpingLog.findMany({
      where: {
        userId: { in: userIds },
        startTime: {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string)
        }
      },
      include: {
        user: {
          select: { name: true, email: true }
        }
      },
      orderBy: { startTime: 'asc' }
    });

    if (logs.length === 0) {
      return res.status(400).json({ error: 'No pumping data found for the selected date range' });
    }

    // Calculate statistics
    const totalSessions = logs.length;
    const completedSessions = logs.filter(log => log.endTime).length;
    const activeSessions = totalSessions - completedSessions;

    const totalAmount = logs.reduce((sum, log) => sum + (log.amount || 0), 0);
    const averageAmount = totalAmount / completedSessions;

    const totalDuration = logs.reduce((sum, log) => sum + (log.duration || 0), 0);
    const averageDuration = totalDuration / completedSessions;

    const storedMilk = logs.filter(log => log.usage === 'STORED').reduce((sum, log) => sum + (log.amount || 0), 0);
    const usedMilk = logs.filter(log => log.usage === 'USED').reduce((sum, log) => sum + (log.amount || 0), 0);

    // Count by pump type
    const pumpTypeCounts = logs.reduce((acc, log) => {
      acc[log.pumpType] = (acc[log.pumpType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Group by date for daily trends
    const dailyData = logs.reduce((acc, log) => {
      const date = format(new Date(log.startTime), 'yyyy-MM-dd');
      if (!acc[date]) {
        acc[date] = { count: 0, amount: 0, duration: 0 };
      }
      acc[date].count++;
      acc[date].amount += log.amount || 0;
      acc[date].duration += log.duration || 0;
      return acc;
    }, {} as Record<string, { count: number; amount: number; duration: number }>);

    // Prepare data for AI analysis
    const analysisData = {
      dateRange: {
        start: format(new Date(startDate as string), 'MMM dd, yyyy'),
        end: format(new Date(endDate as string), 'MMM dd, yyyy')
      },
      summary: {
        totalSessions,
        completedSessions,
        activeSessions,
        totalAmount: Math.round(totalAmount),
        averageAmount: Math.round(averageAmount),
        totalDuration: Math.round(totalDuration),
        averageDuration: Math.round(averageDuration),
        storedMilk: Math.round(storedMilk),
        usedMilk: Math.round(usedMilk)
      },
      pumpTypes: pumpTypeCounts,
      dailyTrends: Object.entries(dailyData).map(([date, data]) => ({
        date,
        sessions: data.count,
        totalAmount: Math.round(data.amount),
        averageAmount: data.count > 0 ? Math.round(data.amount / data.count) : 0,
        totalDuration: Math.round(data.duration),
        averageDuration: data.count > 0 ? Math.round(data.duration / data.count) : 0
      }))
    };

    // Generate AI insights using OpenAI
    const prompt = `You are a lactation consultant and parenting expert. Analyze the following pumping data and provide detailed insights and recommendations.

Data Summary:
- Date Range: ${analysisData.dateRange.start} to ${analysisData.dateRange.end}
- Total Pumping Sessions: ${analysisData.summary.totalSessions}
- Completed Sessions: ${analysisData.summary.completedSessions}
- Total Milk Produced: ${analysisData.summary.totalAmount}ml
- Average per Session: ${analysisData.summary.averageAmount}ml
- Average Duration: ${analysisData.summary.averageDuration} minutes
- Milk Stored: ${analysisData.summary.storedMilk}ml
- Milk Used: ${analysisData.summary.usedMilk}ml

Pump Types Used:
${Object.entries(analysisData.pumpTypes).map(([type, count]) => `- ${type}: ${count} sessions`).join('\n')}

Daily Trends:
${analysisData.dailyTrends.slice(0, 7).map(day =>
  `- ${day.date}: ${day.sessions} sessions, ${day.totalAmount}ml total, ${day.averageAmount}ml average`
).join('\n')}

Please provide:
1. **Overall Performance Analysis**: How is the milk production trending? Is it consistent, increasing, or decreasing?
2. **Volume Insights**: Are the amounts within healthy ranges? Any concerns or positive observations?
3. **Session Frequency**: Is the pumping frequency appropriate? Too frequent or too sparse?
4. **Duration Analysis**: Are session durations optimal? Too long or too short?
5. **Pump Type Effectiveness**: If multiple pumps are used, which seems most effective?
6. **Storage vs Usage**: Comment on the storage/usage balance
7. **Recommendations**: Provide 3-5 actionable recommendations to improve or maintain pumping success
8. **Red Flags**: Any concerns that should be discussed with a healthcare provider?

Format the response as a comprehensive markdown report with clear sections and bullet points.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert lactation consultant and parenting advisor. Provide detailed, evidence-based insights and compassionate recommendations.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    const aiInsights = completion.choices[0]?.message?.content || 'Unable to generate insights at this time.';

    // Generate markdown report
    const report = `# Pumping Report
## ${analysisData.dateRange.start} - ${analysisData.dateRange.end}

Generated on: ${format(new Date(), 'MMMM dd, yyyy \'at\' HH:mm')}

---

## Summary Statistics

- **Total Pumping Sessions**: ${analysisData.summary.totalSessions}
- **Completed Sessions**: ${analysisData.summary.completedSessions}
- **Active Sessions**: ${analysisData.summary.activeSessions}
- **Total Milk Produced**: ${analysisData.summary.totalAmount}ml
- **Average per Session**: ${analysisData.summary.averageAmount}ml
- **Total Duration**: ${analysisData.summary.totalDuration} minutes
- **Average Duration**: ${analysisData.summary.averageDuration} minutes
- **Milk Stored**: ${analysisData.summary.storedMilk}ml (${Math.round((analysisData.summary.storedMilk / analysisData.summary.totalAmount) * 100)}%)
- **Milk Used**: ${analysisData.summary.usedMilk}ml (${Math.round((analysisData.summary.usedMilk / analysisData.summary.totalAmount) * 100)}%)

## Pump Types Used

${Object.entries(analysisData.pumpTypes).map(([type, count]) =>
  `- **${type}**: ${count} sessions (${Math.round((count / totalSessions) * 100)}%)`
).join('\n')}

## Daily Breakdown

| Date | Sessions | Total (ml) | Avg (ml) | Total Duration (min) | Avg Duration (min) |
|------|----------|------------|----------|----------------------|--------------------|
${analysisData.dailyTrends.map(day =>
  `| ${day.date} | ${day.sessions} | ${day.totalAmount} | ${day.averageAmount} | ${day.totalDuration} | ${day.averageDuration} |`
).join('\n')}

---

## AI-Generated Insights & Recommendations

${aiInsights}

---

*This report was generated automatically using AI analysis. Please consult with your healthcare provider or lactation consultant for personalized medical advice.*
`;

    // Set headers for file download
    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', `attachment; filename=pumping-insights-${format(new Date(), 'yyyy-MM-dd')}.md`);
    res.send(report);
  } catch (error) {
    console.error('Generate pumping insights error:', error);
    res.status(500).json({
      error: 'Failed to generate pumping insights'
    });
  }
};
