import { Response } from 'express';
import { prisma } from '../index';
import { AuthRequest } from '../utils/auth';

export const getChildren = async (req: AuthRequest, res: Response) => {
  try {
    const children = await prisma.child.findMany({
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
    
    const child = await prisma.child.findUnique({
      where: { id },
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
    
    if (!name || !dateOfBirth || !gender) {
      return res.status(400).json({ 
        error: 'Name, date of birth, and gender are required' 
      });
    }
    
    const child = await prisma.child.create({
      data: {
        name,
        dateOfBirth: new Date(dateOfBirth),
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
    
    const child = await prisma.child.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
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
