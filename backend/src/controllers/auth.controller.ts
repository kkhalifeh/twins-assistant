import { Request, Response } from 'express';
import { prisma } from '../index';
import { 
  generateToken, 
  hashPassword, 
  comparePassword,
  AuthRequest 
} from '../utils/auth';
import { validateEmail } from '../utils/validation';

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name, phone } = req.body;
    
    // Validation
    if (!email || !password || !name) {
      return res.status(400).json({ 
        error: 'Email, password, and name are required' 
      });
    }
    
    if (!validateEmail(email)) {
      return res.status(400).json({ 
        error: 'Invalid email format' 
      });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ 
        error: 'Password must be at least 6 characters' 
      });
    }
    
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        error: 'User already exists' 
      });
    }
    
    // Create user and account - simplified approach
    const hashedPassword = await hashPassword(password);
    console.log('[Registration] Step 1: Creating user...');

    // Create user first (without account)
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone,
        role: 'PARENT'
      }
    });
    console.log('[Registration] Step 1 complete: User created with ID:', user.id);

    console.log('[Registration] Step 2: Creating account...');
    console.log('[Registration] Account data:', { name: `${name}'s Family`, ownerId: user.id });

    // Create account with user as owner
    const account = await prisma.account.create({
      data: {
        name: `${name}'s Family`,
        ownerId: user.id
      }
    });
    console.log('[Registration] Step 2 complete: Account created with ID:', account.id);

    console.log('[Registration] Step 3: Updating user with accountId...');
    // Update user with accountId
    const result = await prisma.user.update({
      where: { id: user.id },
      data: { accountId: account.id }
    });
    console.log('[Registration] Step 3 complete: User updated with accountId:', result.accountId);
    console.log('[Registration] All steps completed successfully!');

    // Generate token
    const token = generateToken(result.id);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: result.id,
        email: result.email,
        name: result.name,
        role: result.role
      }
    });
  } catch (error: any) {
    console.error('Register error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack
    });
    res.status(500).json({
      error: 'Failed to register user',
      details: error.message
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required' 
      });
    }
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid credentials' 
      });
    }
    
    // Check password
    const isValid = await comparePassword(password, user.password);
    
    if (!isValid) {
      return res.status(401).json({ 
        error: 'Invalid credentials' 
      });
    }
    
    // Generate token
    const token = generateToken(user.id);
    
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Failed to login' 
    });
  }
};

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Unauthorized' 
      });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        createdAt: true
      }
    });
    
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found' 
      });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ 
      error: 'Failed to get profile' 
    });
  }
};
