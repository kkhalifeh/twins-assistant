import { Response } from 'express';
import { prisma } from '../index';
import { AuthRequest } from '../utils/auth';
import { parseIntSafe } from '../utils/validation';
import { TimezoneService } from '../utils/timezone';

export const getHealthLogs = async (req: AuthRequest, res: Response) => {
  try {
    const { childId, type } = req.query;
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
    if (type) where.type = type as string;

    const logs = await prisma.healthLog.findMany({
      where,
      include: {
        child: true,
        user: {
          select: { name: true, email: true }
        }
      },
      orderBy: { timestamp: 'desc' }
    });

    res.json(logs);
  } catch (error) {
    console.error('Get health logs error:', error);
    res.status(500).json({
      error: 'Failed to fetch health logs'
    });
  }
};

export const createHealthLog = async (req: AuthRequest, res: Response) => {
  try {
    const {
      childId,
      timestamp,
      type,
      value,
      unit,
      notes,
      timezone
    } = req.body;

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!childId || !type || !value) {
      return res.status(400).json({
        error: 'Child ID, type, and value are required'
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

    const log = await prisma.healthLog.create({
      data: {
        childId,
        userId: req.user!.id,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        type,
        value: value.toString(),
        unit,
        notes,
        entryTimezone
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
    console.error('Create health log error:', error);
    res.status(500).json({
      error: 'Failed to create health log'
    });
  }
};

export const getLatestVitals = async (req: AuthRequest, res: Response) => {
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

    // Get latest of each vital type
    const temperature = await prisma.healthLog.findFirst({
      where: { childId, type: 'TEMPERATURE' },
      orderBy: { timestamp: 'desc' }
    });

    const weight = await prisma.healthLog.findFirst({
      where: { childId, type: 'WEIGHT' },
      orderBy: { timestamp: 'desc' }
    });

    const height = await prisma.healthLog.findFirst({
      where: { childId, type: 'HEIGHT' },
      orderBy: { timestamp: 'desc' }
    });

    res.json({
      temperature,
      weight,
      height
    });
  } catch (error) {
    console.error('Get latest vitals error:', error);
    res.status(500).json({
      error: 'Failed to fetch latest vitals'
    });
  }
};
