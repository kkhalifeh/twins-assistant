import { Response } from 'express';
import { prisma } from '../index';
import { AuthRequest } from '../utils/auth';
import { parseIntSafe } from '../utils/validation';
import { TimezoneService } from '../utils/timezone';

export const getHygieneLogs = async (req: AuthRequest, res: Response) => {
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

    const logs = await prisma.hygieneLog.findMany({
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
    console.error('Get hygiene logs error:', error);
    res.status(500).json({
      error: 'Failed to fetch hygiene logs'
    });
  }
};

export const createHygieneLog = async (req: AuthRequest, res: Response) => {
  try {
    const {
      childId,
      timestamp,
      type,
      notes,
      timezone
    } = req.body;

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Validate required fields
    if (!childId || !timestamp || !type) {
      return res.status(400).json({
        error: 'Missing required fields: childId, timestamp, type'
      });
    }

    // Get user's accountId
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { accountId: true, timezone: true }
    });

    if (!user?.accountId) {
      return res.status(400).json({ error: 'User not part of an account' });
    }

    // Verify child belongs to account
    const child = await prisma.child.findFirst({
      where: {
        id: childId,
        user: {
          accountId: user.accountId
        }
      }
    });

    if (!child) {
      return res.status(404).json({ error: 'Child not found or access denied' });
    }

    // Use timezone from request or user's default timezone
    const entryTimezone = timezone || user.timezone || 'America/New_York';

    const hygieneLog = await prisma.hygieneLog.create({
      data: {
        childId,
        userId,
        timestamp: new Date(timestamp),
        type,
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

    res.status(201).json(hygieneLog);
  } catch (error) {
    console.error('Create hygiene log error:', error);
    res.status(500).json({
      error: 'Failed to create hygiene log'
    });
  }
};

export const updateHygieneLog = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { timestamp, type, notes } = req.body;
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

    // Verify log belongs to account
    const existingLog = await prisma.hygieneLog.findFirst({
      where: {
        id,
        childId: { in: childIds }
      }
    });

    if (!existingLog) {
      return res.status(404).json({ error: 'Hygiene log not found or access denied' });
    }

    const updateData: any = {};
    if (timestamp) updateData.timestamp = new Date(timestamp);
    if (type) updateData.type = type;
    if (notes !== undefined) updateData.notes = notes;

    const updatedLog = await prisma.hygieneLog.update({
      where: { id },
      data: updateData,
      include: {
        child: true,
        user: {
          select: { name: true, email: true }
        }
      }
    });

    res.json(updatedLog);
  } catch (error) {
    console.error('Update hygiene log error:', error);
    res.status(500).json({
      error: 'Failed to update hygiene log'
    });
  }
};

export const deleteHygieneLog = async (req: AuthRequest, res: Response) => {
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

    // Verify log belongs to account
    const existingLog = await prisma.hygieneLog.findFirst({
      where: {
        id,
        childId: { in: childIds }
      }
    });

    if (!existingLog) {
      return res.status(404).json({ error: 'Hygiene log not found or access denied' });
    }

    await prisma.hygieneLog.delete({
      where: { id }
    });

    res.json({ message: 'Hygiene log deleted successfully' });
  } catch (error) {
    console.error('Delete hygiene log error:', error);
    res.status(500).json({
      error: 'Failed to delete hygiene log'
    });
  }
};
