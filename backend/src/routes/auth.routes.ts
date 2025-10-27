import { Router } from 'express';
import { register, login, getProfile } from '../controllers/auth.controller';
import { authMiddleware } from '../utils/auth';

const router = Router();

// Register
router.post('/register', register);

// Login
router.post('/login', login);

// Get current user
router.get('/me', authMiddleware, getProfile);

export default router;
