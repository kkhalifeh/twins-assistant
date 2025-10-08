import { Response } from 'express';
import { prisma } from '../index';
import { AuthRequest } from '../utils/auth';
import { parseFloatSafe, parseIntSafe } from '../utils/validation';

export const getFeedingLogs = async (req: AuthRequest, res: Response) => {
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

    const logs = await prisma.feedingLog.findMany({
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
    console.error('Get feeding logs error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch feeding logs' 
    });
  }
};

export const createFeedingLog = async (req: AuthRequest, res: Response) => {
  try {
    const { 
      childId, 
      startTime, 
      endTime, 
      type, 
      amount, 
      duration, 
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
    
    const log = await prisma.feedingLog.create({
      data: {
        childId,
        userId: req.user!.id,
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : null,
        type,
        amount: parseFloatSafe(amount),
        duration: parseIntSafe(duration),
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
    console.error('Create feeding log error:', error);
    res.status(500).json({ 
      error: 'Failed to create feeding log' 
    });
  }
};

export const updateFeedingLog = async (req: AuthRequest, res: Response) => {
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
      amount,
      duration,
      notes
    } = req.body;

    const log = await prisma.feedingLog.update({
      where: {
        id,
        userId
      },
      data: {
        ...(startTime && { startTime: new Date(startTime) }),
        ...(endTime !== undefined && { endTime: endTime ? new Date(endTime) : null }),
        ...(type && { type }),
        ...(amount !== undefined && { amount: parseFloatSafe(amount) }),
        ...(duration !== undefined && { duration: parseIntSafe(duration) }),
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
    console.error('Update feeding log error:', error);
    res.status(500).json({ 
      error: 'Failed to update feeding log' 
    });
  }
};

export const deleteFeedingLog = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    await prisma.feedingLog.delete({
      where: {
        id,
        userId
      }
    });
    
    res.json({ message: 'Feeding log deleted successfully' });
  } catch (error) {
    console.error('Delete feeding log error:', error);
    res.status(500).json({ 
      error: 'Failed to delete feeding log' 
    });
  }
};

// Get last feeding time for a child
export const getLastFeeding = async (req: AuthRequest, res: Response) => {
  try {
    const { childId } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const lastLog = await prisma.feedingLog.findFirst({
      where: {
        childId,
        userId
      },
      orderBy: { startTime: 'desc' },
      include: {
        child: true,
        user: {
          select: { name: true, email: true }
        }
      }
    });
    
    if (!lastLog) {
      return res.status(404).json({ 
        message: 'No feeding logs found for this child' 
      });
    }
    
    res.json(lastLog);
  } catch (error) {
    console.error('Get last feeding error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch last feeding' 
    });
  }
};
