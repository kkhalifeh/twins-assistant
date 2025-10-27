import { Request, Response } from 'express';
import { prisma } from '../index';

export const deleteAllData = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Delete all user data in a transaction
    await prisma.$transaction(async (tx) => {
      // Get all children IDs for the user
      const children = await tx.child.findMany({
        where: { userId },
        select: { id: true }
      });

      const childIds = children.map(c => c.id);

      if (childIds.length > 0) {
        // Delete all logs related to user's children
        await tx.feedingLog.deleteMany({
          where: { childId: { in: childIds } }
        });

        await tx.sleepLog.deleteMany({
          where: { childId: { in: childIds } }
        });

        await tx.diaperLog.deleteMany({
          where: { childId: { in: childIds } }
        });

        await tx.healthLog.deleteMany({
          where: { childId: { in: childIds } }
        });

        await tx.milestone.deleteMany({
          where: { childId: { in: childIds } }
        });

        await tx.schedule.deleteMany({
          where: { childId: { in: childIds } }
        });
      }

      // Delete inventory items
      await tx.inventory.deleteMany({
        where: { userId }
      });

      // Delete children
      await tx.child.deleteMany({
        where: { userId }
      });
    });

    res.json({
      message: 'All data deleted successfully',
      success: true
    });
  } catch (error) {
    console.error('Error deleting all data:', error);
    res.status(500).json({ error: 'Failed to delete data' });
  }
};

export const deleteDataByType = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { type } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get all children IDs for the user
    const children = await prisma.child.findMany({
      where: { userId },
      select: { id: true }
    });

    const childIds = children.map(c => c.id);

    if (childIds.length === 0) {
      return res.json({
        message: 'No data to delete',
        success: true
      });
    }

    // Delete data based on type
    switch (type) {
      case 'feeding':
        await prisma.feedingLog.deleteMany({
          where: { childId: { in: childIds } }
        });
        break;

      case 'sleep':
        await prisma.sleepLog.deleteMany({
          where: { childId: { in: childIds } }
        });
        break;

      case 'diapers':
        await prisma.diaperLog.deleteMany({
          where: { childId: { in: childIds } }
        });
        break;

      case 'health':
        await prisma.healthLog.deleteMany({
          where: { childId: { in: childIds } }
        });
        break;

      case 'milestones':
        await prisma.milestone.deleteMany({
          where: { childId: { in: childIds } }
        });
        break;

      case 'inventory':
        await prisma.inventory.deleteMany({
          where: { userId }
        });
        break;

      default:
        return res.status(400).json({ error: 'Invalid data type' });
    }

    res.json({
      message: `${type} data deleted successfully`,
      success: true
    });
  } catch (error) {
    console.error(`Error deleting ${req.params.type} data:`, error);
    res.status(500).json({ error: 'Failed to delete data' });
  }
};
