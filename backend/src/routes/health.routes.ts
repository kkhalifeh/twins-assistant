import { Router } from 'express';
import {
  getHealthLogs,
  createHealthLog,
  updateHealthLog,
  deleteHealthLog,
  getLatestVitals
} from '../controllers/health.controller';
import { authMiddleware } from '../utils/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', getHealthLogs);
router.post('/', createHealthLog);
router.put('/:id', updateHealthLog);
router.delete('/:id', deleteHealthLog);
router.get('/vitals/:childId', getLatestVitals);

export default router;
