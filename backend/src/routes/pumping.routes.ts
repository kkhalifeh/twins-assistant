import { Router } from 'express';
import { authMiddleware } from '../utils/auth';
import {
  getPumpingLogs,
  createPumpingLog,
  updatePumpingLog,
  deletePumpingLog
} from '../controllers/pumping.controller';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get all pumping logs - use controller with proper authorization
router.get('/', getPumpingLogs);

// Create pumping log - use controller with proper authorization
router.post('/', createPumpingLog);

// Update pumping log - use controller with proper authorization
router.put('/:id', updatePumpingLog);

// Delete pumping log - use controller with proper authorization
router.delete('/:id', deletePumpingLog);

export default router;
