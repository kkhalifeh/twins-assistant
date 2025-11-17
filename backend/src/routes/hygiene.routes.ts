import { Router } from 'express';
import {
  getHygieneLogs,
  createHygieneLog,
  updateHygieneLog,
  deleteHygieneLog
} from '../controllers/hygiene.controller';
import { authMiddleware } from '../utils/auth';
import { checkResourceAccess } from '../middleware/rbac.middleware';

const router = Router();

router.use(authMiddleware);
router.use(checkResourceAccess);

router.get('/', getHygieneLogs);
router.post('/', createHygieneLog);
router.put('/:id', updateHygieneLog);
router.delete('/:id', deleteHygieneLog);

export default router;
