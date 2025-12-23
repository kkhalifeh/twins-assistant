import { Response } from 'express';
import { prisma } from '../index';
import { AuthRequest } from '../utils/auth';
import { parseFloatSafe, parseIntSafe } from '../utils/validation';
import { TimezoneService } from '../utils/timezone';

export const getPumpingLogs = async (req: AuthRequest, res: Response) => {
  try {
    const { date } = req.query;
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

      where.startTime = {
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
      orderBy: { startTime: 'desc' }
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
      startTime,
      endTime,
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

    if (!startTime || !pumpType) {
      return res.status(400).json({
        error: 'Start time and pump type are required'
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

    // Calculate duration if endTime is provided
    let calculatedDuration = duration ? parseIntSafe(duration) : null;
    if (endTime && !calculatedDuration) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      calculatedDuration = Math.floor((end.getTime() - start.getTime()) / 1000 / 60);
    }

    const log = await prisma.pumpingLog.create({
      data: {
        userId: req.user!.id,
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : null,
        pumpType,
        duration: calculatedDuration,
        amount: amount ? parseFloatSafe(amount) : null,
        usage: usage || null,
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
      startTime,
      endTime,
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

    // Recalculate duration if times are updated
    let calculatedDuration = duration !== undefined ? parseIntSafe(duration) : undefined;
    if (startTime && endTime && calculatedDuration === undefined) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      calculatedDuration = Math.floor((end.getTime() - start.getTime()) / 1000 / 60);
    }

    const log = await prisma.pumpingLog.update({
      where: { id },
      data: {
        ...(startTime && { startTime: new Date(startTime) }),
        ...(endTime !== undefined && { endTime: endTime ? new Date(endTime) : null }),
        ...(pumpType && { pumpType }),
        ...(calculatedDuration !== undefined && { duration: calculatedDuration }),
        ...(amount !== undefined && { amount: amount ? parseFloatSafe(amount) : null }),
        ...(usage !== undefined && { usage }),
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

// Get active pumping sessions for all users in account
export const getActivePumpingSessions = async (req: AuthRequest, res: Response) => {
  try {
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

    if (userIds.length === 0) {
      return res.json([]);
    }

    // Find all active pumping sessions (no endTime) for users in the account
    const activeSessions = await prisma.pumpingLog.findMany({
      where: {
        userId: { in: userIds },
        endTime: null
      },
      include: {
        user: {
          select: { name: true, email: true }
        }
      },
      orderBy: { startTime: 'desc' }
    });

    res.json(activeSessions);
  } catch (error) {
    console.error('Get active pumping sessions error:', error);
    res.status(500).json({
      error: 'Failed to fetch active pumping sessions'
    });
  }
};

// End pumping session by pumping log ID
export const endPumpingSession = async (req: AuthRequest, res: Response) => {
  try {
    const { pumpingLogId } = req.params;
    const { amount, usage } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!amount || !usage) {
      return res.status(400).json({ error: 'Amount and usage are required to end pumping session' });
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
      return res.status(404).json({ error: 'No users found in account' });
    }

    // Find the pumping log and verify it belongs to a user in the account
    const activeSession = await prisma.pumpingLog.findFirst({
      where: {
        id: pumpingLogId,
        userId: { in: userIds },
        endTime: null
      }
    });

    if (!activeSession) {
      return res.status(404).json({
        error: 'No active pumping session found'
      });
    }

    const endTime = new Date();
    const duration = Math.floor(
      (endTime.getTime() - activeSession.startTime.getTime()) / 1000 / 60
    );

    const updated = await prisma.pumpingLog.update({
      where: { id: activeSession.id },
      data: {
        endTime,
        duration,
        amount: parseFloatSafe(amount) || 0,
        usage
      },
      include: {
        user: {
          select: { name: true, email: true }
        }
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('End pumping session error:', error);
    res.status(500).json({
      error: 'Failed to end pumping session'
    });
  }
};
