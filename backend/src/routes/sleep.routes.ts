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

// End sleep session by sleep log ID - MUST come before /:id route to avoid conflict
router.put('/:sleepLogId/end', endSleepSession);

// Update sleep log - use controller with proper authorization
router.put('/:id', updateSleepLog);

// Delete sleep log - use controller with proper authorization
router.delete('/:id', deleteSleepLog);

export default router;
