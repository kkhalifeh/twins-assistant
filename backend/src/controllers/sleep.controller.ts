import { Response } from 'express';
import { prisma } from '../index';
import { AuthRequest } from '../utils/auth';
import { parseIntSafe } from '../utils/validation';

export const getSleepLogs = async (req: AuthRequest, res: Response) => {
  try {
    const { childId, date, limit = '50' } = req.query;
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
      return res.json([]);
    }

    const where: any = { childId: { in: childIds } };
    if (childId) where.childId = childId as string;
    if (date) {
      const startDate = new Date(date as string);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date as string);
      endDate.setHours(23, 59, 59, 999);

      where.startTime = {
        gte: startDate,
        lte: endDate
      };
    }

    const logs = await prisma.sleepLog.findMany({
      where,
      include: {
        child: true,
        user: {
          select: { name: true, email: true }
        }
      },
      orderBy: { startTime: 'desc' },
      take: parseIntSafe(limit as string) || 50
    });

    res.json(logs);
  } catch (error) {
    console.error('Get sleep logs error:', error);
    res.status(500).json({
      error: 'Failed to fetch sleep logs'
    });
  }
};

export const createSleepLog = async (req: AuthRequest, res: Response) => {
  try {
    const {
      childId,
      startTime,
      endTime,
      type,
      quality,
      notes
    } = req.body;

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!childId || !startTime || !type) {
      return res.status(400).json({
        error: 'Child ID, start time, and type are required'
      });
    }

    // Calculate duration if endTime is provided
    let duration = null;
    if (endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      duration = Math.floor((end.getTime() - start.getTime()) / 1000 / 60); // in minutes
    }

    const log = await prisma.sleepLog.create({
      data: {
        childId,
        userId: req.user!.id,
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : null,
        duration,
        type,
        quality,
        notes
      },
      include: {
        child: true,
        user: {
          select: { name: true, email: true }
        }
      }
    });

    res.status(201).json(log);
  } catch (error) {
    console.error('Create sleep log error:', error);
    res.status(500).json({
      error: 'Failed to create sleep log'
    });
  }
};

export const updateSleepLog = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const {
      startTime,
      endTime,
      type,
      quality,
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

    // Verify log belongs to a child in the account
    const existingLog = await prisma.sleepLog.findFirst({
      where: {
        id,
        childId: { in: childIds }
      }
    });

    if (!existingLog) {
      return res.status(404).json({ error: 'Sleep log not found' });
    }

    // Recalculate duration if times are updated
    let duration = undefined;
    if (startTime && endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      duration = Math.floor((end.getTime() - start.getTime()) / 1000 / 60);
    }

    const log = await prisma.sleepLog.update({
      where: { id },
      data: {
        ...(startTime && { startTime: new Date(startTime) }),
        ...(endTime !== undefined && { endTime: endTime ? new Date(endTime) : null }),
        ...(duration !== undefined && { duration }),
        ...(type && { type }),
        ...(quality && { quality }),
        ...(notes !== undefined && { notes })
      },
      include: {
        child: true,
        user: {
          select: { name: true, email: true }
        }
      }
    });

    res.json(log);
  } catch (error) {
    console.error('Update sleep log error:', error);
    res.status(500).json({
      error: 'Failed to update sleep log'
    });
  }
};

export const deleteSleepLog = async (req: AuthRequest, res: Response) => {
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

    // Verify log belongs to a child in the account
    const existingLog = await prisma.sleepLog.findFirst({
      where: {
        id,
        childId: { in: childIds }
      }
    });

    if (!existingLog) {
      return res.status(404).json({ error: 'Sleep log not found' });
    }

    await prisma.sleepLog.delete({
      where: { id }
    });

    res.json({ message: 'Sleep log deleted successfully' });
  } catch (error) {
    console.error('Delete sleep log error:', error);
    res.status(500).json({
      error: 'Failed to delete sleep log'
    });
  }
};

// End current sleep session
export const endSleepSession = async (req: AuthRequest, res: Response) => {
  try {
    const { childId } = req.params;
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

    // Verify child belongs to someone in the same account
    const child = await prisma.child.findFirst({
      where: {
        id: childId,
        user: {
          accountId: user.accountId
        }
      }
    });

    if (!child) {
      return res.status(404).json({ error: 'Child not found' });
    }

    // Find active sleep session (no endTime)
    const activeSession = await prisma.sleepLog.findFirst({
      where: {
        childId,
        endTime: null
      },
      orderBy: { startTime: 'desc' }
    });

    if (!activeSession) {
      return res.status(404).json({
        error: 'No active sleep session found'
      });
    }

    const endTime = new Date();
    const duration = Math.floor(
      (endTime.getTime() - activeSession.startTime.getTime()) / 1000 / 60
    );

    const updated = await prisma.sleepLog.update({
      where: { id: activeSession.id },
      data: { endTime, duration },
      include: {
        child: true,
        user: {
          select: { name: true, email: true }
        }
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('End sleep session error:', error);
    res.status(500).json({
      error: 'Failed to end sleep session'
    });
  }
};
