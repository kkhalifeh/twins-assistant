import { Router } from 'express';
import { 
  getFeedingLogs, 
  createFeedingLog, 
  updateFeedingLog, 
  deleteFeedingLog,
  getLastFeeding 
} from '../controllers/feeding.controller';
import { authMiddleware } from '../utils/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', getFeedingLogs);
router.post('/', createFeedingLog);
router.put('/:id', updateFeedingLog);
router.delete('/:id', deleteFeedingLog);
router.get('/last/:childId', getLastFeeding);

export default router;
