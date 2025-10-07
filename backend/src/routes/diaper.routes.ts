import { Router } from 'express';
import { 
  getDiaperLogs, 
  createDiaperLog, 
  getLastDiaperChange 
} from '../controllers/diaper.controller';
import { authMiddleware } from '../utils/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', getDiaperLogs);
router.post('/', createDiaperLog);
router.get('/last/:childId', getLastDiaperChange);

export default router;
