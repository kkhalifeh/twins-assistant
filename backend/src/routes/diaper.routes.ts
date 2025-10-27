import { Router } from 'express';
import {
  getDiaperLogs,
  createDiaperLog,
  getLastDiaperChange
} from '../controllers/diaper.controller';
import { authMiddleware } from '../utils/auth';
import { uploadDiaperImage } from '../utils/upload';

const router = Router();

router.use(authMiddleware);

router.get('/', getDiaperLogs);
router.post('/', uploadDiaperImage.single('image'), createDiaperLog);
router.get('/last/:childId', getLastDiaperChange);

export default router;
