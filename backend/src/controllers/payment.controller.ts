import { Response } from 'express';
import { prisma } from '../index';
import { AuthRequest } from '../utils/auth';
import { parseFloatSafe } from '../utils/validation';
import { TimezoneService } from '../utils/timezone';

export const getPaymentLogs = async (req: AuthRequest, res: Response) => {
  try {
    const { category, childId, startDate, endDate } = req.query;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get user's accountId
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { accountId: true }
    });

    if (!user?.accountId) {
      return res.status(400).json({ error: 'User not part of an account' });
    }

    // Get all user IDs in the same account
    const accountUsers = await prisma.user.findMany({
      where: { accountId: user.accountId },
      select: { id: true }
    });

    const userIds = accountUsers.map(u => u.id);

    if (userIds.length === 0) {
      return res.json([]);
    }

    const where: any = { userId: { in: userIds } };

    if (category) where.category = category as string;
    if (childId) {
      where.childIds = {
        has: childId as string
      };
    }
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) {
        const start = new Date(startDate as string);
        start.setUTCHours(0, 0, 0, 0);
        where.timestamp.gte = start;
      }
      if (endDate) {
        const end = new Date(endDate as string);
        end.setUTCHours(23, 59, 59, 999);
        where.timestamp.lte = end;
      }
    }

    const logs = await prisma.paymentLog.findMany({
      where,
      include: {
        user: {
          select: { name: true, email: true }
        }
      },
      orderBy: { timestamp: 'desc' }
    });

    res.json(logs);
  } catch (error) {
    console.error('Get payment logs error:', error);
    res.status(500).json({
      error: 'Failed to fetch payment logs'
    });
  }
};

export const createPaymentLog = async (req: AuthRequest, res: Response) => {
  try {
    const {
      childIds,
      timestamp,
      category,
      description,
      amount,
      currency,
      notes,
      timezone
    } = req.body;

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!timestamp || !category || !description || amount === undefined) {
      return res.status(400).json({
        error: 'Timestamp, category, description, and amount are required'
      });
    }

    // Get user's timezone if not provided in request
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true }
    });

    const entryTimezone = timezone || user?.timezone || 'America/New_York';

    // Validate timezone
    if (!TimezoneService.isValidTimezone(entryTimezone)) {
      return res.status(400).json({ error: 'Invalid timezone' });
    }

    const log = await prisma.paymentLog.create({
      data: {
        userId,
        childIds: childIds || [],
        timestamp: new Date(timestamp),
        category,
        description,
        amount: parseFloatSafe(amount) || 0,
        currency: currency || 'JOD',
        notes,
        entryTimezone
      },
      include: {
        user: {
          select: { name: true, email: true }
        }
      }
    });

    res.status(201).json(log);
  } catch (error) {
    console.error('Create payment log error:', error);
    res.status(500).json({
      error: 'Failed to create payment log'
    });
  }
};

export const updatePaymentLog = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const {
      childIds,
      timestamp,
      category,
      description,
      amount,
      currency,
      notes
    } = req.body;

    // Get user's accountId
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { accountId: true }
    });

    if (!user?.accountId) {
      return res.status(400).json({ error: 'User not part of an account' });
    }

    // Get all user IDs in the same account
    const accountUsers = await prisma.user.findMany({
      where: { accountId: user.accountId },
      select: { id: true }
    });

    const userIds = accountUsers.map(u => u.id);

    // Verify log belongs to a user in the account
    const existingLog = await prisma.paymentLog.findFirst({
      where: {
        id,
        userId: { in: userIds }
      }
    });

    if (!existingLog) {
      return res.status(404).json({ error: 'Payment log not found' });
    }

    const log = await prisma.paymentLog.update({
      where: { id },
      data: {
        ...(childIds !== undefined && { childIds }),
        ...(timestamp && { timestamp: new Date(timestamp) }),
        ...(category && { category }),
        ...(description && { description }),
        ...(amount !== undefined && { amount: parseFloatSafe(amount) || 0 }),
        ...(currency && { currency }),
        ...(notes !== undefined && { notes })
      },
      include: {
        user: {
          select: { name: true, email: true }
        }
      }
    });

    res.json(log);
  } catch (error) {
    console.error('Update payment log error:', error);
    res.status(500).json({
      error: 'Failed to update payment log'
    });
  }
};

export const deletePaymentLog = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get user's accountId
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { accountId: true }
    });

    if (!user?.accountId) {
      return res.status(400).json({ error: 'User not part of an account' });
    }

    // Get all user IDs in the same account
    const accountUsers = await prisma.user.findMany({
      where: { accountId: user.accountId },
      select: { id: true }
    });

    const userIds = accountUsers.map(u => u.id);

    // Verify log belongs to a user in the account
    const existingLog = await prisma.paymentLog.findFirst({
      where: {
        id,
        userId: { in: userIds }
      }
    });

    if (!existingLog) {
      return res.status(404).json({ error: 'Payment log not found' });
    }

    await prisma.paymentLog.delete({
      where: { id }
    });

    res.json({ message: 'Payment log deleted successfully' });
  } catch (error) {
    console.error('Delete payment log error:', error);
    res.status(500).json({
      error: 'Failed to delete payment log'
    });
  }
};

// Get payment summary by category
export const getPaymentSummary = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get user's accountId
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { accountId: true }
    });

    if (!user?.accountId) {
      return res.status(400).json({ error: 'User not part of an account' });
    }

    // Get all user IDs in the same account
    const accountUsers = await prisma.user.findMany({
      where: { accountId: user.accountId },
      select: { id: true }
    });

    const userIds = accountUsers.map(u => u.id);

    const where: any = { userId: { in: userIds } };

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) {
        const start = new Date(startDate as string);
        start.setUTCHours(0, 0, 0, 0);
        where.timestamp.gte = start;
      }
      if (endDate) {
        const end = new Date(endDate as string);
        end.setUTCHours(23, 59, 59, 999);
        where.timestamp.lte = end;
      }
    }

    const logs = await prisma.paymentLog.findMany({
      where,
      select: {
        category: true,
        amount: true,
        currency: true
      }
    });

    // Group by category and currency
    const summary = logs.reduce((acc: any, log) => {
      const key = `${log.category}_${log.currency}`;
      if (!acc[key]) {
        acc[key] = {
          category: log.category,
          currency: log.currency,
          total: 0,
          count: 0
        };
      }
      acc[key].total += log.amount;
      acc[key].count += 1;
      return acc;
    }, {});

    res.json(Object.values(summary));
  } catch (error) {
    console.error('Get payment summary error:', error);
    res.status(500).json({
      error: 'Failed to fetch payment summary'
    });
  }
};
