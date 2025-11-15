import { Response } from 'express';
import { prisma } from '../index';
import { AuthRequest } from '../utils/auth';

export const deleteAllData = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user's account
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { accountId: true }
    });

    if (!user?.accountId) {
      return res.status(400).json({ error: 'User not part of an account' });
    }

    // Delete all user data in a transaction
    await prisma.$transaction(async (tx) => {
      // Get all children IDs for users in the same account
      const children = await tx.child.findMany({
        where: {
          user: {
            accountId: user.accountId
          }
        },
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

      // Delete inventory items for all users in the account
      await tx.inventory.deleteMany({
        where: {
          user: {
            accountId: user.accountId
          }
        }
      });

      // Delete children for all users in the account
      await tx.child.deleteMany({
        where: {
          user: {
            accountId: user.accountId
          }
        }
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

export const deleteDataByType = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { type } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user's account
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

      case 'diaper':
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

      case 'milestone':
      case 'milestones':
        await prisma.milestone.deleteMany({
          where: { childId: { in: childIds } }
        });
        break;

      case 'inventory':
        await prisma.inventory.deleteMany({
          where: {
            user: {
              accountId: user.accountId
            }
          }
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
