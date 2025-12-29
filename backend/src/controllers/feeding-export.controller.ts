import { Response } from 'express';
import { prisma } from '../index';
import { AuthRequest } from '../utils/auth';
import OpenAI from 'openai';
import { format } from 'date-fns';

const openai = new OpenAI({
  apiKey: (process.env.OPENAI_API_KEY || '').trim(),
});

export const exportFeedingCSV = async (req: AuthRequest, res: Response) => {
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

    // Get all children in the account (via users in same account)
    const accountUsers = await prisma.user.findMany({
      where: { accountId: user.accountId },
      select: { id: true }
    });

    const userIds = accountUsers.map(u => u.id);

    // Get children belonging to these users
    const children = await prisma.child.findMany({
      where: { userId: { in: userIds } },
      select: { id: true, name: true }
    });

    const childIds = children.map(c => c.id);

    if (childIds.length === 0) {
      return res.status(400).json({ error: 'No children found in account' });
    }

    // Fetch feeding logs for the date range
    const logs = await prisma.feedingLog.findMany({
      where: {
        childId: { in: childIds },
        startTime: {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string)
        }
      },
      include: {
        child: {
          select: { name: true }
        },
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
      'Child',
      'Type',
      'Amount (ml)',
      'Duration (min)',
      'Logged By',
      'Notes',
      'Timezone'
    ];

    const csvRows = logs.map(log => [
      format(new Date(log.startTime), 'yyyy-MM-dd'),
      format(new Date(log.startTime), 'HH:mm:ss'),
      log.endTime ? format(new Date(log.endTime), 'HH:mm:ss') : '',
      log.child?.name || '',
      log.type,
      log.amount?.toString() || '',
      log.duration?.toString() || '',
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
    res.setHeader('Content-Disposition', `attachment; filename=feeding-export-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Export feeding CSV error:', error);
    res.status(500).json({
      error: 'Failed to export feeding data'
    });
  }
};

export const generateFeedingInsights = async (req: AuthRequest, res: Response) => {
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
      select: { accountId: true, name: true, email: true }
    });

    if (!user?.accountId) {
      return res.status(400).json({ error: 'User not part of an account' });
    }

    // Get all users in the same account
    const accountUsers = await prisma.user.findMany({
      where: { accountId: user.accountId },
      select: { id: true }
    });

    const userIds = accountUsers.map(u => u.id);

    // Get children belonging to these users
    const children = await prisma.child.findMany({
      where: { userId: { in: userIds } },
      select: { id: true, name: true, dateOfBirth: true }
    });

    const childIds = children.map(c => c.id);

    if (childIds.length === 0) {
      return res.status(400).json({ error: 'No children found in account' });
    }

    // Fetch feeding logs for the date range
    const logs = await prisma.feedingLog.findMany({
      where: {
        childId: { in: childIds },
        startTime: {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string)
        }
      },
      include: {
        child: {
          select: { name: true, dateOfBirth: true }
        },
        user: {
          select: { name: true, email: true }
        }
      },
      orderBy: { startTime: 'asc' }
    });

    if (logs.length === 0) {
      return res.status(400).json({ error: 'No feeding data found for the selected date range' });
    }

    // Calculate statistics
    const totalFeedings = logs.length;
    const totalAmount = logs.reduce((sum, log) => sum + (log.amount || 0), 0);
    const feedingsWithAmount = logs.filter(log => log.amount && log.amount > 0);
    const averageAmount = feedingsWithAmount.length > 0 ? totalAmount / feedingsWithAmount.length : 0;

    const totalDuration = logs.reduce((sum, log) => sum + (log.duration || 0), 0);
    const feedingsWithDuration = logs.filter(log => log.duration && log.duration > 0);
    const averageDuration = feedingsWithDuration.length > 0 ? totalDuration / feedingsWithDuration.length : 0;

    // Count by feeding type
    const feedingTypeCounts = logs.reduce((acc, log) => {
      acc[log.type] = (acc[log.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Stats per child
    const childStats = children.map(child => {
      const childLogs = logs.filter(log => log.childId === child.id);
      const childAmount = childLogs.reduce((sum, log) => sum + (log.amount || 0), 0);
      const childFeedings = childLogs.length;

      // Calculate age in months
      const ageInMonths = Math.floor(
        (new Date().getTime() - new Date(child.dateOfBirth).getTime()) / (1000 * 60 * 60 * 24 * 30.44)
      );

      return {
        name: child.name,
        ageInMonths,
        totalFeedings: childFeedings,
        totalAmount: Math.round(childAmount),
        averageAmount: childFeedings > 0 ? Math.round(childAmount / childFeedings) : 0,
        feedingTypes: childLogs.reduce((acc, log) => {
          acc[log.type] = (acc[log.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      };
    });

    // Group by date for daily trends
    const dailyData = logs.reduce((acc, log) => {
      const date = format(new Date(log.startTime), 'yyyy-MM-dd');
      if (!acc[date]) {
        acc[date] = { count: 0, amount: 0, byChild: {} as Record<string, { count: number; amount: number }> };
      }
      acc[date].count++;
      acc[date].amount += log.amount || 0;

      const childName = log.child?.name || 'Unknown';
      if (!acc[date].byChild[childName]) {
        acc[date].byChild[childName] = { count: 0, amount: 0 };
      }
      acc[date].byChild[childName].count++;
      acc[date].byChild[childName].amount += log.amount || 0;

      return acc;
    }, {} as Record<string, { count: number; amount: number; byChild: Record<string, { count: number; amount: number }> }>);

    // Prepare data for AI analysis
    const analysisData = {
      dateRange: {
        start: format(new Date(startDate as string), 'MMM dd, yyyy'),
        end: format(new Date(endDate as string), 'MMM dd, yyyy')
      },
      summary: {
        totalFeedings,
        totalAmount: Math.round(totalAmount),
        averageAmount: Math.round(averageAmount),
        totalDuration: Math.round(totalDuration),
        averageDuration: Math.round(averageDuration)
      },
      feedingTypes: feedingTypeCounts,
      childStats,
      dailyTrends: Object.entries(dailyData).map(([date, data]) => ({
        date,
        feedings: data.count,
        totalAmount: Math.round(data.amount),
        averageAmount: data.count > 0 ? Math.round(data.amount / data.count) : 0,
        byChild: data.byChild
      }))
    };

    // Generate AI insights using OpenAI
    const prompt = `You are a pediatric nutritionist and infant feeding specialist. Analyze the following feeding data for ${children.length > 1 ? 'twins/multiples' : 'a baby'} and provide detailed insights and recommendations.

Data Summary:
- Date Range: ${analysisData.dateRange.start} to ${analysisData.dateRange.end}
- Total Feedings: ${analysisData.summary.totalFeedings}
- Total Volume Consumed: ${analysisData.summary.totalAmount}ml
- Average per Feeding: ${analysisData.summary.averageAmount}ml
- Average Duration: ${analysisData.summary.averageDuration} minutes

Feeding Types Distribution:
${Object.entries(analysisData.feedingTypes).map(([type, count]) => `- ${type}: ${count} feedings (${Math.round((count / totalFeedings) * 100)}%)`).join('\n')}

Per Child Statistics:
${analysisData.childStats.map(child =>
  `- ${child.name} (${child.ageInMonths} months old):
    - Total Feedings: ${child.totalFeedings}
    - Total Volume: ${child.totalAmount}ml
    - Average per Feeding: ${child.averageAmount}ml
    - Types: ${Object.entries(child.feedingTypes).map(([type, count]) => `${type}: ${count}`).join(', ')}`
).join('\n')}

Daily Trends (last 7 days):
${analysisData.dailyTrends.slice(-7).map(day =>
  `- ${day.date}: ${day.feedings} feedings, ${day.totalAmount}ml total`
).join('\n')}

Please provide:
1. **Overall Feeding Assessment**: Are the feeding patterns healthy for ${children.length > 1 ? 'twins/multiples' : 'the baby'} at this age?
2. **Volume Analysis**: Are the amounts appropriate? Any concerns about under/overfeeding?
3. **Feeding Frequency**: Is the feeding frequency appropriate for the age(s)?
4. **Feeding Type Balance**: Comment on the distribution of breast milk, formula, bottles, and solids if applicable
5. **Per-Child Comparison**: ${children.length > 1 ? 'Compare the feeding patterns between the children. Are there significant differences that need attention?' : 'How does this child compare to typical feeding patterns?'}
6. **Daily Pattern Analysis**: Are there concerning fluctuations in daily intake?
7. **Recommendations**: Provide 3-5 actionable recommendations to optimize feeding
8. **Red Flags**: Any concerns that should be discussed with a pediatrician?

Format the response as a comprehensive markdown report with clear sections and bullet points.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert pediatric nutritionist and infant feeding specialist. Provide detailed, evidence-based insights and compassionate recommendations for infant feeding.'
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
    const report = `# Feeding Report
## ${analysisData.dateRange.start} - ${analysisData.dateRange.end}

Generated on: ${format(new Date(), 'MMMM dd, yyyy \'at\' HH:mm')}

---

## Summary Statistics

- **Total Feedings**: ${analysisData.summary.totalFeedings}
- **Total Volume Consumed**: ${analysisData.summary.totalAmount}ml
- **Average per Feeding**: ${analysisData.summary.averageAmount}ml
- **Total Feeding Duration**: ${analysisData.summary.totalDuration} minutes
- **Average Duration**: ${analysisData.summary.averageDuration} minutes

## Feeding Types Distribution

${Object.entries(analysisData.feedingTypes).map(([type, count]) =>
  `- **${type}**: ${count} feedings (${Math.round((count / totalFeedings) * 100)}%)`
).join('\n')}

## Per Child Statistics

${analysisData.childStats.map(child => `### ${child.name} (${child.ageInMonths} months old)
- **Total Feedings**: ${child.totalFeedings}
- **Total Volume**: ${child.totalAmount}ml
- **Average per Feeding**: ${child.averageAmount}ml
- **Feeding Types**: ${Object.entries(child.feedingTypes).map(([type, count]) => `${type}: ${count}`).join(', ')}
`).join('\n')}

## Daily Breakdown

| Date | Total Feedings | Total Volume (ml) | Avg per Feeding (ml) |
|------|----------------|-------------------|----------------------|
${analysisData.dailyTrends.map(day =>
  `| ${day.date} | ${day.feedings} | ${day.totalAmount} | ${day.averageAmount} |`
).join('\n')}

---

## AI-Generated Insights & Recommendations

${aiInsights}

---

*This report was generated automatically using AI analysis. Please consult with your pediatrician or a certified infant feeding specialist for personalized medical advice.*
`;

    // Set headers for file download
    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', `attachment; filename=feeding-insights-${format(new Date(), 'yyyy-MM-dd')}.md`);
    res.send(report);
  } catch (error) {
    console.error('Generate feeding insights error:', error);
    res.status(500).json({
      error: 'Failed to generate feeding insights'
    });
  }
};
