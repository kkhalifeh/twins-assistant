import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../utils/auth';
import { differenceInMinutes } from 'date-fns';

const router = Router();
const prisma = new PrismaClient();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get all sleep logs
router.get('/', async (req: Request, res: Response) => {
  try {
    const { childId, limit = 50 } = req.query;
    
    const where = childId ? { childId: childId as string } : {};
    
    const sleepLogs = await prisma.sleepLog.findMany({
      where,
      include: {
        child: true,
        user: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { startTime: 'desc' },
      take: parseInt(limit as string)
    });

    res.json(sleepLogs);
  } catch (error) {
    console.error('Error fetching sleep logs:', error);
    res.status(500).json({ error: 'Failed to fetch sleep logs' });
  }
});

// Get single sleep log
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const sleepLog = await prisma.sleepLog.findUnique({
      where: { id },
      include: {
        child: true,
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!sleepLog) {
      return res.status(404).json({ error: 'Sleep log not found' });
    }

    res.json(sleepLog);
  } catch (error) {
    console.error('Error fetching sleep log:', error);
    res.status(500).json({ error: 'Failed to fetch sleep log' });
  }
});

// Create sleep log
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { 
      childId, 
      startTime, 
      endTime, 
      type, 
      quality, 
      notes 
    } = req.body;

    // Calculate duration if endTime is provided
    let duration = null;
    if (endTime) {
      duration = differenceInMinutes(new Date(endTime), new Date(startTime));
    }

    const sleepLog = await prisma.sleepLog.create({
      data: {
        childId,
        userId,
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
          select: { id: true, name: true, email: true }
        }
      }
    });

    res.status(201).json(sleepLog);
  } catch (error) {
    console.error('Error creating sleep log:', error);
    res.status(500).json({ error: 'Failed to create sleep log' });
  }
});

// End sleep session (wake up)
router.put('/:id/end', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const endTime = new Date();
    
    // Get the sleep log to calculate duration
    const sleepLog = await prisma.sleepLog.findUnique({
      where: { id }
    });

    if (!sleepLog) {
      return res.status(404).json({ error: 'Sleep log not found' });
    }

    if (sleepLog.endTime) {
      return res.status(400).json({ error: 'Sleep session already ended' });
    }

    // Calculate duration
    const duration = differenceInMinutes(endTime, sleepLog.startTime);

    // Update the sleep log
    const updatedSleepLog = await prisma.sleepLog.update({
      where: { id },
      data: {
        endTime,
        duration
      },
      include: {
        child: true,
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    res.json(updatedSleepLog);
  } catch (error) {
    console.error('Error ending sleep session:', error);
    res.status(500).json({ error: 'Failed to end sleep session' });
  }
});

// Update sleep log
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { 
      startTime, 
      endTime, 
      type, 
      quality, 
      notes 
    } = req.body;

    // Calculate duration if endTime is provided
    let duration = null;
    if (endTime && startTime) {
      duration = differenceInMinutes(new Date(endTime), new Date(startTime));
    }

    const sleepLog = await prisma.sleepLog.update({
      where: { id },
      data: {
        startTime: startTime ? new Date(startTime) : undefined,
        endTime: endTime ? new Date(endTime) : undefined,
        duration,
        type,
        quality,
        notes
      },
      include: {
        child: true,
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    res.json(sleepLog);
  } catch (error) {
    console.error('Error updating sleep log:', error);
    res.status(500).json({ error: 'Failed to update sleep log' });
  }
});

// Delete sleep log
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.sleepLog.delete({
      where: { id }
    });

    res.json({ message: 'Sleep log deleted successfully' });
  } catch (error) {
    console.error('Error deleting sleep log:', error);
    res.status(500).json({ error: 'Failed to delete sleep log' });
  }
});

export default router;
