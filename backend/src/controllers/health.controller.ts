import { Response } from 'express';
import { prisma } from '../index';
import { AuthRequest } from '../utils/auth';
import { parseIntSafe } from '../utils/validation';

export const getHealthLogs = async (req: AuthRequest, res: Response) => {
  try {
    const { childId, type, limit = '50' } = req.query;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const where: any = { userId };
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
      orderBy: { timestamp: 'desc' },
      take: parseIntSafe(limit as string) || 50
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
      notes 
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
    
    const log = await prisma.healthLog.create({
      data: {
        childId,
        userId: req.user!.id,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        type,
        value: value.toString(),
        unit,
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

    // Get latest of each vital type
    const temperature = await prisma.healthLog.findFirst({
      where: { childId, userId, type: 'TEMPERATURE' },
      orderBy: { timestamp: 'desc' }
    });

    const weight = await prisma.healthLog.findFirst({
      where: { childId, userId, type: 'WEIGHT' },
      orderBy: { timestamp: 'desc' }
    });

    const height = await prisma.healthLog.findFirst({
      where: { childId, userId, type: 'HEIGHT' },
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
