import { Response } from 'express';
import { prisma } from '../index';
import { AuthRequest } from '../utils/auth';
import { parseIntSafe } from '../utils/validation';
import { getFileUrl } from '../services/storage.service';

export const getDiaperLogs = async (req: AuthRequest, res: Response) => {
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

      where.timestamp = {
        gte: startDate,
        lte: endDate
      };
    }

    const logs = await prisma.diaperLog.findMany({
      where,
      include: {
        child: true,
        user: {
          select: { name: true, email: true }
        }
      },
      orderBy: { timestamp: 'desc' },
      take: parseIntSafe(limit as string) || 50
    });

    res.json(logs);
  } catch (error) {
    console.error('Get diaper logs error:', error);
    res.status(500).json({
      error: 'Failed to fetch diaper logs'
    });
  }
};

export const createDiaperLog = async (req: AuthRequest, res: Response) => {
  try {
    const {
      childId,
      timestamp,
      type,
      consistency,
      color,
      notes
    } = req.body;

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!childId || !type) {
      return res.status(400).json({
        error: 'Child ID and type are required'
      });
    }

    // Get image URL if file was uploaded
    let imageUrl: string | null = null;
    if ((req as any).file) {
      const file = (req as any).file;
      // Handle both local storage (filename) and cloud storage (key)
      const fileKey = file.key || file.filename;
      imageUrl = getFileUrl(fileKey);
    }

    const log = await prisma.diaperLog.create({
      data: {
        childId,
        userId: req.user!.id,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        type,
        consistency,
        color,
        imageUrl,
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
    console.error('Create diaper log error:', error);
    res.status(500).json({
      error: 'Failed to create diaper log'
    });
  }
};

export const updateDiaperLog = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const {
      timestamp,
      type,
      consistency,
      color,
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
    const existingLog = await prisma.diaperLog.findFirst({
      where: {
        id,
        childId: { in: childIds }
      }
    });

    if (!existingLog) {
      return res.status(404).json({ error: 'Diaper log not found' });
    }

    const log = await prisma.diaperLog.update({
      where: { id },
      data: {
        ...(timestamp && { timestamp: new Date(timestamp) }),
        ...(type && { type }),
        ...(consistency !== undefined && { consistency }),
        ...(color !== undefined && { color }),
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
    console.error('Update diaper log error:', error);
    res.status(500).json({
      error: 'Failed to update diaper log'
    });
  }
};

export const deleteDiaperLog = async (req: AuthRequest, res: Response) => {
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
    const existingLog = await prisma.diaperLog.findFirst({
      where: {
        id,
        childId: { in: childIds }
      }
    });

    if (!existingLog) {
      return res.status(404).json({ error: 'Diaper log not found' });
    }

    await prisma.diaperLog.delete({
      where: { id }
    });

    res.json({ message: 'Diaper log deleted successfully' });
  } catch (error) {
    console.error('Delete diaper log error:', error);
    res.status(500).json({
      error: 'Failed to delete diaper log'
    });
  }
};

export const getLastDiaperChange = async (req: AuthRequest, res: Response) => {
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

    const lastLog = await prisma.diaperLog.findFirst({
      where: {
        childId
      },
      orderBy: { timestamp: 'desc' },
      include: {
        child: true,
        user: {
          select: { name: true, email: true }
        }
      }
    });

    if (!lastLog) {
      return res.status(404).json({
        message: 'No diaper logs found for this child'
      });
    }

    // Calculate time since last change
    const timeSince = Date.now() - lastLog.timestamp.getTime();
    const hoursSince = Math.floor(timeSince / 1000 / 60 / 60);
    const minutesSince = Math.floor((timeSince / 1000 / 60) % 60);

    res.json({
      ...lastLog,
      timeSince: {
        hours: hoursSince,
        minutes: minutesSince,
        formatted: `${hoursSince}h ${minutesSince}m ago`
      }
    });
  } catch (error) {
    console.error('Get last diaper change error:', error);
    res.status(500).json({
      error: 'Failed to fetch last diaper change'
    });
  }
};
