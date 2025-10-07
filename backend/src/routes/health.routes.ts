import { Router } from 'express';
import { 
  getHealthLogs, 
  createHealthLog, 
  getLatestVitals 
} from '../controllers/health.controller';
import { authMiddleware } from '../utils/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', getHealthLogs);
router.post('/', createHealthLog);
router.get('/vitals/:childId', getLatestVitals);

export default router;
