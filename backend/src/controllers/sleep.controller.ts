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

    const where: any = { userId };
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

    // Recalculate duration if times are updated
    let duration = undefined;
    if (startTime && endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      duration = Math.floor((end.getTime() - start.getTime()) / 1000 / 60);
    }

    const log = await prisma.sleepLog.update({
      where: {
        id,
        userId
      },
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

    await prisma.sleepLog.delete({
      where: {
        id,
        userId
      }
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

    // Find active sleep session (no endTime)
    const activeSession = await prisma.sleepLog.findFirst({
      where: {
        childId,
        userId,
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
