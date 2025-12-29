import { Router } from 'express';
import {
  getFeedingLogs,
  createFeedingLog,
  updateFeedingLog,
  deleteFeedingLog,
  getLastFeeding
} from '../controllers/feeding.controller';
import {
  exportFeedingCSV,
  generateFeedingInsights
} from '../controllers/feeding-export.controller';
import { authMiddleware } from '../utils/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', getFeedingLogs);

// Export routes - MUST come before /:id route to avoid conflict
router.get('/export/csv', exportFeedingCSV);
router.get('/export/insights', generateFeedingInsights);

router.post('/', createFeedingLog);
router.put('/:id', updateFeedingLog);
router.delete('/:id', deleteFeedingLog);
router.get('/last/:childId', getLastFeeding);

export default router;
