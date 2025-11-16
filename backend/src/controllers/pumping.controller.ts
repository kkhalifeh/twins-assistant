import { Response } from 'express';
import { prisma } from '../index';
import { AuthRequest } from '../utils/auth';
import { parseFloatSafe, parseIntSafe } from '../utils/validation';
import { TimezoneService } from '../utils/timezone';

export const getPumpingLogs = async (req: AuthRequest, res: Response) => {
  try {
    const { date, limit = '50' } = req.query;
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

    // Get all users in the same account to show all pumping logs
    const users = await prisma.user.findMany({
      where: {
        accountId: user.accountId
      },
      select: { id: true }
    });

    const userIds = users.map(u => u.id);

    if (userIds.length === 0) {
      return res.json([]);
    }

    const where: any = { userId: { in: userIds } };
    if (date) {
      const startDate = new Date(date as string);
      startDate.setUTCHours(0, 0, 0, 0);
      const endDate = new Date(date as string);
      endDate.setUTCHours(23, 59, 59, 999);

      where.timestamp = {
        gte: startDate,
        lte: endDate
      };
    }

    const logs = await prisma.pumpingLog.findMany({
      where,
      include: {
        user: {
          select: { name: true, email: true }
        }
      },
      orderBy: { timestamp: 'desc' },
      take: parseIntSafe(limit as string) || 50
    });

    res.json(logs);
  } catch (error) {
    console.error('Get pumping logs error:', error);
    res.status(500).json({
      error: 'Failed to fetch pumping logs'
    });
  }
};

export const createPumpingLog = async (req: AuthRequest, res: Response) => {
  try {
    const {
      timestamp,
      pumpType,
      duration,
      amount,
      usage,
      notes,
      timezone
    } = req.body;

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!timestamp || !pumpType || !duration || !amount || !usage) {
      return res.status(400).json({
        error: 'Timestamp, pump type, duration, amount, and usage are required'
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

    const log = await prisma.pumpingLog.create({
      data: {
        userId: req.user!.id,
        timestamp: new Date(timestamp),
        pumpType,
        duration: parseIntSafe(duration) || 0,
        amount: parseFloatSafe(amount) || 0,
        usage,
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
    console.error('Create pumping log error:', error);
    res.status(500).json({
      error: 'Failed to create pumping log'
    });
  }
};

export const updatePumpingLog = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const {
      timestamp,
      pumpType,
      duration,
      amount,
      usage,
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

    // Get all users in the same account
    const users = await prisma.user.findMany({
      where: {
        accountId: user.accountId
      },
      select: { id: true }
    });

    const userIds = users.map(u => u.id);

    // Verify log belongs to a user in the account
    const existingLog = await prisma.pumpingLog.findFirst({
      where: {
        id,
        userId: { in: userIds }
      }
    });

    if (!existingLog) {
      return res.status(404).json({ error: 'Pumping log not found' });
    }

    const log = await prisma.pumpingLog.update({
      where: { id },
      data: {
        ...(timestamp && { timestamp: new Date(timestamp) }),
        ...(pumpType && { pumpType }),
        ...(duration !== undefined && { duration: parseIntSafe(duration) || 0 }),
        ...(amount !== undefined && { amount: parseFloatSafe(amount) || 0 }),
        ...(usage && { usage }),
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
    console.error('Update pumping log error:', error);
    res.status(500).json({
      error: 'Failed to update pumping log'
    });
  }
};

export const deletePumpingLog = async (req: AuthRequest, res: Response) => {
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

    // Get all users in the same account
    const users = await prisma.user.findMany({
      where: {
        accountId: user.accountId
      },
      select: { id: true }
    });

    const userIds = users.map(u => u.id);

    // Verify log belongs to a user in the account
    const existingLog = await prisma.pumpingLog.findFirst({
      where: {
        id,
        userId: { in: userIds }
      }
    });

    if (!existingLog) {
      return res.status(404).json({ error: 'Pumping log not found' });
    }

    await prisma.pumpingLog.delete({
      where: { id }
    });

    res.json({ message: 'Pumping log deleted successfully' });
  } catch (error) {
    console.error('Delete pumping log error:', error);
    res.status(500).json({
      error: 'Failed to delete pumping log'
    });
  }
};
