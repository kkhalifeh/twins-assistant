import { Response } from 'express';
import { prisma } from '../index';
import { AuthRequest, hashPassword, generateToken } from '../utils/auth';

// Get all users in the same account (team members)
export const getTeamMembers = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get current user to find their accountId
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        ownedAccount: true,
        account: true
      }
    });

    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Determine the accountId (either owned account or member of account)
    const accountId = currentUser.ownedAccount?.id || currentUser.accountId;

    if (!accountId) {
      // User doesn't have an account yet, return just themselves
      return res.json([{
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        role: currentUser.role,
        isOwner: false
      }]);
    }

    // Get all team members in the account
    const teamMembers = await prisma.user.findMany({
      where: {
        OR: [
          { accountId: accountId },
          { ownedAccount: { id: accountId } }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        ownedAccount: {
          select: {
            id: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Format response with isOwner flag
    const formattedMembers = teamMembers.map(member => ({
      id: member.id,
      name: member.name,
      email: member.email,
      role: member.role,
      createdAt: member.createdAt,
      isOwner: !!member.ownedAccount
    }));

    res.json(formattedMembers);
  } catch (error) {
    console.error('Get team members error:', error);
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
};

// Invite/Add a new user to the account
export const inviteTeamMember = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { email, name, role, password } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Validate required fields
    if (!email || !name || !role || !password) {
      return res.status(400).json({
        error: 'Email, name, role, and password are required'
      });
    }

    // Validate role
    const validRoles = ['PARENT', 'NANNY', 'VIEWER'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        error: 'Invalid role. Must be PARENT, NANNY, or VIEWER'
      });
    }

    // Get current user to find their account
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        ownedAccount: true,
        account: true
      }
    });

    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Only account owner can invite new members
    if (!currentUser.ownedAccount) {
      return res.status(403).json({
        error: 'Only the account owner can invite new team members'
      });
    }

    const accountId = currentUser.ownedAccount.id;

    // Check if user with this email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({
        error: 'A user with this email already exists'
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create new user and add to account
    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role,
        accountId
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      }
    });

    res.status(201).json({
      ...newUser,
      isOwner: false
    });
  } catch (error) {
    console.error('Invite team member error:', error);
    res.status(500).json({ error: 'Failed to invite team member' });
  }
};

// Update team member role
export const updateTeamMemberRole = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { memberId } = req.params;
    const { role } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Validate role
    const validRoles = ['PARENT', 'NANNY', 'VIEWER'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        error: 'Invalid role. Must be PARENT, NANNY, or VIEWER'
      });
    }

    // Get current user
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        ownedAccount: true
      }
    });

    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Only account owner can update roles
    if (!currentUser.ownedAccount) {
      return res.status(403).json({
        error: 'Only the account owner can update team member roles'
      });
    }

    // Cannot update own role
    if (memberId === userId) {
      return res.status(400).json({
        error: 'You cannot change your own role'
      });
    }

    // Get member to update
    const member = await prisma.user.findUnique({
      where: { id: memberId }
    });

    if (!member) {
      return res.status(404).json({ error: 'Team member not found' });
    }

    // Verify member is in the same account
    if (member.accountId !== currentUser.ownedAccount.id) {
      return res.status(403).json({
        error: 'This user is not a member of your account'
      });
    }

    // Update role
    const updatedMember = await prisma.user.update({
      where: { id: memberId },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      }
    });

    res.json({
      ...updatedMember,
      isOwner: false
    });
  } catch (error) {
    console.error('Update team member role error:', error);
    res.status(500).json({ error: 'Failed to update team member role' });
  }
};

// Remove team member
export const removeTeamMember = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { memberId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get current user
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        ownedAccount: true
      }
    });

    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Only account owner can remove members
    if (!currentUser.ownedAccount) {
      return res.status(403).json({
        error: 'Only the account owner can remove team members'
      });
    }

    // Cannot remove self
    if (memberId === userId) {
      return res.status(400).json({
        error: 'You cannot remove yourself from the account'
      });
    }

    // Get member to remove
    const member = await prisma.user.findUnique({
      where: { id: memberId }
    });

    if (!member) {
      return res.status(404).json({ error: 'Team member not found' });
    }

    // Verify member is in the same account
    if (member.accountId !== currentUser.ownedAccount.id) {
      return res.status(403).json({
        error: 'This user is not a member of your account'
      });
    }

    // Remove member (set accountId to null)
    await prisma.user.update({
      where: { id: memberId },
      data: { accountId: null }
    });

    res.json({ message: 'Team member removed successfully' });
  } catch (error) {
    console.error('Remove team member error:', error);
    res.status(500).json({ error: 'Failed to remove team member' });
  }
};

// Get current user info
export const getCurrentUser = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        accountId: true,
        ownedAccount: {
          select: {
            id: true,
            name: true
          }
        },
        account: {
          select: {
            id: true,
            name: true,
            owner: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Failed to fetch user information' });
  }
};
