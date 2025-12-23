import { Router } from 'express';
import { authMiddleware } from '../utils/auth';
import {
  getPumpingLogs,
  createPumpingLog,
  updatePumpingLog,
  deletePumpingLog,
  getActivePumpingSessions,
  endPumpingSession
} from '../controllers/pumping.controller';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get all pumping logs - use controller with proper authorization
router.get('/', getPumpingLogs);

// Get active pumping sessions - MUST come before specific routes to avoid conflicts
router.get('/active', getActivePumpingSessions);

// Create pumping log - use controller with proper authorization
router.post('/', createPumpingLog);

// End pumping session by pumping log ID - MUST come before /:id route to avoid conflict
router.put('/:pumpingLogId/end', endPumpingSession);

// Update pumping log - use controller with proper authorization
router.put('/:id', updatePumpingLog);

// Delete pumping log - use controller with proper authorization
router.delete('/:id', deletePumpingLog);

export default router;
