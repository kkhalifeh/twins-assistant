import { Response } from 'express';
import { prisma } from '../index';
import { AuthRequest } from '../utils/auth';
import { parseIntSafe } from '../utils/validation';

export const getDiaperLogs = async (req: AuthRequest, res: Response) => {
  try {
    const { childId, date, limit = '50' } = req.query;
    
    const where: any = {};
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
    
    if (!childId || !type) {
      return res.status(400).json({ 
        error: 'Child ID and type are required' 
      });
    }
    
    const log = await prisma.diaperLog.create({
      data: {
        childId,
        userId: req.user!.userId,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        type,
        consistency,
        color,
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

export const getLastDiaperChange = async (req: AuthRequest, res: Response) => {
  try {
    const { childId } = req.params;
    
    const lastLog = await prisma.diaperLog.findFirst({
      where: { childId },
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
