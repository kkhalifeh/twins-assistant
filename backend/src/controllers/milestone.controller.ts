import { Response } from 'express';
import { prisma } from '../index';
import { AuthRequest } from '../utils/auth';

export const getMilestones = async (req: AuthRequest, res: Response) => {
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

    const milestones = await prisma.milestone.findMany({
      where,
      include: {
        child: true
      },
      orderBy: { dateAchieved: 'desc' }
    });

    res.json(milestones);
  } catch (error) {
    console.error('Get milestones error:', error);
    res.status(500).json({
      error: 'Failed to fetch milestones'
    });
  }
};

export const createMilestone = async (req: AuthRequest, res: Response) => {
  try {
    const {
      childId,
      type,
      name,
      dateAchieved,
      notes,
      mediaUrl
    } = req.body;

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Validate required fields
    if (!childId || !type || !name || !dateAchieved) {
      return res.status(400).json({
        error: 'Missing required fields: childId, type, name, dateAchieved'
      });
    }

    // Get user's accountId
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { accountId: true }
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

    const milestone = await prisma.milestone.create({
      data: {
        childId,
        type,
        name,
        dateAchieved: new Date(dateAchieved),
        notes,
        mediaUrl
      },
      include: {
        child: true
      }
    });

    res.status(201).json(milestone);
  } catch (error) {
    console.error('Create milestone error:', error);
    res.status(500).json({
      error: 'Failed to create milestone'
    });
  }
};

export const updateMilestone = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { type, name, dateAchieved, notes, mediaUrl } = req.body;
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

    // Verify milestone belongs to account
    const existingMilestone = await prisma.milestone.findFirst({
      where: {
        id,
        childId: { in: childIds }
      }
    });

    if (!existingMilestone) {
      return res.status(404).json({ error: 'Milestone not found or access denied' });
    }

    const updateData: any = {};
    if (type) updateData.type = type;
    if (name) updateData.name = name;
    if (dateAchieved) updateData.dateAchieved = new Date(dateAchieved);
    if (notes !== undefined) updateData.notes = notes;
    if (mediaUrl !== undefined) updateData.mediaUrl = mediaUrl;

    const updatedMilestone = await prisma.milestone.update({
      where: { id },
      data: updateData,
      include: {
        child: true
      }
    });

    res.json(updatedMilestone);
  } catch (error) {
    console.error('Update milestone error:', error);
    res.status(500).json({
      error: 'Failed to update milestone'
    });
  }
};

export const deleteMilestone = async (req: AuthRequest, res: Response) => {
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

    // Verify milestone belongs to account
    const existingMilestone = await prisma.milestone.findFirst({
      where: {
        id,
        childId: { in: childIds }
      }
    });

    if (!existingMilestone) {
      return res.status(404).json({ error: 'Milestone not found or access denied' });
    }

    await prisma.milestone.delete({
      where: { id }
    });

    res.json({ message: 'Milestone deleted successfully' });
  } catch (error) {
    console.error('Delete milestone error:', error);
    res.status(500).json({
      error: 'Failed to delete milestone'
    });
  }
};
