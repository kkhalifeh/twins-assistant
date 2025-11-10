import { Response } from 'express';
import { prisma } from '../index';
import { AuthRequest } from '../utils/auth';

export const getChildren = async (req: AuthRequest, res: Response) => {
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

    // Get all children for users in the same account
    const children = await prisma.child.findMany({
      where: {
        user: {
          accountId: user.accountId
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json(children);
  } catch (error) {
    console.error('Get children error:', error);
    res.status(500).json({
      error: 'Failed to fetch children'
    });
  }
};

export const getChild = async (req: AuthRequest, res: Response) => {
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

    // Get child if it belongs to someone in the same account
    const child = await prisma.child.findFirst({
      where: {
        id,
        user: {
          accountId: user.accountId
        }
      },
      include: {
        _count: {
          select: {
            feedingLogs: true,
            sleepLogs: true,
            diaperLogs: true,
            healthLogs: true,
            milestones: true
          }
        }
      }
    });

    if (!child) {
      return res.status(404).json({
        error: 'Child not found'
      });
    }

    res.json(child);
  } catch (error) {
    console.error('Get child error:', error);
    res.status(500).json({
      error: 'Failed to fetch child'
    });
  }
};

export const createChild = async (req: AuthRequest, res: Response) => {
  try {
    const { name, dateOfBirth, gender, medicalNotes } = req.body;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!name || !dateOfBirth || !gender) {
      return res.status(400).json({
        error: 'Name, date of birth, and gender are required'
      });
    }

    // For date-only fields (no time component), store the date string directly
    // This prevents timezone conversion issues
    const child = await prisma.child.create({
      data: {
        userId, // Associate child with authenticated user
        name,
        dateOfBirth: new Date(dateOfBirth + 'T00:00:00.000Z'), // Force UTC midnight to avoid timezone shifts
        gender,
        medicalNotes
      }
    });

    res.status(201).json(child);
  } catch (error) {
    console.error('Create child error:', error);
    res.status(500).json({
      error: 'Failed to create child'
    });
  }
};

export const updateChild = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, dateOfBirth, gender, medicalNotes, photoUrl } = req.body;
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

    // Verify the child belongs to someone in the same account
    const existingChild = await prisma.child.findFirst({
      where: {
        id,
        user: {
          accountId: user.accountId
        }
      }
    });

    if (!existingChild) {
      return res.status(404).json({ error: 'Child not found' });
    }

    const child = await prisma.child.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth + 'T00:00:00.000Z') }),
        ...(gender && { gender }),
        ...(medicalNotes !== undefined && { medicalNotes }),
        ...(photoUrl !== undefined && { photoUrl })
      }
    });

    res.json(child);
  } catch (error) {
    console.error('Update child error:', error);
    res.status(500).json({
      error: 'Failed to update child'
    });
  }
};
