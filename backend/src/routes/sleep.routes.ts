import { Router } from 'express';
import { authMiddleware } from '../utils/auth';
import {
  getSleepLogs,
  createSleepLog,
  updateSleepLog,
  deleteSleepLog,
  endSleepSession
} from '../controllers/sleep.controller';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get all sleep logs - use controller with proper authorization
router.get('/', getSleepLogs);

// Create sleep log - use controller with proper authorization
router.post('/', createSleepLog);

// Update sleep log - use controller with proper authorization
router.put('/:id', updateSleepLog);

// Delete sleep log - use controller with proper authorization
router.delete('/:id', deleteSleepLog);

// End sleep session - use controller with proper authorization
router.put('/:childId/end', endSleepSession);

export default router;
